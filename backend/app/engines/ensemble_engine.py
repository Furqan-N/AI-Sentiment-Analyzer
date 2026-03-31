from app.engines.base import SentimentEngine, SentimentResult
from app.engines.vader_engine import VaderEngine
from app.engines.roberta_engine import RobertaEngine

ENGINE_NAME = "ensemble"

# Weights: RoBERTa is the stronger model, VADER provides a rule-based sanity check
ROBERTA_WEIGHT = 0.7
VADER_WEIGHT = 0.3


class EnsembleEngine(SentimentEngine):
    """Weighted ensemble combining VADER (rule-based) and RoBERTa (deep learning).

    Uses RoBERTa's label as the primary signal. When both engines agree, confidence
    is boosted. When they disagree, the weighted score reflects the uncertainty.
    """

    def __init__(self) -> None:
        self._vader = VaderEngine()
        self._roberta = RobertaEngine()

    async def predict(self, text: str) -> SentimentResult:
        vader_result, roberta_result = await self._vader.predict(text), None
        roberta_result = await self._roberta.predict(text)

        if vader_result.label == roberta_result.label:
            # Both agree — boost confidence via weighted average
            combined_score = (
                ROBERTA_WEIGHT * roberta_result.score
                + VADER_WEIGHT * vader_result.score
            )
            return SentimentResult(
                label=roberta_result.label,
                score=round(combined_score, 4),
                engine_used=ENGINE_NAME,
            )

        # Disagreement — trust the higher-weighted model but reduce confidence
        if roberta_result.score * ROBERTA_WEIGHT >= vader_result.score * VADER_WEIGHT:
            label = roberta_result.label
            combined_score = (
                ROBERTA_WEIGHT * roberta_result.score
                - VADER_WEIGHT * vader_result.score * 0.5
            )
        else:
            label = vader_result.label
            combined_score = (
                VADER_WEIGHT * vader_result.score
                - ROBERTA_WEIGHT * roberta_result.score * 0.5
            )

        return SentimentResult(
            label=label,
            score=round(max(combined_score, 0.01), 4),
            engine_used=ENGINE_NAME,
        )
