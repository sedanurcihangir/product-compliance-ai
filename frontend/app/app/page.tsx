"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getCurrentUser,
  listMyEvaluations,
  type AuthUser,
  type EvaluationHistoryItem,
} from "@/lib/api";
import Reveal from "./Reveal";
import styles from "./home.module.css";

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

const FEATURES = [
  {
    key: "mevzuat",
    title: "Mevzuat",
    body: "Ürününüzle ilişkili mevzuatları belirlemeye yardımcı olur.",
    mark: "M",
  },
  {
    key: "belge",
    title: "Belge",
    body: "Gerekli olabilecek belge ve gereklilikleri görünür hale getirir.",
    mark: "B",
  },
  {
    key: "risk",
    title: "Risk",
    body: "İthalat öncesinde dikkat edilmesi gereken riskleri özetler.",
    mark: "R",
  },
  {
    key: "kaynak",
    title: "Kaynak",
    body: "Sonuçların dayandığı kaynakları görünür tutar.",
    mark: "K",
  },
] as const;

const STEPS = [
  {
    n: "01",
    title: "Ürününü gir",
    body: "Ürün adı, kategori, açıklama ve tedarikçi ülkesini belirt.",
  },
  {
    n: "02",
    title: "Mevzuatı incele",
    body: "Sistem mevcut düzenleyici veriler içerisinden ürünle ilişkili bilgileri değerlendirir.",
  },
  {
    n: "03",
    title: "Sonuçları gör",
    body: "Mevzuat, gereklilik, eksik bilgiler, riskler ve önerilen aksiyonları incele.",
  },
] as const;

const TRACE_ITEMS = [
  "Resmi kaynaklar",
  "Mevzuat kayıtları",
  "Gereklilikler",
  "Kaynak URL’leri",
] as const;

