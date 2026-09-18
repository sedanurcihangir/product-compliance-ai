"""
Idempotent seed for Bluetooth Kulaklık REAL regulation MVP data.

- Does NOT delete or modify DEMO records.
- Re-running updates existing REAL records matched by unique name/title/condition/organization+url.
- No migrations, no secrets, no scraping into content fields beyond curated text.

Official source URLs used (verified as ticaret.gov.tr / mevzuat.gov.tr / urunkurallari.ticaret.gov.tr):
1) https://urunkurallari.ticaret.gov.tr/tr/sektorel-rehber/iletisim-teknolojisi-telekomunikasyon-ve-veri-isleme/mevzuat
2) https://ticaret.gov.tr/urun-guvenligi/ithalatta-urun-guvenligi-denetimleri/ithalatta-denetimi-gerceklestirilen-urun-gruplari
3) https://ticaret.gov.tr/urun-guvenligi/ab-teknik-mevzuat-uyumu/urun-guvenligi-cati-mevzuati-kanun-ve-uygulama-yonetmelikleri
"""

from __future__ import annotations

from datetime import date

from app.db import SessionLocal
from app.models import Country, ProductCategory, Regulation, Requirement, RiskRule, Source

CATEGORY_NAME = "Bluetooth Kulaklık"
CATEGORY_DESCRIPTION = (
    "Türkiye'ye ithal edilmesi ve piyasaya arz edilmesi planlanan, kablosuz iletişim "
    "özelliğine sahip tüketici tipi Bluetooth kulaklık ürünleri için MVP ön değerlendirme "
    "kategorisi."
)

REG1_TITLE = "Telsiz Ekipmanları Yönetmeliği"
REG1_DESCRIPTION = (
    "Telsiz ekipmanlarının piyasaya arzına ilişkin temel teknik gerekleri, uygunluk "
    "değerlendirme yaklaşımını ve işaretleme/uygunlukla ilgili yükümlülükleri düzenleyen "
    "mevzuattır. Bluetooth kulaklıklar telsiz ekipmanı niteliğindeki ürünler olarak bu "
    "kapsamda değerlendirilebilir."
)

REG2_TITLE = (
    "Telsiz ve Telekomünikasyon Terminal Ekipmanlarının İthalat Denetimi Tebliği "
    "(Ürün Güvenliği ve Denetimi: 2026/8)"
)
REG2_DESCRIPTION = (
    "Telsiz ve telekomünikasyon terminal ekipmanlarının ithalat aşamasındaki ürün "
    "güvenliği denetimini düzenleyen güncel ithalat denetimi mevzuatıdır. T.C. Ticaret "
    "Bakanlığı'nın ürün grupları açıklamasında Bluetooth kulaklıklar açıkça bu grup "
    "içinde belirtilmektedir."
)

REQS_REG1 = [
    {
        "title": "CE işareti kontrolü",
        "description": (
            "Telsiz ekipmanlarının piyasaya arzında CE işareti gerekliliğinin kontrol "
            "edilmesi gerekir. Türkiye Ürün Kuralları Veri Tabanı, telsiz ekipmanlarının "
            "CE işareti taşımasının piyasaya arz için zorunlu olduğunu belirtmektedir."
        ),
        "type": "marking",
    },
    {
        "title": "Uygunluk Beyanı kontrolü",
        "description": (
            "Ürüne ilişkin uygunluk beyanının mevcut olup olmadığı ve ürünle ilişkili "
            "belgelerle tutarlılığının kontrol edilmesi gerekir."
        ),
        "type": "document",
    },
    {
        "title": "Üretici ve ithalatçı bilgilerinin kontrolü",
        "description": (
            "Ürünün, ambalajının veya kullanım kılavuzunun ilgili yerlerinde üretici "
            "ve/veya ithalatçı bilgilerinin bulunup bulunmadığının kontrol edilmesi gerekir."
        ),
        "type": "labeling",
    },
]

