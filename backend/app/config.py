import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./procurement.db")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "sih26032_secret_key_super_secure_987654321")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
    MOCK_SMS_ENABLED: bool = True

    class Config:
        env_file = ".env"

settings = Settings()
