# Re-Anchor Document: AI Sentiment Analyzer

**Last Updated:** 2026-03-31
**Transfer:** Claude Code (Opus 4.6) → Gemini
**Project Root:** `.`

---

## 1. Project Goal

Build a **production-grade AI Sentiment Analyzer** with a FastAPI backend that supports multiple ML engines via the Strategy Pattern, persists all results to PostgreSQL, handles large-scale CSV batch processing asynchronously, and provides a React dashboard for visualization and interaction.

---

## 2. Completed Phases

### Phase 1: Core Engines (Done)

Scaffolded the backend with two pluggable sentiment engines and a single `/analyze` endpoint.

### Phase 2: Persistence & Batch Processing (Done)

Added PostgreSQL integration, auto-persists every analysis result, and a `POST /analyze/batch` endpoint that processes CSV files in the background.

### Phase 3: Analytics Layer (Done)

Added analytics service with summary and time-series trend endpoints. Configured CORS middleware for frontend integration. Created a seed script for test data.

### Phase 4: React Frontend (Done)

Next.js 16 + TypeScript + Tailwind CSS v4 "Mission Control" dashboard. Material Design 3 dark theme (background `#0b1326`, primary `#adc6ff`, secondary `#4edea3`, error `#ff516a`). 4 pages: Overview (stat cards + interactive sandbox + Recharts trend chart + live signal feed), Live Feed (inline analysis with label filters), Historical Analytics (chart + breakdown bars), Model Settings (engine info + system status). Fixed sidebar navigation, top bar with live pulse indicator. All API calls target `http://localhost:8000`.

### Phase 5: Batch Status Tracking & Resilience (Done)

Added `BatchJob` database model to track batch processing jobs with status lifecycle (`pending` → `processing` → `completed` / `failed`), row-level progress, and error capture. Refactored `process_batch` to update the `BatchJob` record after every chunk. Added `GET /analyze/batch/{job_id}` status endpoint. Implemented global FastAPI exception handlers for database connection errors (503), timeouts (504), ML inference timeouts (504), and unhandled exceptions (500). Updated Sidebar with a live progress toast that polls the status endpoint every 1.5s and auto-dismisses 5s after completion.

### Phase 6: Containerization & Evaluation (Done)

Dockerized the full stack: backend `Dockerfile` (Python 3.12, CPU-only torch), frontend `Dockerfile` (multi-stage Node 22 Alpine with standalone output), and `docker-compose.yml` orchestrating backend + frontend + PostgreSQL 15 with health checks and a persistent volume. Made the frontend API base URL configurable via `NEXT_PUBLIC_API_URL` env var. Enabled Next.js `output: "standalone"` for production Docker builds.

### Phase 7: Advanced Engines & Dashboard Wiring (Done)

Added two new sentiment engines: **RoBERTa** (`cardiffnlp/twitter-roberta-base-sentiment-latest`, 124M tweets, native 3-class) and **Ensemble** (weighted VADER 30% + RoBERTa 70%). Global `EngineContext` shares the selected engine across TopBar tabs, InteractiveSandbox, LiveFeed, and Sidebar batch uploads. All dashboard buttons wired up: TopBar sensors → /live-feed, settings → /settings; Sidebar links → API Swagger docs and GitHub repo; Settings page has per-engine test buttons and refresh health check with latency. LiveSignalFeed now shows actual analyzed text. API response includes `text` field.

### Phase 8: Production Readiness & Scale (Done)

**CLI** (`cli.py`): Typer-based CLI with `analyze`, `batch`, `engines`, and `benchmark` commands for end-to-end integration without the API server. **PostgreSQL indexes**: single-column indexes on `label`, `engine_used`, `created_at` plus composite indexes `(created_at, label)` and `(engine_used, label)` for sub-millisecond analytics queries. **Connection pooling**: `pool_size=20`, `max_overflow=10`, `pool_pre_ping=True`, `pool_recycle=1800`. **Latency middleware**: every API response includes `X-Response-Time` header with millisecond measurement. **Streaming batch pipeline**: CSV written to temp file on disk and streamed row-by-row with concurrent predictions via `asyncio.gather` + semaphore — supports GB-scale files without loading into memory. Chunk size increased to 500. **SST-2 benchmark**: eval script downloads Stanford Sentiment Treebank validation set (872 samples) from HuggingFace and benchmarks all 4 engines. **Large dataset generator** (`generate_large_dataset.py`): downloads IMDB reviews and generates CSVs up to GB-scale (500k+ rows) for throughput testing.

---

## 3. Directory Structure

