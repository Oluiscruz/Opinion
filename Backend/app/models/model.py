from enum import Enum
from typing import List, Optional
from datetime import datetime, timezone
from sqlmodel import SQLModel, Field, Relationship, JSON, Column
import uuid

# class que define os tipos de plano
class PlanType(str, Enum):
    FREE = "free"
    BASIC = "basic"
    PREMIUM = "premium"

# 1. Cria tabela de usuários
class Users(SQLModel, table=True):
    __tablename__ = 'users'
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str = Field(..., nullable=False)
    nickname: str = Field(..., nullable=False, unique=True, index=True)
    email: str = Field(..., index=True, nullable=False, unique=True)
    password: str = Field(..., nullable=False)
    plan_type: PlanType = Field(default=PlanType.FREE)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    searches: List["SearchHistory"] = Relationship(back_populates="user")

# 2. Cria a tabela de histórico de pesquisas
class SearchHistory(SQLModel, table=True):
    __tablename__ = 'search_history'
    
    id: Optional[int] = Field(default=None, primary_key=True)
    query: str = Field(..., nullable=False)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    user_id: uuid.UUID = Field(..., foreign_key="users.id", nullable=False)
    user: Users = Relationship(back_populates="searches")

# 4. tabela de comentários do youtube -> Única API até o momento que armazena os comentários e análises
class YouTubeComments(SQLModel, table=True):
    __tablename__ = 'youtube_comments'
    
    id: Optional[int] = Field(default=None, primary_key=True)
    video_id: str = Field(..., max_length=50)
    video_title: Optional[str] = None
    channel: Optional[str] = None
    author: Optional[str] = None
    comment: str = Field(..., nullable=False)
    sentiment: Optional[str] = None
    trust: Optional[float] = None
    reason: Optional[str] = None
    
    # Armazena o resultado em um JSONB do Postgresql via SQLModel
    analysis_result: dict = Field(default={}, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    