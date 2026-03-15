# Re-Anchor Document: AI Sentiment Analyzer

**Last Updated:** 2026-03-15
**Transfer:** Claude Code (Opus 4.6) → Gemini
**Project Root:** `C:\Users\Chess Master\AI-Sentiment-Analyzer`

---

## 1. Project Goal

Build a **production-grade AI Sentiment Analyzer** with a FastAPI backend that supports multiple ML engines via the Strategy Pattern, persists all results to PostgreSQL, and handles large-scale CSV batch processing asynchronously.

---

## 2. Completed Phases

### Phase 1: Core Engines (Done)

Scaffolded the backend with two pluggable sentiment engines and a single `/analyze` endpoint.

### Phase 2: Persistence & Batch Processing (Done)

Added PostgreSQL integration, auto-persists every analysis result, and a `POST /analyze/batch` endpoint that processes CSV files in the background.

---

## 3. Directory Structure

```
backend/
├── main.py                          # FastAPI app + lifespan (auto-creates DB tables)
├── requirements.txt                 # All Python dependencies
└── app/
    ├── __init__.py
    ├── models.py                    # SQLAlchemy SentimentResultRecord table
    ├── api/
    │   ├── __init__.py
    │   └── routes.py                # POST /analyze, POST /analyze/batch
    ├── core/
    │   ├── __init__.py
    │   ├── config.py                # pydantic-settings: DB URL, batch chunk size
    │   ├── database.py              # Async SQLAlchemy engine + session factory
    │   ├── schemas.py               # Pydantic request/response models
    │   ├── engine_factory.py        # Maps engine_type string → engine singleton
    │   └── batch.py                 # Background CSV processing logic
    └── engines/
        ├── __init__.py              # Re-exports VaderEngine, TransformerEngine
        ├── base.py                  # ABC SentimentEngine + SentimentResult dataclass
        ├── vader_engine.py          # VADER rule-based engine
        └── transformer_engine.py    # HuggingFace DistilBERT engine
```

---

## 4. Dependencies (`requirements.txt`)

```
fastapi>=0.110.0
uvicorn[standard]>=0.29.0
pydantic>=2.0.0
pydantic-settings>=2.0.0
vaderSentiment>=3.3.2
transformers>=4.40.0
torch>=2.0.0
sqlalchemy[asyncio]>=2.0.0
asyncpg>=0.29.0
python-multipart>=0.0.9
```

---

## 5. Architecture & Key Design Decisions

### Strategy Pattern (Phase 1)

- **`SentimentEngine`** (`app/engines/base.py`): Abstract base class — `async predict(text: str) -> SentimentResult`.
- **`SentimentResult`**: Dataclass with fields `label`, `score`, `engine_used`.
- **`VaderEngine`** (`app/engines/vader_engine.py`): Uses `vaderSentiment`. Compound score thresholds: ≥0.05 → Positive, ≤-0.05 → Negative, else Neutral. Score = `abs(compound)`.
- **`TransformerEngine`** (`app/engines/transformer_engine.py`): HuggingFace `pipeline("sentiment-analysis")` with `distilbert-base-uncased-finetuned-sst-2-english`. Score = model confidence.
- **Engine Factory** (`app/core/engine_factory.py`): Dict maps `"vader"` / `"transformer"` to singleton instances. `get_engine()` returns engine or raises `ValueError`.

### Database Layer (Phase 2)

- **Config** (`app/core/config.py`): `pydantic-settings` `Settings` class. DB URL and `batch_chunk_size` (default 50) overridable via `SENTIMENT_` prefixed env vars.
- **Database** (`app/core/database.py`): Async SQLAlchemy engine + `async_sessionmaker`. `get_db()` is a FastAPI dependency yielding an `AsyncSession`.
- **Model** (`app/models.py`): `SentimentResultRecord` table with columns: `id` (PK, autoincrement), `text`, `label`, `score`, `engine_used`, `created_at` (server-side `now()`).
- **Lifespan** (`main.py`): On startup, `Base.metadata.create_all` auto-creates tables. On shutdown, disposes the engine.

