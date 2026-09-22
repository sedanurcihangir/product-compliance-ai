from datetime import date, datetime
from typing import Literal

from pydantic import AnyHttpUrl, BaseModel, Field, field_validator

from app.schemas.country import CountryResponse


class EvaluationCreate(BaseModel):
    product_name: str = Field(min_length=1, max_length=255)
    product_id: int = Field(gt=0)
    # Optional; when provided must match the selected product's category.
    product_category_id: int | None = Field(default=None, gt=0)
    product_description: str = Field(min_length=1)
    supplier_country: str = Field(min_length=1, max_length=255)
    product_url: AnyHttpUrl | None = None

    @field_validator("product_name", "product_description", "supplier_country")
    @classmethod
    def must_not_be_blank(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("must not be empty")
        return cleaned


class EvaluationProduct(BaseModel):
    product_name: str
    product_id: int | None = None
    product_category_id: int
    product_category_name: str
    product_description: str
    supplier_country: str
    product_url: str | None = None


class EvaluationRegulation(BaseModel):
    id: int
    title: str
    description: str | None = None
    status: str
    country: CountryResponse


class EvaluationRequirement(BaseModel):
    id: int
    title: str
    description: str | None = None
    type: str | None = None
    regulation_id: int


class EvaluationRiskRule(BaseModel):
    id: int
    condition: str
    risk_level: str
    explanation: str | None = None


class EvaluationSource(BaseModel):
    id: int
    organization: str
    url: str
    publication_date: date | None = None
    last_checked: date | None = None


class AiRiskAssessment(BaseModel):
    level: str
    reason: str


class AiAssessment(BaseModel):
    summary: str
    missing_information: list[str] = Field(default_factory=list)
    risk_assessment: AiRiskAssessment
    recommended_actions: list[str] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)


class EvaluationResult(BaseModel):
    product: EvaluationProduct
    regulations: list[EvaluationRegulation]
    requirements: list[EvaluationRequirement]
    risk_rules: list[EvaluationRiskRule]
    sources: list[EvaluationSource]
    limitations: list[str]
    evaluation_mode: Literal["deterministic", "llm"] = "deterministic"
    ai_assessment: AiAssessment | None = None


class EvaluationResponse(BaseModel):
    success: bool
    message: str
    evaluation: EvaluationResult
    evaluation_id: int | None = None


class EvaluationHistoryItem(BaseModel):
    id: int
    product_name: str
    product_id: int | None = None
    product_category_id: int
    product_category_name: str
    supplier_country: str
    evaluation_mode: str
    created_at: datetime


class EvaluationDetailResponse(BaseModel):
    success: bool
    message: str
    evaluation_id: int
    evaluation: EvaluationResult
    created_at: datetime


# Backward-compatible alias.
EvaluationData = EvaluationResult
