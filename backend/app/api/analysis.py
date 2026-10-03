from uuid import UUID

from app.core.database import async_session_factory, get_db
from app.models.analysis_job import AnalysisJob, JobType
from app.models.case import Case
from app.models.evidence import Evidence
from app.orchestrator.service import OrchestrationService
from app.schemas.analysis import (
    AnalysisJobCreate,
    AnalysisJobDetailResponse,
    AnalysisJobResponse,
)
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/cases/{case_id}/analysis", tags=["analysis"])


@router.post("", response_model=AnalysisJobResponse, status_code=status.HTTP_201_CREATED)
async def create_analysis(
    case_id: UUID,
    job_data: AnalysisJobCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    case = await db.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    evidence = await db.get(Evidence, job_data.evidence_id)
    if not evidence or evidence.case_id != case_id:
        raise HTTPException(status_code=404, detail="Evidence not found in this case")

    orchestrator = OrchestrationService(db)
    job = await orchestrator.create_job(
        case_id=case_id,
        evidence_id=job_data.evidence_id,
        job_type=JobType(job_data.job_type),
        config=job_data.config,
    )
    await db.commit()
    await db.refresh(job)

    # Run in background
    background_tasks.add_task(run_analysis_job, job.id)

    return job


@router.get("", response_model=list[AnalysisJobResponse])
async def list_analysis_jobs(
    case_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    case = await db.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    result = await db.execute(
        select(AnalysisJob)
        .where(AnalysisJob.case_id == case_id)
        .order_by(AnalysisJob.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{job_id}", response_model=AnalysisJobDetailResponse)
async def get_analysis_job(case_id: UUID, job_id: UUID, db: AsyncSession = Depends(get_db)):
    job = await db.get(AnalysisJob, job_id)
    if not job or job.case_id != case_id:
        raise HTTPException(status_code=404, detail="Analysis job not found")
    return job


@router.get("/{job_id}/status")
async def get_job_status(case_id: UUID, job_id: UUID, db: AsyncSession = Depends(get_db)):
    job = await db.get(AnalysisJob, job_id)
    if not job or job.case_id != case_id:
        raise HTTPException(status_code=404, detail="Analysis job not found")

    return {
        "job_id": str(job.id),
        "status": job.status,
        "current_stage": job.current_stage,
        "progress_percent": job.progress_percent,
        "error": job.error,
    }


async def run_analysis_job(job_id: UUID):
    """Background task to run analysis job."""
    async with async_session_factory() as db:
        orchestrator = OrchestrationService(db)
        try:
            await orchestrator.run_job(job_id)
            await db.commit()
        except Exception:
            # Error is handled in run_job
            await db.rollback()
