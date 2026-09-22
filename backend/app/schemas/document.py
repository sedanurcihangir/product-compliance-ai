from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


ALLOWED_DOCUMENT_TYPES = {
    "declaration_of_conformity",
}


class DocumentResponse(BaseModel):
    id: int
    evaluation_id: int
    original_filename: str
    document_type: str
    mime_type: str
    file_size: int
    page_count: int | None = None
    extraction_status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class DocumentDetailResponse(BaseModel):
    id: int
    evaluation_id: int
    original_filename: str
    document_type: str
    mime_type: str
    file_size: int
    page_count: int | None = None
    extraction_status: str
    created_at: datetime
    analysis_result: dict[str, Any] | None = None

    model_config = {"from_attributes": True}


class DocumentAnalysisResponse(BaseModel):
    id: int
    evaluation_id: int
    original_filename: str
    document_type: str
    mime_type: str
    file_size: int
    page_count: int | None = None
    extraction_status: str
    created_at: datetime
    analysis_result: dict[str, Any]

    model_config = {"from_attributes": True}


class DocumentAiAssessment(BaseModel):
    summary: str
    observations: list[str] = Field(default_factory=list)
    attention_points: list[str] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)


class DocumentUploadForm(BaseModel):
    document_type: str = Field(default="declaration_of_conformity")
