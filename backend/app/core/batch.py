import asyncio
import csv
import io
import logging
import tempfile
from pathlib import Path

from sqlalchemy import update

from app.core.config import settings
from app.core.database import async_session
from app.core.engine_factory import get_engine
from app.models import BatchJob, SentimentResultRecord

logger = logging.getLogger(__name__)

MAX_CONCURRENCY = 10


async def _predict_one(semaphore: asyncio.Semaphore, engine, text: str) -> SentimentResultRecord:
    """Run a single prediction with concurrency control."""
    async with semaphore:
        result = await engine.predict(text)
        return SentimentResultRecord(
            text=text,
            label=result.label,
            score=result.score,
            engine_used=result.engine_used,
        )


def _count_rows(path: Path) -> int:
    """Count valid text rows without loading the whole file into memory."""
    count = 0
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row.get("text", "").strip():
                count += 1
    return count


def _stream_rows(path: Path, chunk_size: int):
    """Yield chunks of text rows from a CSV file on disk."""
    chunk: list[str] = []
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f)
        for row in reader:
            text = row.get("text", "").strip()
            if text:
                chunk.append(text)
                if len(chunk) >= chunk_size:
                    yield chunk
                    chunk = []
    if chunk:
        yield chunk


async def process_batch(file_bytes: bytes, engine_type: str, job_id: str) -> None:
    """Background task: stream CSV from disk, analyze in chunks, bulk-insert results.

    Writes the uploaded bytes to a temp file first so arbitrarily large CSVs
    (GB-scale) never need to fit entirely in memory during inference.
    """
    logger.info("Batch job %s started (engine=%s, %d bytes)", job_id, engine_type, len(file_bytes))

    # Write to temp file so we can stream rows without holding everything in RAM
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".csv")
    tmp_path = Path(tmp.name)
    try:
        tmp.write(file_bytes)
        tmp.close()

        total = _count_rows(tmp_path)
        file_mb = len(file_bytes) / (1024 * 1024)
        logger.info("Batch job %s: %d rows, %.1f MB", job_id, total, file_mb)

        async with async_session() as session:
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
            semaphore = asyncio.Semaphore(MAX_CONCURRENCY)
            processed = 0

            try:
                for chunk in _stream_rows(tmp_path, chunk_size):
                    records = await asyncio.gather(
                        *[_predict_one(semaphore, engine, text) for text in chunk]
                    )

                    session.add_all(records)
                    processed += len(chunk)

                    await session.execute(
                        update(BatchJob)
                        .where(BatchJob.job_id == job_id)
                        .values(processed_rows=processed)
                    )
                    await session.commit()

                    logger.info(
                        "Batch job %s: %d / %d rows (%.1f%%)",
                        job_id, processed, total, (processed / total) * 100,
                    )

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

        logger.info("Batch job %s completed (%d rows, %.1f MB)", job_id, total, file_mb)

    finally:
        tmp_path.unlink(missing_ok=True)
