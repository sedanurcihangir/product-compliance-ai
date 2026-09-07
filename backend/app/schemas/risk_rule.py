from pydantic import BaseModel, ConfigDict, Field, field_validator


class RiskRuleCreate(BaseModel):
    condition: str = Field(min_length=1)
    risk_level: str = Field(min_length=1, max_length=255)
    explanation: str | None = None

    @field_validator("condition", "risk_level")
    @classmethod
    def must_not_be_blank(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("must not be empty")
        return cleaned


class RiskRuleUpdate(BaseModel):
    condition: str = Field(min_length=1)
    risk_level: str = Field(min_length=1, max_length=255)
    explanation: str | None = None

    @field_validator("condition", "risk_level")
    @classmethod
    def must_not_be_blank(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("must not be empty")
        return cleaned


class RiskRuleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    condition: str
    risk_level: str
    explanation: str | None = None
