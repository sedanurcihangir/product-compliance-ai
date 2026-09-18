from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import ProductCategory
from app.schemas import EvaluationCreate, EvaluationResponse
from app.services.evaluation_service import run_evaluation

router = APIRouter(prefix="/api/evaluations", tags=["evaluations"])


@router.post("", response_model=EvaluationResponse, status_code=status.HTTP_200_OK)
def create_evaluation(payload: EvaluationCreate, db: Session = Depends(get_db)):
    category = db.get(ProductCategory, payload.product_category_id)
    if category is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product category not found.",
        )

    return run_evaluation(db, payload, category)