REQ_REG2 = {
    "title": "İthalat aşaması ürün güvenliği denetimi",
    "description": (
        "Bluetooth kulaklıkların ithalat aşamasında ilgili telsiz ve telekomünikasyon "
        "terminal ekipmanları mevzuatına uygunluk yönünden denetime tabi olabileceği "
        "kontrol edilmelidir."
    ),
    "type": "import_control",
}

RISK_RULES = [
    {
        "condition": (
            "Bluetooth kulaklık için CE işareti veya uygunlukla ilgili gerekli "
            "bilgi/belgelerin mevcut olduğunun doğrulanamaması"
        ),
        "risk_level": "medium",
        "explanation": (
            "Ürünün ilgili teknik mevzuata uygunluğunun ön değerlendirme kapsamında "
            "doğrulanması zorlaşır. Eksik veya doğrulanamayan bilgi nedeniyle ek kontrol "
            "gerekebilir."
        ),
    },
    {
        "condition": (
            "Ürünün ithalat aşamasında ilgili telsiz ve telekomünikasyon terminal "
            "ekipmanları denetimi kapsamına girip girmediğinin doğrulanamaması"
        ),
        "risk_level": "medium",
        "explanation": (
            "İthalat aşamasındaki uygunluk kontrollerinin kapsamı ürünün teknik "
            "özellikleri ve ilgili mevzuata göre ayrıca doğrulanmalıdır."
        ),
    },
]

TODAY = date.today()

SOURCES = [
    {
        "organization": "Türkiye Ürün Kuralları Veri Tabanı - Ticaret Bakanlığı",
        "url": (
            "https://urunkurallari.ticaret.gov.tr/tr/sektorel-rehber/"
            "iletisim-teknolojisi-telekomunikasyon-ve-veri-isleme/mevzuat"
        ),
        # Sector legislation page; exact page publication date not independently verified here.
        "publication_date": None,
        "last_checked": TODAY,
        "supports": "Telsiz Ekipmanları Yönetmeliği listesi / sektörel mevzuat rehberi",
    },
    {
        "organization": "T.C. Ticaret Bakanlığı",
        "url": (
            "https://ticaret.gov.tr/urun-guvenligi/ithalatta-urun-guvenligi-denetimleri/"
            "ithalatta-denetimi-gerceklestirilen-urun-gruplari"
        ),
        # Exact publication_date for this HTML page was not independently verified; leave NULL.
        "publication_date": None,
        "last_checked": TODAY,
        "supports": "2026/8 ithalat denetimi ürün grubu (Bluetooth kulaklıklar dahil)",
    },
    {
        "organization": "T.C. Ticaret Bakanlığı - Ürün Güvenliği Çatı Mevzuatı",
        "url": (
            "https://ticaret.gov.tr/urun-guvenligi/ab-teknik-mevzuat-uyumu/"
            "urun-guvenligi-cati-mevzuati-kanun-ve-uygulama-yonetmelikleri"
        ),
        # Kanun yayım tarihi (RG 12.03.2020 / 31066) resmi kaynaklarda doğrulanmıştır.
        "publication_date": date(2020, 3, 12),
        "last_checked": TODAY,
        "supports": "7223 Sayılı Ürün Güvenliği ve Teknik Düzenlemeler Kanunu",
    },
]


def _get_or_create_category(db) -> ProductCategory:
    cat = (
        db.query(ProductCategory)
        .filter(ProductCategory.name == CATEGORY_NAME)
        .one_or_none()
    )
    if cat is None:
        cat = ProductCategory(name=CATEGORY_NAME, description=CATEGORY_DESCRIPTION)
        db.add(cat)
        db.flush()
        print(f"created_category id={cat.id}")
    else:
        cat.description = CATEGORY_DESCRIPTION
        print(f"existing_category id={cat.id}")
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
    reg = db.query(Regulation).filter(Regulation.title == title).one_or_none()
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
        print(f"created_regulation id={reg.id} title={title[:60]}")
    else:
        reg.description = description
        reg.country_id = country_id
        reg.product_category_id = product_category_id
        reg.effective_date = effective_date
        reg.status = "active"
        print(f"existing_regulation id={reg.id} title={title[:60]}")
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
        print(f"created_requirement id={req.id} title={title}")
    else:
        req.description = description
        req.type = type_
        print(f"existing_requirement id={req.id} title={title}")
    return req


