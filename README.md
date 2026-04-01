# AI Sentiment Analyzer

A production-grade sentiment analysis platform with 4 pluggable ML engines, a streaming batch pipeline for GB-scale CSV processing, real-time analytics, and a React dashboard. Exposes functionality through both a FastAPI REST API and a Typer CLI.

## Features

- **4 ML Engines** — VADER (rule-based), DistilBERT (SST-2), RoBERTa (124M tweets, 3-class), and Ensemble (weighted VADER + RoBERTa fusion), swappable per request via the Strategy Pattern
- **CLI + REST API** — Analyze text, batch-process CSVs, list engines, and run benchmarks from the command line or via HTTP
- **Streaming Batch Pipeline** — Processes GB-scale CSV files without loading into memory; concurrent predictions via `asyncio.gather` with semaphore control
- **Real-Time Analysis** — Analyze text instantly through the interactive sandbox, live feed, or API
- **Analytics Dashboard** — 7-day trend charts, sentiment breakdowns, and summary statistics
- **PostgreSQL with Indexing** — Single + composite indexes for sub-millisecond analytics queries; connection pooling (20 connections + 10 overflow)
- **Latency Tracking** — Every API response includes an `X-Response-Time` header with millisecond measurement
- **Model Benchmarking** — Evaluates all 4 engines against a curated adversarial dataset (30 samples) and the Stanford SST-2 public validation set (872 samples)
- **GB-Scale Test Data** — Built-in generator downloads IMDB reviews and creates CSVs up to 1.2 GB (500k+ rows) for throughput testing
- **Dockerized** — Full stack runs with a single `docker compose up`

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | FastAPI, SQLAlchemy 2.0 (async), Pydantic v2, Typer CLI |
| ML Engines | VADER, DistilBERT, RoBERTa (twitter-roberta-base-sentiment-latest), Ensemble |
| Database | PostgreSQL 15 + asyncpg + connection pooling + indexed queries |
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

## CLI

The Typer-based CLI provides full access to sentiment analysis without the API server:

```bash
# Analyze a single text
python cli.py analyze "This product is amazing!" --engine ensemble

# Batch process a CSV (streaming, with throughput metrics)
python cli.py batch reviews.csv --engine vader --chunk-size 500

# List available engines
python cli.py engines

# Run the full evaluation benchmark
python cli.py benchmark
```

With Docker:
```bash
docker compose exec backend python cli.py analyze "Great product!" --engine roberta
docker compose exec backend python cli.py batch test_reviews.csv --engine ensemble
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/analyze` | Analyze a single text. Returns label, score, engine, and timestamp. |
| `POST` | `/analyze/batch` | Upload a CSV for background processing. Returns a `job_id`. |
| `GET` | `/analyze/batch/{job_id}` | Poll batch job progress (status, rows processed). |
| `GET` | `/analytics/summary` | Total count, per-label breakdown, average confidence. |
| `GET` | `/analytics/trends` | Hourly sentiment counts for the last 7 days. |

All responses include an `X-Response-Time` header with latency in milliseconds.

### Example

```bash
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "This product is amazing!", "engine_type": "ensemble"}'
```

```json
{
  "label": "Positive",
  "score": 0.6239,
  "engine_used": "ensemble",
  "text": "This product is amazing!",
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

## Engines

| Engine | Model | Classes | Best For |
|--------|-------|---------|----------|
| `vader` | Rule-based lexicon | 3 | Fast inference, explicit sentiment |
| `transformer` | DistilBERT (SST-2) | 2 | Lightweight transformer accuracy |
| `roberta` | RoBERTa (124M tweets) | 3 | Sarcasm, informal text, nuance |
| `ensemble` | VADER 30% + RoBERTa 70% | 3 | Highest accuracy (default) |

## Dashboard

The frontend is a "Mission Control" dashboard with a Material Design 3 dark theme.

| Page | Description |
|------|-------------|
| **Overview** | Stat cards, interactive analysis sandbox, trend chart, live signal feed |
| **Live Feed** | Real-time analysis with sentiment label filters and inline results |
| **Historical Analytics** | Full-width trend chart with label breakdown bars and confidence metrics |
| **Model Settings** | 4 engine cards with test buttons, health check with latency, Swagger link |

The global engine selector in the TopBar syncs across all pages. Batch CSV uploads show a live progress indicator in the sidebar.

## Architecture

```
                    ┌─────────────┐
                    │  Frontend   │
                    │  Next.js 16 │
                    └──────┬──────┘
                           │ fetch
                    ┌──────▼──────┐     ┌─────────┐
                    │   Backend   │────►│   CLI   │
                    │   FastAPI   │     │  Typer  │
                    └──┬──┬───┬───┘     └─────────┘
               ┌───────▼┐ │ ┌─▼────────┐
               │  VADER  │ │ │ RoBERTa  │
               └─────────┘ │ └──────────┘
              ┌────────────▼─┐ ┌──────────┐
              │  DistilBERT  │ │ Ensemble │
              └──────────────┘ └──────────┘
                       │
                 ┌─────▼─────┐
                 │ PostgreSQL │
                 │  15 + idx  │
                 └───────────┘
