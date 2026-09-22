from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session, joinedload

from app.db import get_db
from app.deps.auth import get_current_user
from app.config import get_settings
from app.models.document import Document
from app.models.evaluation import Evaluation
from app.models.user import User
from app.schemas.document import (
    ALLOWED_DOCUMENT_TYPES,
    DocumentAnalysisResponse,
    DocumentDetailResponse,
    DocumentResponse,
)
from app.services.document_analysis import analyze_document
from app.services.pdf_service import (
    PdfValidationError,
    extract_pdf_text,
    validate_file_size,
    validate_pdf_magic,
)

router = APIRouter(tags=["documents"])


def _get_owned_evaluation(
    db: Session,
    *,
    evaluation_id: int,
    current_user: User,
) -> Evaluation:
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
    return record


@router.post(
    "/api/evaluations/{evaluation_id}/documents",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_evaluation_document(
    evaluation_id: int,
    file: UploadFile = File(...),
    document_type: str = Form(default="declaration_of_conformity"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_owned_evaluation(
        db,
        evaluation_id=evaluation_id,
        current_user=current_user,
    )

    doc_type = (document_type or "declaration_of_conformity").strip()
    if doc_type not in ALLOWED_DOCUMENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported document_type.",
        )

    original_filename = (file.filename or "").strip() or "upload.pdf"
    if not original_filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only .pdf files are accepted.",
        )

    content_type = (file.content_type or "").lower().strip()
    if content_type and content_type not in {
        "application/pdf",
        "application/x-pdf",
        "application/octet-stream",
    }:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Content-Type must be application/pdf.",
        )

    data = await file.read()
    file_size = len(data)

    try:
        validate_file_size(file_size)
        validate_pdf_magic(data)
        extraction = extract_pdf_text(data)
    except PdfValidationError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail=exc.message,
        ) from None
    finally:
        # Drop PDF bytes from local scope ASAP after extraction.
        data = b""

    record = Document(
        user_id=current_user.id,
        evaluation_id=evaluation_id,
        original_filename=original_filename[:512],
        stored_filename=None,
        document_type=doc_type,
        mime_type="application/pdf",
        file_size=file_size,
        page_count=extraction.page_count,
        extraction_status="ok",
        extracted_text=extraction.extracted_text,
        analysis_result=None,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get(
    "/api/evaluations/{evaluation_id}/documents",
    response_model=list[DocumentResponse],
)
def list_evaluation_documents(
    evaluation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_owned_evaluation(
        db,
        evaluation_id=evaluation_id,
        current_user=current_user,
    )
    rows = (
        db.query(Document)
        .filter(
            Document.evaluation_id == evaluation_id,
            Document.user_id == current_user.id,
        )
        .order_by(Document.created_at.desc(), Document.id.desc())
        .all()
    )
    return rows


@router.get(
    "/api/documents/{document_id}",
    response_model=DocumentDetailResponse,
)
def get_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = (
        db.query(Document)
        .filter(
            Document.id == document_id,
            Document.user_id == current_user.id,
        )
        .one_or_none()
    )
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found.",
        )
    return record


@router.post(
    "/api/documents/{document_id}/analyze",
    response_model=DocumentAnalysisResponse,
)
def analyze_owned_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = (
        db.query(Document)
        .filter(
            Document.id == document_id,
            Document.user_id == current_user.id,
        )
        .one_or_none()
    )
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found.",
        )

    evaluation = (
        db.query(Evaluation)
        .options(joinedload(Evaluation.product_category))
        .filter(
            Evaluation.id == record.evaluation_id,
            Evaluation.user_id == current_user.id,
        )
        .one_or_none()
    )
    if evaluation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evaluation not found.",
        )

    try:
        analyze_document(
            db,
            document=record,
            evaluation=evaluation,
            settings=get_settings(),
            product_category_name=(
                evaluation.product_category.name
                if evaluation.product_category is not None
                else None
            ),
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from None

    db.refresh(record)
    return record
