from app.routers.countries import router as countries_router
from app.routers.product_categories import router as product_categories_router
from app.routers.regulations import router as regulations_router

__all__ = [
    "product_categories_router",
    "countries_router",
    "regulations_router",
]
