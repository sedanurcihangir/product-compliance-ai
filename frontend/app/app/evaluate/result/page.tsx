"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import type { EvaluationResponse } from "@/lib/api";
import { loadEvaluationResult } from "@/lib/evaluationStorage";
import styles from "./result.module.css";

function subscribe(onStoreChange: () => void) {
  // Same-tab updates go through storeEvaluationResult before navigation.
  // Listen for cross-tab sessionStorage changes as well.
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: StorageEvent) => {
    if (event.storageArea === window.sessionStorage) {
      onStoreChange();
    }
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

function getClientSnapshot(): EvaluationResponse | null {
  // loadEvaluationResult caches by raw payload so React gets a stable reference.
  return loadEvaluationResult<EvaluationResponse>();
}

function getServerSnapshot(): EvaluationResponse | null {
  return null;
}

function isDemoSource(organization: string): boolean {
  const value = organization.toUpperCase();
  return value.includes("DEMO") || value.includes("TEST");
}

export default function EvaluateResultPage() {
  const result = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  if (!result) {
    return (
      <section className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>Değerlendirme Sonucu</h1>
          <p className={styles.subtitle}>
            Görüntülenecek değerlendirme sonucu bulunamadı.
          </p>
          <p className={styles.note}>
            Lütfen formu yeniden gönderin. Sonuçlar bu tarayıcı oturumunda
            saklanır.
          </p>
        </header>
        <div className={styles.actions}>
          <Link href="/app/evaluate" className={styles.primaryLink}>
            Forma dön
          </Link>
        </div>
      </section>
    );
  }

  const { evaluation, message, success } = result;
  const {
    product,
    regulations,
    requirements,
    risk_rules,
    sources,
    limitations,
    evaluation_mode,
    ai_assessment,
  } = evaluation;

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Değerlendirme Sonucu</h1>
        {success ? (
          <p className={styles.successBanner}>{message}</p>
        ) : (
          <p className={styles.subtitle}>{message}</p>
        )}
        <p className={styles.note}>
          Mod:{" "}
          <strong>
            {evaluation_mode === "llm"
              ? "RAG + LLM"
              : "Deterministik ön değerlendirme"}
          </strong>
          . Bu çıktı resmi hukuki onay yerine geçmez.
        </p>
      </header>

      <section className={styles.block}>
        <h2 className={styles.blockTitle}>Ürün</h2>
        <ul className={styles.summaryList}>
          <li>Ürün adı: {product.product_name}</li>
          <li>Kategori: {product.product_category_name}</li>
          <li>Açıklama: {product.product_description}</li>
          <li>Tedarikçi ülkesi: {product.supplier_country}</li>
          <li>
            Ürün linki:{" "}
            {product.product_url ? (
              <a
                className={styles.inlineLink}
                href={product.product_url}
                target="_blank"
                rel="noreferrer"
              >
                {product.product_url}
              </a>
            ) : (
              "—"
            )}
          </li>
        </ul>
      </section>

      {ai_assessment ? (
        <section className={styles.block}>
          <h2 className={styles.blockTitle}>Değerlendirme Özeti</h2>
          <p>{ai_assessment.summary}</p>
        </section>
      ) : null}

      <section className={styles.block}>
        <h2 className={styles.blockTitle}>İlgili Mevzuatlar</h2>
        {regulations.length === 0 ? (
          <p className={styles.empty}>
            Seçilen ürün kategorisi için kayıtlı mevzuat bulunamadı.
          </p>
        ) : (
          <ul className={styles.itemList}>
            {regulations.map((regulation) => (
              <li key={regulation.id} className={styles.item}>
                <strong>{regulation.title}</strong>
                <span className={styles.meta}>
                  {regulation.country.name} ({regulation.country.code}) ·{" "}
                  {regulation.status}
                </span>
                <p>{regulation.description || "Açıklama yok."}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.block}>
        <h2 className={styles.blockTitle}>
          Kontrol edilmesi gereken gereklilikler / belgeler
        </h2>
        {requirements.length === 0 ? (
          <p className={styles.empty}>
            Seçilen mevzuatlara bağlı gereklilik kaydı bulunamadı.
          </p>
        ) : (
          <ul className={styles.itemList}>
            {requirements.map((requirement) => (
              <li key={requirement.id} className={styles.item}>
                <strong>{requirement.title}</strong>
                <span className={styles.meta}>
                  Regulation ID: {requirement.regulation_id}
                  {requirement.type ? ` · Tür: ${requirement.type}` : ""}
                </span>
                <p>{requirement.description || "Açıklama yok."}</p>
              </li>
            ))}
          </ul>
        )}
        {ai_assessment && ai_assessment.missing_information.length > 0 ? (
          <>
            <p className={styles.meta}>
              Not: Aşağıdakiler kesin &quot;eksik&quot; hükmü değildir; kontrol
              listesidir.
            </p>
            <ul className={styles.itemList}>
              {ai_assessment.missing_information.map((item) => (
                <li key={item} className={styles.item}>
                  {item}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>

      <section className={styles.block}>
        <h2 className={styles.blockTitle}>Risk bilgileri</h2>
        {ai_assessment ? (
          <>
            <p>
              <strong>Kaydedilmiş seviye bilgisi:</strong>{" "}
              {ai_assessment.risk_assessment.level}
            </p>
            <p>{ai_assessment.risk_assessment.reason}</p>
          </>
        ) : (
          <p className={styles.empty}>
            Risk özeti üretilemedi. Aşağıdaki kurallar bilgi amaçlıdır.
          </p>
        )}
        {risk_rules.length === 0 ? (
          <p className={styles.empty}>Kayıtlı risk kuralı bulunamadı.</p>
        ) : (
          <ul className={styles.itemList}>
            {risk_rules.map((rule) => (
              <li key={rule.id} className={styles.item}>
                <strong>Kontrol edilmesi gereken risk: {rule.risk_level}</strong>
                <span className={styles.meta}>Koşul: {rule.condition}</span>
                <p>{rule.explanation || "Açıklama yok."}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.block}>
        <h2 className={styles.blockTitle}>Yapılması gereken aksiyonlar</h2>
        {!ai_assessment || ai_assessment.recommended_actions.length === 0 ? (
          <p className={styles.empty}>Önerilen aksiyon bulunamadı.</p>
        ) : (
          <ul className={styles.itemList}>
            {ai_assessment.recommended_actions.map((item) => (
              <li key={item} className={styles.item}>
                {item}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.block}>
        <h2 className={styles.blockTitle}>Kaynaklar</h2>
        {sources.length === 0 ? (
          <p className={styles.empty}>Kayıtlı kaynak bulunamadı.</p>
        ) : (
          <ul className={styles.itemList}>
            {sources.map((source) => (
              <li key={source.id} className={styles.item}>
                <strong>{source.organization}</strong>
                {isDemoSource(source.organization) ? (
                  <span className={styles.meta}>
                    Demo/test kaynağı — resmi mevzuat yerine geçmez.
                  </span>
                ) : null}
                <a
                  className={styles.inlineLink}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {source.url}
                </a>
                <span className={styles.meta}>
                  Yayın: {source.publication_date || "—"} · Son kontrol:{" "}
                  {source.last_checked || "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.block}>
        <h2 className={styles.blockTitle}>Sınırlamalar</h2>
        <ul className={styles.limitList}>
          {limitations.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <div className={styles.actions}>
        <Link href="/app/evaluate" className={styles.secondaryLink}>
          Forma dön
        </Link>
        <Link href="/app" className={styles.primaryLink}>
          Ana sayfaya dön
        </Link>
      </div>
    </section>
  );
}
