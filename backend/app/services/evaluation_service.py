from __future__ import annotations

from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.models import ProductCategory
from app.schemas.evaluation import (
    AiAssessment,
    AiRiskAssessment,
    EvaluationCreate,
    EvaluationProduct,
    EvaluationRegulation,
    EvaluationRequirement,
    EvaluationResponse,
    EvaluationResult,
    EvaluationRiskRule,
    EvaluationSource,
)
from app.services.llm_client import (
    LlmConfigurationError,
    LlmRequestError,
    LlmResponseError,
    generate_ai_assessment,
)
from app.services.prompts import SYSTEM_PROMPT, build_user_prompt
from app.services.retrieval import RetrievalBundle, format_context_for_llm, retrieve_context


def _dedupe_preserve(items: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for item in items:
        cleaned = item.strip()
        if not cleaned or cleaned in seen:
            continue
        seen.add(cleaned)
        out.append(cleaned)
    return out


def _deterministic_limitations(bundle: RetrievalBundle) -> list[str]:
    limitations = [
        "Bu bir ön değerlendirmedir; resmi hukuki veya uygunluk onayı değildir.",
        "Sonuç database'deki mevcut kayıtlara ve retrieval sonucuna bağlıdır.",
        "Mevzuatlar Türkiye (TR) ve seçilen ürün kategorisine göre filtrelenir; "
        "kategoriye bağlı olmayan mevzuatlar getirilmez veya uydurulmaz.",
        "RiskRule.condition alanı serbest metindir; otomatik kesin risk skoru üretilmez.",
        "Bu sonuç deterministik (kural tabanlı) değerlendirmedir; LLM kullanılmamıştır.",
    ]
    if not bundle.turkey_found:
        limitations.append(
            "Türkiye (TR) country kaydı bulunamadı; mevzuat ve gereklilik listeleri boş döndü."
        )
    elif not bundle.regulations:
        limitations.append(
            "Seçilen ürün kategorisi için henüz tanımlanmış bir mevzuat bulunmuyor."
        )
    elif not bundle.requirements:
        limitations.append(
            "Seçilen kategoriye bağlı mevzuatlar için Requirement kaydı bulunamadı."
        )
    if not bundle.risk_rules:
        limitations.append(
            "RiskRule kaydı bulunamadı; risk bilgisi uydurulmadı."
        )
    if not bundle.sources:
        limitations.append(
            "Source kaydı bulunamadı; resmi kaynak uydurulmadı."
        )
    return _dedupe_preserve(limitations)


def _build_deterministic_assessment(
    *,
    payload: EvaluationCreate,
    category: ProductCategory,
    bundle: RetrievalBundle,
) -> AiAssessment:
    """Grounded, non-LLM assessment derived only from retrieval records."""
    if not bundle.regulations:
        summary = (
            f"“{payload.product_name}” için “{category.name}” kategorisinde "
            "tanımlı mevzuat bulunamadı. Ön değerlendirme sınırlıdır; "
            "sistem mevzuat uydurmaz."
        )
    else:
        summary = (
            f"“{payload.product_name}” için “{category.name}” kategorisinde "
            f"{len(bundle.regulations)} mevzuat ve {len(bundle.requirements)} "
            "gereklilik kaydına dayalı kural tabanlı ön değerlendirme yapılmıştır. "
            "Bu sonuç resmi uygunluk onayı değildir."
        )

    missing_information: list[str] = []
    for req in bundle.requirements:
        if req.type:
            missing_information.append(
                f"Kontrol edilmesi gereken: {req.title} (tür: {req.type})"
            )
        else:
            missing_information.append(f"Kontrol edilmesi gereken: {req.title}")
    if not bundle.regulations:
        missing_information.append(
            "Kontrol edilmesi gereken: Seçilen ürün kategorisi için mevzuat "
            "ve gereklilik tanımları"
        )

    recommended_actions: list[str] = []
    for req in bundle.requirements:
        recommended_actions.append(
            f"Ürün için “{req.title}” belgesini/bilgisini temin edin ve "
            "ön uygunluk değerlendirmesinde kontrol edin."
        )
    for rule in bundle.risk_rules:
        recommended_actions.append(
            f"Kontrol edilmesi gereken risk ({rule.risk_level}): {rule.condition}"
        )
    if bundle.sources:
        recommended_actions.append(
            "Listelenen kaynakları doğrulayın; demo/test kaynaklarını resmi "
            "mevzuat yerine koymayın."
        )
    if not recommended_actions:
        recommended_actions.append(
            "İlgili ürün kategorisi için Admin Panel üzerinden mevzuat, "
            "gereklilik ve kaynak tanımlayın."
        )

    if bundle.risk_rules:
        levels = sorted({rule.risk_level for rule in bundle.risk_rules})
        reason_parts = [
            f"Kontrol edilmesi gereken risk ({rule.risk_level}): {rule.condition}"
            for rule in bundle.risk_rules
        ]
        risk_assessment = AiRiskAssessment(
            level=", ".join(levels),
            reason=(
                "Aşağıdaki risk kuralları database kayıtlarından alınmıştır; "
                "ürün için kesin risk hükmü değildir. "
                + " ".join(reason_parts)
            ),
        )
    else:
        risk_assessment = AiRiskAssessment(
            level="değerlendirilemedi",
            reason=(
                "Database/retrieval içinde RiskRule kaydı olmadığı için risk "
                "seviyesi üretilmedi; risk uydurulmadı."
            ),
        )

    return AiAssessment(
        summary=summary,
        missing_information=_dedupe_preserve(missing_information),
        risk_assessment=risk_assessment,
        recommended_actions=_dedupe_preserve(recommended_actions),
        limitations=[
            "Deterministik değerlendirme yalnızca retrieval sonucuna dayanır.",
            "Belge/bilgi 'eksik' diye kesinleştirilmez; kontrol listesi sunulur.",
        ],
    )


def _to_result(
    *,
    payload: EvaluationCreate,
    category: ProductCategory,
    bundle: RetrievalBundle,
    evaluation_mode: str,
    limitations: list[str],
    ai_assessment: AiAssessment | None,
) -> EvaluationResult:
    return EvaluationResult(
        product=EvaluationProduct(
            product_name=payload.product_name,
            product_category_id=category.id,
            product_category_name=category.name,
            product_description=payload.product_description,
            supplier_country=payload.supplier_country,
            product_url=str(payload.product_url) if payload.product_url else None,
        ),
        regulations=[
            EvaluationRegulation(
                id=reg.id,
                title=reg.title,
                description=reg.description,
                status=reg.status,
                country=reg.country,
            )
            for reg in bundle.regulations
        ],
        requirements=[
            EvaluationRequirement(
                id=req.id,
                title=req.title,
                description=req.description,
                type=req.type,
                regulation_id=req.regulation_id,
            )
            for req in bundle.requirements
        ],
        risk_rules=[
            EvaluationRiskRule(
                id=rule.id,
                condition=rule.condition,
                risk_level=rule.risk_level,
                explanation=rule.explanation,
            )
            for rule in bundle.risk_rules
        ],
        sources=[
            EvaluationSource(
                id=source.id,
                organization=source.organization,
                url=source.url,
                publication_date=source.publication_date,
                last_checked=source.last_checked,
            )
            for source in bundle.sources
        ],
        limitations=_dedupe_preserve(limitations),
        evaluation_mode=evaluation_mode,  # type: ignore[arg-type]
        ai_assessment=ai_assessment,
    )


def run_evaluation(
    db: Session,
    payload: EvaluationCreate,
    category: ProductCategory,
    settings: Settings | None = None,
) -> EvaluationResponse:
    settings = settings or get_settings()
    bundle = retrieve_context(
        db,
        category=category,
        product_name=payload.product_name,
        product_description=payload.product_description,
        supplier_country=payload.supplier_country,
    )

    # Default: grounded deterministic assessment from retrieval.
    limitations = _deterministic_limitations(bundle)
    evaluation_mode = "deterministic"
    ai_assessment = _build_deterministic_assessment(
        payload=payload,
        category=category,
        bundle=bundle,
    )
    message = "Kural tabanlı ön değerlendirme tamamlandı."

    should_try_llm = settings.evaluation_use_llm
    if should_try_llm and not settings.llm_configured:
        limitations.append(
            "LLM yapılandırması eksik (OPENAI_API_KEY). Deterministik değerlendirme kullanıldı."
        )
    elif should_try_llm:
        product_block = (
            f"product_name={payload.product_name}\n"
            f"product_category={category.name}\n"
            f"product_description={payload.product_description}\n"
            f"supplier_country={payload.supplier_country}\n"
            f"product_url={payload.product_url or ''}"
        )
        context_block = format_context_for_llm(bundle)
        user_prompt = build_user_prompt(
            product_block=product_block,
            context_block=context_block,
        )
        try:
            llm_assessment = generate_ai_assessment(
                settings=settings,
                system_prompt=SYSTEM_PROMPT,
                user_prompt=user_prompt,
            )
            # Normalize invented risk levels when no risk rules exist in context.
            if not bundle.risk_rules:
                llm_assessment.risk_assessment = AiRiskAssessment(
                    level="değerlendirilemedi",
                    reason=(
                        "CONTEXT içinde RiskRule kaydı olmadığı için risk seviyesi "
                        "üretilemedi."
                    ),
                )
            ai_assessment = llm_assessment
            evaluation_mode = "llm"
            message = "RAG + LLM destekli ön değerlendirme tamamlandı."
            limitations = _dedupe_preserve(
                [
                    "Bu sonuç retrieval + LLM ile üretilmiştir; resmi hukuki onay değildir.",
                    "Sonuç database'deki mevcut kayıtlara ve retrieval sonucuna bağlıdır.",
                    "Mevzuatlar Türkiye (TR) ve seçilen ürün kategorisine göre filtrelenir.",
                    "Grounded regulation/requirement/source listeleri database kayıtlarından gelir; "
                    "LLM bu listeleri değiştirmez.",
                    *llm_assessment.limitations,
                ]
            )
        except (LlmConfigurationError, LlmRequestError, LlmResponseError):
            # Never forward provider HTTP bodies, quota/billing text, or
            # exception details to the user-facing limitations list.
            limitations.append(
                "AI değerlendirmesi şu anda kullanılamıyor. Sonuç, mevcut "
                "mevzuat verileri üzerinden kural tabanlı olarak oluşturuldu."
            )
            evaluation_mode = "deterministic"
            message = "Kural tabanlı ön değerlendirme tamamlandı (LLM fallback)."
            ai_assessment = _build_deterministic_assessment(
                payload=payload,
                category=category,
                bundle=bundle,
            )

    result = _to_result(
        payload=payload,
        category=category,
        bundle=bundle,
        evaluation_mode=evaluation_mode,
        limitations=limitations,
        ai_assessment=ai_assessment,
    )
    return EvaluationResponse(success=True, message=message, evaluation=result)
