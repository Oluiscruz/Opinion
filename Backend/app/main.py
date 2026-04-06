import os
import random
import time
import uuid

from dotenv import load_dotenv
from datetime import timedelta, timezone, datetime
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import defer
from sqlalchemy.exc import IntegrityError

from sqlmodel import Session, or_, select
from jose import JWTError, jwt
from auth.auth import get_password_hash, verify_password, create_access_token, oauth_scheme, SECRET_KEY, ALGORITHM
from models.model import PlanType, SearchHistory, Users, YouTubeComments
from models.postgresql_db import create_db_and_tables, get_session, engine
from clients.ia_analyser import OpiAnalyser
from clients.youtube_extractor import YoutubeExtractor
from fastapi.middleware.cors import CORSMiddleware



# Chaves API
load_dotenv()
YOUTUBE_API_KEY = os.getenv('YOUTUBE_API_KEY')
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

app = FastAPI()

# CORS (dev)
cors_origins_env = os.getenv("CORS_ORIGINS", "")
allowed_origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()]
if not allowed_origins:
    allowed_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,  # auth via Authorization header, no cookies needed in dev
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

@app.on_event("startup")
def on_startup():
    create_db_and_tables()


# Função para dividir a lista de comments em pequenos pedaços
def chunck_list(data, size):
    for i in range(0, len(data), size):
        yield data[i:i+size]


# Função que roda as análises em background, para não travar a resposta da API    
def run_analysis_task(theme: str, user_id: uuid.UUID):
    print(f"[TASK START] Running background task for theme: '{theme}'")
    
    extractor = YoutubeExtractor(YOUTUBE_API_KEY)
    analyser = OpiAnalyser(GEMINI_API_KEY)
    
    videos_found = extractor.search_videos(theme, max_results=5)
    if not videos_found:
        print("\n[TASK END] No videos found")
        return
    
    selected_video = videos_found[0]
    selected_video_id = videos_found[0]['video_id']
    selected_channel = videos_found[0]['channel']
    selected_title = videos_found[0]['title']
    
    print(f"\n[TASK INFO] Analyzing video: '{selected_title}'")
    
    comments = extractor.get_comments(selected_video_id, max_results_per_page=50, max_pages=3)
    # max_results_per_page=50 para evitar sobrecarregar a API do YouTube e reduzir risco de rate limit
    if not comments:
        print("\n[TASK END] No comments found or error in extraction")
        return
    
    batch_size = 10
    
    # abre uma nova sessão do banco de dados para a tarefa em background
    with Session(engine) as db_session:
        for batch in chunck_list(comments, batch_size):
            texts_to_analyse = [str(c) for c in batch]
            max_retries = 5
            base_delay = 2
            batch_results = None
            
            for attempt in range(max_retries):
                try: 
                    batch_results = analyser.analyze_comments(texts_to_analyse)
                    break
                
                except Exception as e:
                    error_text = str(e).lower()
                    is_rate_limit = any(token in error_text for token in [
                        "429", "rate", "quota", "resource_exhausted", "too many requests"
                    ])
                    
                    if not is_rate_limit:
                        print(f"\n[TASK ERROR] Error unrelated to rate limit: {e}")
                        break
                    
                    if attempt < max_retries - 1:
                        wait_time = (base_delay * (2 ** attempt)) + random.uniform(0, 1)
                        print(f"\n[TASK WARN] Rate limit hit, attempt: {attempt + 1}/{max_retries}. Retrying in {wait_time:.2f} seconds...")
                        time.sleep(wait_time)
                    else:
                        print(f"\n[TASK ERROR] Max retries reached: {max_retries}")
                    
        if not batch_results or len(batch_results) != len(batch):
            print(f"\n[TASK WARN] jump batch of {len(batch)} comments.")
            return
        
        # Salva os resultados no banco de dados
        for comment_data, analysis in zip(batch, batch_results):
            try:
                # Garante que o nível de confiança (trust) seja um número decimal float
                try:
                    trust_value = float(analysis.get("trust", 0.0))
                except (ValueError, TypeError):
                    trust_value = 0.0
                
                # Instancia o modelo do SQLModel
                new_comment_db = YouTubeComments(
                    video_id=selected_video_id,
                    video_title=selected_title,
                    channel=selected_channel,
                    author=comment_data.get('author', 'N/A'),
                    comment=comment_data.get('text', ''),
                    sentiment=analysis.get("sentiment", "N/A"),
                    trust_value=trust_value,
                    reason=analysis.get("reason", "N/A"),
                    analysis_result=analysis
                )
                db_session.add(new_comment_db)
            
            except Exception as e:
                print(f"[TASK ERROR] Error preparing comment for the database.: {e}")
                continue
        #comita o lote atual no banco
        try:
            db_session.commit()
        except Exception as e:
            print(f"[TASK ERROR] Error committing batch to the database: {e}")
            db_session.rollback()

    print(f"\n[TASK SUCCESS] Analysis of theme: '{theme}' completed.")


# --- Dependência para gerar rotas ---

