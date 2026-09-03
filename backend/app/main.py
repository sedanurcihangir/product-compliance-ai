from fastapi import FastAPI

app = FastAPI(title="Product Compliance AI")


@app.get("/health")
def health():
    return {"status": "ok"}
