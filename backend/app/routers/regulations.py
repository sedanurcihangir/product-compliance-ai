from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.db import get_db
from app.models import Country, Regulation
from app.schemas import RegulationCreate, RegulationResponse, RegulationUpdate

router = APIRouter(prefix="/api/regulations", tags=["regulations"])


def _get_regulation_or_404(db: Session, regulation_id: int) -> Regulation:
    regulation = db.execute(
        select(Regulation)
        .options(joinedload(Regulation.country))
        .where(Regulation.id == regulation_id)
    ).scalar_one_or_none()
    if regulation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Regulation not found.",
        )
    return regulation


def _ensure_country_exists(db: Session, country_id: int) -> Country:
    country = db.get(Country, country_id)
    if country is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Country not found.",
        )
    return country


@router.post("", response_model=RegulationResponse, status_code=status.HTTP_201_CREATED)
def create_regulation(payload: RegulationCreate, db: Session = Depends(get_db)):
    _ensure_country_exists(db, payload.country_id)
    regulation = Regulation(
        title=payload.title,
        description=payload.description,
        country_id=payload.country_id,
        effective_date=payload.effective_date,
        status=payload.status,
    )
    db.add(regulation)
    db.commit()
    return _get_regulation_or_404(db, regulation.id)


@router.get("", response_model=list[RegulationResponse])
def list_regulations(db: Session = Depends(get_db)):
    result = db.execute(
        select(Regulation)
        .options(joinedload(Regulation.country))
        .order_by(Regulation.id)
    )
    return result.scalars().unique().all()


@router.get("/{regulation_id}", response_model=RegulationResponse)
def get_regulation(regulation_id: int, db: Session = Depends(get_db)):
    return _get_regulation_or_404(db, regulation_id)


@router.put("/{regulation_id}", response_model=RegulationResponse)
def update_regulation(
    regulation_id: int,
    payload: RegulationUpdate,
    db: Session = Depends(get_db),
):
    regulation = _get_regulation_or_404(db, regulation_id)
    _ensure_country_exists(db, payload.country_id)

    regulation.title = payload.title
    regulation.description = payload.description
    regulation.country_id = payload.country_id
    regulation.effective_date = payload.effective_date
    regulation.status = payload.status
    db.commit()
    return _get_regulation_or_404(db, regulation.id)


@router.delete("/{regulation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_regulation(regulation_id: int, db: Session = Depends(get_db)):
    regulation = db.get(Regulation, regulation_id)
    if regulation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Regulation not found.",
        )
    db.delete(regulation)
    db.commit()
    return None
