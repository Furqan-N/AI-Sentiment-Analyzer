"""Seed the database with ~50 fake sentiment records for testing analytics."""

import asyncio
import random
from datetime import datetime, timedelta, timezone

from app.core.database import async_session, engine
from app.models import Base, SentimentResultRecord

LABELS = ["Positive", "Negative", "Neutral"]
ENGINES = ["vader", "transformer"]

SAMPLE_TEXTS = [
    "I love this product, it works great!",
    "Terrible experience, would not recommend.",
    "It's okay, nothing special.",
    "Absolutely fantastic service!",
    "Very disappointed with the quality.",
    "Not bad, but could be better.",
    "The best purchase I've ever made!",
    "Worst customer support ever.",
    "It does what it says, no complaints.",
    "Exceeded all my expectations!",
]


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    now = datetime.now(timezone.utc)

    records = []
    for i in range(50):
        label = random.choice(LABELS)
        score = round(random.uniform(0.50, 0.99), 4)
        engine_used = random.choice(ENGINES)
        text = random.choice(SAMPLE_TEXTS)
        # Spread timestamps across the last 7 days
        created_at = now - timedelta(
            days=random.uniform(0, 7),
            hours=random.uniform(0, 23),
        )
        records.append(
            SentimentResultRecord(
                text=text,
                label=label,
                score=score,
                engine_used=engine_used,
                created_at=created_at,
            )
        )

    async with async_session() as session:
        session.add_all(records)
        await session.commit()

    print(f"Seeded {len(records)} records.")


if __name__ == "__main__":
    asyncio.run(seed())
