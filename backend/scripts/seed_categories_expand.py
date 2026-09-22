"""
Idempotent seed: expand product categories (official-source-safe).

Rules:
- Do NOT modify existing Bluetooth Kulaklık regulations/requirements/risks/sources.
- Do NOT delete Demo Elektronik Ürün.
- Do NOT invent regulation links without explicit official product-group wording.
- Regulation get-or-create matches by (title, product_category_id) so Bluetooth
  rows are never reassigned.

Official source verified (ticaret.gov.tr product groups page, 2026/8):
  "Akıllı Saatler, Bluetooth Kulaklıklar vb. ürünlerin Telsiz ve Telekomünikasyon
   Terminal Ekipmanları Yönetmeliğine uygunluğunun denetimi..."

Therefore ONLY "Akıllı Saat" receives new Regulation/Requirement links in this seed.
Other new categories are created as ProductCategory rows only.

RiskRule: intentionally NOT created for Akıllı Saat. RiskRule is a global table with
keyword retrieval; adding parallel smartwatch rules leaked into Bluetooth evaluations.
"""

from __future__ import annotations

from datetime import date

from app.db import SessionLocal
from app.models import Country, ProductCategory, Regulation, Requirement, Source

TODAY = date.today()

CATEGORY_ONLY: list[tuple[str, str]] = [
    (
        "Kablosuz Hoparlör",
        "Türkiye'ye ithal edilmesi planlanan kablosuz hoparlör ürünleri için ön "
        "değerlendirme kategorisi. Resmi ithalat ürün grupları sayfasında bu "
        "ürün adı açıkça listelenmediği için kategori oluşturulmuş; mevzuat "
        "ilişkisi uydurulmamıştır.",
    ),
    (
        "Kablosuz Mouse",
        "Türkiye'ye ithal edilmesi planlanan kablosuz mouse ürünleri için ön "
        "değerlendirme kategorisi. Resmi kaynakta 'mouse pad' ifadesi farklı "
        "bir ürün grubunda geçmektedir; kablosuz mouse için açık ürün grubu "
        "eşlemesi doğrulanmadığı için mevzuat ilişkisi kurulmamıştır.",
    ),
    (
        "Kablosuz Oyun Kumandası",
        "Türkiye'ye ithal edilmesi planlanan kablosuz oyun kumandası ürünleri "
        "için ön değerlendirme kategorisi. Resmi 2026/8 metninde 'Uzaktan "
        "Kumanda Cihazları' ifadesi geçmekle birlikte 'oyun kumandası' açıkça "
        "adlandırılmadığı için mevzuat ilişkisi uydurulmamıştır.",
    ),
    (
        "Dizüstü Bilgisayar",
        "Türkiye'ye ithal edilmesi planlanan dizüstü bilgisayar ürünleri için "
        "ön değerlendirme kategorisi. Resmi ithalat ürün grupları sayfasında "
        "bu ürün adı açıkça listelenmediği için mevzuat ilişkisi kurulmamıştır.",
    ),
    (
        "Harici Güç Adaptörü",
        "Türkiye'ye ithal edilmesi planlanan harici güç adaptörü ürünleri için "
        "ön değerlendirme kategorisi. 2026/9 metninde genel 'elektrikli-"
        "elektronik cihazlar' ifadesi geçmekle birlikte 'güç adaptörü' açıkça "
        "adlandırılmadığı için mevzuat ilişkisi uydurulmamıştır.",
    ),
]

SMARTWATCH_NAME = "Akıllı Saat"
SMARTWATCH_DESCRIPTION = (
    "Türkiye'ye ithal edilmesi ve piyasaya arz edilmesi planlanan akıllı saat "
    "ürünleri için ön değerlendirme kategorisi. T.C. Ticaret Bakanlığı ithalat "
    "ürün grupları açıklamasında Akıllı Saatler, 2026/8 telsiz/telekomünikasyon "
    "terminal ekipmanları denetim grubunda açıkça belirtilmektedir."
)

REG1_TITLE = "Telsiz Ekipmanları Yönetmeliği"
REG1_DESCRIPTION = (
    "Telsiz ekipmanlarının piyasaya arzına ilişkin temel teknik gerekleri ve "
    "uygunluk değerlendirme yaklaşımını düzenleyen mevzuattır. Ticaret "
    "Bakanlığı, akıllı saatlerin ithalat denetiminde Telsiz ve "
    "Telekomünikasyon Terminal Ekipmanları Yönetmeliğine uygunluk denetimini "
    "ifade etmektedir."
)

