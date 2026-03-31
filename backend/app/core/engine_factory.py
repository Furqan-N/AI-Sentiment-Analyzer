from app.engines.base import SentimentEngine
from app.engines.vader_engine import VaderEngine
from app.engines.transformer_engine import TransformerEngine
from app.engines.roberta_engine import RobertaEngine
from app.engines.ensemble_engine import EnsembleEngine

_ENGINES: dict[str, SentimentEngine] = {
    "vader": VaderEngine(),
    "transformer": TransformerEngine(),
    "roberta": RobertaEngine(),
    "ensemble": EnsembleEngine(),
}


def get_engine(engine_type: str) -> SentimentEngine:
    engine = _ENGINES.get(engine_type)
    if engine is None:
        raise ValueError(f"Unknown engine type: {engine_type!r}. Choose from: {list(_ENGINES)}")
    return engine
