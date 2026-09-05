from pydantic import BaseModel, ConfigDict, Field, field_validator


class CountryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    code: str