REG2_TITLE = (
    "Telsiz ve Telekomünikasyon Terminal Ekipmanlarının İthalat Denetimi Tebliği "
    "(Ürün Güvenliği ve Denetimi: 2026/8)"
)
REG2_DESCRIPTION = (
    "Telsiz ve telekomünikasyon terminal ekipmanlarının ithalat aşamasındaki "
    "ürün güvenliği denetimini düzenleyen güncel ithalat denetimi mevzuatıdır. "
    "T.C. Ticaret Bakanlığı ürün grupları sayfasında Akıllı Saatler bu grup "
    "içinde açıkça belirtilmektedir."
)

REQS_REG1 = [
    {
        "title": "CE işareti kontrolü",
        "description": (
            "Akıllı saatlerin piyasaya arzında CE işareti gerekliliğinin kontrol "
            "edilmesi gerekir. Türkiye Ürün Kuralları Veri Tabanı, telsiz "
            "ekipmanlarının CE işareti taşımasının piyasaya arz için zorunlu "
            "olduğunu belirtmektedir."
        ),
        "type": "marking",
    },
    {
        "title": "Uygunluk Beyanı kontrolü",
        "description": (
            "Ürüne ilişkin uygunluk beyanının mevcut olup olmadığı ve ürünle "
            "ilişkili belgelerle tutarlılığının kontrol edilmesi gerekir."
        ),
        "type": "document",
    },
    {
        "title": "Üretici ve ithalatçı bilgilerinin kontrolü",
        "description": (
            "Ürünün, ambalajının veya kullanım kılavuzunun ilgili yerlerinde "
            "üretici ve/veya ithalatçı bilgilerinin bulunup bulunmadığının "
            "kontrol edilmesi gerekir."
        ),
        "type": "labeling",
    },
]

REQ_REG2 = {
    "title": "İthalat aşaması ürün güvenliği denetimi",
    "description": (
        "Akıllı saatlerin ithalat aşamasında ilgili telsiz ve telekomünikasyon "
        "terminal ekipmanları mevzuatına uygunluk yönünden denetime tabi "
        "olabileceği kontrol edilmelidir."
    ),
    "type": "import_control",
}

# RiskRule tablosu kategori FK'siz / global retrieval kullandığı için
# Akıllı Saat'e özel yeni RiskRule EKLENMEZ. Aksi halde Bluetooth değerlendirmesine
# anahtar kelime sızıntısı oluşur. Mevzuat+requirement zinciri yeterli grounded
# bağlam sağlar.

SOURCES = [
    {
        "organization": "T.C. Ticaret Bakanlığı",
        "url": (
            "https://ticaret.gov.tr/urun-guvenligi/ithalatta-urun-guvenligi-denetimleri/"
            "ithalatta-denetimi-gerceklestirilen-urun-gruplari"
        ),
        "publication_date": None,
        "last_checked": TODAY,
    },
    {
        "organization": "Türkiye Ürün Kuralları Veri Tabanı - Ticaret Bakanlığı",
        "url": (
            "https://urunkurallari.ticaret.gov.tr/tr/sektorel-rehber/"
            "iletisim-teknolojisi-telekomunikasyon-ve-veri-isleme/mevzuat"
        ),
        "publication_date": None,
        "last_checked": TODAY,
    },
]


def _get_or_create_category(db, *, name: str, description: str) -> ProductCategory:
    cat = (
        db.query(ProductCategory)
        .filter(ProductCategory.name == name)
        .one_or_none()
    )
    if cat is None:
        cat = ProductCategory(name=name, description=description)
        db.add(cat)
        db.flush()
        print(f"created_category id={cat.id} name={name}")
    else:
        # Do not overwrite Bluetooth descriptions; only fill empty/update new ones.
        if name != "Bluetooth Kulaklık":
            cat.description = description
        print(f"existing_category id={cat.id} name={name}")
    return cat


def _get_or_create_regulation(
    db,
    *,
    title: str,
    description: str,
    country_id: int,
    product_category_id: int,
    effective_date: date | None,
) -> Regulation:
    reg = (
        db.query(Regulation)
        .filter(
            Regulation.title == title,
            Regulation.product_category_id == product_category_id,
        )
        .one_or_none()
    )
    if reg is None:
        reg = Regulation(
            title=title,
            description=description,
            country_id=country_id,
            product_category_id=product_category_id,
            effective_date=effective_date,
            status="active",
        )
        db.add(reg)
        db.flush()
        print(f"created_regulation id={reg.id} category={product_category_id}")
    else:
        reg.description = description
        reg.country_id = country_id
        reg.effective_date = effective_date
        reg.status = "active"
        print(f"existing_regulation id={reg.id} category={product_category_id}")
    return reg


