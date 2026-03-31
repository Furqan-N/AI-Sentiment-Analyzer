from datetime import datetime

from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=1, description="The text to analyze for sentiment.")
    engine_type: str = Field(
        default="vader",
        pattern="^(vader|transformer|roberta|ensemble)$",
        description="The engine to use: 'vader', 'transformer', 'roberta', or 'ensemble'.",
    )


class AnalyzeResponse(BaseModel):
    label: str
    score: float
    engine_used: str


class AnalyzeResponseWithTimestamp(AnalyzeResponse):
    id: int
    text: str
    created_at: datetime

    model_config = {"from_attributes": True}


class BatchResponse(BaseModel):
    job_id: str
    status: str
    message: str


class BatchJobStatus(BaseModel):
    job_id: str
    status: str
    total_rows: int
    processed_rows: int
    engine_type: str
    error_message: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
