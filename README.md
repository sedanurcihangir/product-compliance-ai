# Product Compliance AI

Yurtdışından ürün ithal ederek Türkiye'de satış yapmak isteyen girişimciler için yapay zekâ destekli ön uygunluk ve karar destek sistemi (MVP).

Sistem resmi veya hukuki bir uygunluk kararı vermez; satın alma öncesi ön değerlendirme ve karar desteği sunmayı hedefler.

## Temel stack

- **Frontend:** Next.js
- **Backend:** Python + FastAPI
- **Database:** PostgreSQL
- **API:** REST (`/api/v1/...`)
- **ORM:** SQLAlchemy (planlanan)

*(İleride PRD kapsamında: pgvector, hazır LLM API, Python RAG pipeline — henüz geliştirilmiyor.)*

## Geliştirme

Tüm geliştirme **`develop`** branch üzerinde yapılır. `main` stabil branch olarak korunur.

Detaylı gereksinimler: [`docs/prd.pdf`](docs/prd.pdf)
