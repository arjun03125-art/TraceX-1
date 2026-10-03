import pytest
from pathlib import Path
from uuid import uuid4

from app.adapters.xfs.mock import MockXFSAdapter
from app.adapters.btrfs.mock import MockBtrfsAdapter
from app.adapters.carving.mock import MockCarvingAdapter
from app.adapters.base import EngineCapabilities


class TestMockXFSAdapter:
    @pytest.fixture
    def adapter(self):
        return MockXFSAdapter()

    @pytest.mark.asyncio
    async def test_capabilities(self, adapter):
        caps = adapter.capabilities
        assert isinstance(caps, EngineCapabilities)
        assert caps.engine_name == "mock_xfs"
        assert "xfs" in caps.supported_filesystems
        assert caps.can_detect is True
        assert caps.can_analyze is True
        assert caps.can_recover is True
        assert caps.can_validate is True

    @pytest.mark.asyncio
    async def test_detect(self, adapter):
        result = await adapter.detect(Path("/fake/path"))
        assert result is True

    @pytest.mark.asyncio
    async def test_analyze(self, adapter):
        case_id = uuid4()
        evidence_id = uuid4()
        result = await adapter.analyze(Path("/fake/path"), case_id, evidence_id)

        assert result.success is True
        assert len(result.artifacts) == 3
        for art in result.artifacts:
            assert art.artifact_type == "recovered_file"
            assert art.filesystem == "xfs"
            assert art.recovery_method == "filesystem"
            assert art.confidence_score is not None
            assert art.confidence_score > 0.9

    @pytest.mark.asyncio
    async def test_recover(self, adapter, tmp_path):
        case_id = uuid4()
        evidence_id = uuid4()
        artifacts = (await adapter.analyze(Path("/fake/path"), case_id, evidence_id)).artifacts

        output_dir = tmp_path / "recovered"
        result = await adapter.recover(artifacts, Path("/fake/path"), output_dir)

        assert result.success is True
        assert result.metadata["recovered_count"] == 3
        for art in artifacts:
            out_file = output_dir / art.name
            assert out_file.exists()
            assert out_file.read_bytes() == b"MOCK XFS RECOVERED CONTENT"

    @pytest.mark.asyncio
    async def test_validate(self, adapter):
        case_id = uuid4()
        evidence_id = uuid4()
        artifacts = (await adapter.analyze(Path("/fake/path"), case_id, evidence_id)).artifacts

        result = await adapter.validate(artifacts)
        assert result.success is True


class TestMockBtrfsAdapter:
    @pytest.fixture
    def adapter(self):
        return MockBtrfsAdapter()

    @pytest.mark.asyncio
    async def test_capabilities(self, adapter):
        caps = adapter.capabilities
        assert caps.engine_name == "mock_btrfs"
        assert "btrfs" in caps.supported_filesystems

    @pytest.mark.asyncio
    async def test_analyze(self, adapter):
        case_id = uuid4()
        evidence_id = uuid4()
        result = await adapter.analyze(Path("/fake/path"), case_id, evidence_id)

        assert result.success is True
        assert len(result.artifacts) == 2
        for art in result.artifacts:
            assert art.filesystem == "btrfs"
            assert art.confidence_score is not None
            assert art.confidence_score > 0.9


class TestMockCarvingAdapter:
    @pytest.fixture
    def adapter(self):
        return MockCarvingAdapter()

    @pytest.mark.asyncio
    async def test_capabilities(self, adapter):
        caps = adapter.capabilities
        assert caps.engine_name == "mock_carving"
        assert "*" in caps.supported_filesystems
        assert caps.can_detect is False  # Carving doesn't detect FS

    @pytest.mark.asyncio
    async def test_analyze(self, adapter):
        case_id = uuid4()
        evidence_id = uuid4()
        result = await adapter.analyze(Path("/fake/path"), case_id, evidence_id)

        assert result.success is True
        assert len(result.artifacts) == 2
        for art in result.artifacts:
            assert art.filesystem is None
            assert art.recovery_method == "carving"
            assert art.confidence_score is not None
            assert art.confidence_score < 0.8  # Lower confidence for carving