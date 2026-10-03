from app.adapters.base import EngineCapabilities, EngineResult, ForensicEngineAdapter
from app.adapters.btrfs.mock import MockBtrfsAdapter
from app.adapters.carving.mock import MockCarvingAdapter

# Import mock adapters for development
from app.adapters.xfs.mock import MockXFSAdapter

# Engine registry
ENGINE_REGISTRY = {
    "xfs": MockXFSAdapter,
    "btrfs": MockBtrfsAdapter,
    "carving": MockCarvingAdapter,
}


def get_engine_adapter(engine_name: str) -> ForensicEngineAdapter:
    """Get engine adapter instance by name."""
    if engine_name not in ENGINE_REGISTRY:
        raise ValueError(f"Unknown engine: {engine_name}")
    return ENGINE_REGISTRY[engine_name]()


def list_engines() -> list[str]:
    return list(ENGINE_REGISTRY.keys())


__all__ = [
    "ForensicEngineAdapter",
    "EngineCapabilities",
    "EngineResult",
    "MockXFSAdapter",
    "MockBtrfsAdapter",
    "MockCarvingAdapter",
    "ENGINE_REGISTRY",
    "get_engine_adapter",
    "list_engines",
]
