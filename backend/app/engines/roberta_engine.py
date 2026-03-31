import asyncio
from functools import lru_cache

from transformers import pipeline

from app.engines.base import SentimentEngine, SentimentResult

MODEL_NAME = "cardiffnlp/twitter-roberta-base-sentiment-latest"
ENGINE_NAME = "roberta"

LABEL_MAP = {
    "positive": "Positive",
    "negative": "Negative",
    "neutral": "Neutral",
}


@lru_cache(maxsize=1)
def _get_pipeline():
    return pipeline("sentiment-analysis", model=MODEL_NAME, tokenizer=MODEL_NAME)


class RobertaEngine(SentimentEngine):
    """RoBERTa model fine-tuned on ~124M tweets with native 3-class output.

    Better at informal text, sarcasm, and nuanced sentiment than DistilBERT.
    Outputs Positive, Negative, or Neutral natively.
    """

    async def predict(self, text: str) -> SentimentResult:
        classifier = _get_pipeline()
        results = await asyncio.to_thread(classifier, text, truncation=True)
        top = results[0]

        label = LABEL_MAP.get(top["label"].lower(), "Neutral")

        return SentimentResult(
            label=label,
            score=round(top["score"], 4),
            engine_used=ENGINE_NAME,
        )