def _get_or_create_risk_rule(
    db,
    *,
    condition: str,
    risk_level: str,
    explanation: str,
) -> RiskRule:
    rule = db.query(RiskRule).filter(RiskRule.condition == condition).one_or_none()
    if rule is None:
        rule = RiskRule(
            condition=condition,
            risk_level=risk_level,
            explanation=explanation,
        )
        db.add(rule)
        db.flush()
        print(f"created_risk_rule id={rule.id}")
    else:
        rule.risk_level = risk_level
        rule.explanation = explanation
        print(f"existing_risk_rule id={rule.id}")
    return rule


def _get_or_create_source(
    db,
    *,
    organization: str,
    url: str,
    publication_date: date | None,
    last_checked: date | None,
) -> Source:
    source = (
        db.query(Source)
        .filter(Source.organization == organization, Source.url == url)
        .one_or_none()
    )
    if source is None and "Çatı Mevzuatı" in organization:
        # Migrate earlier seed row that used mevzuat.gov.tr Kanun 7223 URL.
        source = (
            db.query(Source)
            .filter(Source.url.like("%MevzuatNo=7223%"))
            .one_or_none()
        )
    if source is None:
        source = (
            db.query(Source)
            .filter(Source.url == url)
            .one_or_none()
        )
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
        source.organization = organization
        source.url = url
        source.publication_date = publication_date
        source.last_checked = last_checked
        print(f"existing_source id={source.id}")
    return source


def main() -> None:
    db = SessionLocal()
    try:
        turkey = db.query(Country).filter(Country.code == "TR").one_or_none()
        if turkey is None:
            raise RuntimeError("Türkiye/TR country kaydı bulunamadı; seed durduruldu.")

        demo_cats = (
            db.query(ProductCategory)
            .filter(ProductCategory.name.like("Demo%"))
            .count()
        )
        print(f"demo_categories_preserved_count={demo_cats}")

        category = _get_or_create_category(db)

        # Reg1 effective_date verified via Türkiye Ürün Kuralları Veri Tabanı: 05.11.2020
        reg1 = _get_or_create_regulation(
            db,
            title=REG1_TITLE,
            description=REG1_DESCRIPTION,
            country_id=turkey.id,
            product_category_id=category.id,
            effective_date=date(2020, 11, 5),
        )
        # Reg2: title/scope verified via ticaret.gov.tr product groups page (2026/8 + Bluetooth).
        # Exact Official Gazette effective_date for 2026/8 was not independently confirmed
        # against resmigazete.gov.tr in this seed run → leave NULL (do not invent).
        reg2 = _get_or_create_regulation(
            db,
            title=REG2_TITLE,
            description=REG2_DESCRIPTION,
            country_id=turkey.id,
            product_category_id=category.id,
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

        for item in RISK_RULES:
            _get_or_create_risk_rule(
                db,
                condition=item["condition"],
                risk_level=item["risk_level"],
                explanation=item["explanation"],
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
        print("seed_commit_ok")
        print(
            "totals",
            f"countries={db.query(Country).count()}",
            f"categories={db.query(ProductCategory).count()}",
            f"regulations={db.query(Regulation).count()}",
            f"requirements={db.query(Requirement).count()}",
            f"risk_rules={db.query(RiskRule).count()}",
            f"sources={db.query(Source).count()}",
        )
        print(f"category_id={category.id} reg1_id={reg1.id} reg2_id={reg2.id}")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
