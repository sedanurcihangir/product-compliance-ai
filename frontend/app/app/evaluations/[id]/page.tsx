"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ApiError,
  analyzeDocument,
  getDocument,
  getMyEvaluation,
  listEvaluationDocuments,
  uploadEvaluationDocument,
  type DocumentAnalysisResult,
  type DocumentType,
  type EvaluationDetailResponse,
  type EvaluationDocument,
  type EvaluationDocumentDetail,
} from "@/lib/api";
import styles from "./detail.module.css";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  declaration_of_conformity: "Uygunluk Beyanı",
};

type UploadPhase = "idle" | "uploading" | "analyzing";

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string): string {
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function documentTypeLabel(value: string): string {
  return DOCUMENT_TYPE_LABELS[value] ?? value;
}

function extractionLabel(status: string): string {
  if (status === "ok") return "Metin çıkarıldı";
  return status;
}

function mapDocumentError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) {
      return "Oturumunuz sona ermiş olabilir. Lütfen tekrar giriş yapın.";
    }
    if (err.status === 404) {
      return "Belge veya değerlendirme bulunamadı.";
    }
    if (err.status === 413) {
      return "Dosya boyutu veya sayfa sayısı izin verilen sınırı aşıyor.";
    }
    if (err.status === 400 || err.status === 422) {
      return "Bu dosya geçerli bir PDF değil.";
    }
    if (err.status >= 500) {
      return "Belge analiz edilirken bir hata oluştu.";
    }
  }
  if (err instanceof Error && err.message.toLowerCase().includes("auth")) {
    return "Oturumunuz sona ermiş olabilir. Lütfen tekrar giriş yapın.";
  }
  return "Belge işlemi sırasında bir hata oluştu.";
}

function statusCopy(status: string): {
  icon: string;
  className: string;
  text: string;
} {
  if (status === "found") {
    return {
      icon: "✅",
      className: styles.findingFound,
      text: "Belgede ilgili ifade bulundu.",
    };
  }
  if (status === "not_applicable") {
    return {
      icon: "ℹ️",
      className: styles.findingNa,
      text: "Bu gereklilik doğrudan belge içeriğinden doğrulanamaz.",
    };
  }
  return {
    icon: "⚠️",
    className: styles.findingMissing,
    text: "Belgede bu bilgiye ilişkin eşleşme bulunamadı.",
  };
}

function isDemoSource(organization: string): boolean {
  const value = organization.toUpperCase();
  return value.includes("DEMO") || value.includes("TEST");
}

function riskTone(level: string): string {
  const value = level.toLocaleLowerCase("tr-TR");
  if (value.includes("yüksek") || value.includes("high")) {
    return styles.riskHigh;
  }
  if (value.includes("orta") || value.includes("medium")) {
    return styles.riskMedium;
  }
  if (value.includes("düşük") || value.includes("low")) {
    return styles.riskLow;
  }
  return styles.riskNeutral;
}

function modeBadgeLabel(mode: string): string {
  return mode === "llm" ? "LLM destekli" : "Deterministik";
}

