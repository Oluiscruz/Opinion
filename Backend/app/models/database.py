import os
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from dotenv import load_dotenv

load_dotenv()
DB_URL = os.getenv('MONGO_URL') # String de conexão.

async def init_db():
    # Inicializa o Beanie usando a connection string para evitar incompatibilidades
    # entre versões do Motor/PyMongo e o método internals do Beanie
    from .model import Users, SearchHistory, YouTubeComments

    await init_beanie(connection_string=DB_URL, document_models=[Users, SearchHistory, YouTubeComments])