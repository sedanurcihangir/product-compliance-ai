"use client";

import dynamic from "next/dynamic";
import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import {
  getAnalyticsOverview,
  getDistributionByCity,
  getDistributionByCountry,
  getDistributionByProduct,
  getDistributionOverTime,
  type AnalyticsFilters,
  type AnalyticsOverview,
  type CityDistribution,
  type CountryDistribution,
  type ProductDistributionAnalytics,
  type TimeSeriesPoint,
} from "@/lib/analytics";
import {
  listCountries,
  listProductCategories,
  listProducts,
  listRegulations,
  type Country,
  type Product,
  type ProductCategory,
  type Regulation,
} from "@/lib/api";
import ImportSourcesDonut from "./components/ImportSourcesDonut";
import ProductDistributionBars from "./components/ProductDistributionBars";
import RegulationTimeline, {
  type TimelineItem,
} from "./components/RegulationTimeline";
import styles from "./dashboard.module.css";

const TurkeyMap = dynamic(() => import("./components/TurkeyMap"), {
  ssr: false,
  loading: () => <p className={styles.stateMessage}>Harita yükleniyor…</p>,
});

type FilterState = {
  import_country_id: string;
  product_category_id: string;
  product_name: string;
  date_from: string;
  date_to: string;
  include_demo: boolean;
};

const defaultFilters: FilterState = {
  import_country_id: "",
  product_category_id: "",
  product_name: "",
  date_from: "",
  date_to: "",
  include_demo: true,
};

type SectionState<T> = {
  data: T;
  loading: boolean;
  error: string | null;
};

function toApiFilters(filters: FilterState): AnalyticsFilters {
  return {
    import_country_id: filters.import_country_id
      ? Number(filters.import_country_id)
      : null,
    product_category_id: filters.product_category_id
      ? Number(filters.product_category_id)
      : null,
    product_name: filters.product_name || null,
    date_from: filters.date_from || null,
    date_to: filters.date_to || null,
    include_demo: filters.include_demo,
  };
}

function emptyMessage(includeDemo: boolean): string {
  if (!includeDemo) {
    return "Demo verileri kapalı ve bu filtrelere uygun kayıt bulunamadı.";
  }
  return "Bu filtrelere uygun dağıtım verisi bulunamadı.";
}

function formatPeriodLabel(period: string): string {
  // Expect YYYY-MM from analytics endpoint.
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  if (!match) return period;
  const month = Number(match[2]);
  const year = match[1];
  const months = [
    "Ocak",
    "Şubat",
    "Mart",
    "Nisan",
    "Mayıs",
    "Haziran",
    "Temmuz",
    "Ağustos",
    "Eylül",
    "Ekim",
    "Kasım",
    "Aralık",
  ];
  return `${months[month - 1] ?? period} ${year}`;
}

function formatRegulationDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("tr-TR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function buildTimelineItems(regs: Regulation[]): TimelineItem[] {
  const seen = new Set<string>();
  const items: Array<TimelineItem & { sortKey: string }> = [];
  for (const reg of regs) {
    if (!reg.effective_date) continue;
    const key = `${reg.title}::${reg.effective_date}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      id: reg.id,
      title: reg.title,
      dateLabel: formatRegulationDate(reg.effective_date),
      description: reg.description
        ? reg.description.length > 180
          ? `${reg.description.slice(0, 177)}…`
          : reg.description
        : null,
      sortKey: reg.effective_date,
    });
  }
  return items
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .map((item) => ({
      id: item.id,
      title: item.title,
      dateLabel: item.dateLabel,
      description: item.description,
    }));
}

export default function AdminDashboardPage() {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [countries, setCountries] = useState<Country[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [metaError, setMetaError] = useState<string | null>(null);

  const [overview, setOverview] = useState<SectionState<AnalyticsOverview | null>>(
    {
      data: null,
      loading: true,
      error: null,
    },
  );
  const [cities, setCities] = useState<SectionState<CityDistribution[]>>({
    data: [],
    loading: true,
    error: null,
  });
  const [products, setProducts] = useState<
    SectionState<ProductDistributionAnalytics[]>
  >({
    data: [],
    loading: true,
    error: null,
  });
  const [byCountry, setByCountry] = useState<
    SectionState<CountryDistribution[]>
  >({
    data: [],
    loading: true,
    error: null,
  });
  const [series, setSeries] = useState<SectionState<TimeSeriesPoint[]>>({
    data: [],
    loading: true,
    error: null,
  });

  const apiFilters = useMemo(() => toApiFilters(filters), [filters]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [countryRows, categoryRows, productRows, regulationRows] =
          await Promise.all([
            listCountries(),
            listProductCategories({ has_products: true }),
            listProducts(),
            listRegulations(),
          ]);
        if (cancelled) return;
        setCountries(countryRows);
        setCategories(
          [...categoryRows].sort((a, b) => a.name.localeCompare(b.name, "tr")),
        );
        setCatalogProducts(
          [...productRows].sort((a, b) => a.name.localeCompare(b.name, "tr")),
        );
        setRegulations(regulationRows);
      } catch (err) {
        if (!cancelled) {
          setMetaError(
            err instanceof Error
              ? err.message
              : "Filtre seçenekleri yüklenemedi.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const productOptions = useMemo(() => {
    const categoryId = filters.product_category_id
      ? Number(filters.product_category_id)
      : null;
    const rows =
      categoryId == null
        ? catalogProducts
        : catalogProducts.filter((p) => p.product_category_id === categoryId);
    return rows;
  }, [catalogProducts, filters.product_category_id]);

  const loadAnalytics = useCallback(async (nextFilters: AnalyticsFilters) => {
    setOverview((prev) => ({ ...prev, loading: true, error: null }));
    setCities((prev) => ({ ...prev, loading: true, error: null }));
    setProducts((prev) => ({ ...prev, loading: true, error: null }));
    setByCountry((prev) => ({ ...prev, loading: true, error: null }));
    setSeries((prev) => ({ ...prev, loading: true, error: null }));

    const results = await Promise.allSettled([
      getAnalyticsOverview(nextFilters),
      getDistributionByCity(nextFilters),
      getDistributionByProduct(nextFilters),
      getDistributionByCountry(nextFilters),
      getDistributionOverTime(nextFilters),
    ]);

    const fail = "Analitik verileri yüklenirken bir hata oluştu.";

    if (results[0].status === "fulfilled") {
      setOverview({ data: results[0].value, loading: false, error: null });
    } else {
      setOverview({ data: null, loading: false, error: fail });
    }

    if (results[1].status === "fulfilled") {
      setCities({ data: results[1].value, loading: false, error: null });
    } else {
      setCities({ data: [], loading: false, error: fail });
    }

    if (results[2].status === "fulfilled") {
      setProducts({ data: results[2].value, loading: false, error: null });
    } else {
      setProducts({ data: [], loading: false, error: fail });
    }

    if (results[3].status === "fulfilled") {
      setByCountry({ data: results[3].value, loading: false, error: null });
    } else {
      setByCountry({ data: [], loading: false, error: fail });
    }

    if (results[4].status === "fulfilled") {
      setSeries({ data: results[4].value, loading: false, error: null });
    } else {
      setSeries({ data: [], loading: false, error: fail });
    }
  }, []);

  useEffect(() => {
    startTransition(() => {
      void loadAnalytics(apiFilters);
    });
  }, [apiFilters, loadAnalytics]);

  function updateFilter<K extends keyof FilterState>(
    key: K,
    value: FilterState[K],
  ) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function clearFilters() {
    setFilters(defaultFilters);
  }

  const showDemoBadge = filters.include_demo;
  const timelineItems = useMemo(
    () => buildTimelineItems(regulations),
    [regulations],
  );
  const snapshotPeriod =
    !series.loading && series.data.length === 1 ? series.data[0].period : null;

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Dağıtım ve İthalat Analitiği</h1>
        <p className={styles.subtitle}>
          İthalat ülkesi, ürün, kategori ve tarih filtrelerine göre dağıtım
          verilerini inceleyin.
        </p>
        {showDemoBadge ? (
          <span className={styles.demoBadge}>Demo verileri gösteriliyor</span>
        ) : (
          <span className={styles.demoBadge}>Demo verileri kapalı</span>
        )}
        {snapshotPeriod ? (
          <span className={styles.periodChip}>
            Kayıt dönemi: {formatPeriodLabel(snapshotPeriod)}
          </span>
        ) : null}
        <p className={styles.note}>
          Bu ekrandaki sayılar örnek/demo dağıtım kayıtlarına dayanır; gerçek
          piyasa veya satış verisi değildir. Trend grafiği yalnızca yeterli
          tarih noktası olduğunda gösterilir.
        </p>
      </header>

      {metaError ? <p className={styles.errorMessage}>{metaError}</p> : null}

      <div className={styles.filters}>
        <label className={styles.label}>
          İthalat Ülkesi
          <select
            className={styles.select}
            value={filters.import_country_id}
            onChange={(event) =>
              updateFilter("import_country_id", event.target.value)
            }
          >
            <option value="">Tümü</option>
            {countries
              .filter((country) => (country.code || "").toUpperCase() !== "TR")
              .map((country) => (
                <option key={country.id} value={country.id}>
                  {country.name} ({country.code})
                </option>
              ))}
          </select>
        </label>

        <label className={styles.label}>
          Ürün Kategorisi
          <select
            className={styles.select}
            value={filters.product_category_id}
            onChange={(event) => {
              setFilters((prev) => ({
                ...prev,
                product_category_id: event.target.value,
                product_name: "",
              }));
            }}
          >
            <option value="">Tümü</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.label}>
          Ürün
          <select
            className={styles.select}
            value={filters.product_name}
            onChange={(event) => updateFilter("product_name", event.target.value)}
          >
            <option value="">Tümü</option>
            {productOptions.map((product) => (
              <option key={product.id} value={product.name}>
                {product.name}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.label}>
          Başlangıç Tarihi
          <input
            className={styles.input}
            type="date"
            value={filters.date_from}
            onChange={(event) => updateFilter("date_from", event.target.value)}
          />
        </label>

        <label className={styles.label}>
          Bitiş Tarihi
          <input
            className={styles.input}
            type="date"
            value={filters.date_to}
            onChange={(event) => updateFilter("date_to", event.target.value)}
          />
        </label>

        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={filters.include_demo}
            onChange={(event) =>
              updateFilter("include_demo", event.target.checked)
            }
          />
          Demo verileri dahil et
        </label>

        <div className={styles.filterActions}>
          <button
            type="button"
            className={styles.clearButton}
            onClick={clearFilters}
          >
            Filtreleri Temizle
          </button>
        </div>
      </div>

      <div className={styles.kpiGrid}>
        {[
          {
            label: "Toplam Dağıtılan Miktar",
            value: overview.data?.total_quantity,
          },
          { label: "Dağıtım Kaydı", value: overview.data?.record_count },
          { label: "Ürün Sayısı", value: overview.data?.product_count },
          { label: "Kategori Sayısı", value: overview.data?.category_count },
          {
            label: "İthalat Ülkesi Sayısı",
            value: overview.data?.import_country_count,
          },
        ].map((card) => (
          <article key={card.label} className={styles.kpiCard}>
            <span className={styles.kpiLabel}>{card.label}</span>
            {overview.loading ? (
              <span className={styles.skeleton} />
            ) : overview.error ? (
              <span className={styles.stateMessage}>—</span>
            ) : (
              <span className={styles.kpiValue} data-testid="kpi-value">
                {(card.value ?? 0).toLocaleString("tr-TR")}
              </span>
            )}
          </article>
        ))}
      </div>
      {overview.error ? (
        <p className={styles.errorMessage}>{overview.error}</p>
      ) : null}

      <section className={styles.mapPanel} data-testid="admin-map-panel">
        <h2 className={styles.panelTitle}>Türkiye&apos;de Ürün Dağılımı</h2>
        <p className={styles.panelLead}>
          Seçili filtrelere göre ürünlerin şehir bazlı yoğunluğunu gösterir.
        </p>
        {cities.error ? (
          <p className={styles.errorMessage}>{cities.error}</p>
        ) : cities.loading ? (
          <p className={styles.stateMessage}>Harita verileri yükleniyor…</p>
        ) : cities.data.length === 0 ? (
          <p className={styles.stateMessage}>
            {emptyMessage(filters.include_demo)}
          </p>
        ) : (
          <div className={styles.mapFrame} data-testid="admin-map-frame">
            <TurkeyMap cities={cities.data} />
          </div>
        )}
      </section>

      <div className={styles.analysisRow}>
        <section className={styles.analysisPanel}>
          <h2 className={styles.panelTitle}>Ürün Dağıtım Analizi</h2>
          <p className={styles.panelLead}>
            Hangi ürünlerin ne kadar dağıtıldığını karşılaştırır.
          </p>
          {products.error ? (
            <p className={styles.errorMessage}>{products.error}</p>
          ) : products.loading ? (
            <p className={styles.stateMessage}>Grafik yükleniyor…</p>
          ) : products.data.length === 0 ? (
            <p className={styles.stateMessage}>
              {emptyMessage(filters.include_demo)}
            </p>
          ) : (
            <ProductDistributionBars data={products.data} />
          )}
        </section>

        <section className={styles.sidePanel}>
          <h2 className={styles.panelTitle}>İthalat Kaynakları</h2>
          <p className={styles.panelLead}>
            Ürünlerin hangi ülkelerden geldiğini gösterir.
          </p>
          {byCountry.error ? (
            <p className={styles.errorMessage}>{byCountry.error}</p>
          ) : byCountry.loading ? (
            <p className={styles.stateMessage}>Grafik yükleniyor…</p>
          ) : byCountry.data.length === 0 ? (
            <p className={styles.stateMessage}>
              {emptyMessage(filters.include_demo)}
            </p>
          ) : (
            <ImportSourcesDonut data={byCountry.data} />
          )}
        </section>
      </div>

      <section className={styles.timelinePanel}>
        <h2 className={styles.panelTitle}>Mevzuat Zaman Çizgisi</h2>
        <p className={styles.panelLead}>
          Effective date bilgisi bulunan gerçek mevzuat kayıtlarının zaman
          konumunu gösterir.
        </p>
        <RegulationTimeline items={timelineItems} />
      </section>
    </section>
  );
}
