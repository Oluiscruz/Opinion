# model.py
from enum import Enum
from typing import Optional
from datetime import datetime, timezone
from pydantic import Field
from beanie import Document, Indexed
import uuid

# Classe dos tipos de planos de assinatura
class PlanType(str, Enum):
    FREE = "free"
    BASIC = "basic"
    PREMIUM = "premium"

# 1. Coleção de Usuários
class Users(Document):
    # O Beanie cria um _id automaticamente, mas podemos forçar o uso do UUID como você fez
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    name: str
    nickname: Indexed(str, unique=True) # Indexed cria os índices no MongoDB
    email: Indexed(str, unique=True)
    password: str
    plan_type: PlanType = PlanType.FREE
    is_admin: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "users" # Nome da collection no banco

# 2. Coleção de Histórico de Pesquisas
class SearchHistory(Document):
    query: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    user_id: Optional[uuid.UUID] = None
    ip: Optional[str] = None
    video_id: Optional[str] = None

    class Settings:
        name = "search_history"

# 3. Coleção de Comentários do YouTube
class YouTubeComments(Document):
    video_id: str
    video_title: Optional[str] = None
    channel: Optional[str] = None
    author: Optional[str] = None
    comment: str
    sentiment: Optional[str] = None
    trust_value: Optional[float] = None
    reason: Optional[str] = None
    analysis_result: dict = Field(default_factory=dict) # JSON nativo
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "youtube_comments"
        