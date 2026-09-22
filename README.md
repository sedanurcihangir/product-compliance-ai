# Ürün İthalatı Ön Uygunluk ve Regülasyon AI

Türkiye’ye ürün ithal etmeyi planlayan kullanıcıların ürün bilgilerini girerek ilgili mevzuat, gereklilik, risk kontrol noktaları ve resmi kaynaklar hakkında bir **ön değerlendirme (pre-assessment)** alabilmesini sağlayan bir **karar destek (decision support)** prototipidir.

Bu sistem:

- resmi uygunluk veya ithalat onayı vermez
- hukuki danışmanlık yerine geçmez
- TAREKS işlemlerini otomatikleştirmez

Amaç, satın alma / ithalat öncesi bilgilendirici bir karar desteği sunmaktır.

---

## MVP kapsamı

| Alan | Durum |
|------|--------|
| Ülke | Türkiye / TR |
| Ürün kapsamı | Elektronik ürünler (Product → kategori: Elektronik Ürünler) |
| Veri modeli | ProductCategory, Product, ProductRegulation, Regulation, Requirement, RiskRule, Source, Evaluation, ProductDistribution |
| Admin | CRUD panelleri + Dashboard V2 (harita / dağılım) |
| Kullanıcı | Auth, değerlendirme, geçmiş, analiz |
| Retrieval / RAG | Keyword / token overlap tabanlı |
| LLM | OpenAI-compatible Chat Completions |
| Fallback | Deterministic (kural tabanlı) değerlendirme |

MVP veri setinde **Bluetooth Kulaklık** ve **Akıllı Saat** için resmi kaynaklara dayalı gerçek kayıtlar bulunmaktadır. Ayrı olarak demo/test kayıtları da tutulur.

---

## Teknoloji stack

### Frontend
- Next.js
- React
- TypeScript

### Backend
- FastAPI
- Python
- Pydantic
- SQLAlchemy (aktif olarak kullanılmaktadır)

### Database
- PostgreSQL
- Alembic (migration)

### AI / Retrieval
- OpenAI-compatible Chat Completions
- Varsayılan model: `gpt-4o-mini`
- Retrieval / RAG (metin tabanlı; embedding yok)
- Structured JSON yanıt
- Pydantic validation
- Deterministic fallback

**Not:** `pgvector` veya embedding pipeline **kullanılmamaktadır**.

---

## Mimari (özet)

```
User
  ↓
Next.js Frontend
  ↓
FastAPI Backend  (/api/..., /health)
  ↓
Retrieval (ProductCategory + TR filtre + relevance)
  ↓
PostgreSQL regulatory data
  ↓
LLM (yapılandırılmışsa)
  ↓
Pydantic validation
  ↓
Deterministic fallback (LLM yok/hata ise)
  ↓
Evaluation Result
```

**Önemli:** LLM, grounded listeleri (Regulation / Requirement / RiskRule / Source) kendisi üretmez veya değiştirmez. Bu listeler retrieval tarafından veritabanından seçilir. LLM yalnızca ön değerlendirme metinlerini (özet, kontrol listesi, aksiyon vb.) üretebilir.

---

## Kullanıcı akışı (User Panel)

1. `/app` — giriş / tanıtım
2. `/app/evaluate` — ürün değerlendirme formu
3. Form alanları:
   - ürün adı
   - ürün kategorisi
   - ürün açıklaması
   - tedarikçi / menşe ülke
   - opsiyonel ürün URL’si
4. Değerlendirme isteği (`POST /api/evaluations`)
5. `/app/evaluate/result` — sonuç ekranı

Sonuçta tipik olarak şunlar gösterilir:

- ilgili mevzuatlar
- gereklilikler / kontrol edilmesi gereken belgeler
- risk kontrol noktaları
- önerilen aksiyonlar
- kaynaklar
- sınırlamalar
- `evaluation_mode` (`deterministic` veya `llm`)

---

## Admin akışı

Admin giriş: `/admin`

| Modül | Yol |
|--------|-----|
| Ürün kategorileri | `/admin/product-categories` |
| Mevzuatlar | `/admin/regulations` |
| Gereklilikler | `/admin/requirements` |
| Risk kuralları | `/admin/risk-rules` |
| Kaynaklar | `/admin/sources` |

Her modülde **CRUD** (Create / Read / Update / Delete) desteklenir.

İlişkiler:

- **Regulation → ProductCategory** (`product_category_id`, nullable FK)
- **Requirement → Regulation** (`regulation_id`)
- **Country:** Türkiye / TR temel kayıt; ülke listesi `GET /api/countries` ile okunur

---

## Gerçek regülasyon veri seti (Bluetooth Kulaklık)

Mevcut gerçek MVP veri seti **Bluetooth Kulaklık** kategorisine yöneliktir.