def _get_or_create_requirement(
    db,
    *,
    regulation_id: int,
    title: str,
    description: str,
    type_: str,
) -> Requirement:
    req = (
        db.query(Requirement)
        .filter(
            Requirement.regulation_id == regulation_id,
            Requirement.title == title,
        )
        .one_or_none()
    )
    if req is None:
        req = Requirement(
            regulation_id=regulation_id,
            title=title,
            description=description,
            type=type_,
        )
        db.add(req)
        db.flush()
        print(f"created_requirement id={req.id}")
    else:
        req.description = description
        req.type = type_
        print(f"existing_requirement id={req.id}")
    return req


def _get_or_create_source(
    db,
    *,
    organization: str,
    url: str,
    publication_date: date | None,
    last_checked: date | None,
) -> Source:
    source = db.query(Source).filter(Source.url == url).one_or_none()
    if source is None:
        source = Source(
            organization=organization,
            url=url,
            publication_date=publication_date,
            last_checked=last_checked,
        )
        db.add(source)
        db.flush()
        print(f"created_source id={source.id}")
    else:
        # Refresh last_checked only; keep organization if previously curated.
        source.last_checked = last_checked
        print(f"existing_source id={source.id}")
    return source


def main() -> None:
    db = SessionLocal()
    try:
        turkey = db.query(Country).filter(Country.code == "TR").one_or_none()
        if turkey is None:
            raise RuntimeError("Türkiye/TR country kaydı bulunamadı; seed durduruldu.")

        bluetooth = (
            db.query(ProductCategory)
            .filter(ProductCategory.name == "Bluetooth Kulaklık")
            .one_or_none()
        )
        if bluetooth is None:
            raise RuntimeError(
                "Bluetooth Kulaklık kategorisi bulunamadı; önce bluetooth seed çalıştırın."
            )
        print(f"bluetooth_preserved id={bluetooth.id}")

        for name, description in CATEGORY_ONLY:
            _get_or_create_category(db, name=name, description=description)

        smartwatch = _get_or_create_category(
            db,
            name=SMARTWATCH_NAME,
            description=SMARTWATCH_DESCRIPTION,
        )

        reg1 = _get_or_create_regulation(
            db,
            title=REG1_TITLE,
            description=REG1_DESCRIPTION,
            country_id=turkey.id,
            product_category_id=smartwatch.id,
            effective_date=date(2020, 11, 5),
        )
        reg2 = _get_or_create_regulation(
            db,
            title=REG2_TITLE,
            description=REG2_DESCRIPTION,
            country_id=turkey.id,
            product_category_id=smartwatch.id,
            effective_date=None,
        )

        for item in REQS_REG1:
            _get_or_create_requirement(
                db,
                regulation_id=reg1.id,
                title=item["title"],
                description=item["description"],
                type_=item["type"],
            )
        _get_or_create_requirement(
            db,
            regulation_id=reg2.id,
            title=REQ_REG2["title"],
            description=REQ_REG2["description"],
            type_=REQ_REG2["type"],
        )

        for item in SOURCES:
            _get_or_create_source(
                db,
                organization=item["organization"],
                url=item["url"],
                publication_date=item["publication_date"],
                last_checked=item["last_checked"],
            )

        db.commit()
        print("seed_categories_expand_commit_ok")

        cats = db.query(ProductCategory).order_by(ProductCategory.id).all()
        print(f"categories_total={len(cats)}")
        for c in cats:
            print(f"  {c.id}\t{c.name}")

        # Safety: Bluetooth regulations still point to Bluetooth category.
        bt_regs = (
            db.query(Regulation)
            .filter(Regulation.product_category_id == bluetooth.id)
            .all()
        )
        print(f"bluetooth_regulations_count={len(bt_regs)}")
        for r in bt_regs:
            print(f"  bt_reg {r.id} {r.title[:70]}")
        sw_regs = (
            db.query(Regulation)
            .filter(Regulation.product_category_id == smartwatch.id)
            .all()
        )
        print(f"smartwatch_regulations_count={len(sw_regs)}")
        for r in sw_regs:
            print(f"  sw_reg {r.id} {r.title[:70]}")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
