export type AnalyticsOverview = {
  total_quantity: number;
  record_count: number;
  product_count: number;
  category_count: number;
  import_country_count: number;
  is_demo: boolean;
};

export type CityDistribution = {
  city: string;
  city_code: string;
  quantity: number;
};

export type ProductDistributionAnalytics = {
  product_name: string;
  quantity: number;
};

export type CountryDistribution = {
  import_country_id: number;
  country_name: string;
  country_code: string;
  quantity: number;
};

export type TimeSeriesPoint = {
  period: string;
  quantity: number;
};

export type AnalyticsFilters = {
  import_country_id?: number | null;
  product_category_id?: number | null;
  product_name?: string | null;
  date_from?: string | null;
  date_to?: string | null;
  include_demo?: boolean;
};

function buildQuery(filters: AnalyticsFilters): string {
  const params = new URLSearchParams();
  if (filters.import_country_id != null && filters.import_country_id > 0) {
    params.set("import_country_id", String(filters.import_country_id));
  }
  if (filters.product_category_id != null && filters.product_category_id > 0) {
    params.set("product_category_id", String(filters.product_category_id));
  }
  if (filters.product_name && filters.product_name.trim()) {
    params.set("product_name", filters.product_name.trim());
  }
  if (filters.date_from) {
    params.set("date_from", filters.date_from);
  }
  if (filters.date_to) {
    params.set("date_to", filters.date_to);
  }
  if (filters.include_demo !== undefined) {
    params.set("include_demo", String(filters.include_demo));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

async function parseError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { detail?: unknown };
    if (typeof data.detail === "string") return data.detail;
  } catch {
    // ignore
  }
  return `Request failed with status ${response.status}`;
}

async function analyticsGet<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return (await response.json()) as T;
}

export function getAnalyticsOverview(filters: AnalyticsFilters = {}) {
  return analyticsGet<AnalyticsOverview>(
    `/api/analytics/overview${buildQuery(filters)}`,
  );
}

export function getDistributionByCity(filters: AnalyticsFilters = {}) {
  return analyticsGet<CityDistribution[]>(
    `/api/analytics/distribution-by-city${buildQuery(filters)}`,
  );
}

export function getDistributionByProduct(filters: AnalyticsFilters = {}) {
  return analyticsGet<ProductDistributionAnalytics[]>(
    `/api/analytics/distribution-by-product${buildQuery(filters)}`,
  );
}

export function getDistributionByCountry(filters: AnalyticsFilters = {}) {
  return analyticsGet<CountryDistribution[]>(
    `/api/analytics/distribution-by-country${buildQuery(filters)}`,
  );
}

export function getDistributionOverTime(filters: AnalyticsFilters = {}) {
  return analyticsGet<TimeSeriesPoint[]>(
    `/api/analytics/distribution-over-time${buildQuery(filters)}`,
  );
}
