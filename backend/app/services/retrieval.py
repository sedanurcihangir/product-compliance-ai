from __future__ import annotations

import re
from dataclasses import dataclass
from urllib.parse import urlparse

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models import Country, Product, ProductCategory, Regulation, Requirement, RiskRule, Source
from app.models.product import ProductRegulation

MVP_COUNTRY_CODE = "TR"
_TOKEN_RE = re.compile(r"[0-9A-Za-zÇĞİÖŞÜçğıöşü]+", re.UNICODE)

# Generic tokens that create false relevance between DEMO placeholders and any product.
_STOPWORDS = {
    "icin",
    "için",
    "veya",
    "ile",
    "ve",
    "bir",
    "bu",
    "da",
    "de",
    "olan",
    "olarak",
    "ilgili",
    "gerekli",
    "gereken",
    "gerekir",
    "urun",
    "ürün",
    "urunun",
    "ürünün",
    "urunleri",
    "ürünleri",
    "bilgi",
    "belge",
    "belgeler",
    "belgelerin",
    "kontrol",
    "edilmesi",
    "edilmeli",
    "bulunmuyorsa",
    "mevcut",
    "oldugunun",
    "olduğunun",
    "dogrulanamamasi",
    "doğrulanamaması",
    "aciklama",
    "açıklama",
    "turkiye",
    "türkiye",
    "test",
    "demo",
    "teknik",
    "technical",
    "risk",
    "level",
    "medium",
    "high",
    "low",
    # URL / TLD noise (prevents 'TR' matching '*.gov.tr')
    "tr",
    "gov",
    "com",
    "org",
    "www",
    "http",
    "https",
    "html",
    "htm",
    "php",
}


@dataclass
class RetrievalBundle:
    turkey_found: bool
    regulations: list[Regulation]
    requirements: list[Requirement]
    risk_rules: list[RiskRule]
    sources: list[Source]
    query_tokens: set[str]


def _tokenize(text: str | None) -> set[str]:
    if not text:
        return set()
    return {token.lower() for token in _TOKEN_RE.findall(text) if len(token) > 1}


def _content_tokens(text: str | None) -> set[str]:
    return {token for token in _tokenize(text) if token not in _STOPWORDS}


def _score(text: str | None, query_tokens: set[str]) -> int:
    if not query_tokens:
        return 0
    return len(_tokenize(text) & query_tokens)


def _score_relevant(text: str | None, query_tokens: set[str]) -> int:
    """Score using non-generic tokens only (avoids DEMO/global false positives)."""
    if not query_tokens:
        return 0
    return len(_content_tokens(text) & query_tokens)


def _rank(items: list, query_tokens: set[str], text_fn, limit: int):
    scored = [(_score(text_fn(item), query_tokens), item) for item in items]
    scored.sort(key=lambda pair: (-pair[0], getattr(pair[1], "id", 0)))
    positive = [item for score, item in scored if score > 0]
    if positive:
        return positive[:limit]
    # No keyword overlap: keep a bounded MVP subset so LLM still has context.
    return [item for _, item in scored[:limit]]


def _rank_positive_only(items: list, query_tokens: set[str], text_fn, limit: int):
    """Return only positively relevant items; never fall back to unrelated globals."""
    scored = [(_score_relevant(text_fn(item), query_tokens), item) for item in items]
    scored.sort(key=lambda pair: (-pair[0], getattr(pair[1], "id", 0)))
    return [item for score, item in scored if score > 0][:limit]


def _is_placeholder_source(source: Source) -> bool:
    """Reject known non-official placeholder hosts (not DEMO-string-only filtering)."""
    try:
        host = (urlparse(source.url).hostname or "").lower()
    except Exception:
        return True
    return host in {"example.com", "example.org", "localhost"} or host.endswith(
        ".example.com"
    )


