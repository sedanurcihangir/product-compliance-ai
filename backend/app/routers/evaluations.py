from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.db import get_db
from app.deps.auth import get_current_user
from app.models import Product, ProductCategory
from app.models.evaluation import Evaluation
from app.models.user import User
from app.schemas import EvaluationCreate, EvaluationResponse
from app.schemas.evaluation import (
    EvaluationDetailResponse,
    EvaluationHistoryItem,
    EvaluationResult,
)
from app.services.evaluation_service import run_evaluation

router = APIRouter(prefix="/api/evaluations", tags=["evaluations"])


@router.post("", response_model=EvaluationResponse, status_code=status.HTTP_200_OK)
def create_evaluation(
    payload: EvaluationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = (
        db.query(Product)
        .options(joinedload(Product.product_category))
        .filter(Product.id == payload.product_id)
        .one_or_none()
    )
    if product is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product not found.",
        )
    category = product.product_category
    if category is None:
        category = db.get(ProductCategory, product.product_category_id)
    if category is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product category not found.",
        )
    if (
        payload.product_category_id is not None
        and payload.product_category_id != category.id
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="product_category_id does not match the selected product.",
        )

    response = run_evaluation(db, payload, category=category, product=product)
    result = response.evaluation
    result_payload = result.model_dump(mode="json")

    record = Evaluation(
        user_id=current_user.id,
        product_name=payload.product_name,
        product_category_id=category.id,
        product_id=product.id,
        product_description=payload.product_description,
        supplier_country=payload.supplier_country,
        product_url=str(payload.product_url) if payload.product_url else None,
        evaluation_mode=result.evaluation_mode,
        result_data=result_payload,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return EvaluationResponse(
        success=response.success,
        message=response.message,
        evaluation=result,
        evaluation_id=record.id,
    )


@router.get("/me", response_model=list[EvaluationHistoryItem])
def list_my_evaluations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.query(Evaluation)
        .options(
            joinedload(Evaluation.product_category),
            joinedload(Evaluation.product).joinedload(Product.product_category),
        )
        .filter(Evaluation.user_id == current_user.id)
        .order_by(Evaluation.created_at.desc(), Evaluation.id.desc())
        .all()
    )
    items: list[EvaluationHistoryItem] = []
    for row in rows:
        if row.product is not None and row.product.product_category is not None:
            category_id = row.product.product_category_id
            category_name = row.product.product_category.name
        elif row.product_category is not None:
            category_id = row.product_category_id
            category_name = row.product_category.name
        else:
            category_id = row.product_category_id
            category_name = ""
        items.append(
            EvaluationHistoryItem(
                id=row.id,
                product_name=row.product_name,
                product_id=row.product_id,
                product_category_id=category_id,
                product_category_name=category_name,
                supplier_country=row.supplier_country,
                evaluation_mode=row.evaluation_mode,
                created_at=row.created_at,
            )
        )
    return items


@router.get("/{evaluation_id}", response_model=EvaluationDetailResponse)
def get_my_evaluation(
    evaluation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = (
        db.query(Evaluation)
        .filter(
            Evaluation.id == evaluation_id,
            Evaluation.user_id == current_user.id,
        )
        .one_or_none()
    )
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evaluation not found.",
        )

    try:
        evaluation = EvaluationResult.model_validate(record.result_data)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Stored evaluation data is invalid.",
        ) from None

    return EvaluationDetailResponse(
        success=True,
        message="Stored evaluation loaded.",
        evaluation_id=record.id,
        evaluation=evaluation,
        created_at=record.created_at,
    )
