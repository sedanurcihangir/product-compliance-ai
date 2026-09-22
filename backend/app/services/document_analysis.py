from __future__ import annotations

import re
import unicodedata
from typing import Any

from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.models.document import Document
from app.models.evaluation import Evaluation
from app.models.regulation import Regulation
from app.models.requirement import Requirement
from app.services.llm_client import (
    LlmConfigurationError,
    LlmRequestError,
    LlmResponseError,
    generate_document_ai_assessment,
)
from app.services.prompts import (
    DOCUMENT_ANALYSIS_SYSTEM_PROMPT,
    build_document_analysis_user_prompt,
)

# Controlled keyword rules keyed by requirement title patterns (case-insensitive).
# Kept intentionally small for MVP Bluetooth / declaration-of-conformity checks.
_RULES: list[dict[str, Any]] = [
    {
        "title_contains": ["ce işareti"],
        "keywords": ["CE", "CE işareti", "CE mark", "CE marking"],
        "mode": "match",
    },
    {
        "title_contains": ["uygunluk beyanı"],
        "keywords": [
            "Declaration of Conformity",
            "Uygunluk Beyanı",
            "DoC",
            "Declaration of Conformity (DoC)",
        ],
        "mode": "match",
    },
    {
        "title_contains": ["üretici", "ithalatçı"],
        "keywords": [
            "manufacturer",
            "manufacturer name",
            "üretici",
            "importer",
            "ithalatçı",
        ],
        "mode": "match",
    },
    {
        "title_contains": ["ithalat aşaması", "ürün güvenliği denetimi"],
        "keywords": [],
        "mode": "not_applicable",
        "explanation": (
            "Bu gereklilik ürün belgesinden doğrudan doğrulanabilecek bir belge "
            "alanı değildir."
        ),
    },
]


def _normalize(text: str) -> str:
    # Preserve Turkish letters; fold case and collapse whitespace.
    value = unicodedata.normalize("NFC", text or "")
    value = value.casefold()
    value = re.sub(r"\s+", " ", value).strip()
    return value


def _find_rule_for_title(title: str) -> dict[str, Any] | None:
    norm_title = _normalize(title)
    for rule in _RULES:
        needles = [_normalize(x) for x in rule["title_contains"]]
        if any(n and n in norm_title for n in needles):
            return rule
    return None


def _match_keywords(haystack_norm: str, keywords: list[str]) -> tuple[list[str], list[str]]:
    matched: list[str] = []
    missing: list[str] = []
    for kw in keywords:
        kn = _normalize(kw)
        if not kn:
            continue
        # Short tokens (CE, DoC) require word-ish boundaries to reduce false positives.
        if len(kn) <= 3:
            hit = re.search(rf"(?<!\w){re.escape(kn)}(?!\w)", haystack_norm) is not None
        else:
            hit = kn in haystack_norm
        if hit:
            matched.append(kw)
        else:
            missing.append(kw)
    return matched, missing


def load_category_requirements(
    db: Session,
    *,
    product_category_id: int,
    product_id: int | None = None,
) -> list[Requirement]:
    """Requirements linked to regulations for the evaluation's product (preferred) or category."""
    reg_ids: list[int] = []
    if product_id is not None:
        from app.models.product import ProductRegulation

        reg_ids = [
            row.regulation_id
            for row in db.query(ProductRegulation.regulation_id)
            .filter(ProductRegulation.product_id == product_id)
            .all()
        ]
    if not reg_ids:
        reg_ids = [
            row.id
            for row in db.query(Regulation.id)
            .filter(Regulation.product_category_id == product_category_id)
            .all()
        ]
    if not reg_ids:
        return []
    return (
        db.query(Requirement)
        .filter(Requirement.regulation_id.in_(reg_ids))
        .order_by(Requirement.id.asc())
        .all()
    )


