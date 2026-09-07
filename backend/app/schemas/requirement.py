from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.regulation import RegulationResponse


class RequirementCreate(BaseModel):
    regulation_id: int = Field(gt=0)
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    type: str | None = Field(default=None, max_length=255)

    @field_validator("title")
    @classmethod
    def title_must_not_be_blank(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("title must not be empty")
        return cleaned

    @field_validator("type")
    @classmethod
    def type_strip_blank_to_none(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class RequirementUpdate(BaseModel):
    regulation_id: int = Field(gt=0)
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    type: str | None = Field(default=None, max_length=255)

    @field_validator("title")
    @classmethod
    def title_must_not_be_blank(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("title must not be empty")
        return cleaned

    @field_validator("type")
    @classmethod
    def type_strip_blank_to_none(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class RequirementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    regulation_id: int
    title: str
    description: str | None = None
    type: str | None = None
    regulation: RegulationResponse
