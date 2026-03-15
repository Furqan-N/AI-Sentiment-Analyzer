import asyncio
from functools import lru_cache

from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

from app.engines.base import SentimentEngine, SentimentResult

ENGINE_NAME = "vader"


@lru_cache(maxsize=1)
def _get_analyzer() -> SentimentIntensityAnalyzer:
    return SentimentIntensityAnalyzer()


class VaderEngine(SentimentEngine):
    """Fast, rule-based sentiment analyzer powered by VADER."""

    async def predict(self, text: str) -> SentimentResult:
        analyzer = _get_analyzer()
        scores = await asyncio.to_thread(analyzer.polarity_scores, text)
        compound = scores["compound"]

        if compound >= 0.05:
            label = "Positive"
        elif compound <= -0.05:
            label = "Negative"
        else:
            label = "Neutral"

        return SentimentResult(
            label=label,
            score=round(abs(compound), 4),
            engine_used=ENGINE_NAME,
        )
