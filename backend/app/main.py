from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import (
    analytics_router,
    auth_router,
    countries_router,
    documents_router,
    evaluations_router,
    product_categories_router,
    product_distributions_router,
    products_router,
    regulations_router,
    requirements_router,
    risk_rules_router,
    sources_router,
)



app = FastAPI(title="Product Compliance AI")

# Allow the Next.js admin UI (browser) to call this API during local development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:3000",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(product_categories_router)
app.include_router(products_router)
app.include_router(countries_router)
app.include_router(regulations_router)
app.include_router(requirements_router)
app.include_router(risk_rules_router)
app.include_router(sources_router)
app.include_router(evaluations_router)
app.include_router(documents_router)
app.include_router(product_distributions_router)
app.include_router(analytics_router)



@app.get("/health")
def health():
    return {"status": "ok"}
