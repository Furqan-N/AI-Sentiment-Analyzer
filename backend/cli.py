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
import io
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
):
    """Process a CSV file of text samples."""
    eng = _get_engine(engine)

    with open(file, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = [row["text"].strip() for row in reader if row.get("text", "").strip()]

    if not rows:
        typer.echo("No valid 'text' rows found in CSV.", err=True)
        raise typer.Exit(1)

    typer.echo(f"Processing {len(rows)} rows with {engine}...\n")

    counts = {"Positive": 0, "Negative": 0, "Neutral": 0}
    start = time.perf_counter()

    async def run_all():
        for i, text in enumerate(rows, 1):
            result = await eng.predict(text)
            counts[result.label] = counts.get(result.label, 0) + 1
            if i % 100 == 0 or i == len(rows):
                typer.echo(f"  [{i}/{len(rows)}] processed")

    asyncio.run(run_all())
    elapsed = time.perf_counter() - start

    typer.echo(f"\nResults ({len(rows)} samples in {elapsed:.2f}s):")
    typer.echo(f"  Throughput: {len(rows)/elapsed:.1f} samples/sec")
    for label, count in sorted(counts.items()):
        pct = (count / len(rows)) * 100
        typer.echo(f"  {label:<10s}  {count:>5d}  ({pct:.1f}%)")


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
