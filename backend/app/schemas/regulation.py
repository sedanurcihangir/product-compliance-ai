from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.country import CountryResponse

RegulationStatus = Literal["active", "inactive"]


class RegulationCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    country_id: int = Field(gt=0)
    effective_date: date | None = None
    status: RegulationStatus = "active"

    @field_validator("title")
    @classmethod
    def title_must_not_be_blank(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("title must not be empty")
        return cleaned


class RegulationUpdate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    country_id: int = Field(gt=0)
    effective_date: date | None = None
    status: RegulationStatus

    @field_validator("title")
    @classmethod
    def title_must_not_be_blank(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("title must not be empty")
        return cleaned


class RegulationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str | None = None
    country_id: int
    effective_date: date | None = None
    status: RegulationStatus
    country: CountryResponse
