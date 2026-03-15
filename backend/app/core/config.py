from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/sentiment_db"
    batch_chunk_size: int = 50

    model_config = {"env_prefix": "SENTIMENT_"}


settings = Settings()
