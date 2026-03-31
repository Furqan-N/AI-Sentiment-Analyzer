from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/sentiment_db"
    batch_chunk_size: int = 500
    db_pool_size: int = 20
    db_max_overflow: int = 10

    model_config = {"env_prefix": "SENTIMENT_"}


settings = Settings()
