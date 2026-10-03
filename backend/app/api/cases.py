from uuid import UUID

from app.core.database import get_db
from app.models.case import Case, CaseStatus
from app.schemas.case import CaseCreate, CaseListResponse, CaseResponse, CaseUpdate
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/cases", tags=["cases"])


@router.post("", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
async def create_case(case_data: CaseCreate, db: AsyncSession = Depends(get_db)):
    case = Case(
        case_number=f"CASE-{Case.generate_case_number()}",
        name=case_data.name,
        description=case_data.description,
        status=CaseStatus.OPEN,
    )
    db.add(case)
    await db.commit()
    await db.refresh(case)
    return case


@router.get("", response_model=CaseListResponse)
async def list_cases(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(Case)
    if status:
        query = query.where(Case.status == status)

    total_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(total_query)

    query = query.order_by(Case.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    cases = result.scalars().all()

    return CaseListResponse(
        cases=cases,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{case_id}", response_model=CaseResponse)
async def get_case(case_id: UUID, db: AsyncSession = Depends(get_db)):
    case = await db.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case


@router.patch("/{case_id}", response_model=CaseResponse)
async def update_case(case_id: UUID, case_data: CaseUpdate, db: AsyncSession = Depends(get_db)):
    case = await db.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    for field, value in case_data.model_dump(exclude_unset=True).items():
        setattr(case, field, value)

    await db.commit()
    await db.refresh(case)
    return case


@router.delete("/{case_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_case(case_id: UUID, db: AsyncSession = Depends(get_db)):
    case = await db.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    await db.delete(case)
    await db.commit()


# Add class method to Case model for generating case numbers
def generate_case_number() -> str:
    import random
    return f"{random.randint(10000, 99999)}"


Case.generate_case_number = staticmethod(generate_case_number)