export default function UserHomePage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [history, setHistory] = useState<EvaluationHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError(null);
      try {
        const me = await getCurrentUser();
        if (cancelled) return;
        setUser(me);
        const items = await listMyEvaluations();
        if (!cancelled) setHistory(items);
      } catch {
        if (!cancelled) {
          setUser(null);
          setHistory([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const preview = history.slice(0, 3);

  return (
    <div className={styles.page}>
      <div className={styles.atmosphere} aria-hidden>
        <span className={styles.orbA} />
        <span className={styles.orbB} />
        <span className={styles.grid} />
      </div>

      <section className={styles.hero} aria-labelledby="home-hero-title">
        <div className={styles.heroCopy}>
          <Reveal immediate delayMs={40}>
            <p className={styles.eyebrow}>Türkiye ithalatı için ön kontrol</p>
          </Reveal>
          <Reveal immediate delayMs={120}>
            <h1 id="home-hero-title" className={styles.title}>
              Ürünü sipariş etmeden önce,
              <br />
              neyle karşılaşacağını bil.
            </h1>
          </Reveal>
          <Reveal immediate delayMs={220}>
            <p className={styles.subtitle}>
              Product Compliance AI, Türkiye&apos;ye ürün ithal etmeden önce
              mevzuat, belge, gereklilik ve uygunluk risklerini ön
              değerlendirmeye yardımcı olur.
            </p>
          </Reveal>
          {!loading && !user ? (
            <Reveal immediate delayMs={320}>
              <p className={styles.authHint}>
                Değerlendirme yapmak için{" "}
                <Link href="/app/login" className={styles.inlineLink}>
                  giriş yapın
                </Link>{" "}
                veya{" "}
                <Link href="/app/register" className={styles.inlineLink}>
                  hesap oluşturun
                </Link>
                . Yeni değerlendirme üst menüden başlatılır.
              </p>
            </Reveal>
          ) : null}
        </div>

        <Reveal immediate delayMs={280} className={styles.heroVisualWrap}>
          <div className={styles.heroVisual} aria-hidden>
            <div className={styles.heroPanel}>
              <span className={styles.heroPanelLabel}>Ön değerlendirme</span>
              <ul className={styles.heroPanelList}>
                <li>Mevzuat eşleştirme</li>
                <li>Gereklilik özeti</li>
                <li>Risk ve aksiyonlar</li>
                <li>Kaynak izlenebilirliği</li>
              </ul>
            </div>
            <div className={styles.heroFloat}>
              <strong>Yapılandırılmış sonuç</strong>
              <span>Belge · Risk · Kaynak</span>
            </div>
          </div>
        </Reveal>
      </section>

      <section
        className={styles.section}
        aria-labelledby="features-title"
        data-testid="home-features"
      >
        <Reveal>
          <div className={styles.sectionHead}>
            <h2 id="features-title" className={styles.sectionTitle}>
              Ürün değeri
            </h2>
            <p className={styles.sectionLead}>
              Sipariş öncesi karar desteği için dört temel görünürlük katmanı.
            </p>
          </div>
        </Reveal>
        <div className={styles.featureGrid}>
          {FEATURES.map((feature, index) => (
            <Reveal key={feature.key} delayMs={index * 80}>
              <article className={styles.featureCard}>
                <span className={styles.featureMark} aria-hidden>
                  {feature.mark}
                </span>
                <h3 className={styles.featureTitle}>{feature.title}</h3>
                <p className={styles.featureBody}>{feature.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section
        className={styles.section}
        aria-labelledby="how-title"
        data-testid="home-how"
      >
        <Reveal>
          <div className={styles.sectionHead}>
            <h2 id="how-title" className={styles.sectionTitle}>
              Nasıl çalışır?
            </h2>
            <p className={styles.sectionLead}>
              Üç adımda yapılandırılmış bir ön değerlendirme akışı.
            </p>
          </div>
        </Reveal>
        <ol className={styles.steps}>
          {STEPS.map((step, index) => (
            <Reveal key={step.n} delayMs={index * 90}>
              <li className={styles.step}>
                <span className={styles.stepNum}>{step.n}</span>
                <div>
                  <h3 className={styles.stepTitle}>{step.title}</h3>
                  <p className={styles.stepBody}>{step.body}</p>
                </div>
              </li>
            </Reveal>
          ))}
        </ol>
      </section>

      <section
        className={styles.section}
        aria-labelledby="trace-title"
        data-testid="home-trace"
      >
        <Reveal>
          <div className={styles.traceCard}>
            <div className={styles.sectionHead}>
              <h2 id="trace-title" className={styles.sectionTitle}>
                Sonuçların kaynağını görün.
              </h2>
              <p className={styles.sectionLead}>
                Sistem yalnızca bir cevap üretmez; kullanılan düzenleyici
                kaynakları da gösterir.
              </p>
            </div>
            <ul className={styles.traceList}>
              {TRACE_ITEMS.map((item) => (
                <li key={item} className={styles.traceItem}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </section>

      <section
        className={styles.section}
        aria-labelledby="history-title"
        data-testid="home-history"
      >
        <Reveal>
          <div className={styles.sectionHeadRow}>
            <div className={styles.sectionHead}>
              <h2 id="history-title" className={styles.sectionTitle}>
                Son değerlendirmeler
              </h2>
              <p className={styles.sectionLead}>
                Son kayıtlarınızın kısa bir özeti. Tüm geçmiş için ayrı sayfayı
                kullanın.
              </p>
            </div>
            {user ? (
              <Link href="/app/evaluations" className={styles.sectionAction}>
                Geçmiş Değerlendirmelerin Tümünü Gör
              </Link>
            ) : null}
          </div>
        </Reveal>

        <Reveal delayMs={60}>
          <div className={styles.historyPanel}>
            {loading ? (
              <p className={styles.historyEmpty}>Yükleniyor…</p>
            ) : !user ? (
              <p className={styles.historyEmpty}>
                Geçmişinizi görmek için giriş yapmanız gerekir.
              </p>
            ) : error ? (
              <p className={styles.historyError}>{error}</p>
            ) : preview.length === 0 ? (
              <div className={styles.emptyState}>
                <strong>Henüz değerlendirme yok</strong>
                <p>
                  İlk ön değerlendirmenizi üst menüdeki{" "}
                  <span className={styles.inlineEm}>Yeni Değerlendirme</span>{" "}
                  ile başlatabilirsiniz.
                </p>
              </div>
            ) : (
              <ul className={styles.historyList}>
                {preview.map((item) => (
                  <li key={item.id} className={styles.historyItem}>
                    <div className={styles.historyMeta}>
                      <strong className={styles.historyProduct}>
                        {item.product_name}
                      </strong>
                      <span>
                        {item.product_category_name} · {item.supplier_country}
                      </span>
                      <span>{formatDate(item.created_at)}</span>
                    </div>
                    <Link
                      href={`/app/evaluations/${item.id}`}
                      className={styles.historyLink}
                    >
                      Detayı Gör
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Reveal>
      </section>

      <Reveal>
        <aside className={styles.disclaimer} role="note">
          Bu sistem ön değerlendirme ve karar destek amacıyla hazırlanmıştır.
          Resmi uygunluk veya hukuki danışmanlık yerine geçmez.
        </aside>
      </Reveal>
    </div>
  );
}