```
docker-compose.yml                   # Full stack: backend + frontend + PostgreSQL 15

backend/
├── Dockerfile                       # Python 3.12, CPU-only torch, uvicorn
├── .dockerignore
├── main.py                          # FastAPI app + lifespan + CORS + error handlers + latency middleware
├── cli.py                           # Typer CLI: analyze, batch, engines, benchmark commands
├── requirements.txt                 # All Python dependencies (incl. typer, datasets)
├── seed_data.py                     # Inserts ~50 fake records for testing analytics
├── generate_large_dataset.py        # Downloads IMDB reviews, generates GB-scale test CSVs
├── test_reviews.csv                 # 20-row sample CSV for quick testing
└── app/
    ├── __init__.py
    ├── models.py                    # SQLAlchemy tables + indexes (SentimentResultRecord, BatchJob)
    ├── eval_metrics.py              # Multi-engine benchmark: adversarial + SST-2 public dataset
    ├── api/
    │   ├── __init__.py
    │   ├── routes.py                # POST /analyze, POST /analyze/batch, GET /analyze/batch/{job_id}
    │   └── analytics.py             # GET /analytics/summary, GET /analytics/trends
    ├── core/
    │   ├── __init__.py
    │   ├── config.py                # pydantic-settings: DB URL, pool sizes, batch chunk size
    │   ├── database.py              # Async SQLAlchemy engine + connection pooling + session factory
    │   ├── schemas.py               # Pydantic request/response models (incl. BatchJobStatus)
    │   ├── engine_factory.py        # Maps engine_type string → engine singleton (4 engines)
    │   └── batch.py                 # Streaming CSV batch processor with concurrent predictions
    ├── services/
    │   ├── __init__.py
    │   └── analytics.py             # Query functions: summary counts, avg confidence, hourly trends
    └── engines/
        ├── __init__.py              # Re-exports all 4 engine classes
        ├── base.py                  # ABC SentimentEngine + SentimentResult dataclass
        ├── vader_engine.py          # VADER rule-based engine (3-class)
        ├── transformer_engine.py    # HuggingFace DistilBERT engine (2-class)
        ├── roberta_engine.py        # Twitter-RoBERTa engine (3-class, 124M tweets)
        └── ensemble_engine.py       # Weighted VADER + RoBERTa fusion (3-class)

frontend/                            # Next.js 16 + TypeScript + Tailwind CSS v4
├── Dockerfile                       # Multi-stage Node 22 Alpine, standalone output
├── .dockerignore
├── src/
│   ├── app/
│   │   ├── globals.css              # Tailwind v4 @theme: MD3 dark palette (50+ tokens)
│   │   ├── layout.tsx               # Root layout: Providers + Sidebar + TopBar shell
│   │   ├── page.tsx                 # Overview dashboard (stat cards, sandbox, chart, feed)
│   │   ├── live-feed/page.tsx       # Dedicated live feed with inline analysis + filters
│   │   ├── analytics/page.tsx       # Historical analytics: chart + label breakdown bars
│   │   └── settings/page.tsx        # 4 engine cards with test buttons + system status
│   ├── components/
│   │   ├── Providers.tsx            # Client-side context wrapper (EngineProvider)
│   │   ├── Sidebar.tsx              # Fixed sidebar nav + CSV upload + batch progress toast
│   │   ├── TopBar.tsx               # 4 engine tabs, nav buttons, live pulse indicator
│   │   ├── StatCards.tsx            # 4 intelligence cards with sparklines (Total/Pos/Neg/Neu)
│   │   ├── InteractiveSandbox.tsx   # Textarea + engine selector → POST /analyze with result panel
│   │   ├── SentimentChart.tsx       # Recharts AreaChart: 7-day hourly trends with gradient fills
│   │   └── LiveSignalFeed.tsx       # Scrollable signal feed with actual text + label badges
│   └── lib/
│       ├── api.ts                   # Typed fetch wrappers for all backend endpoints
│       └── EngineContext.tsx         # Global engine selection context (4 engines)
├── package.json                     # next, react, recharts, tailwindcss, typescript
└── tsconfig.json
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
typer>=0.12.0
datasets>=2.19.0
```

## 4b. Frontend Dependencies (`frontend/package.json`)

```
next@16.2.1
react@19
recharts@2
tailwindcss@4 (via @tailwindcss/postcss)
typescript@5
```

---

## 5. Architecture & Key Design Decisions

### Strategy Pattern (Phase 1)

