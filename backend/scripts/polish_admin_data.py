"""
One-shot admin data polish (local DB only).

Safe cleanup for professor/demo readiness:
- Reassign legacy ProductCategory FKs on regulations to Elektronik Ürünler
- Merge duplicate product-scoped regulation copies into canonical rows
- Delete unused legacy categories (0 products after reassignment)
- Delete DEMO TEST SOURCE (example.com) if present

Does NOT delete products, evaluations, distributions, or official sources.
Does NOT create Alembic migrations.
"""

from __future__ import annotations

from sqlalchemy import text

from app.db import SessionLocal
from app.models.product_category import ProductCategory
from app.models.regulation import Regulation
from app.models.requirement import Requirement
from app.models.source import Source

CANONICAL_CATEGORY_NAME = "Elektronik Ürünler"

# Duplicate regulation pairs created under the old "product-as-category" model.
# Keep canonical_id; fold duplicate_id into it.
REGULATION_MERGES: list[tuple[int, int]] = [
    (16, 18),  # Telsiz Ekipmanları Yönetmeliği
    (17, 19),  # İthalat Denetimi Tebliği 2026/8
]


def _merge_regulation(db, canonical_id: int, duplicate_id: int) -> None:
    canonical = db.get(Regulation, canonical_id)
    duplicate = db.get(Regulation, duplicate_id)
    if canonical is None or duplicate is None:
        print(f"skip merge {duplicate_id}->{canonical_id}: missing row")
        return
    if canonical.title != duplicate.title:
        raise RuntimeError(
            f"Refusing merge {duplicate_id}->{canonical_id}: titles differ "
            f"({canonical.title!r} vs {duplicate.title!r})",
        )

    # Move product links
    prod_ids = [
        row[0]
        for row in db.execute(
            text("select product_id from product_regulations where regulation_id=:rid"),
            {"rid": duplicate_id},
        ).fetchall()
    ]
    for pid in prod_ids:
        exists = db.execute(
            text(
                "select 1 from product_regulations "
                "where product_id=:pid and regulation_id=:rid"
            ),
            {"pid": pid, "rid": canonical_id},
        ).scalar()
        if not exists:
            db.execute(
                text(
                    "insert into product_regulations (product_id, regulation_id) "
                    "values (:pid, :rid)"
                ),
                {"pid": pid, "rid": canonical_id},
            )
        db.execute(
            text(
                "delete from product_regulations "
                "where product_id=:pid and regulation_id=:rid"
            ),
            {"pid": pid, "rid": duplicate_id},
        )

    # Drop duplicate requirements that already exist on canonical (same title+type)
    canon_keys = {
        (q.title.strip().lower(), (q.type or "").strip().lower())
        for q in db.query(Requirement).filter(Requirement.regulation_id == canonical_id)
    }
    for req in (
        db.query(Requirement).filter(Requirement.regulation_id == duplicate_id).all()
    ):
        key = (req.title.strip().lower(), (req.type or "").strip().lower())
        if key in canon_keys:
            db.delete(req)
        else:
            req.regulation_id = canonical_id
            db.add(req)

    db.flush()
    leftover = (
        db.query(Requirement).filter(Requirement.regulation_id == duplicate_id).count()
    )
    if leftover:
        raise RuntimeError(
            f"Cannot delete regulation {duplicate_id}: {leftover} requirements remain",
        )

    db.delete(duplicate)
    print(f"merged regulation {duplicate_id} -> {canonical_id}")


def main() -> int:
    db = SessionLocal()
    try:
        canonical = (
            db.query(ProductCategory)
            .filter(ProductCategory.name == CANONICAL_CATEGORY_NAME)
            .one_or_none()
        )
        if canonical is None:
            raise RuntimeError(f"Canonical category {CANONICAL_CATEGORY_NAME!r} missing")

        # 1) Point all regulations at canonical category (legacy FK only)
        moved = (
            db.query(Regulation)
            .filter(
                Regulation.product_category_id.isnot(None),
                Regulation.product_category_id != canonical.id,
            )
            .all()
        )
        for reg in moved:
            print(
                f"reassign reg {reg.id} category {reg.product_category_id} -> {canonical.id}",
            )
            reg.product_category_id = canonical.id
            db.add(reg)
        db.flush()

        # 1b) Point historical evaluations at canonical category (preserve rows)
        eval_moved = db.execute(
            text(
                "update evaluations set product_category_id=:cid "
                "where product_category_id is not null "
                "and product_category_id <> :cid"
            ),
            {"cid": canonical.id},
        ).rowcount
        print(f"reassign evaluations category -> {canonical.id} (rows={eval_moved})")
        db.flush()

        # 2) Merge duplicate regulation copies
        for canonical_id, duplicate_id in REGULATION_MERGES:
            _merge_regulation(db, canonical_id, duplicate_id)
        db.flush()

        # 3) Delete unused legacy categories (0 products, 0 regulations)
        for cat in db.query(ProductCategory).order_by(ProductCategory.id).all():
            if cat.id == canonical.id:
                continue
            prod_count = db.execute(
                text("select count(*) from products where product_category_id=:i"),
                {"i": cat.id},
            ).scalar()
            reg_count = db.execute(
                text("select count(*) from regulations where product_category_id=:i"),
                {"i": cat.id},
            ).scalar()
            if prod_count == 0 and reg_count == 0:
                print(f"delete unused category {cat.id} {cat.name!r}")
                db.delete(cat)
            else:
                print(
                    f"keep category {cat.id} {cat.name!r} "
                    f"(products={prod_count}, regs={reg_count})",
                )

        # 4) Remove demo source with example.com URL
        demo_sources = (
            db.query(Source)
            .filter(
                (Source.organization.ilike("%DEMO TEST SOURCE%"))
                | (Source.url.ilike("%example.com/demo-regulation-source%")),
            )
            .all()
        )
        for src in demo_sources:
            print(f"delete demo source {src.id} {src.organization!r}")
            db.delete(src)

        db.commit()

        # Verification summary
        print("--- after ---")
        cats = db.query(ProductCategory).order_by(ProductCategory.id).all()
        print("categories", [(c.id, c.name) for c in cats])
        for pid, name in [(1, "Bluetooth"), (2, "Akilli Saat")]:
            rows = db.execute(
                text(
                    "select regulation_id from product_regulations "
                    "where product_id=:pid order by regulation_id"
                ),
                {"pid": pid},
            ).fetchall()
            print(f"product {pid} regs", [r[0] for r in rows])
        print(
            "sources remaining",
            [(s.id, s.organization) for s in db.query(Source).order_by(Source.id)],
        )
        return 0
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        print(f"ERROR: {exc}")
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
