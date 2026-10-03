from uuid import UUID

from app.core.database import get_db
from app.models.artifact import Artifact
from app.models.case import Case
from app.schemas.artifact import (
    ArtifactDetailResponse,
    ArtifactListResponse,
)
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

router = APIRouter(prefix="/cases/{case_id}/artifacts", tags=["artifacts"])


@router.get("", response_model=ArtifactListResponse)
async def list_artifacts(
    case_id: UUID,
    artifact_type: str | None = Query(None),
    recovery_method: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    case = await db.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    query = select(Artifact).where(Artifact.case_id == case_id)

    if artifact_type:
        query = query.where(Artifact.artifact_type == artifact_type)
    if recovery_method:
        query = query.where(Artifact.recovery_method == recovery_method)

    total_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(total_query)

    query = query.order_by(Artifact.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    artifacts = result.scalars().all()

    return ArtifactListResponse(
        artifacts=artifacts,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{artifact_id}", response_model=ArtifactDetailResponse)
async def get_artifact(case_id: UUID, artifact_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Artifact)
        .options(selectinload(Artifact.observations))
        .where(Artifact.id == artifact_id, Artifact.case_id == case_id)
    )
    artifact = result.scalar_one_or_none()

    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found")

    return artifact


@router.get("/{artifact_id}/provenance")
async def get_artifact_provenance(case_id: UUID, artifact_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Artifact)
        .options(selectinload(Artifact.observations))
        .where(Artifact.id == artifact_id, Artifact.case_id == case_id)
    )
    artifact = result.scalar_one_or_none()

    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found")

    return {
        "artifact_id": str(artifact.id),
        "artifact_number": artifact.artifact_number,
        "name": artifact.name,
        "provenance": artifact.provenance,
        "observations": [
            {
                "engine_name": obs.engine_name,
                "source_offset": obs.source_offset,
                "source_inode": obs.source_inode,
                "engine_data": obs.engine_data,
            }
            for obs in artifact.observations
        ],
        "confidence_score": artifact.confidence_score,
        "confidence_signals": artifact.confidence_signals,
    }