| Tip | Örnek kayıtlar |
|-----|----------------|
| Category | Bluetooth Kulaklık |
| Regulations | Telsiz Ekipmanları Yönetmeliği · Telsiz ve Telekomünikasyon Terminal Ekipmanlarının İthalat Denetimi Tebliği (Ürün Güvenliği ve Denetimi: 2026/8) |
| Requirements | CE işareti kontrolü · Uygunluk Beyanı kontrolü · Üretici ve ithalatçı bilgilerinin kontrolü · İthalat aşaması ürün güvenliği denetimi |
| RiskRule | 2 kontrollü risk kuralı |
| Source | 3 resmi kaynak |

Bu veriler **ön değerlendirme demosu** içindir; resmi hukuki karar belgesi değildir.

---

## Resmi kaynaklar

Aşağıdaki bağlantılar resmi kurum kaynaklarıdır (blog / forum / AI üretimi değildir):

1. **Türkiye Ürün Kuralları Veri Tabanı** — İletişim Teknolojisi / Telsiz Ekipmanları mevzuat listesi
   https://urunkurallari.ticaret.gov.tr/tr/sektorel-rehber/iletisim-teknolojisi-telekomunikasyon-ve-veri-isleme/mevzuat

2. **T.C. Ticaret Bakanlığı** — İthalatta Denetimi Gerçekleştirilen Ürün Grupları
   https://ticaret.gov.tr/urun-guvenligi/ithalatta-urun-guvenligi-denetimleri/ithalatta-denetimi-gerceklestirilen-urun-gruplari

3. **T.C. Ticaret Bakanlığı** — Ürün Güvenliği Çatı Mevzuatı (7223 çerçevesi)
   https://ticaret.gov.tr/urun-guvenligi/ab-teknik-mevzuat-uyumu/urun-guvenligi-cati-mevzuati-kanun-ve-uygulama-yonetmelikleri

---

## Demo ve gerçek veri ayrımı

Veritabanında hem **demo/test** hem **gerçek** kayıtlar bulunur.

| | Demo / test | Gerçek (Bluetooth) |
|--|-------------|---------------------|
| Category | id **20** | id **24** |
| Regulation | id **14** | id **16**, **17** |
| Requirement | id **7** | id **8**, **9**, **10**, **11** |
| RiskRule | id **5** | id **6**, **7** |
| Source | id **5** (`example.com`) | id **6**, **7**, **8** |

Demo kayıtlar **production / resmi mevzuat verisi olarak değerlendirilmemelidir**. Bluetooth değerlendirmesinde retrieval, ilgisiz demo RiskRule/Source sızıntısını engelleyecek şekilde filtreler.

---

## Retrieval / RAG

Sistem şu anda **keyword / token overlap** tabanlı retrieval kullanır.

- `pgvector` yok
- embedding yok
- vektör veritabanı yok

Akış (özet):

1. Ürün girdisi + ProductCategory
2. Ülke filtresi: **TR**
3. `Regulation.product_category_id` ile kategoriye bağlı mevzuatlar
4. Seçilen Regulation’lara bağlı Requirement’lar
5. RiskRule / Source için relevance (içerik token’ları; sıfır skorlu global fallback yok)
6. Sonuç LLM context’ine ve evaluation response’una grounded liste olarak gider

---

## LLM entegrasyonu

- LLM çağrısı **yalnızca backend** üzerinden yapılır
- API key frontend’e gönderilmez / `NEXT_PUBLIC_*` altında tutulmaz
- Varsayılan model: **`gpt-4o-mini`**
- `EVALUATION_USE_LLM=true` iken LLM denenir
- Yanıt JSON beklenir; **Pydantic** ile doğrulanır
- Geçersiz JSON, HTTP hatası veya yapılandırma eksikliğinde **deterministic fallback** çalışır

User ürün metni **untrusted**; retrieval çıktısı **trusted context** olarak ayrılır.

### Provider quota notu

LLM entegrasyonu ve fallback pipeline’ı mevcuttur. Mevcut geliştirme ortamında OpenAI sağlayıcı tarafında **API quota / credits** bulunmadığı için gerçek LLM E2E testinde **HTTP 429 insufficient_quota** alınmıştır.

Bu nedenle doğrulanmış demo akışı şu an **deterministic** modda çalışmaktadır. Bu, “AI entegrasyonu yok” anlamına gelmez; **gerçek LLM üretimi, provider kotası nedeniyle bu ortamda doğrulanamamıştır**.

---

## API

Endpoint prefix: **`/api/`** ( `/api/v1` değil )

Örnekler:

| Method | Path |
|--------|------|
| GET | `/health` |
| GET/POST/PUT/DELETE | `/api/product-categories` |
| GET | `/api/countries` |
| GET/POST/PUT/DELETE | `/api/regulations` |
| GET/POST/PUT/DELETE | `/api/requirements` |
| GET/POST/PUT/DELETE | `/api/risk-rules` |
| GET/POST/PUT/DELETE | `/api/sources` |
| POST | `/api/evaluations` |

