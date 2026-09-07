from datetime import date

from pydantic import AnyHttpUrl, BaseModel, ConfigDict, Field, field_validator


class SourceCreate(BaseModel):
    organization: str = Field(min_length=1, max_length=255)
    url: AnyHttpUrl
    publication_date: date | None = None
    last_checked: date | None = None

    @field_validator("organization")
    @classmethod
    def organization_must_not_be_blank(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("organization must not be empty")
        return cleaned


class SourceUpdate(BaseModel):
    organization: str = Field(min_length=1, max_length=255)
    url: AnyHttpUrl
    publication_date: date | None = None
    last_checked: date | None = None

    @field_validator("organization")
    @classmethod
    def organization_must_not_be_blank(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("organization must not be empty")
        return cleaned


class SourceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization: str
    url: str
    publication_date: date | None = None
    last_checked: date | None = None
