import csv
import io
import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import async_session
from app.core.engine_factory import get_engine
from app.models import SentimentResultRecord

logger = logging.getLogger(__name__)


async def process_batch(file_bytes: bytes, engine_type: str, job_id: str) -> None:
    """Background task: read CSV, analyze in chunks, bulk-insert results."""
    logger.info("Batch job %s started (engine=%s)", job_id, engine_type)

    decoded = file_bytes.decode("utf-8")
    reader = csv.DictReader(io.StringIO(decoded))

    rows: list[str] = []
    for row in reader:
        text = row.get("text", "").strip()
        if text:
            rows.append(text)

    if not rows:
        logger.warning("Batch job %s: CSV contained no valid 'text' rows", job_id)
        return

    engine = get_engine(engine_type)
    chunk_size = settings.batch_chunk_size
    total = len(rows)
    processed = 0

    async with async_session() as session:
        for i in range(0, total, chunk_size):
            chunk = rows[i : i + chunk_size]
            records: list[SentimentResultRecord] = []

            for text in chunk:
                result = await engine.predict(text)
                records.append(
                    SentimentResultRecord(
                        text=text,
                        label=result.label,
                        score=result.score,
                        engine_used=result.engine_used,
                    )
                )

            session.add_all(records)
            await session.commit()

            processed += len(chunk)
            logger.info("Batch job %s: %d / %d rows processed", job_id, processed, total)

    logger.info("Batch job %s completed (%d rows)", job_id, total)
