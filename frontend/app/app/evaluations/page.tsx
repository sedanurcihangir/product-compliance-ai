"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ApiError,
  getCurrentUser,
  listMyEvaluations,
  type EvaluationHistoryItem,
} from "@/lib/api";
import styles from "./history.module.css";

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

function modeLabel(mode: string): string {
  if (mode === "llm") return "LLM destekli";
  if (mode === "deterministic") return "Deterministik";
  return mode;
}

export default function EvaluationsHistoryPage() {
  const router = useRouter();
  const [items, setItems] = useState<EvaluationHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await getCurrentUser();
        const data = await listMyEvaluations();
        if (!cancelled) setItems(data);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/app/login");
          return;
        }
        setError("Değerlendirmeler yüklenirken bir sorun oluştu.");
        setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <section className={styles.page} data-testid="evaluations-history-page">
      <header className={styles.header}>
        <h1 className={styles.title}>Geçmiş Değerlendirmeler</h1>
        <p className={styles.subtitle}>
          Daha önce kaydettiğiniz ön değerlendirmeleri buradan inceleyebilirsiniz.
        </p>
      </header>

      {loading ? (
        <div className={styles.skeletonGrid} aria-busy="true" aria-live="polite">
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
        </div>
      ) : null}

      {!loading && error ? (
        <p className={styles.errorBanner} role="alert">
          {error}
        </p>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <div className={styles.emptyState}>
          <strong>Henüz bir değerlendirme yapmadınız.</strong>
          <p>
            İlk ürününüzü değerlendirmek için yeni bir değerlendirme
            oluşturabilirsiniz.
          </p>
          <Link href="/app/evaluate" className={styles.primaryLink}>
            Yeni Değerlendirme
          </Link>
        </div>
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <ul className={styles.grid}>
          {items.map((item) => (
            <li key={item.id} className={styles.card}>
              <div className={styles.cardBody}>
                <h2 className={styles.productName}>{item.product_name}</h2>
                <p className={styles.meta}>
                  {item.product_category_name} · {item.supplier_country}
                </p>
                <p className={styles.meta}>{formatDate(item.created_at)}</p>
                {item.evaluation_mode ? (
                  <span className={styles.modeBadge}>
                    {modeLabel(item.evaluation_mode)}
                  </span>
                ) : null}
              </div>
              <Link
                href={`/app/evaluations/${item.id}`}
                className={styles.detailLink}
              >
                Detayı Gör
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