def build_analysis_result(
    *,
    document: Document,
    requirements: list[Requirement],
) -> dict[str, Any]:
    text = (document.extracted_text or "").strip()
    text_norm = _normalize(text)

    checked: list[dict[str, Any]] = []
    found = 0
    not_found = 0
    not_applicable = 0

    for req in requirements:
        rule = _find_rule_for_title(req.title)
        item: dict[str, Any] = {
            "requirement_id": req.id,
            "title": req.title,
            "description": req.description,
        }

        if rule is None:
            # Unknown requirement types: treat as not_found with no keywords.
            item["status"] = "not_found"
            item["matched_keywords"] = []
            item["missing_keywords"] = []
            not_found += 1
        elif rule["mode"] == "not_applicable":
            item["status"] = "not_applicable"
            item["matched_keywords"] = []
            item["missing_keywords"] = []
            item["explanation"] = rule.get("explanation")
            not_applicable += 1
        else:
            matched, missing = _match_keywords(text_norm, list(rule["keywords"]))
            # "found" if at least one keyword hits (MVP).
            if matched:
                item["status"] = "found"
                item["matched_keywords"] = matched
                item["missing_keywords"] = missing
                found += 1
            else:
                item["status"] = "not_found"
                item["matched_keywords"] = []
                item["missing_keywords"] = missing
                not_found += 1

        checked.append(item)

    return {
        "analysis_mode": "deterministic",
        "document_type": document.document_type,
        "summary": {
            "total_requirements_checked": len(checked),
            "found": found,
            "not_found": not_found,
            "not_applicable": not_applicable,
        },
        "requirements": checked,
        "ai_assessment": None,
        "limitations": [
            "Bu analiz belge içeriğinde anahtar kelime eşleşmesine dayalı ön kontroldür.",
            "Belgenin hukuken geçerli veya resmi olarak uygun olduğunu doğrulamaz.",
        ],
    }


_LLM_UNAVAILABLE_MSG = (
    "AI belge yorumu şu anda kullanılamıyor. Belge analizi mevcut kural tabanlı "
    "bulgular üzerinden gösteriliyor."
)


def _deterministic_findings_block(result: dict[str, Any]) -> str:
    lines: list[str] = []
    for item in result.get("requirements") or []:
        lines.append(
            f"- requirement_id={item.get('requirement_id')} | "
            f"title={item.get('title')} | "
            f"status={item.get('status')} | "
            f"matched_keywords={item.get('matched_keywords')}"
        )
    return "\n".join(lines) if lines else "(no requirements)"


def _maybe_attach_llm_assessment(
    *,
    result: dict[str, Any],
    document: Document,
    evaluation: Evaluation,
    settings: Settings,
    product_category_name: str,
) -> dict[str, Any]:
    """Optionally enrich deterministic result with LLM narrative. Never mutates requirements."""
    requirements_snapshot = list(result.get("requirements") or [])
    result["ai_assessment"] = None

    if not settings.evaluation_use_llm:
        return result

    if not settings.llm_configured:
        limitations = list(result.get("limitations") or [])
        if _LLM_UNAVAILABLE_MSG not in limitations:
            limitations.append(_LLM_UNAVAILABLE_MSG)
        result["limitations"] = limitations
        return result

    product_block = (
        f"product_name={evaluation.product_name}\n"
        f"product_category_name={product_category_name}\n"
        f"supplier_country={evaluation.supplier_country}"
    )
    user_prompt = build_document_analysis_user_prompt(
        product_block=product_block,
        document_type=document.document_type,
        deterministic_block=_deterministic_findings_block(result),
        document_text=document.extracted_text or "",
    )

    try:
        ai = generate_document_ai_assessment(
            settings=settings,
            system_prompt=DOCUMENT_ANALYSIS_SYSTEM_PROMPT,
            user_prompt=user_prompt,
        )
        result["ai_assessment"] = ai.model_dump()
        result["analysis_mode"] = "deterministic+llm"
    except (LlmConfigurationError, LlmRequestError, LlmResponseError):
        limitations = list(result.get("limitations") or [])
        if _LLM_UNAVAILABLE_MSG not in limitations:
            limitations.append(_LLM_UNAVAILABLE_MSG)
        result["limitations"] = limitations
        result["ai_assessment"] = None
        result["analysis_mode"] = "deterministic"

    # Hard guarantee: deterministic requirement rows stay untouched.
    result["requirements"] = requirements_snapshot
    return result


def analyze_document(
    db: Session,
    *,
    document: Document,
    evaluation: Evaluation,
    settings: Settings | None = None,
    product_category_name: str | None = None,
) -> dict[str, Any]:
    text = (document.extracted_text or "").strip()
    if not text:
        raise ValueError("Belge metni analiz edilemedi.")

    settings = settings or get_settings()
    category_name = product_category_name or (
        evaluation.product_category.name
        if evaluation.product_category is not None
        else ""
    )

    requirements = load_category_requirements(
        db,
        product_category_id=evaluation.product_category_id,
        product_id=evaluation.product_id,
    )
    result = build_analysis_result(document=document, requirements=requirements)
    result = _maybe_attach_llm_assessment(
        result=result,
        document=document,
        evaluation=evaluation,
        settings=settings,
        product_category_name=category_name,
    )
    document.analysis_result = result
    db.add(document)
    db.commit()
    db.refresh(document)
    return result
