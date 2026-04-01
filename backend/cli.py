"""
Sentiment Analyzer CLI — command-line interface for end-to-end integration.

Usage:
    python cli.py analyze "This product is amazing!"
    python cli.py analyze "Terrible service" --engine roberta
    python cli.py batch reviews.csv --engine ensemble
    python cli.py engines
    python cli.py benchmark
"""

import asyncio
import csv
import sys
import time
from pathlib import Path

import typer

from app.engines.vader_engine import VaderEngine
from app.engines.transformer_engine import TransformerEngine
from app.engines.roberta_engine import RobertaEngine
from app.engines.ensemble_engine import EnsembleEngine
from app.engines.base import SentimentEngine

app = typer.Typer(
    name="sentiment",
    help="AI Sentiment Analyzer — analyze text from the command line.",
    add_completion=False,
)

ENGINES: dict[str, SentimentEngine] = {
    "vader": VaderEngine(),
    "transformer": TransformerEngine(),
    "roberta": RobertaEngine(),
    "ensemble": EnsembleEngine(),
}


def _get_engine(name: str) -> SentimentEngine:
    engine = ENGINES.get(name)
    if not engine:
        typer.echo(f"Unknown engine: {name!r}. Available: {', '.join(ENGINES)}", err=True)
        raise typer.Exit(1)
    return engine


def _format_size(nbytes: int) -> str:
    if nbytes >= 1024 ** 3:
        return f"{nbytes / (1024 ** 3):.2f} GB"
    if nbytes >= 1024 ** 2:
        return f"{nbytes / (1024 ** 2):.1f} MB"
    if nbytes >= 1024:
        return f"{nbytes / 1024:.1f} KB"
    return f"{nbytes} B"


@app.command()
def analyze(
    text: str = typer.Argument(..., help="Text to analyze for sentiment."),
    engine: str = typer.Option("ensemble", "--engine", "-e", help="Engine to use."),
):
    """Analyze a single piece of text."""
    eng = _get_engine(engine)
    start = time.perf_counter()
    result = asyncio.run(eng.predict(text))
    elapsed = time.perf_counter() - start

    typer.echo(f"  Text:       {text}")
    typer.echo(f"  Label:      {result.label}")
    typer.echo(f"  Score:      {result.score:.4f}")
    typer.echo(f"  Engine:     {result.engine_used}")
    typer.echo(f"  Latency:    {elapsed*1000:.1f}ms")


@app.command()
def batch(
    file: Path = typer.Argument(..., help="Path to CSV file with a 'text' column.", exists=True),
    engine: str = typer.Option("ensemble", "--engine", "-e", help="Engine to use."),
    chunk_size: int = typer.Option(500, "--chunk-size", "-c", help="Rows per processing chunk."),
):
    """Process a CSV file of text samples with streaming.

    Streams the CSV row-by-row so arbitrarily large files (GB-scale) work
    without loading everything into memory.
    """
    eng = _get_engine(engine)
    file_size = file.stat().st_size

    typer.echo(f"File:    {file.name} ({_format_size(file_size)})")
    typer.echo(f"Engine:  {engine}")
    typer.echo(f"Chunk:   {chunk_size} rows\n")

    counts: dict[str, int] = {"Positive": 0, "Negative": 0, "Neutral": 0}
    total_rows = 0
    start = time.perf_counter()

    async def process_streaming():
        nonlocal total_rows
        chunk: list[str] = []

        with open(file, "r", encoding="utf-8", errors="replace") as f:
            reader = csv.DictReader(f)
            for row in reader:
                text = row.get("text", "").strip()
                if not text:
                    continue
                chunk.append(text)

                if len(chunk) >= chunk_size:
                    await _process_chunk(eng, chunk, counts)
                    total_rows += len(chunk)
                    elapsed = time.perf_counter() - start
                    rate = total_rows / elapsed if elapsed > 0 else 0
                    typer.echo(
                        f"  [{total_rows:,} rows]  {rate:,.0f} samples/sec  "
                        f"{_format_size(int(total_rows * (file_size / max(total_rows, 1))))} processed"
                    )
                    chunk = []

            if chunk:
                await _process_chunk(eng, chunk, counts)
                total_rows += len(chunk)

    asyncio.run(process_streaming())
    elapsed = time.perf_counter() - start
    rate = total_rows / elapsed if elapsed > 0 else 0

    typer.echo(f"\n{'=' * 60}")
    typer.echo(f"Completed: {total_rows:,} rows in {elapsed:.2f}s")
    typer.echo(f"File size: {_format_size(file_size)}")
    typer.echo(f"Throughput: {rate:,.0f} samples/sec")
    typer.echo(f"{'=' * 60}")
    for label, count in sorted(counts.items()):
        pct = (count / total_rows) * 100 if total_rows else 0
        typer.echo(f"  {label:<10s}  {count:>7,d}  ({pct:.1f}%)")


async def _process_chunk(eng: SentimentEngine, texts: list[str], counts: dict[str, int]):
    """Process a chunk of texts concurrently."""
    semaphore = asyncio.Semaphore(10)

    async def predict(text: str):
        async with semaphore:
            return await eng.predict(text)

    results = await asyncio.gather(*[predict(t) for t in texts])
    for r in results:
        counts[r.label] = counts.get(r.label, 0) + 1


@app.command()
def engines():
    """List available sentiment engines."""
    typer.echo("Available engines:\n")
    info = [
        ("vader", "VADER", "Rule-based lexicon, CPU-only, 3-class"),
        ("transformer", "DistilBERT", "SST-2 fine-tuned, binary, GPU optional"),
        ("roberta", "RoBERTa", "124M tweets, 3-class, GPU optional"),
        ("ensemble", "Ensemble", "VADER + RoBERTa weighted fusion, 3-class"),
    ]
    for key, name, desc in info:
        typer.echo(f"  {key:<14s}  {name:<12s}  {desc}")


@app.command()
def benchmark():
    """Run the evaluation benchmark against all engines."""
    from app.eval_metrics import main as eval_main
    asyncio.run(eval_main())


if __name__ == "__main__":
    app()