```

- **Strategy Pattern** — 4 engines implement an abstract `SentimentEngine` base class. The factory maps engine names to singleton instances.
- **Async Throughout** — All inference runs via `asyncio.to_thread()`. Database operations use SQLAlchemy async sessions with connection pooling.
- **Streaming Batch** — CSV written to temp file, streamed row-by-row, concurrent predictions per chunk via `asyncio.gather`. Supports GB-scale files.
- **Indexed Queries** — Composite indexes on `(created_at, label)` and `(engine_used, label)` for sub-millisecond analytics at scale.

## Model Evaluation

Benchmark all 4 engines against curated adversarial data and the Stanford SST-2 public dataset:

```bash
# Full benchmark (adversarial + SST-2 public dataset)
docker compose exec backend python -m app.eval_metrics

# Quick mode (adversarial only, no download)
docker compose exec backend python -m app.eval_metrics --quick
```

### Large-Scale Throughput Testing

```bash
# Generate test data from IMDB reviews
docker compose exec backend python generate_large_dataset.py --rows 100000   # ~240 MB
docker compose exec backend python generate_large_dataset.py --rows 500000   # ~1.2 GB

# Process through the streaming pipeline
docker compose exec backend python cli.py batch large_test_data.csv --engine vader
```

## Project Structure

```
docker-compose.yml

backend/
├── Dockerfile
├── cli.py                      # Typer CLI: analyze, batch, engines, benchmark
├── main.py                     # FastAPI app + latency middleware + error handlers
├── requirements.txt
├── seed_data.py
├── generate_large_dataset.py   # IMDB-based GB-scale CSV generator
└── app/
    ├── models.py               # SQLAlchemy tables + indexes
    ├── eval_metrics.py         # Multi-engine benchmark (adversarial + SST-2)
    ├── api/
    │   ├── routes.py           # /analyze, /analyze/batch, /analyze/batch/{job_id}
    │   └── analytics.py        # /analytics/summary, /analytics/trends
    ├── core/
    │   ├── config.py           # Settings (DB, pool sizes, chunk size)
    │   ├── database.py         # Async engine + connection pooling
    │   ├── schemas.py          # Pydantic request/response models
    │   ├── engine_factory.py   # 4-engine registry
    │   └── batch.py            # Streaming CSV processor with concurrent predictions
    ├── services/
    │   └── analytics.py        # Summary + trend query functions
    └── engines/
        ├── base.py             # SentimentEngine ABC
        ├── vader_engine.py     # VADER (rule-based, 3-class)
        ├── transformer_engine.py  # DistilBERT (SST-2, 2-class)
        ├── roberta_engine.py   # RoBERTa (124M tweets, 3-class)
        └── ensemble_engine.py  # Weighted VADER + RoBERTa fusion

frontend/
├── Dockerfile
└── src/
    ├── app/                    # Next.js App Router pages
    ├── components/             # Sidebar, TopBar, StatCards, Charts, Providers
    └── lib/
        ├── api.ts              # Typed API client
        └── EngineContext.tsx    # Global engine selection context
```

## Configuration

Environment variables (all prefixed with `SENTIMENT_`):

| Variable | Default | Description |
|----------|---------|-------------|
| `SENTIMENT_DATABASE_URL` | `postgresql+asyncpg://postgres:postgres@localhost:5432/sentiment_db` | PostgreSQL connection string |
| `SENTIMENT_BATCH_CHUNK_SIZE` | `500` | Rows per chunk in batch processing |
| `SENTIMENT_DB_POOL_SIZE` | `20` | Connection pool size |
| `SENTIMENT_DB_MAX_OVERFLOW` | `10` | Max overflow connections |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend URL for the frontend |

## License

This project is part of a professional portfolio. All rights reserved.