- **`SentimentEngine`** (`app/engines/base.py`): Abstract base class — `async predict(text: str) -> SentimentResult`.
- **`SentimentResult`**: Dataclass with fields `label`, `score`, `engine_used`.
- **`VaderEngine`** (`app/engines/vader_engine.py`): Uses `vaderSentiment`. Compound score thresholds: ≥0.05 → Positive, ≤-0.05 → Negative, else Neutral. Score = `abs(compound)`.
- **`TransformerEngine`** (`app/engines/transformer_engine.py`): HuggingFace `pipeline("sentiment-analysis")` with `distilbert-base-uncased-finetuned-sst-2-english`. Binary (Positive/Negative). Score = model confidence.
- **`RobertaEngine`** (`app/engines/roberta_engine.py`): `cardiffnlp/twitter-roberta-base-sentiment-latest`, trained on ~124M tweets. Native 3-class (Positive/Negative/Neutral). Better at sarcasm and informal text.
- **`EnsembleEngine`** (`app/engines/ensemble_engine.py`): Weighted fusion of VADER (30%) and RoBERTa (70%). Boosts confidence when both agree, reduces on disagreement.
- **Engine Factory** (`app/core/engine_factory.py`): Dict maps `"vader"` / `"transformer"` / `"roberta"` / `"ensemble"` to singleton instances. `get_engine()` returns engine or raises `ValueError`.

### Database Layer (Phase 2)

- **Config** (`app/core/config.py`): `pydantic-settings` `Settings` class. DB URL, `batch_chunk_size` (default 500), `db_pool_size` (default 20), `db_max_overflow` (default 10) overridable via `SENTIMENT_` prefixed env vars.
- **Database** (`app/core/database.py`): Async SQLAlchemy engine with connection pooling (`pool_size=20`, `max_overflow=10`, `pool_pre_ping=True`, `pool_recycle=1800`) + `async_sessionmaker`. `get_db()` is a FastAPI dependency yielding an `AsyncSession`.
- **Model** (`app/models.py`): `SentimentResultRecord` table with columns: `id` (PK, autoincrement), `text`, `label`, `score`, `engine_used`, `created_at` (server-side `now()`). `BatchJob` table with columns: `job_id` (string PK), `status` (pending/processing/completed/failed), `total_rows`, `processed_rows`, `engine_type`, `error_message` (nullable), `created_at`.
- **Lifespan** (`main.py`): On startup, `Base.metadata.create_all` auto-creates tables. On shutdown, disposes the engine.

### Batch Processing (Phase 2)

- **`POST /analyze/batch`** (`app/api/routes.py`): Accepts a CSV file upload + `engine_type` query param. Validates content type, reads bytes, generates a job ID (12-char hex), and enqueues `process_batch` via `BackgroundTasks`.
- **`process_batch()`** (`app/core/batch.py`): Writes uploaded bytes to a temp file on disk, then streams rows using `_stream_rows()` generator — never loads the entire CSV into memory. Chunks rows by `batch_chunk_size` (default 500). Within each chunk, runs concurrent predictions via `asyncio.gather()` with a semaphore (max 10 concurrent). Bulk-inserts per chunk and updates `BatchJob.processed_rows` after every chunk. Sets status to `completed` on success or `failed` with `error_message` on exception. Supports GB-scale CSV files.

### Analytics Layer (Phase 3)

- **Service** (`app/services/analytics.py`): Two async query functions:
  - `get_sentiment_summary()` — counts per label (`Positive`/`Negative`/`Neutral`), total count, and `avg(score)` rounded to 4 decimals.
  - `get_sentiment_trends()` — uses `date_trunc('hour', created_at)` to group records by hour × label for the last 7 days.
- **Router** (`app/api/analytics.py`): Mounts at `/analytics` with two `GET` endpoints that call the service functions.
- **Seed Script** (`backend/seed_data.py`): Inserts 50 randomized `SentimentResultRecord` rows with timestamps spread across the last 7 days. Run with `python seed_data.py`.

### CORS Middleware (Phase 3)

- Added `CORSMiddleware` in `main.py` with `allow_origins=["*"]`, `allow_credentials=True`, `allow_methods=["*"]`, `allow_headers=["*"]`. Intended for local development; should be restricted before production.

### Global Error Handling (Phase 5)

- `OperationalError` → 503 (database unavailable).
- `SATimeoutError` → 504 (database timeout).
- `TimeoutError` → 504 (ML inference timeout).
- Catch-all `Exception` → 500 (unexpected error with logging).
- All handlers log the error and return a structured JSON `{"detail": "..."}` response.

### CLI (Phase 8)

- **`cli.py`**: Typer-based CLI with 4 commands:
  - `analyze "text" --engine ensemble` — single text analysis with latency.
  - `batch file.csv --engine vader --chunk-size 500` — streaming batch with throughput metrics (samples/sec, file size).
  - `engines` — list all available engines.
  - `benchmark` — run the full evaluation benchmark.

