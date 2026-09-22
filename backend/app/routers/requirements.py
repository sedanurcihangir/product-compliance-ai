from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.db import get_db
from app.deps.auth import get_current_admin_user
from app.models import Regulation, Requirement
from app.schemas import RequirementCreate, RequirementResponse, RequirementUpdate

router = APIRouter(
    prefix="/api/requirements",
    tags=["requirements"],
    dependencies=[Depends(get_current_admin_user)],
)

def _get_requirement_or_404(db: Session, requirement_id: int) -> Requirement:
    requirement = db.execute(
        select(Requirement)
        .options(
            joinedload(Requirement.regulation).joinedload(Regulation.country),
        )
        .where(Requirement.id == requirement_id)
    ).scalar_one_or_none()
    if requirement is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requirement not found.",
        )
    return requirement


def _ensure_regulation_exists(db: Session, regulation_id: int) -> Regulation:
    regulation = db.get(Regulation, regulation_id)
    if regulation is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Regulation not found.",
        )
    return regulation


@router.post("", response_model=RequirementResponse, status_code=status.HTTP_201_CREATED)
def create_requirement(payload: RequirementCreate, db: Session = Depends(get_db)):
    _ensure_regulation_exists(db, payload.regulation_id)
    requirement = Requirement(
        regulation_id=payload.regulation_id,
        title=payload.title,
        description=payload.description,
        type=payload.type,
    )
    db.add(requirement)
    db.commit()
    return _get_requirement_or_404(db, requirement.id)


@router.get("", response_model=list[RequirementResponse])
def list_requirements(db: Session = Depends(get_db)):
    result = db.execute(
        select(Requirement)
        .options(
            joinedload(Requirement.regulation).joinedload(Regulation.country),
        )
        .order_by(Requirement.id)
    )
    return result.scalars().unique().all()


@router.get("/{requirement_id}", response_model=RequirementResponse)
def get_requirement(requirement_id: int, db: Session = Depends(get_db)):
    return _get_requirement_or_404(db, requirement_id)


@router.put("/{requirement_id}", response_model=RequirementResponse)
def update_requirement(
    requirement_id: int,
    payload: RequirementUpdate,
    db: Session = Depends(get_db),
):
    requirement = _get_requirement_or_404(db, requirement_id)
    _ensure_regulation_exists(db, payload.regulation_id)

    requirement.regulation_id = payload.regulation_id
    requirement.title = payload.title
    requirement.description = payload.description
    requirement.type = payload.type
    db.commit()
    return _get_requirement_or_404(db, requirement.id)


@router.delete("/{requirement_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_requirement(requirement_id: int, db: Session = Depends(get_db)):
    requirement = db.get(Requirement, requirement_id)
    if requirement is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requirement not found.",
        )
    db.delete(requirement)
    db.commit()
    return None
