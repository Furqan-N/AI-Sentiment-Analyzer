from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import SentimentResultRecord


async def get_sentiment_summary(db: AsyncSession) -> dict:
    """Return total count per sentiment label and overall average confidence."""
    # Count per label
    label_query = (
        select(
            SentimentResultRecord.label,
            func.count().label("count"),
        )
        .group_by(SentimentResultRecord.label)
    )
    label_rows = (await db.execute(label_query)).all()

    counts = {row.label: row.count for row in label_rows}

    # Average confidence
    avg_query = select(func.avg(SentimentResultRecord.score))
    avg_score = (await db.execute(avg_query)).scalar()

    return {
        "total": sum(counts.values()),
        "per_label": counts,
        "average_confidence": round(avg_score, 4) if avg_score is not None else 0.0,
    }


async def get_sentiment_trends(db: AsyncSession) -> list[dict]:
    """Return hourly record counts for the last 7 days."""
    since = datetime.now(timezone.utc) - timedelta(days=7)

    query = (
        select(
            func.date_trunc("hour", SentimentResultRecord.created_at).label("hour"),
            SentimentResultRecord.label,
            func.count().label("count"),
        )
        .where(SentimentResultRecord.created_at >= since)
        .group_by("hour", SentimentResultRecord.label)
        .order_by("hour")
    )
    rows = (await db.execute(query)).all()

    return [
        {
            "hour": row.hour.isoformat(),
            "label": row.label,
            "count": row.count,
        }
        for row in rows
    ]