### Database Indexes (Phase 8)

- Single-column indexes: `label`, `engine_used`, `created_at` on `SentimentResultRecord`.
- Composite indexes: `(created_at, label)` for trend queries, `(engine_used, label)` for filtered analytics.
- `BatchJob.status` indexed for status lookups.

### Latency Middleware (Phase 8)

- HTTP middleware in `main.py` measures request duration and sets `X-Response-Time` header (e.g., `12.34ms`) on every response. Logs method, path, and elapsed time to stdout.

### Evaluation & Benchmarking (Phases 6–8)

- **`app/eval_metrics.py`**: Benchmarks all 4 engines against two datasets:
  1. **Curated adversarial** (30 samples: 10 easy + 20 hard with sarcasm, negation, backhanded phrasing).
  2. **SST-2 public dataset** (872 validation samples from `stanfordnlp/sst2` via HuggingFace `datasets`).
- Prints per-engine classification reports (P/R/F1), comparative accuracy table, timing, and best engine.
- `--quick` flag skips SST-2 download for fast local runs.
- **`generate_large_dataset.py`**: Downloads IMDB reviews (25k) and generates CSVs up to GB-scale (`--rows 500000` → ~1.2 GB) for throughput testing.

### Containerization (Phase 6)

- **`backend/Dockerfile`**: Python 3.12-slim, CPU-only torch from PyTorch index, installs requirements, runs uvicorn.
- **`frontend/Dockerfile`**: Multi-stage (deps → build → runner) with Node 22 Alpine. Next.js standalone output. Non-root `nextjs` user.
- **`docker-compose.yml`**: 3 services — `db` (PostgreSQL 15 Alpine with health check + persistent volume), `backend` (depends on db healthy), `frontend` (depends on backend). Backend DB URL points to `db:5432`. Frontend API URL baked at build time via `NEXT_PUBLIC_API_URL` arg.

### React Frontend (Phase 4)

- **Framework**: Next.js 16.2.1 with App Router, TypeScript, Tailwind CSS v4.
- **Theme**: Material Design 3 dark palette with 50+ color tokens defined in `@theme inline` in `globals.css`. Uses Inter font + Material Symbols Outlined icon font (loaded via CDN in layout).
- **Layout**: Fixed sidebar (`Sidebar.tsx`) with navigation links (Overview, Live Feed, Historical Analytics, Model Settings), CSV upload button, and footer links. Sticky top bar (`TopBar.tsx`) with engine tabs, live pulse health indicator, and user avatar.
- **Pages**:
  - `/` (Overview): `StatCards` (4 intelligence cards with sparklines), `InteractiveSandbox` (textarea + engine selector → inference result panel), `SentimentChart` (Recharts AreaChart), `LiveSignalFeed` (scrollable results).
  - `/live-feed`: Inline text input with Enter-to-analyze, label filter buttons (All/Positive/Negative/Neutral with counts), expanded feed items with score display.
  - `/analytics`: Full-width trend chart + label breakdown with progress bars and average confidence.
  - `/settings`: Engine info cards (VADER + Transformer) and system status table (health check, endpoint, DB, chunk size).
- **State**: Each page is a `"use client"` component managing its own state via `useState`/`useEffect`. Overview re-fetches summary + trends after each new analysis.
- **API Client** (`lib/api.ts`): Typed `fetch` wrappers for all backend endpoints. Base URL configurable via `NEXT_PUBLIC_API_URL` env var (defaults to `http://localhost:8000`).

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Returns `{"status": "ok"}` |
| `POST` | `/analyze` | Single text analysis. Persists to DB. Returns result with `id` and `created_at`. |
| `POST` | `/analyze/batch` | CSV upload. Background processing. Returns `job_id`, `status`, `message`. |
| `GET` | `/analyze/batch/{job_id}` | Returns batch job progress: status, total/processed rows, error. |
| `GET` | `/analytics/summary` | Returns `total`, `per_label` counts, and `average_confidence`. |
| `GET` | `/analytics/trends` | Returns hourly record counts by label for the last 7 days. |

### Async / Performance

- All engines use `asyncio.to_thread()` for non-blocking ML inference.
- `@lru_cache(maxsize=1)` lazily loads each model on first call.
- Batch processing streams from disk, commits per chunk, uses `asyncio.gather` with semaphore for concurrent predictions.
- Connection pooling: 20 persistent connections + 10 overflow, pre-ping health checks, 30-min recycle.
- Latency middleware tracks every request with `X-Response-Time` header.

### Validation