Frontend, Next.js rewrite ile tarayıcıdan same-origin `/api/*` isteklerini FastAPI’ye proxy eder.

---

## Yerel çalıştırma (Windows)

### Önkoşullar
- Python 3.x + `backend/.venv`
- Node.js / npm
- Çalışan PostgreSQL ve `backend/.env` içinde `DATABASE_URL`

### Backend

```bash
cd backend
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend: http://127.0.0.1:8000
Health: http://127.0.0.1:8000/health

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:3000

Gerekirse migration:

```bash
cd backend
alembic upgrade head
```

---

## Ortam değişkenleri (backend)

`backend/.env` (Git’e **commit edilmemelidir**; `.gitignore` kapsamındadır):

| Değişken | Açıklama |
|----------|----------|
| `DATABASE_URL` | PostgreSQL bağlantısı |
| `OPENAI_API_KEY` | LLM anahtarı (opsiyonel; yoksa deterministic) |
| `OPENAI_MODEL` | örn. `gpt-4o-mini` |
| `OPENAI_BASE_URL` | varsayılan `https://api.openai.com/v1` |
| `EVALUATION_USE_LLM` | `true` / `false` |

Şablon: `backend/.env.example`
**Gerçek API key değerlerini README veya örnek dosyalara yazmayın.**

---

## Database

- PostgreSQL
- Alembic migration zinciri mevcut
- **Alembic head:** `0006_regulation_product_category`
  → `regulations.product_category_id` (nullable FK → `product_categories`)
- Ülke kaydı: **Türkiye / TR**
- DB içeriği: demo + gerçek Bluetooth veri seti

Bluetooth gerçek veriyi yeniden yüklemek için (idempotent, demo silmez):

```bash
cd backend
python scripts/seed_bluetooth_real_data.py
```

---

## Bilinen sınırlamalar

- MVP yalnızca **Türkiye / TR** kapsamındadır
- Ürün kapsamı bilinçli olarak **Bluetooth Kulaklık** ile sınırlıdır
- Sistem resmi uygunluk / ithalat onayı vermez
- Hukuki danışmanlık değildir
- TAREKS otomasyonu yoktur
- RiskRule serbest metin tabanlıdır; otomatik kesin risk skoru üretilmez
- RiskRule → Regulation / ProductCategory FK yoktur
- Source → Regulation FK yoktur
- RiskRule / Source seçimi relevance filtrelemeye dayanır
- Retrieval embedding / vector DB kullanmaz; `pgvector` yok
- Mevzuat crawler / update botu yoktur
- İthalat denetimi tebliği kaydında `effective_date` doğrulanamadığı için **NULL** bırakılmıştır (tarih uydurulmamıştır)
- Gerçek LLM üretimi provider quota nedeniyle mevcut ortamda doğrulanamamıştır
- Resmi mevzuat değişiklikleri için veri setinin **manuel** güncellenmesi gerekir

---

## MVP dışı (gelecek kapsam)

Aşağıdakiler **mevcut MVP’de yoktur**:

- pgvector / embeddings / gelişmiş semantic retrieval
- regulation update bot / official source crawler / change detection
- admin bildirimleri
- çoklu ülke / geniş ürün kategorileri
- gelişmiş risk motoru
- TAREKS entegrasyonu
- otomatik mevzuat güncelleme

---

## Güvenlik (kısa)

- API key yalnızca backend `.env` içinde tutulur
- Frontend bundle’a expose edilmez
- `.env` Git ignore altındadır
- Kullanıcının girdiği `product_url` resmi Source olarak kabul edilmez
- Prompt’ta untrusted ürün girdisi ile trusted retrieval context ayrılır

---

## Proje durumu (MVP Status)

**Status:** Functional MVP / Release Candidate

### Tamamlananlar
- Admin CRUD
- User evaluation akışı
- PostgreSQL veri modeli + Alembic
- Regulation ↔ ProductCategory ilişkisi
- Gerçek Bluetooth regülasyon veri seti
- Retrieval + demo sızıntı filtresi
- LLM entegrasyonu + deterministic fallback
- Kaynak gösterimi
- Browser E2E doğrulamaları
- Lint / build doğrulamaları

### Bilinen
- OpenAI provider quota nedeniyle gerçek LLM üretimi ayrıca kredi gerektirir
- MVP kapsamı bilinçli olarak dardır
- Teslim/demo için deterministic ön değerlendirme akışı doğrulanmıştır

Geliştirme **`develop`** branch üzerinde yapılır; `main` stabil tutulur.

Detaylı ürün gereksinimleri: [`docs/prd.pdf`](docs/prd.pdf)
