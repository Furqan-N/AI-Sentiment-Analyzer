import asyncio
from functools import lru_cache

from transformers import pipeline

from app.engines.base import SentimentEngine, SentimentResult

MODEL_NAME = "distilbert-base-uncased-finetuned-sst-2-english"
ENGINE_NAME = "transformer"


@lru_cache(maxsize=1)
def _get_pipeline():
    return pipeline("sentiment-analysis", model=MODEL_NAME)


class TransformerEngine(SentimentEngine):
    """State-of-the-art sentiment analyzer using a fine-tuned DistilBERT model."""

    async def predict(self, text: str) -> SentimentResult:
        classifier = _get_pipeline()
        results = await asyncio.to_thread(classifier, text, truncation=True)
        top = results[0]

        raw_label = top["label"].upper()
        if raw_label == "POSITIVE":
            label = "Positive"
        elif raw_label == "NEGATIVE":
            label = "Negative"
        else:
            label = "Neutral"

        return SentimentResult(
            label=label,
            score=round(top["score"], 4),
            engine_used=ENGINE_NAME,
        )
