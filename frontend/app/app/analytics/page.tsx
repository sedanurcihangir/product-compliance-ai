"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ApiError,
  getCurrentUser,
  getMyEvaluation,
  listMyEvaluations,
  type EvaluationDetailResponse,
  type EvaluationHistoryItem,
} from "@/lib/api";
import Reveal from "../Reveal";
import styles from "./analytics.module.css";

type AnalyticsRow = {
  history: EvaluationHistoryItem;
  detail: EvaluationDetailResponse | null;
};

const RISK_COLORS = ["#1d4ed8", "#0f766e", "#b45309", "#b91c1c", "#64748b"];

/** Line chart only when there are enough distinct day points to form a trend. */
const TIMELINE_CHART_MIN_DAYS = 2;
/** Pie/donut only when there are at least two risk level buckets. */
const RISK_CHART_MIN_BUCKETS = 2;
/** Country bar chart only when there are at least two supplier countries. */
const COUNTRY_CHART_MIN_BUCKETS = 2;

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

function formatDayLabel(value: string): string {
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit",
      month: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function dayKey(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function countMap(values: string[]): { name: string; count: number }[] {
  const map = new Map<string, number>();
  for (const raw of values) {
    const key = raw.trim();
    if (!key) continue;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "tr"));
}

function formatRiskLabel(level: string): string {
  const normalized = level.trim().toLocaleLowerCase("tr-TR");
  if (normalized === "medium" || normalized === "orta") return "Orta";
  if (normalized === "low" || normalized === "düşük" || normalized === "dusuk") {
    return "Düşük";
  }
  if (normalized === "high" || normalized === "yüksek" || normalized === "yuksek") {
    return "Yüksek";
  }
  if (normalized.includes("değerlendirilemedi") || normalized.includes("degerlendirilemedi")) {
    return "Değerlendirilemedi";
  }
  return level;
}

export default function UserAnalyticsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<AnalyticsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await getCurrentUser();
        const history = await listMyEvaluations();
        const details = await Promise.all(
          history.map(async (item) => {
            try {
              const detail = await getMyEvaluation(item.id);
              return { history: item, detail } satisfies AnalyticsRow;
            } catch {
              return { history: item, detail: null } satisfies AnalyticsRow;
            }
          }),
        );
        if (!cancelled) setRows(details);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/app/login");
          return;
        }
        setError("Analiz verileri yüklenirken bir sorun oluştu.");
        setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const analytics = useMemo(() => {
    const total = rows.length;
    const products = new Set(
      rows.map((r) => r.history.product_name.trim()).filter(Boolean),
    );

    let regulationHits = 0;
    let requirementHits = 0;
    const regulationIds = new Set<number>();
    const riskLevels: string[] = [];
    const missingItems: string[] = [];
    let riskDetected = 0;

    for (const row of rows) {
      const evaluation = row.detail?.evaluation;
      if (!evaluation) continue;

      regulationHits += evaluation.regulations.length;
      requirementHits += evaluation.requirements.length;
      for (const reg of evaluation.regulations) {
        regulationIds.add(reg.id);
      }

      const level = evaluation.ai_assessment?.risk_assessment?.level?.trim();
      if (level) {
        riskLevels.push(level);
        riskDetected += 1;
      }

      const missing = evaluation.ai_assessment?.missing_information ?? [];
      for (const item of missing) {
        if (item.trim()) missingItems.push(item.trim());
      }
    }

    const countries = countMap(rows.map((r) => r.history.supplier_country));
    const riskDistribution = countMap(riskLevels);
    const missingTop = countMap(missingItems).slice(0, 8);

    const byDayMap = new Map<string, { key: string; label: string; count: number }>();
    for (const row of rows) {
      const key = dayKey(row.history.created_at);
      const existing = byDayMap.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        byDayMap.set(key, {
          key,
          label: formatDayLabel(row.history.created_at),
          count: 1,
        });
      }
    }
    const timeline = [...byDayMap.values()].sort((a, b) =>
      a.key.localeCompare(b.key),
    );

    const recent = [...rows]
      .sort(
        (a, b) =>
          new Date(b.history.created_at).getTime() -
          new Date(a.history.created_at).getTime(),
      )
      .slice(0, 5)
      .map((row) => ({
        id: row.history.id,
        product_name: row.history.product_name,
        supplier_country: row.history.supplier_country,
        created_at: row.history.created_at,
        risk:
          row.detail?.evaluation.ai_assessment?.risk_assessment?.level?.trim() ||
          null,
      }));

    const dominantRisk =
      riskDistribution.length === 1 ? riskDistribution[0] : null;

    return {
      total,
      productCount: products.size,
      regulationDistinct: regulationIds.size,
      regulationHits,
      requirementHits,
      riskDetected,
      riskDistribution,
      dominantRisk,
      countries,
      missingTop,
      timeline,
      recent,
      hasDetailData: rows.some((r) => r.detail != null),
      showRiskChart: riskDistribution.length >= RISK_CHART_MIN_BUCKETS,
      showCountryChart: countries.length >= COUNTRY_CHART_MIN_BUCKETS,
      showTimelineChart: timeline.length >= TIMELINE_CHART_MIN_DAYS,
    };
  }, [rows]);

  return (
    <div className={styles.page} data-testid="user-analytics-page">
      <Reveal immediate>
        <header className={styles.header}>
          <h1 className={styles.title}>Analiz</h1>
          <p className={styles.subtitle}>
            Yaptığınız ürün değerlendirmelerinin genel görünümünü ve tekrar eden
            bilgi ihtiyaçlarını inceleyin. Grafikler yalnızca yeterli veri
            olduğunda gösterilir.
          </p>
        </header>
      </Reveal>

      {loading ? (
        <div className={styles.loadingBlock} aria-busy="true">
          <div className={styles.kpiGrid}>
            <div className={styles.skeletonKpi} />
            <div className={styles.skeletonKpi} />
            <div className={styles.skeletonKpi} />
          </div>
          <div className={styles.chartsGrid}>
            <div className={styles.skeletonChart} />
            <div className={styles.skeletonChart} />
          </div>
        </div>
      ) : null}

      {!loading && error ? (
        <p className={styles.errorBanner} role="alert">
          {error}
        </p>
      ) : null}

      {!loading && !error && analytics.total === 0 ? (
        <Reveal>
          <div className={styles.emptyState}>
            <strong>Henüz analiz edilecek bir değerlendirme bulunmuyor.</strong>
            <p>İlk ürününüzü değerlendirin.</p>
            <Link href="/app/evaluate" className={styles.primaryLink}>
              Yeni Değerlendirme
            </Link>
          </div>
        </Reveal>
      ) : null}

      {!loading && !error && analytics.total > 0 ? (
        <>
          <section className={styles.kpiGrid} aria-label="Özet göstergeler">
            <Reveal delayMs={40}>
              <article className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Toplam Değerlendirme</span>
                <strong className={styles.kpiValue}>{analytics.total}</strong>
              </article>
            </Reveal>
            <Reveal delayMs={90}>
              <article className={styles.kpiCard}>
                <span className={styles.kpiLabel}>İncelenen Ürün</span>
                <strong className={styles.kpiValue}>
                  {analytics.productCount}
                </strong>
              </article>
            </Reveal>
            {analytics.hasDetailData ? (
              <Reveal delayMs={140}>
                <article className={styles.kpiCard}>
                  <span className={styles.kpiLabel}>Tespit Edilen Risk</span>
                  <strong className={styles.kpiValue}>
                    {analytics.riskDetected}
                  </strong>
                </article>
              </Reveal>
            ) : null}
          </section>

          <div className={styles.contentStack}>
            {analytics.hasDetailData &&
            (analytics.regulationDistinct > 0 || analytics.requirementHits > 0) ? (
              <Reveal delayMs={80}>
                <section className={styles.panel}>
                  <h2 className={styles.panelTitle}>Değerlendirme Kapsamı</h2>
                  <p className={styles.panelLead}>
                    Değerlendirmelerinizde geçen mevzuat ve gerekliliklerin
                    özeti.
                  </p>
                  <div className={styles.statPair}>
                    <article className={styles.statCard}>
                      <strong className={styles.statValue}>
                        {analytics.regulationDistinct}
                      </strong>
                      <span className={styles.statLabel}>İlgili mevzuat</span>
                    </article>
                    <article className={styles.statCard}>
                      <strong className={styles.statValue}>
                        {analytics.requirementHits}
                      </strong>
                      <span className={styles.statLabel}>
                        Tespit edilen gereklilik
                      </span>
                    </article>
                  </div>
                </section>
              </Reveal>
            ) : null}

            <div className={styles.chartsGrid}>
              {analytics.showRiskChart ? (
                <Reveal delayMs={100}>
                  <section className={styles.panel}>
                    <h2 className={styles.panelTitle}>Risk Dağılımı</h2>
                    <div className={styles.chartBody}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analytics.riskDistribution}
                            dataKey="count"
                            nameKey="name"
                            innerRadius={48}
                            outerRadius={78}
                            paddingAngle={2}
                          >
                            {analytics.riskDistribution.map((entry, index) => (
                              <Cell
                                key={entry.name}
                                fill={RISK_COLORS[index % RISK_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value, name) => [
                              `${value} değerlendirme`,
                              formatRiskLabel(String(name)),
                            ]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <ul className={styles.legend}>
                        {analytics.riskDistribution.map((entry, index) => (
                          <li key={entry.name}>
                            <span
                              className={styles.legendDot}
                              style={{
                                background:
                                  RISK_COLORS[index % RISK_COLORS.length],
                              }}
                            />
                            {formatRiskLabel(entry.name)} · {entry.count}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </section>
                </Reveal>
              ) : analytics.dominantRisk ? (
                <Reveal delayMs={100}>
                  <section className={styles.panel}>
                    <h2 className={styles.panelTitle}>Risk Durumu</h2>
                    <p className={styles.panelLead}>
                      Tek risk seviyesi görüldüğü için dağılım grafiği
                      gösterilmiyor.
                    </p>
                    <div className={styles.statusBlock}>
                      <span className={styles.statusEyebrow}>SEVİYE</span>
                      <strong className={styles.statusValue}>
                        {formatRiskLabel(analytics.dominantRisk.name)}
                      </strong>
                    </div>
                  </section>
                </Reveal>
              ) : null}

              {analytics.showCountryChart ? (
                <Reveal delayMs={140}>
                  <section className={styles.panel}>
                    <h2 className={styles.panelTitle}>
                      Değerlendirilen Tedarikçi Ülkeleri
                    </h2>
                    <div className={styles.chartBody}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={analytics.countries}
                          layout="vertical"
                          margin={{ left: 8, right: 12 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis type="number" allowDecimals={false} />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={88}
                            tick={{ fontSize: 12 }}
                          />
                          <Tooltip
                            formatter={(value) => [
                              `${value} değerlendirme`,
                              "Adet",
                            ]}
                          />
                          <Bar
                            dataKey="count"
                            fill="#1d4ed8"
                            radius={[0, 6, 6, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </section>
                </Reveal>
              ) : analytics.countries.length === 1 ? (
                <Reveal delayMs={140}>
                  <section className={styles.panel}>
                    <h2 className={styles.panelTitle}>Tedarikçi Ülkesi</h2>
                    <p className={styles.panelLead}>
                      Tek ülke görüldüğü için karşılaştırma grafiği
                      gösterilmiyor.
                    </p>
                    <div className={styles.countryChip}>
                      {analytics.countries[0].name}
                    </div>
                  </section>
                </Reveal>
              ) : null}
            </div>

            {analytics.hasDetailData ? (
              <Reveal delayMs={160}>
                <section className={styles.panel}>
                  <h2 className={styles.panelTitle}>Eksik Bilgiler</h2>
                  <p className={styles.panelLead}>
                    Değerlendirmelerde tekrarlayan kontrol / belge ihtiyaçları.
                  </p>
                  {analytics.missingTop.length === 0 ? (
                    <p className={styles.emptyNote}>
                      Eksik bilgi analizi için henüz yeterli veri bulunmuyor.
                    </p>
                  ) : (
                    <ul className={styles.rankList}>
                      {analytics.missingTop.map((item) => (
                        <li key={item.name} className={styles.rankItem}>
                          <span className={styles.rankLabel}>{item.name}</span>
                          <strong className={styles.rankCount}>
                            {item.count}
                          </strong>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </Reveal>
            ) : null}

            <Reveal delayMs={200}>
              <section className={styles.panel}>
                <h2 className={styles.panelTitle}>Değerlendirme Geçmişi</h2>
                {analytics.showTimelineChart ? (
                  <div className={styles.chartBodyTall}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analytics.timeline}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} width={32} />
                        <Tooltip
                          formatter={(value) => [
                            `${value} değerlendirme`,
                            "Adet",
                          ]}
                        />
                        <Line
                          type="monotone"
                          dataKey="count"
                          stroke="#1d4ed8"
                          strokeWidth={2.5}
                          dot={{ r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className={styles.infoState}>
                    <strong>Trend henüz oluşmadı</strong>
                    <p>
                      Yeterli geçmiş verisi oluştuğunda (en az{" "}
                      {TIMELINE_CHART_MIN_DAYS} farklı günde değerlendirme)
                      değerlendirme trendiniz burada gösterilecek.
                    </p>
                  </div>
                )}
              </section>
            </Reveal>

            <Reveal delayMs={120}>
              <section className={styles.recentSection}>
                <div className={styles.recentHead}>
                  <h2 className={styles.panelTitle}>Son Değerlendirmeler</h2>
                  <Link href="/app/evaluations" className={styles.textLink}>
                    Geçmiş Değerlendirmelerin Tümünü Gör
                  </Link>
                </div>
                <ul className={styles.recentList}>
                  {analytics.recent.map((item) => (
                    <li key={item.id} className={styles.recentCard}>
                      <div className={styles.recentMeta}>
                        <strong>{item.product_name}</strong>
                        <span>
                          {item.supplier_country} · {formatDate(item.created_at)}
                        </span>
                        {item.risk ? (
                          <span className={styles.riskBadge}>
                            {formatRiskLabel(item.risk)}
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
              </section>
            </Reveal>
          </div>
        </>
      ) : null}
    </div>
  );
}