function AnalysisView({
  analysis,
  loading,
}: {
  analysis: DocumentAnalysisResult | null | undefined;
  loading: boolean;
}) {
  if (loading) {
    return <p className={styles.loading}>Analiz sonucu hazırlanıyor...</p>;
  }
  if (!analysis) {
    return (
      <p className={styles.empty}>Bu belge için henüz analiz sonucu yok.</p>
    );
  }

  const summary = analysis.summary;
  const requirements = analysis.requirements ?? [];
  const ai = analysis.ai_assessment ?? null;

  return (
    <div className={styles.analysisPanel}>
      <h3 className={styles.sectionTitle}>Belge Ön Analizi</h3>

      <div>
        <h4 className={styles.sectionTitle}>Özet</h4>
        {summary ? (
          <ul className={styles.summaryList}>
            <li>
              {summary.found ?? 0} gereklilik belgede bulundu.
            </li>
            <li>
              {summary.not_found ?? 0} gereklilik için eşleşme bulunamadı.
            </li>
            <li>
              {summary.not_applicable ?? 0} gereklilik bu belge türünden
              doğrulanamaz.
            </li>
          </ul>
        ) : (
          <p className={styles.empty}>Özet bilgisi yok.</p>
        )}
      </div>

      <div>
        <h4 className={styles.sectionTitle}>Gereklilikler</h4>
        {requirements.length === 0 ? (
          <p className={styles.empty}>Gereklilik sonucu yok.</p>
        ) : (
          <ul className={styles.findingList}>
            {requirements.map((item) => {
              const copy = statusCopy(item.status);
              return (
                <li
                  key={item.requirement_id}
                  className={`${styles.finding} ${copy.className}`}
                >
                  <span className={styles.findingTitle}>
                    {copy.icon} {item.title}
                  </span>
                  <span className={styles.findingText}>
                    {item.explanation || copy.text}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div>
        <h4 className={styles.sectionTitle}>AI Ön Yorumu</h4>
        {ai ? (
          <div className={styles.aiBox}>
            <p>{ai.summary}</p>
            {ai.observations.length > 0 ? (
              <>
                <strong>Gözlemler</strong>
                <ul className={styles.aiList}>
                  {ai.observations.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </>
            ) : null}
            {ai.attention_points.length > 0 ? (
              <>
                <strong>Dikkat edilmesi gerekenler</strong>
                <ul className={styles.aiList}>
                  {ai.attention_points.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </>
            ) : null}
            {ai.limitations.length > 0 ? (
              <>
                <strong>Sınırlamalar</strong>
                <ul className={styles.aiList}>
                  {ai.limitations.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        ) : (
          <p className={styles.note}>
            AI yorumu şu anda kullanılamıyor. Kural tabanlı belge analizi
            gösteriliyor.
          </p>
        )}
      </div>

      <p className={styles.disclaimer} role="note">
        Bu belge analizi, yüklenen belgenin içeriğine yönelik teknik bir ön
        kontroldür. Belgenin hukuken geçerli veya mevzuata kesin olarak uygun
        olduğunu göstermez.
      </p>
    </div>
  );
}

export default function EvaluationHistoryDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const evaluationId = Number(params.id);
  const idValid = Number.isFinite(evaluationId) && evaluationId > 0;

  const [detail, setDetail] = useState<EvaluationDetailResponse | null>(null);
  const [documents, setDocuments] = useState<EvaluationDocument[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedDetail, setSelectedDetail] =
    useState<EvaluationDocumentDetail | null>(null);
  const [pageLoading, setPageLoading] = useState(idValid);
  const [docsLoading, setDocsLoading] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [docError, setDocError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [documentType, setDocumentType] = useState<DocumentType>(
    "declaration_of_conformity",
  );
  const [file, setFile] = useState<File | null>(null);
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>("idle");
  const [analyzedIds, setAnalyzedIds] = useState<number[]>([]);

  const markAnalyzed = useCallback((documentId: number) => {
    setAnalyzedIds((prev) =>
      prev.includes(documentId) ? prev : [...prev, documentId],
    );
  }, []);

  const loadDocuments = useCallback(async (evalId: number) => {
    setDocsLoading(true);
    try {
      const items = await listEvaluationDocuments(evalId);
      setDocuments(items);
      return items;
    } finally {
      setDocsLoading(false);
    }
  }, []);

  const loadAnalysis = useCallback(
    async (documentId: number) => {
      setAnalysisLoading(true);
      setDocError(null);
      try {
        const doc = await getDocument(documentId);
        setSelectedDetail(doc);
        setSelectedId(documentId);
        if (doc.analysis_result) {
          markAnalyzed(documentId);
        }
      } catch (err) {
        setDocError(mapDocumentError(err));
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/app/login");
        }
      } finally {
        setAnalysisLoading(false);
      }
    },
    [markAnalyzed, router],
  );

  useEffect(() => {
    if (!idValid) return;
    let cancelled = false;

    (async () => {
      setPageLoading(true);
      setPageError(null);
      try {
        const evaluation = await getMyEvaluation(evaluationId);
        if (cancelled) return;
        setDetail(evaluation);
        const items = await loadDocuments(evaluationId);
        if (cancelled) return;
        if (items.length > 0) {
          setShowUpload(false);
          await loadAnalysis(items[0].id);
        } else {
          setShowUpload(true);
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/app/login");
          return;
        }
        if (err instanceof ApiError && err.status === 404) {
          setPageError("Belge veya değerlendirme bulunamadı.");
        } else {
          setPageError(
            err instanceof Error
              ? err.message
              : "Değerlendirme yüklenemedi.",
          );
        }
      } finally {
        if (!cancelled) setPageLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [evaluationId, idValid, loadAnalysis, loadDocuments, router]);

  async function handleUpload(event: FormEvent) {
    event.preventDefault();
    setDocError(null);

    if (!file) {
      setDocError("Lütfen bir PDF dosyası seçin.");
      return;
    }
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setDocError("Bu dosya geçerli bir PDF değil.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setDocError("Dosya boyutu veya sayfa sayısı izin verilen sınırı aşıyor.");
      return;
    }

    setUploadPhase("uploading");
    try {
      const uploaded = await uploadEvaluationDocument(
        evaluationId,
        file,
        documentType,
      );
      setUploadPhase("analyzing");
      const analyzed = await analyzeDocument(uploaded.id);
      await loadDocuments(evaluationId);
      setSelectedId(analyzed.id);
      setSelectedDetail(analyzed);
      if (analyzed.analysis_result) {
        markAnalyzed(analyzed.id);
      }
      setFile(null);
      setShowUpload(false);
    } catch (err) {
      setDocError(mapDocumentError(err));
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/app/login");
      }
    } finally {
      setUploadPhase("idle");
    }
  }

  if (!idValid) {
    return (
      <section className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>Değerlendirme Detayı</h1>
          <p className={styles.subtitle}>Geçersiz değerlendirme kimliği.</p>
        </header>
        <div className={styles.actions}>
          <Link href="/app" className={styles.primaryLink}>
            Ana sayfaya dön
          </Link>
        </div>
      </section>
    );
  }

  if (pageLoading) {
    return (
      <section className={styles.page}>
        <p className={styles.loading}>Kayıtlı değerlendirme yükleniyor…</p>
      </section>
    );
  }

  if (pageError || !detail) {
    return (
      <section className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>Değerlendirme Detayı</h1>
          <p className={styles.subtitle}>
            {pageError ?? "Değerlendirme açılamadı."}
          </p>
        </header>
        <div className={styles.actions}>
          <Link href="/app" className={styles.primaryLink}>
            Ana sayfaya dön
          </Link>
        </div>
      </section>
    );
  }

  const { evaluation } = detail;
  const product = evaluation.product;
  const {
    regulations,
    requirements,
    risk_rules,
    sources,
    limitations,
    evaluation_mode,
    ai_assessment,
  } = evaluation;
  const busy = uploadPhase !== "idle";
  const summaryText = ai_assessment?.summary?.trim() || "";
  const missingInformation = ai_assessment?.missing_information ?? [];
  const recommendedActions = ai_assessment?.recommended_actions ?? [];

  return (
    <section className={styles.page}>
      <header className={styles.resultHero}>
        <p className={styles.eyebrow}>Değerlendirme Detayı</p>
        <h1 className={styles.title}>{product.product_name}</h1>
        <p className={styles.routeLine}>
          {product.supplier_country} → Türkiye
        </p>
        <div className={styles.badgeRow}>
          <span className={styles.infoBadge}>Ön Değerlendirme</span>
          <span className={styles.infoBadgeMuted}>
            {modeBadgeLabel(evaluation_mode)}
          </span>
        </div>
        <p className={styles.heroNote}>
          Bu çıktı resmi hukuki veya uygunluk onayı yerine geçmez.
        </p>
      </header>

      {summaryText ? (
        <section className={styles.summaryCard} data-testid="result-summary">
          <h2 className={styles.blockTitle}>Genel Değerlendirme</h2>
          <p className={styles.summaryText}>{summaryText}</p>
        </section>
      ) : null}

      <section className={styles.statsGrid} data-testid="result-stats">
        <div className={styles.statCard}>
          <strong>{regulations.length}</strong>
          <span>Mevzuat</span>
        </div>
        <div className={styles.statCard}>
          <strong>{requirements.length}</strong>
          <span>Gereklilik</span>
        </div>
        <div className={styles.statCard}>
          <strong>{sources.length}</strong>
          <span>Kaynak</span>
        </div>
      </section>

      <section className={styles.block} data-testid="result-product">
        <h2 className={styles.blockTitle}>Ürün Bilgileri</h2>
        <dl className={styles.productGrid}>
          <div>
            <dt>Ürün adı</dt>
            <dd>{product.product_name}</dd>
          </div>
          <div>
            <dt>Kategori</dt>
            <dd>{product.product_category_name}</dd>
          </div>
          <div>
            <dt>Tedarikçi / menşe ülkesi</dt>
            <dd>{product.supplier_country}</dd>
          </div>
          {product.product_description ? (
            <div className={styles.productFull}>
              <dt>Açıklama</dt>
              <dd>{product.product_description}</dd>
            </div>
          ) : null}
          {product.product_url ? (
            <div className={styles.productFull}>
              <dt>Ürün linki</dt>
              <dd>
                <a
                  className={styles.inlineLink}
                  href={product.product_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {product.product_url}
                </a>
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className={styles.block} data-testid="result-regulations">
        <h2 className={styles.blockTitle}>Uygulanan Mevzuatlar</h2>
        {regulations.length === 0 ? (
          <p className={styles.empty}>
            Bu değerlendirme için eşleşen mevzuat bulunamadı.
          </p>
        ) : (
          <ul className={styles.cardList}>
            {regulations.map((regulation) => (
              <li key={regulation.id} className={styles.infoCard}>
                <h3 className={styles.cardHeading}>{regulation.title}</h3>
                <span className={styles.meta}>
                  {regulation.country.name} ({regulation.country.code})
                  {regulation.status ? ` · ${regulation.status}` : ""}
                </span>
                {regulation.description ? (
                  <p className={styles.cardBody}>{regulation.description}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.block} data-testid="result-requirements">
        <h2 className={styles.blockTitle}>Gereklilikler</h2>
        {requirements.length === 0 ? (
          <p className={styles.empty}>
            Bu değerlendirme için eşleşen gereklilik bulunamadı.
          </p>
        ) : (
          <ul className={styles.checklist}>
            {requirements.map((requirement) => (
              <li key={requirement.id} className={styles.checkItem}>
                <span className={styles.checkMark} aria-hidden>
                  ✓
                </span>
                <div>
                  <strong>{requirement.title}</strong>
                  {requirement.description ? (
                    <p className={styles.cardBody}>{requirement.description}</p>
                  ) : null}
                  {requirement.type ? (
                    <span className={styles.meta}>Tür: {requirement.type}</span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.block} data-testid="result-missing">
        <h2 className={styles.blockTitle}>Eksik Bilgiler</h2>
        {!ai_assessment || missingInformation.length === 0 ? (
          <p className={styles.empty}>
            Ek bilgi gerektiren bir durum belirlenmedi.
          </p>
        ) : (
          <ul className={styles.bulletList}>
            {missingInformation.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </section>

      <section
        className={`${styles.riskCard} ${
          ai_assessment
            ? riskTone(ai_assessment.risk_assessment.level)
            : styles.riskNeutral
        }`}
        data-testid="result-risk"
      >
        <h2 className={styles.blockTitle}>Risk Değerlendirmesi</h2>
        {ai_assessment ? (
          <>
            <p className={styles.riskLevel}>
              {ai_assessment.risk_assessment.level}
            </p>
            {ai_assessment.risk_assessment.reason ? (
              <p className={styles.cardBody}>
                {ai_assessment.risk_assessment.reason}
              </p>
            ) : null}
          </>
        ) : (
          <p className={styles.empty}>
            Risk özeti üretilemedi. Aşağıdaki kurallar bilgi amaçlıdır.
          </p>
        )}
        {risk_rules.length > 0 ? (
          <ul className={styles.cardList}>
            {risk_rules.map((rule) => (
              <li key={rule.id} className={styles.infoCardInner}>
                <strong>{rule.risk_level}</strong>
                <span className={styles.meta}>{rule.condition}</span>
                {rule.explanation ? (
                  <p className={styles.cardBody}>{rule.explanation}</p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className={styles.block} data-testid="result-actions">
        <h2 className={styles.blockTitle}>İthalat Öncesi Yapılacaklar</h2>
        {recommendedActions.length === 0 ? (
          <p className={styles.empty}>
            Bu değerlendirme modunda ek aksiyon önerisi oluşturulmadı.
          </p>
        ) : (
          <ol className={styles.numberedList}>
            {recommendedActions.map((item, index) => (
              <li key={`${index}-${item}`}>
                <span className={styles.stepIndex}>{index + 1}</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className={styles.block} data-testid="result-sources">
        <h2 className={styles.blockTitle}>Kaynaklar</h2>
        {sources.length === 0 ? (
          <p className={styles.empty}>Kayıtlı kaynak bulunamadı.</p>
        ) : (
          <ul className={styles.sourceList}>
            {sources.map((source) => (
              <li key={source.id} className={styles.sourceItem}>
                <strong>{source.organization}</strong>
                {isDemoSource(source.organization) ? (
                  <span className={styles.meta}>
                    Demo/test kaynağı — resmi mevzuat yerine geçmez.
                  </span>
                ) : null}
                <span className={styles.meta}>
                  Yayın: {source.publication_date || "—"}
                  {source.last_checked
                    ? ` · Son kontrol: ${source.last_checked}`
                    : ""}
                </span>
                {source.url ? (
                  <a
                    className={styles.inlineLink}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {source.url}
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.mutedCard} data-testid="result-limitations">
        <h2 className={styles.blockTitle}>Sınırlamalar</h2>
        {limitations.length === 0 ? (
          <p className={styles.empty}>Kayıtlı sınırlama bulunamadı.</p>
        ) : (
          <ul className={styles.bulletList}>
            {limitations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
        <p className={styles.limitationDisclaimer}>
          Bu sistem ön değerlendirme ve karar destek amacıyla hazırlanmıştır.
          Resmi uygunluk veya hukuki onay yerine geçmez.
        </p>
      </section>

      <section className={styles.uploadCard} id="belgeler" data-testid="result-documents">
        <h2 className={styles.blockTitle}>Belgeler</h2>
        <p className={styles.uploadHint}>
          PDF · en fazla 10 MB · en fazla 30 sayfa
        </p>

        {!showUpload ? (
          <button
            type="button"
            className={styles.submit}
            onClick={() => setShowUpload(true)}
            disabled={busy}
          >
            PDF Belgesi Yükle
          </button>
        ) : null}

        {showUpload ? (
          <form className={styles.uploadForm} onSubmit={handleUpload} noValidate>
            <label className={styles.label}>
              Belge türü
              <select
                className={styles.select}
                value={documentType}
                disabled={busy}
                onChange={(event) =>
                  setDocumentType(event.target.value as DocumentType)
                }
              >
                <option value="declaration_of_conformity">
                  Uygunluk Beyanı
                </option>
              </select>
            </label>

            <label className={styles.label}>
              Dosya
              <input
                className={styles.fileInput}
                type="file"
                accept=".pdf,application/pdf"
                disabled={busy}
                onChange={(event) => {
                  const next = event.target.files?.[0] ?? null;
                  setFile(next);
                  setDocError(null);
                }}
              />
            </label>

            <button type="submit" className={styles.submit} disabled={busy}>
              {uploadPhase === "uploading"
                ? "Belge yükleniyor..."
                : uploadPhase === "analyzing"
                  ? "Belge analiz ediliyor..."
                  : "Yükle ve Analiz Et"}
            </button>
          </form>
        ) : null}

        {docError ? <p className={styles.errorBanner}>{docError}</p> : null}

        {docsLoading ? (
          <p className={styles.loading}>Belgeler yükleniyor...</p>
        ) : null}

        {!docsLoading && documents.length === 0 ? (
          <div>
            <p className={styles.empty}>
              Bu değerlendirmeye henüz belge eklenmedi.
            </p>
            {!showUpload ? (
              <button
                type="button"
                className={styles.submit}
                onClick={() => setShowUpload(true)}
              >
                PDF Belgesi Yükle
              </button>
            ) : null}
          </div>
        ) : null}

        {!docsLoading && documents.length > 0 ? (
          <ul className={styles.docList}>
            {documents.map((doc) => {
              const active = doc.id === selectedId;
              return (
                <li key={doc.id}>
                  <button
                    type="button"
                    className={`${styles.docItem} ${active ? styles.docItemActive : ""}`}
                    onClick={() => {
                      void loadAnalysis(doc.id);
                    }}
                  >
                    <span className={styles.docName}>
                      {doc.original_filename}
                    </span>
                    <span className={styles.docMeta}>
                      {documentTypeLabel(doc.document_type)}
                    </span>
                    <span className={styles.docMeta}>
                      {doc.page_count != null
                        ? `${doc.page_count} sayfa`
                        : "Sayfa sayısı yok"}{" "}
                      · {formatBytes(doc.file_size)} ·{" "}
                      {analyzedIds.includes(doc.id)
                        ? "Analiz edildi"
                        : extractionLabel(doc.extraction_status)}
                    </span>
                    <span className={styles.docMeta}>
                      {formatDate(doc.created_at)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}

        {selectedId ? (
          <AnalysisView
            analysis={selectedDetail?.analysis_result}
            loading={analysisLoading}
          />
        ) : null}
      </section>

      <div className={styles.actions}>
        <Link href="/app/evaluate" className={styles.secondaryLink}>
          Yeni değerlendirme
        </Link>
        <Link href="/app" className={styles.primaryLink}>
          Ana sayfaya dön
        </Link>
      </div>
    </section>
  );
}
