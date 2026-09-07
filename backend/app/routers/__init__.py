from app.routers.countries import router as countries_router
from app.routers.product_categories import router as product_categories_router
from app.routers.regulations import router as regulations_router
from app.routers.requirements import router as requirements_router
from app.routers.risk_rules import router as risk_rules_router
from app.routers.sources import router as sources_router

__all__ = [
    "product_categories_router",
    "countries_router",
    "regulations_router",
    "requirements_router",
    "risk_rules_router",
    "sources_router",
]