### Batch Processing (Phase 2)

- **`POST /analyze/batch`** (`app/api/routes.py`): Accepts a CSV file upload + `engine_type` query param. Validates content type, reads bytes, generates a job ID (12-char hex), and enqueues `process_batch` via `BackgroundTasks`.
- **`process_batch()`** (`app/core/batch.py`): Decodes CSV, extracts `text` column, chunks rows by `batch_chunk_size` (default 50), runs the engine on each row, bulk-inserts per chunk with a commit after each chunk. Logs progress.

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Returns `{"status": "ok"}` |
| `POST` | `/analyze` | Single text analysis. Persists to DB. Returns result with `id` and `created_at`. |
| `POST` | `/analyze/batch` | CSV upload. Background processing. Returns `job_id`, `status`, `message`. |

### Async / Performance

- Both engines use `asyncio.to_thread()` for non-blocking ML inference.
- `@lru_cache(maxsize=1)` lazily loads each model on first call.
- Batch processing commits per chunk to avoid holding a single massive transaction.

### Validation

- `text`: non-empty (`min_length=1`).
- `engine_type`: regex `^(vader|transformer)$`, defaults to `"vader"`.
- Batch CSV upload: content type must be `text/csv` or `application/vnd.ms-excel`.

### Response Schemas

**Single analysis (`POST /analyze`):**
```json
{
  "label": "Positive | Negative | Neutral",
  "score": 0.6239,
  "engine_used": "vader",
  "id": 1,
  "created_at": "2026-03-15T10:30:00Z"
}
```

**Batch (`POST /analyze/batch`):**
```json
{
  "job_id": "a1b2c3d4e5f6",
  "status": "processing",
  "message": "Batch job a1b2c3d4e5f6 queued. Results will be saved to the database."
}
```

---

## 6. How to Run

### Prerequisites

A running PostgreSQL instance. Override the default connection string:
```bash
export SENTIMENT_DATABASE_URL="postgresql+asyncpg://user:pass@localhost:5432/sentiment_db"
```

Default: `postgresql+asyncpg://postgres:postgres@localhost:5432/sentiment_db`

### Start the Server

```bash
cd "C:\Users\Chess Master\AI-Sentiment-Analyzer\backend"
pip install -r requirements.txt
python main.py
# Server starts on http://0.0.0.0:8000
# Tables auto-created on startup
```

### Test Requests

**Single analysis:**
```bash
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "This product is amazing!", "engine_type": "vader"}'
```

**Batch CSV upload:**
```bash
curl -X POST "http://localhost:8000/analyze/batch?engine_type=vader" \
  -F "file=@reviews.csv"
```

CSV format (must have a `text` column header):
```csv
text
"This product is amazing!"
"Terrible experience, would not recommend."
```

---

## 7. What Has NOT Been Done

- [ ] **Frontend** — No UI exists yet.
- [ ] **Tests** — No unit or integration tests.
- [ ] **Docker / Containerization** — No Dockerfile or docker-compose.
- [ ] **CI/CD** — No GitHub Actions or pipeline config.
- [ ] **CORS middleware** — Not configured (needed if a frontend will call the API).
- [ ] **Global error handling** — Only basic ValueError catch; no middleware-level exception handler.
- [ ] **Git** — The repository has not been initialized.
- [ ] **Batch job status tracking** — No endpoint to query job progress (job_id is fire-and-forget for now).
- [ ] **Dependency installation** — `pip install -r requirements.txt` has not been run yet.

---

## 8. Conventions

- Python 3.10+ type hints throughout.
- Pydantic v2 for request/response validation. `from_attributes = True` for ORM → schema conversion.
- SQLAlchemy 2.0 async style with `mapped_column` and `Mapped` type annotations.
- Abstract base class pattern (not Protocol) for engine interface.
- Module-level `@lru_cache` for singleton model loading.
- All inference is async-safe via `asyncio.to_thread()`.
- Environment config via `pydantic-settings` with `SENTIMENT_` prefix.
- Flat imports in `app/engines/__init__.py` for convenience.
