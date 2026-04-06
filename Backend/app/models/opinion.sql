create database if not exists opinion;
use opinion;

create table if not exists users(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    nickname VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    plan_type Enum("Free", "Basic", "Premium") NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

create table if not exists search_history(
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

create table if not exists youtube_comments(
    id SERIAL PRIMARY KEY,
    video_id VARCHAR(50) NOT NULL,
    video_title TEXT,
    channel VARCHAR(255),
    author VARCHAR(255), 
    comment TEXT
    sentiment VARCHAR(50),
    trust FLOAT,
    reason TEXT,
    analysis_result JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);