def retrieve_context(
    db: Session,
    *,
    category: ProductCategory,
    product_name: str,
    product_description: str,
    supplier_country: str,
    product: Product | None = None,
    regulation_limit: int = 8,
    requirement_limit: int = 12,
    risk_rule_limit: int = 8,
    source_limit: int = 8,
) -> RetrievalBundle:
    query_tokens = (
        _tokenize(product_name)
        | _tokenize(product_description)
        | _tokenize(category.name)
        | _tokenize(category.description)
        | _tokenize(supplier_country)
    )
    if product is not None:
        query_tokens |= _tokenize(product.name) | _tokenize(product.description)

    turkey = db.execute(
        select(Country).where(Country.code == MVP_COUNTRY_CODE)
    ).scalar_one_or_none()

    # Prefer Product → ProductRegulation M2M; fall back to legacy category FK.
    regulations: list[Regulation] = []
    if turkey is not None:
        if product is not None:
            m2m_ids = [
                row.regulation_id
                for row in db.execute(
                    select(ProductRegulation.regulation_id).where(
                        ProductRegulation.product_id == product.id
                    )
                ).all()
            ]
            if m2m_ids:
                regulations = (
                    db.execute(
                        select(Regulation)
                        .options(joinedload(Regulation.country))
                        .where(
                            Regulation.country_id == turkey.id,
                            Regulation.id.in_(m2m_ids),
                        )
                        .order_by(Regulation.id)
                    )
                    .scalars()
                    .unique()
                    .all()
                )
        if not regulations:
            # Legacy path: regulations still keyed by product_category_id.
            # When evaluating a Product under "Elektronik Ürünler", also match
            # regulations whose legacy category name equals the product name.
            legacy_category_ids = {category.id}
            if product is not None:
                legacy_cat = db.execute(
                    select(ProductCategory).where(ProductCategory.name == product.name)
                ).scalar_one_or_none()
                if legacy_cat is not None:
                    legacy_category_ids.add(legacy_cat.id)
            regulations = (
                db.execute(
                    select(Regulation)
                    .options(joinedload(Regulation.country))
                    .where(
                        Regulation.country_id == turkey.id,
                        Regulation.product_category_id.in_(legacy_category_ids),
                    )
                    .order_by(Regulation.id)
                )
                .scalars()
                .unique()
                .all()
            )

    regulations = _rank(
        regulations,
        query_tokens,
        lambda reg: f"{reg.title} {reg.description or ''}",
        regulation_limit,
    )
    regulation_ids = [reg.id for reg in regulations]

    requirements: list[Requirement] = []
    if regulation_ids:
        requirements = (
            db.execute(
                select(Requirement)
                .where(Requirement.regulation_id.in_(regulation_ids))
                .order_by(Requirement.id)
            )
            .scalars()
            .all()
        )
        requirements = _rank(
            requirements,
            query_tokens,
            lambda req: f"{req.title} {req.description or ''} {req.type or ''}",
            requirement_limit,
        )

    # Without category-linked regulations there is no safe grounded context for
    # independent RiskRule/Source tables → prefer empty over global/DEMO bleed.
    if not regulations:
        return RetrievalBundle(
            turkey_found=turkey is not None,
            regulations=[],
            requirements=[],
            risk_rules=[],
            sources=[],
            query_tokens=query_tokens,
        )

    # Expand relevance context with selected grounded regulation/requirement text.
    context_tokens = set(query_tokens)
    for reg in regulations:
        context_tokens |= _tokenize(reg.title) | _tokenize(reg.description)
    for req in requirements:
        context_tokens |= (
            _tokenize(req.title) | _tokenize(req.description) | _tokenize(req.type)
        )
    relevance_tokens = {token for token in context_tokens if token not in _STOPWORDS}

    all_risk_rules = list(
        db.execute(select(RiskRule).order_by(RiskRule.id)).scalars().all()
    )
    risk_rules = _rank_positive_only(
        all_risk_rules,
        relevance_tokens,
        lambda rule: f"{rule.condition} {rule.explanation or ''}",
        risk_rule_limit,
    )

    all_sources = [
        source
        for source in db.execute(select(Source).order_by(Source.id)).scalars().all()
        if not _is_placeholder_source(source)
    ]
    sources = _rank_positive_only(
        all_sources,
        relevance_tokens,
        lambda source: f"{source.organization} {source.url}",
        source_limit,
    )

    return RetrievalBundle(
        turkey_found=turkey is not None,
        regulations=regulations,
        requirements=requirements,
        risk_rules=risk_rules,
        sources=sources,
        query_tokens=query_tokens,
    )


def format_context_for_llm(bundle: RetrievalBundle) -> str:
    lines: list[str] = []

    lines.append("## Regulations")
    if not bundle.regulations:
        lines.append("(none)")
    for reg in bundle.regulations:
        lines.append(
            f"- id={reg.id}; title={reg.title}; status={reg.status}; "
            f"country={reg.country.name} ({reg.country.code}); "
            f"description={reg.description or ''}"
        )

    lines.append("## Requirements")
    if not bundle.requirements:
        lines.append("(none)")
    for req in bundle.requirements:
        lines.append(
            f"- id={req.id}; regulation_id={req.regulation_id}; title={req.title}; "
            f"type={req.type or ''}; description={req.description or ''}"
        )

    lines.append("## RiskRules")
    if not bundle.risk_rules:
        lines.append("(none)")
    for rule in bundle.risk_rules:
        lines.append(
            f"- id={rule.id}; risk_level={rule.risk_level}; "
            f"condition={rule.condition}; explanation={rule.explanation or ''}"
        )

    lines.append("## Sources")
    if not bundle.sources:
        lines.append("(none)")
    for source in bundle.sources:
        lines.append(
            f"- id={source.id}; organization={source.organization}; url={source.url}; "
            f"publication_date={source.publication_date}; last_checked={source.last_checked}"
        )

    return "\n".join(lines)
