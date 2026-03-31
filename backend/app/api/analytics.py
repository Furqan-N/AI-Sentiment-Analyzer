from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.analytics import get_sentiment_summary, get_sentiment_trends

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/summary")
async def summary(db: AsyncSession = Depends(get_db)):
    return await get_sentiment_summary(db)


@router.get("/trends")
async def trends(db: AsyncSession = Depends(get_db)):
    return await get_sentiment_trends(db)
