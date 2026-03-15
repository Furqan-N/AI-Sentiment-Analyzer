from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class SentimentResult:
    label: str
    score: float
    engine_used: str


class SentimentEngine(ABC):
    """Abstract base class for all sentiment analysis engines."""

    @abstractmethod
    async def predict(self, text: str) -> SentimentResult:
        """Analyze the sentiment of the given text.

        Args:
            text: The input string to analyze.

        Returns:
            A SentimentResult with label, score, and engine name.
        """
        ...