async def get_current_user(token:str = Depends(oauth_scheme), session: Session = Depends(get_session)):
    """
        Esta função interrompe a requisição, lê o JWT do header,
        valida e retorna o usuário do banco de dados.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Decodifica o token
        payload = jwt.decode(token, key=SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # Busca o usuario no banco usando o token
    # Converte a string em uuid, pois o SQLModel só permite assim
    try:
        user_uuid = uuid.UUID(user_id)
        user = session.get(Users, user_uuid)
    except ValueError:
        raise credentials_exception

    if user is None:
        raise credentials_exception
    return user

# --- ROTAS DE AUTENTICAÇÃO ---
from pydantic import BaseModel # uso do pydantic para validação dos dados

class UserCreate(BaseModel):
    name: str
    nickname: str
    email: str
    password: str

class UserPublic(BaseModel):
    name: str
    nickname: str
    email: str
    plan_type: PlanType

# Rota de cadastro
@app.post("/auth/register", status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, session: Session = Depends(get_session)):
    # verifica se o email ou nickname já existe
    existing_user = session.exec(
        select(Users).where(
            or_(
                Users.email == user_data.email,
                Users.nickname == user_data.nickname
            )
        )
    ).first()

    if existing_user:
        raise HTTPException(status_code=400, detail="Email or nickname already exists.")

    # Salva com a senha hasheada
    hashed = get_password_hash(user_data.password)
    new_user = Users(
        name=user_data.name,
        nickname=user_data.nickname, 
        email=user_data.email, 
        password=hashed, 
        plan_type=PlanType.FREE
        )

    session.add(new_user)
    try:
        session.commit()
    except IntegrityError as e:
        session.rollback()
        raise HTTPException(status_code=400, detail=f"Email or nickname already exists. {e}")
    return {"message": "User created successfully!"}

# Rota de login
@app.post("/auth/login", status_code=status.HTTP_200_OK)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    session: Session = Depends(get_session)
    ):
    """
        OAuth2PasswordRequestForm espera que o front-end envie 'username' e 'password'
        como form-data (e não como JSON). Vamos usar o campo 'username' para o email.
    """
    statement = select(Users).where(Users.email == form_data.username)
    user = session.exec(statement).first()

    if not user or not verify_password(form_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail or password is incorrect",
            headers={"WWW-Authenticate": "Bearer"},
        )

        # Gera o token guardando o ID do usuário (como string) no campo "sub" (subject)
    access_token = create_access_token(data={"sub": str(user.id)})

    # O FastAPI (e o padrão OAuth2) exige que o retorno tenha exatamente este formato:
    return {"access_token": access_token, "token_type": "bearer"}

# Rota para obter o usuário autenticado
@app.get("/auth/me", response_model=UserPublic)
async def get_me(current_user: Users = Depends(get_current_user)):
    return UserPublic(
        name=current_user.name,
        nickname=current_user.nickname,
        email=current_user.email,
        plan_type=current_user.plan_type,
    )

# --- ROTAS DE API ---

@app.post("/api/analyze")
async def analyze_video(
    theme: str, 
    background_tasks: BackgroundTasks, 
    current_user: Users = Depends(get_current_user), # <-- Mágica acontece aqui
    session: Session = Depends(get_session)
):

    
    # 2. Verificar limite de uso diário
    if current_user.plan_type == PlanType.FREE:
        forty_eight_hours_ago = datetime.now(timezone.utc) - timedelta(hours=48)

        # Query para contar quantidade de pesquisas recentes
        statement = select(SearchHistory).where(
            SearchHistory.user_id == current_user.id,
            SearchHistory.created_at >= forty_eight_hours_ago
        )
        recent_searches = session.exec(statement).all()

        if len(recent_searches) >= 2:
            raise HTTPException(
                status_code=403,
                detail="You have reached the limit of 2 surveys, please wait 48 hours."
                )
        pass
        
    # 3. Registra nova pesquisa
    new_search = SearchHistory(query=theme, user_id=current_user.id)
    session.add(new_search)
    session.commit()
    
    # 4. Dispara a análise pesada
    background_tasks.add_task(run_analysis_task, theme, current_user.id)
    
    return {
        "message": f"Analysis started for theme '{theme}'.", 
        "plan": current_user.plan_type,
        "status": "processing"
    }
    

@app.get("/analysis/results/{video_id}")
# Retorna os resultados das análises para um vídeo específico
async def get_analysis_results(video_id: str, session: Session = Depends(get_session)):
    # Consulta no banco de daddos com SQLModel
    statement = select(YouTubeComments).where(YouTubeComments.video_id == video_id)
    results = session.exec(statement).all()

    # Se não encontrar nada a tarefa pode estar rodando ou o vídeo não existe/deletado
    if not results:
        return {
            "status": "processing_or_not_found",
            "message": "Analysis is still processing or video not found. Please check back later.",
            "data": []
        }

    # Se encontrar retorna os dados completos
    return{
        "status": "completed",
        "video_id": video_id,
        "message": f"Analysis completed for video_id '{video_id}'.",
        "data": results
    }
