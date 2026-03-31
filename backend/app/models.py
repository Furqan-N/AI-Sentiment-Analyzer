from datetime import datetime

from sqlalchemy import Index, String, Float, Integer, DateTime, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class SentimentResultRecord(Base):
    __tablename__ = "sentiment_results"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    text: Mapped[str] = mapped_column(String, nullable=False)
    label: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    score: Mapped[float] = mapped_column(Float, nullable=False)
    engine_used: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    __table_args__ = (
        # Composite index for analytics trend queries (GROUP BY hour, label WHERE created_at >= ...)
        Index("ix_sentiment_created_label", "created_at", "label"),
        # Composite index for filtered queries by engine + label
        Index("ix_sentiment_engine_label", "engine_used", "label"),
    )


class BatchJob(Base):
    __tablename__ = "batch_jobs"

    job_id: Mapped[str] = mapped_column(String(12), primary_key=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending", index=True)
    total_rows: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    processed_rows: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    engine_type: Mapped[str] = mapped_column(String(20), nullable=False, default="vader")
    error_message: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
