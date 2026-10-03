import logging
from pathlib import Path
from uuid import UUID

from app.core.config import settings
from app.core.database import get_db
from app.models.case import Case
from app.models.evidence import Evidence, EvidenceStatus, FilesystemType
from app.schemas.evidence import EvidenceListResponse, EvidenceResponse, EvidenceVerifyResponse
from app.services.evidence_storage import get_storage_service
from app.services.filesystem_detector import get_filesystem_detector
from app.services.hash_service import get_hash_service
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/cases/{case_id}/evidence", tags=["evidence"])

logger = logging.getLogger(__name__)


@router.post("", response_model=EvidenceResponse, status_code=status.HTTP_201_CREATED)
async def add_evidence(
    case_id: UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    # Verify case exists
    case = await db.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    # Use storage service to store with streaming hash
    storage = get_storage_service()
    try:
        stored_path, size_bytes, sha256_hash = storage.store_evidence(
            case_id=case_id,
            evidence_id=None,  # Will be set after DB insert
            original_filename=file.filename or "unknown",
            file_stream=file.file,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Check for duplicate evidence
    existing = await db.execute(
        select(Evidence).where(Evidence.sha256_hash == sha256_hash)
    )
    if existing.scalar_one_or_none():
        # Clean up the stored file since it's a duplicate
        try:
            stored_path.unlink(missing_ok=True)
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Evidence with this hash already exists",
        )

    # Create evidence record
    evidence = Evidence(
        case_id=case_id,
        evidence_number=f"EVD-{Evidence.generate_evidence_number()}",
        original_filename=file.filename,
        stored_path=str(stored_path),
        size_bytes=size_bytes,
        sha256_hash=sha256_hash,
        mime_type=file.content_type,
        filesystem_type=FilesystemType.UNKNOWN,
        status=EvidenceStatus.IMPORTED,
    )
    db.add(evidence)
    await db.commit()
    await db.refresh(evidence)

    # Move file to correct evidence_id path
    new_stored_path = storage.get_evidence_original_dir(case_id, evidence.id) / stored_path.name
    new_stored_path.parent.mkdir(parents=True, exist_ok=True)
    stored_path.rename(new_stored_path)
    evidence.stored_path = str(new_stored_path)
    await db.commit()
    await db.refresh(evidence)

    # Create audit event
    from app.models.audit import AuditEvent
    from uuid import uuid4
    from datetime import UTC, datetime
    audit = AuditEvent(
        id=uuid4(),
        case_id=case_id,
        evidence_id=evidence.id,
        event_type="EVIDENCE_ADDED",
        actor="system",
        action="Evidence added",
        description=f"Evidence {evidence.evidence_number} added to case",
        input_hash=sha256_hash,
    )
    db.add(audit)
    await db.commit()

    return evidence


@router.get("", response_model=EvidenceListResponse)
async def list_evidence(
    case_id: UUID,
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
):
    case = await db.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    query = select(Evidence).where(Evidence.case_id == case_id)

    total_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(total_query)

    query = query.order_by(Evidence.acquired_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    evidence_list = result.scalars().all()

    return EvidenceListResponse(
        evidence=evidence_list,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{evidence_id}", response_model=EvidenceResponse)
async def get_evidence(case_id: UUID, evidence_id: UUID, db: AsyncSession = Depends(get_db)):
    evidence = await db.get(Evidence, evidence_id)
    if not evidence or evidence.case_id != case_id:
        raise HTTPException(status_code=404, detail="Evidence not found")
    return evidence


@router.post("/{evidence_id}/verify", response_model=EvidenceVerifyResponse)
async def verify_evidence(
    case_id: UUID,
    evidence_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Verify evidence integrity by recalculating SHA-256 hash."""
    evidence = await db.get(Evidence, evidence_id)
    if not evidence or evidence.case_id != case_id:
        raise HTTPException(status_code=404, detail="Evidence not found")

    file_path = Path(evidence.stored_path)
    if not file_path.exists():
        # Create audit event for failed verification (file missing)
        from app.models.audit import AuditEvent
        from uuid import uuid4
        from datetime import UTC, datetime
        audit = AuditEvent(
            id=uuid4(),
            case_id=case_id,
            evidence_id=evidence_id,
            event_type="EVIDENCE_INTEGRITY_FAILED",
            actor="system",
            action="Evidence verification failed - file missing",
            description=f"Evidence file not found at {evidence.stored_path}",
        )
        db.add(audit)
        await db.commit()
        
        raise HTTPException(status_code=404, detail="Evidence file not found on disk")

    # Calculate hash
    hash_service = get_hash_service()
    calculated_hash, matches = hash_service.verify_hash(file_path, evidence.sha256_hash)

    # Update evidence status
    if matches:
        evidence.status = EvidenceStatus.VERIFIED
        event_type = "EVIDENCE_VERIFIED"
        action = "Evidence integrity verified"
        description = f"SHA-256 verified for evidence {evidence.evidence_number}"
    else:
        evidence.status = EvidenceStatus.ERROR
        event_type = "EVIDENCE_INTEGRITY_FAILED"
        action = "Evidence integrity check failed"
        description = f"SHA-256 mismatch for evidence {evidence.evidence_number}"

    await db.flush()

    # Create audit event
    from app.models.audit import AuditEvent
    from uuid import uuid4
    from datetime import UTC, datetime
    audit = AuditEvent(
        id=uuid4(),
        case_id=case_id,
        evidence_id=evidence_id,
        event_type=event_type,
        actor="system",
        action=action,
        description=description,
        input_hash=evidence.sha256_hash,
        output_hash=calculated_hash,
    )
    db.add(audit)
    await db.commit()
    await db.refresh(evidence)

    return EvidenceVerifyResponse(
        evidence_id=str(evidence.id),
        stored_hash=evidence.sha256_hash,
        calculated_hash=calculated_hash,
        match=matches,
        status=evidence.status.value,
    )


@router.post("/{evidence_id}/detect-filesystem", response_model=dict)
async def detect_filesystem(
    case_id: UUID,
    evidence_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Detect filesystem type from evidence file."""
    evidence = await db.get(Evidence, evidence_id)
    if not evidence or evidence.case_id != case_id:
        raise HTTPException(status_code=404, detail="Evidence not found")

    file_path = Path(evidence.stored_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Evidence file not found on disk")

    detector = get_filesystem_detector()
    fs_type, confidence = detector.detect_with_confidence(file_path)

    evidence.filesystem_type = fs_type
    await db.commit()
    await db.refresh(evidence)

    # Create audit event
    from app.models.audit import AuditEvent
    from uuid import uuid4
    from datetime import UTC, datetime
    audit = AuditEvent(
        id=uuid4(),
        case_id=case_id,
        evidence_id=evidence_id,
        event_type="FILESYSTEM_DETECTED",
        actor="system",
        action="Filesystem detected",
        description=f"Detected {fs_type.value} filesystem with confidence {confidence:.0%}",
    )
    db.add(audit)
    await db.commit()

    return {
        "evidence_id": str(evidence.id),
        "filesystem_type": fs_type.value,
        "confidence": confidence,
    }


def generate_evidence_number() -> int:
    import random
    return random.randint(10000, 99999)


Evidence.generate_evidence_number = staticmethod(generate_evidence_number)