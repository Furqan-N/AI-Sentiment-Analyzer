# AI Sentiment Analyzer

A production-grade sentiment analysis platform with pluggable ML engines, real-time analytics, and a React dashboard. Built with FastAPI, Next.js 16, and PostgreSQL.

## Features

- **Dual ML Engines** — VADER (rule-based, fast) and DistilBERT Transformer (deep learning, accurate), swappable per request via the Strategy Pattern
- **Real-Time Analysis** — Analyze text instantly through the interactive sandbox or API
- **Batch Processing** — Upload CSV files for background processing with live progress tracking
- **Analytics Dashboard** — 7-day trend charts, sentiment breakdowns, and summary statistics
- **Persistent Storage** — Every analysis result is stored in PostgreSQL with timestamps
- **Global Error Handling** — Structured JSON responses for DB errors, timeouts, and unhandled exceptions
- **Model Evaluation** — Built-in script to measure Precision, Recall, and F1 against labeled data
- **Dockerized** — Full stack runs with a single `docker compose up`

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | FastAPI, SQLAlchemy 2.0 (async), Pydantic v2 |
| ML Engines | VADER (vaderSentiment), DistilBERT (HuggingFace Transformers) |
| Database | PostgreSQL 15 + asyncpg |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4, Recharts |
| Infrastructure | Docker, Docker Compose |

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (recommended) **or**
- Python 3.10+, Node.js 22+, and PostgreSQL 15+ for manual setup

## Quick Start

### Docker (Recommended)

```bash
git clone https://github.com/Furqan-N/AI-Sentiment-Analyzer.git
cd AI-Sentiment-Analyzer
docker compose up --build
```

This starts three containers:
- **PostgreSQL** on port `5432`
- **Backend API** on port `8000`
- **Frontend** on port `3000`

Open [http://localhost:3000](http://localhost:3000) to access the dashboard.

### Manual Setup

**Prerequisites:** Python 3.10+, Node.js 22+, PostgreSQL

```bash
# Backend
cd backend
pip install -r requirements.txt
export SENTIMENT_DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5432/sentiment_db"
python main.py                    # API on http://localhost:8000

# Frontend (in a separate terminal)
cd frontend
npm install
npm run dev                       # Dashboard on http://localhost:3000
```

### Seed Test Data

```bash
# With Docker
docker compose exec backend python seed_data.py

# Without Docker
cd backend
python seed_data.py
```

This inserts ~50 sample records spanning 7 days to populate the analytics charts.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/analyze` | Analyze a single text. Returns label, score, engine, and timestamp. |
| `POST` | `/analyze/batch` | Upload a CSV for background processing. Returns a `job_id`. |
| `GET` | `/analyze/batch/{job_id}` | Poll batch job progress (status, rows processed). |
| `GET` | `/analytics/summary` | Total count, per-label breakdown, average confidence. |
| `GET` | `/analytics/trends` | Hourly sentiment counts for the last 7 days. |

### Example

```bash
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "This product is amazing!", "engine_type": "vader"}'
```

```json
{
  "label": "Positive",
  "score": 0.6239,
  "engine_used": "vader",
  "id": 1,
  "created_at": "2026-03-31T10:30:00Z"
}
```

### Batch Upload

```bash
curl -X POST "http://localhost:8000/analyze/batch?engine_type=vader" \
  -F "file=@reviews.csv"
```

CSV files must have a `text` column:
```csv
text
"This product is amazing!"
"Terrible experience, would not recommend."
```

## Dashboard

The frontend is a "Mission Control" dashboard with a Material Design 3 dark theme.

| Page | Description |
|------|-------------|
| **Overview** | Stat cards, interactive analysis sandbox, trend chart, live signal feed |
| **Live Feed** | Real-time analysis with sentiment label filters and inline results |
| **Historical Analytics** | Full-width trend chart with label breakdown bars and confidence metrics |
| **Model Settings** | Engine info cards and system status panel |

Batch CSV uploads show a live progress indicator in the sidebar with row-level tracking.

## Architecture

```
                    ┌─────────────┐
                    │  Frontend   │
                    │  Next.js 16 │
                    └──────┬──────┘
                           │ fetch
                    ┌──────▼──────┐
                    │   Backend   │
                    │   FastAPI   │
                    └──┬──────┬───┘
               ┌───────▼┐  ┌─▼────────┐
               │  VADER  │  │DistilBERT│
               │ Engine  │  │  Engine  │
               └─────────┘  └──────────┘
                    │
              ┌─────▼─────┐
              │ PostgreSQL │
              │     15     │
              └───────────┘
```

- **Strategy Pattern** — Engines implement an abstract `SentimentEngine` base class. The factory maps `"vader"` / `"transformer"` to singleton instances.
- **Async Throughout** — All inference runs via `asyncio.to_thread()`. Database operations use SQLAlchemy async sessions.
- **Batch Resilience** — CSV processing runs in background tasks, commits per chunk, and tracks progress in a `BatchJob` table. Failures are captured with error messages.

## Model Evaluation

Run the built-in evaluation script to measure TransformerEngine accuracy:

```bash
# With Docker
docker compose exec backend python -m app.eval_metrics

# Without Docker
cd backend
python -m app.eval_metrics
```

This runs 30 labeled samples (10 easy, 20 adversarial) through DistilBERT and prints a classification report with Precision, Recall, F1, and accuracy. The adversarial set includes sarcasm, double negation, and mixed-signal text to stress-test the model.

## Project Structure

```
docker-compose.yml

backend/
├── Dockerfile
├── main.py                     # App entry point + global error handlers
├── requirements.txt
├── seed_data.py
└── app/
    ├── models.py               # SentimentResultRecord + BatchJob tables
    ├── eval_metrics.py         # TransformerEngine evaluation script
    ├── api/
    │   ├── routes.py           # /analyze, /analyze/batch, /analyze/batch/{job_id}
    │   └── analytics.py        # /analytics/summary, /analytics/trends
    ├── core/
    │   ├── config.py           # Environment-based settings (SENTIMENT_ prefix)
    │   ├── database.py         # Async SQLAlchemy engine + sessions
    │   ├── schemas.py          # Pydantic request/response models
    │   ├── engine_factory.py   # Engine registry
    │   └── batch.py            # Background CSV processing with progress tracking
    ├── services/
    │   └── analytics.py        # Summary + trend query functions
    └── engines/
        ├── base.py             # SentimentEngine ABC + SentimentResult dataclass
        ├── vader_engine.py     # VADER rule-based engine
        └── transformer_engine.py  # HuggingFace DistilBERT engine

frontend/
├── Dockerfile
└── src/
    ├── app/                    # Next.js App Router pages
    ├── components/             # Sidebar, TopBar, StatCards, Charts, etc.
    └── lib/api.ts              # Typed API client
```

## Configuration

Environment variables (all prefixed with `SENTIMENT_`):

| Variable | Default | Description |
|----------|---------|-------------|
| `SENTIMENT_DATABASE_URL` | `postgresql+asyncpg://postgres:postgres@localhost:5432/sentiment_db` | PostgreSQL connection string |
| `SENTIMENT_BATCH_CHUNK_SIZE` | `50` | Rows per chunk in batch processing |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend URL for the frontend |

## License

This project is part of a professional portfolio. All rights reserved.
