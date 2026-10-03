from datetime import datetime
from uuid import UUID

from app.core.database import get_db
from app.models.case import Case
from app.models.timeline import TimelineEvent
from app.schemas.timeline import TimelineResponse
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/cases/{case_id}/timeline", tags=["timeline"])


@router.get("", response_model=TimelineResponse)
async def get_timeline(
    case_id: UUID,
    start_time: datetime | None = Query(None),
    end_time: datetime | None = Query(None),
    source: str | None = Query(None),
    artifact_id: UUID | None = Query(None),
    limit: int = Query(1000, ge=1, le=10000),
    db: AsyncSession = Depends(get_db),
):
    case = await db.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    query = select(TimelineEvent).where(TimelineEvent.case_id == case_id)

    if start_time:
        query = query.where(TimelineEvent.event_timestamp >= start_time)
    if end_time:
        query = query.where(TimelineEvent.event_timestamp <= end_time)
    if source:
        query = query.where(TimelineEvent.source == source)
    if artifact_id:
        query = query.where(TimelineEvent.artifact_id == artifact_id)

    query = query.order_by(TimelineEvent.event_timestamp.asc()).limit(limit)

    result = await db.execute(query)
    events = result.scalars().all()

    total_query = select(func.count()).select_from(
        select(TimelineEvent).where(TimelineEvent.case_id == case_id).subquery()
    )
    total = await db.scalar(total_query)

    return TimelineResponse(events=events, total=total)