- `text`: non-empty (`min_length=1`).
- `engine_type`: regex `^(vader|transformer|roberta|ensemble)$`, defaults to `"vader"`.
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

**Batch status (`GET /analyze/batch/{job_id}`):**
```json
{
  "job_id": "a1b2c3d4e5f6",
  "status": "processing",
  "total_rows": 200,
  "processed_rows": 100,
  "engine_type": "vader",
  "error_message": null,
  "created_at": "2026-03-31T10:30:00Z"
}
```

**Analytics summary (`GET /analytics/summary`):**
```json
{
  "total": 50,
  "per_label": {"Positive": 20, "Negative": 15, "Neutral": 15},
  "average_confidence": 0.7432
}
```

**Analytics trends (`GET /analytics/trends`):**
```json
[
  {"hour": "2026-03-29T14:00:00+00:00", "label": "Positive", "count": 3},
  {"hour": "2026-03-29T14:00:00+00:00", "label": "Negative", "count": 1}
]
```

---

## 6. How to Run

### Docker (Recommended)

```bash
cd "."
docker compose up --build
# PostgreSQL on :5432, Backend on :8000, Frontend on :3000
```

### Manual Prerequisites

A running PostgreSQL instance. Override the default connection string:
```bash
export SENTIMENT_DATABASE_URL="postgresql+asyncpg://user:pass@localhost:5432/sentiment_db"
```

Default: `postgresql+asyncpg://postgres:postgres@localhost:5432/sentiment_db`

### Start the Server

```bash
cd "backend"
pip install -r requirements.txt
python main.py
# Server starts on http://0.0.0.0:8000
# Tables auto-created on startup
```

### Start the Frontend

```bash
cd "frontend"
npm install
npm run dev
# Frontend starts on http://localhost:3000
# Requires backend running on http://localhost:8000
```

### Seed Test Data

```bash
cd "backend"
python seed_data.py
# Inserts ~50 fake records with timestamps spanning the last 7 days
```

### CLI Usage

```bash
cd backend
python cli.py analyze "This product is amazing!" --engine ensemble
python cli.py batch test_reviews.csv --engine vader
python cli.py engines
python cli.py benchmark
```

### Run Evaluation

```bash
cd backend
python -m app.eval_metrics              # Full benchmark (adversarial + SST-2)
python -m app.eval_metrics --quick      # Adversarial only (no download)
```

### Generate Large Test Data

```bash
cd backend
python generate_large_dataset.py                    # 25k IMDB reviews (~60 MB)
python generate_large_dataset.py --rows 100000      # 100k rows (~240 MB)
python generate_large_dataset.py --rows 500000      # 500k rows (~1.2 GB)
python cli.py batch large_test_data.csv --engine vader
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

**Analytics summary:**
```bash
curl http://localhost:8000/analytics/summary
```

**Analytics trends:**
```bash
curl http://localhost:8000/analytics/trends
```

---

## 7. What Has NOT Been Done

- [x] **Frontend** — Next.js 16 React dashboard with dark theme, charts, real-time analysis, and CSV upload.
- [ ] **Tests** — No unit or integration tests.
- [x] **Docker / Containerization** — Backend Dockerfile, frontend Dockerfile, docker-compose.yml with PostgreSQL 15.
- [ ] **CI/CD** — No GitHub Actions or pipeline config.
- [x] **CORS middleware** — Configured with `allow_origins=["*"]` (restrict before production).
- [x] **Global error handling** — FastAPI exception handlers for DB errors (503), timeouts (504), and unhandled exceptions (500).
- [x] **Git** — Repository initialized, initial commit on `master`.
- [x] **Batch job status tracking** — `BatchJob` model + `GET /analyze/batch/{job_id}` endpoint + sidebar progress toast.
- [x] **Evaluation script** — `eval_metrics.py` benchmarks 4 engines against adversarial + SST-2 datasets.
- [x] **CLI** — Typer CLI with analyze, batch (streaming), engines, and benchmark commands.
- [x] **Database indexes** — Single + composite indexes for sub-millisecond analytics queries.
- [x] **Connection pooling** — pool_size=20, max_overflow=10, pre_ping, recycle.
- [x] **Latency tracking** — X-Response-Time header on every API response.
- [x] **GB-scale batch support** — Streaming CSV parser + IMDB dataset generator.
- [ ] **Dependency installation** — `pip install -r requirements.txt` has not been run yet (use Docker instead).

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
- **Frontend**: Next.js App Router with `"use client"` for all interactive components. Tailwind v4 `@theme inline` for design tokens. Native `fetch` (no axios). `@/` path alias via tsconfig.
