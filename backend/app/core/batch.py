import csv
import io
import logging

from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import async_session
from app.core.engine_factory import get_engine
from app.models import BatchJob, SentimentResultRecord

logger = logging.getLogger(__name__)


async def process_batch(file_bytes: bytes, engine_type: str, job_id: str) -> None:
    """Background task: read CSV, analyze in chunks, bulk-insert results, track progress."""
    logger.info("Batch job %s started (engine=%s)", job_id, engine_type)

    decoded = file_bytes.decode("utf-8")
    reader = csv.DictReader(io.StringIO(decoded))

    rows: list[str] = []
    for row in reader:
        text = row.get("text", "").strip()
        if text:
            rows.append(text)

    total = len(rows)

    async with async_session() as session:
        # Update job with total row count and set to processing
        await session.execute(
            update(BatchJob)
            .where(BatchJob.job_id == job_id)
            .values(status="processing", total_rows=total)
        )
        await session.commit()

        if not total:
            logger.warning("Batch job %s: CSV contained no valid 'text' rows", job_id)
            await session.execute(
                update(BatchJob)
                .where(BatchJob.job_id == job_id)
                .values(status="completed", total_rows=0, processed_rows=0)
            )
            await session.commit()
            return

        engine = get_engine(engine_type)
        chunk_size = settings.batch_chunk_size
        processed = 0

        try:
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
                processed += len(chunk)

                await session.execute(
                    update(BatchJob)
                    .where(BatchJob.job_id == job_id)
                    .values(processed_rows=processed)
                )
                await session.commit()

                logger.info("Batch job %s: %d / %d rows processed", job_id, processed, total)

            # Mark completed
            await session.execute(
                update(BatchJob)
                .where(BatchJob.job_id == job_id)
                .values(status="completed")
            )
            await session.commit()

        except Exception as exc:
            logger.error("Batch job %s failed: %s", job_id, exc)
            await session.execute(
                update(BatchJob)
                .where(BatchJob.job_id == job_id)
                .values(status="failed", error_message=str(exc)[:500])
            )
            await session.commit()

    logger.info("Batch job %s completed (%d rows)", job_id, total)
