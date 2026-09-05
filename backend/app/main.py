from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import product_categories_router

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

app.include_router(product_categories_router)


@app.get("/health")
def health():
    return {"status": "ok"}
