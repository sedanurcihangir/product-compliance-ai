from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Country
from app.schemas import CountryResponse

router = APIRouter(prefix="/api/countries", tags=["countries"])


@router.get("", response_model=list[CountryResponse])
def list_countries(db: Session = Depends(get_db)):
    result = db.execute(select(Country).order_by(Country.name))
    return result.scalars().all()
