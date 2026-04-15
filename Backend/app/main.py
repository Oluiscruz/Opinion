import os
import random
import time
import uuid

from dotenv import load_dotenv
from datetime import timedelta, timezone, datetime
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from app.models.database import init_db
from pymongo import MongoClient

from jose import JWTError, jwt
from app.auth.auth import get_password_hash, verify_password, create_access_token, oauth_scheme, SECRET_KEY, ALGORITHM
from app.models.model import PlanType, SearchHistory, Users, YouTubeComments
from app.clients.ia_analyser import OpiAnalyser
from app.clients.youtube_extractor import YoutubeExtractor
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
async def on_startup():
    await init_db()


# Função para dividir a lista de comments em pequenos pedaços
def chunck_list(data, size):
    for i in range(0, len(data), size):
        yield data[i:i+size]


# Função que roda as análises em background, para não travar a resposta da API    
def run_analysis_task(theme: str, user_id: Optional[uuid.UUID], search_id: Optional[str] = None):
    print(f"[TASK START] Running background task for theme: '{theme}'")
    
    """Esta função roda em lógica assícrona, porém, as APIS do youtube e do
    gemini são síncronas, então a função inteira é síncrona. Para evitar problemas de concorrência
    com o banco de dados, ela cria uma conexão exclusiva para esta thread usando MongoClient do pymongo"""
    
    # 1. Configura a conexão síncrona exclusiva para esta thread 
    client = MongoClient(os.getenv('MONGO_URL'))
    
    # 2. Acessa o banco e a collection correspondente ao Beanie
    db = client.opynion
    collection = db.youtube_comments
    
    extractor = YoutubeExtractor(YOUTUBE_API_KEY)
    analyser = OpiAnalyser(GEMINI_API_KEY)
    
    videos_found = extractor.search_videos(theme, max_results=5)
    if not videos_found:
        print("\n[TASK END] No videos found")
        return
    
    selected_video_id = videos_found[0]['video_id']
    selected_channel = videos_found[0]['channel']
    selected_title = videos_found[0]['title']
    
    # Atualiza o SearchHistory com o video_id encontrado
    if search_id:
        try:
            search_db = client.opynion.search_history
            search_db.update_one({"_id": search_id}, {"$set": {"video_id": selected_video_id}})
        except Exception as e:
            print(f"[TASK WARN] Could not update search video_id: {e}")
    
    print(f"\n[TASK INFO] Analyzing video: '{selected_title}'")
    
    comments = extractor.get_comments(selected_video_id, max_results_per_page=50, max_pages=1)
    # max_results_per_page=50 para evitar sobrecarregar a API do YouTube e reduzir risco de rate limit
    if not comments:
        print("\n[TASK END] No comments found or error in extraction")
        client.close()
        return
    
    batch_size = 10
    
    # abre uma nova sessão do banco de dados para a tarefa em background
    for batch in chunck_list(comments, batch_size):
        texts_to_analyse = [str(c) for c in batch]
        max_retries = 5
        base_delay = 2
        batch_results = None

        for attempt in range(max_retries):
            try:
                batch_results = analyser.analyse_sentiment(texts_to_analyse)
                break
            except Exception as e:
                error_text = str(e).lower()
                is_rate_limit = any(token in error_text for token in [
                    "429", "503", "rate", "quota", "resource_exhausted", "too many requests", "unavailable", "high demand"
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
            continue

        # Salva os resultados no banco de dados
        documents_to_insert = []
        for comment_data, analysis in zip(batch, batch_results):
            try:
                try:
                    trust_value = float(analysis.get("trust", 0.0))
                except (ValueError, TypeError):
                    trust_value = 0.0

                new_comment_doc = YouTubeComments(
                    video_id=selected_video_id,
                    video_title=selected_title,
                    channel=selected_channel,
                    author=comment_data.get('author', 'N/A'),
                    comment=comment_data.get('text', ''),
                    sentiment=analysis.get("sentiment", "N/A"),
                    trust_value=trust_value,
                    reason=analysis.get("reason", "N/A"),
                    analysis_result=analysis,
                    created_at=datetime.now(timezone.utc)
                )
                documents_to_insert.append(new_comment_doc.model_dump(exclude={"id"}))
            except Exception as e:
                print(f"[TASK ERROR] Error preparing comment for the database.: {e}")
                continue

        if documents_to_insert:
            try:
                collection.insert_many(documents_to_insert)
                print(f"[TASK INFO] Inserted batch of {len(documents_to_insert)} comments.")
            except Exception as e:
                print(f"[TASK ERROR] Error inserting batch to MongoDB: {e}")


    print(f"\n[TASK SUCCESS] Analysis of theme: '{theme}' completed.")

    client.close()  


# --- Dependência para gerar rotas ---

async def get_current_user(token:str = Depends(oauth_scheme)):
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
        user = await Users.find_one(Users.id == user_uuid)
    except ValueError:
        raise credentials_exception

    if user is None:
        raise credentials_exception
    return user


async def get_optional_user(request: Request):
    """
        Dependency that returns the authenticated user or None if no valid token provided.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return None
    parts = auth_header.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    token = parts[1]

    try:
        payload = jwt.decode(token, key=SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
    except JWTError:
        return None

    try:
        user_uuid = uuid.UUID(user_id)
        user = await Users.find_one(Users.id == user_uuid)
    except Exception:
        return None

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
async def register(user_data: UserCreate):
    # verifica se o email ou nickname já existe
    existing_user = await Users.find_one(
        {"$or": [
            {"email": user_data.email},
            {"nickname": user_data.nickname}
        ]}
    )
    
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
    
    await new_user.insert() # Salva no MongoDB usando Beanie
    return {"message": "User created successfully."}

# Rota de login
@app.post("/auth/login", status_code=status.HTTP_200_OK)
async def login( form_data: OAuth2PasswordRequestForm = Depends() ):
    # Busca o usuário pelo email (que é o username nesse caso)
    user = await Users.find_one(Users.email == form_data.username)

    if not user or not verify_password(form_data.password, user.password):
        raise HTTPException(status_code=400, detail="Incorrect email or password.")

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
    request: Request,
    current_user: Optional[Users] = Depends(get_optional_user),
):

    forty_eight_hours_ago = datetime.now(timezone.utc) - timedelta(hours=48)
    
    # Os administradores estão isentos dos limites de pesquisa.
    adm = getattr(current_user, "is_admin", False)
    print(f"[DEBUG] user={getattr(current_user, 'email', None)} is_admin={adm} plan={getattr(current_user, 'plan_type', None)}")

    # Autenticado: mantém a lógica existente (limite por plano free)
    if current_user:
        if not adm and current_user.plan_type == PlanType.FREE:
            recent_search_count = await SearchHistory.find(
                SearchHistory.user_id == current_user.id,
                SearchHistory.created_at >= forty_eight_hours_ago
            ).count()

            if recent_search_count >= 2:
                raise HTTPException(
                    status_code=429,
                    detail="Daily limit of 2 searches reached for free plan. Please upgrade to Basic or Premium for more usage.",
                )

        # Registra pesquisa ligada ao usuário
        new_search = SearchHistory(query=theme, user_id=current_user.id)
        await new_search.insert()
        background_tasks.add_task(run_analysis_task, theme, current_user.id, str(new_search.id))

        return {
            "message": f"Analysis started for theme '{theme}'.",
            "search_id": str(new_search.id),
            "plan": current_user.plan_type,
            "status": "processing",
        }

    # Não autenticado: limita por IP (2 pesquisas a cada 48 horas)
    # Tenta obter IP real via X-Forwarded-For, senão usa request.client.host
    xff = request.headers.get("X-Forwarded-For")
    if xff:
        ip = xff.split(",")[0].strip()
    else:
        ip = request.client.host if request.client else None

    recent_search_count = await SearchHistory.find(
        SearchHistory.ip == ip,
        SearchHistory.created_at >= forty_eight_hours_ago,
    ).count()

    if recent_search_count >= 2:
        raise HTTPException(
            status_code=429,
            detail="Limit of 2 searches reached for anonymous users. Please log in to continue.",
        )

    new_search = SearchHistory(query=theme, user_id=None, ip=ip)
    await new_search.insert()
    background_tasks.add_task(run_analysis_task, theme, None, str(new_search.id))

    return {
        "message": f"Analysis started for theme '{theme}'.",
        "search_id": str(new_search.id),
        "plan": "anonymous",
        "status": "processing",
    }
    

@app.get("/analysis/status/{search_id}")
async def get_analysis_status(search_id: str):
    try:
        from beanie import PydanticObjectId
        search = await SearchHistory.get(PydanticObjectId(search_id))
    except Exception:
        raise HTTPException(status_code=404, detail="Search not found")

    if not search or not search.video_id:
        return {"status": "processing", "video_id": None}

    count = await YouTubeComments.find(YouTubeComments.video_id == search.video_id).count()
    if count == 0:
        return {"status": "processing", "video_id": search.video_id}

    return {"status": "completed", "video_id": search.video_id}


@app.get("/analysis/results/{video_id}")
async def get_analysis_results(video_id: str):
    
    # Consulta no banco de daddos com Beanie para encontrar os comentários analisados daquele vídeo
    results = await YouTubeComments.find(YouTubeComments.video_id == video_id).to_list()

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
