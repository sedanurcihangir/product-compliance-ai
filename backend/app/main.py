from fastapi import FastAPI

from app.routers import product_categories_router

app = FastAPI(title="Product Compliance AI")

app.include_router(product_categories_router)


@app.get("/health")
def health():
    return {"status": "ok"}
