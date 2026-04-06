import os
from sqlmodel import SQLModel, create_engine, Session
from dotenv import load_dotenv

load_dotenv()
DB = os.getenv('POSTGRES_URL')

# echo=True para debug, mostra as queries SQL no console python
engine = create_engine(DB, echo=True)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

# Dependency para o FastAPI injetar a sessão do banco de dados nas rotas
def get_session():
    with Session(engine) as session:
        yield session
            
