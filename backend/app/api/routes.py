import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.schemas import AnalyzeRequest, AnalyzeResponseWithTimestamp, BatchJobStatus, BatchResponse
from app.core.engine_factory import get_engine
from app.core.database import get_db
from app.core.batch import process_batch
from app.models import BatchJob, SentimentResultRecord

router = APIRouter()


@router.post("/analyze", response_model=AnalyzeResponseWithTimestamp)
async def analyze_sentiment(
    request: AnalyzeRequest,
    db: AsyncSession = Depends(get_db),
) -> AnalyzeResponseWithTimestamp:
    try:
        engine = get_engine(request.engine_type)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    result = await engine.predict(request.text)

    record = SentimentResultRecord(
        text=request.text,
        label=result.label,
        score=result.score,
        engine_used=result.engine_used,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)

    return AnalyzeResponseWithTimestamp.model_validate(record)


@router.post("/analyze/batch", response_model=BatchResponse)
async def analyze_batch(
    file: UploadFile,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    engine_type: str = Query(
        default="vader",
        pattern="^(vader|transformer)$",
        description="The engine to use for all rows.",
    ),
) -> BatchResponse:
    if file.content_type not in ("text/csv", "application/vnd.ms-excel"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted.")

    file_bytes = await file.read()
    job_id = uuid.uuid4().hex[:12]

    # Create the batch job record before enqueuing
    job = BatchJob(job_id=job_id, status="pending", engine_type=engine_type)
    db.add(job)
    await db.commit()

    background_tasks.add_task(process_batch, file_bytes, engine_type, job_id)

    return BatchResponse(
        job_id=job_id,
        status="pending",
        message=f"Batch job {job_id} queued. Results will be saved to the database.",
    )


@router.get("/analyze/batch/{job_id}", response_model=BatchJobStatus)
async def get_batch_status(
    job_id: str,
    db: AsyncSession = Depends(get_db),
) -> BatchJobStatus:
    result = await db.execute(select(BatchJob).where(BatchJob.job_id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail=f"Batch job '{job_id}' not found.")
    return BatchJobStatus.model_validate(job)
