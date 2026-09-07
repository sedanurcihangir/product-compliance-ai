export type ProductCategory = {
  id: number;
  name: string;
  description: string | null;
};

export type ProductCategoryInput = {
  name: string;
  description?: string | null;
};

export type Country = {
  id: number;
  name: string;
  code: string;
};

export type RegulationStatus = "active" | "inactive";

export type Regulation = {
  id: number;
  title: string;
  description: string | null;
  country_id: number;
  effective_date: string | null;
  status: RegulationStatus;
  country: Country;
};

export type RegulationInput = {
  title: string;
  description?: string | null;
  country_id: number;
  effective_date?: string | null;
  status: RegulationStatus;
};

function getApiBaseUrl(): string {
  // In the browser, use same-origin URLs so Next.js rewrites proxy to FastAPI.
  // This prevents cross-origin Failed to fetch between localhost and 127.0.0.1.
  if (typeof window !== "undefined") {
    return "";
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) {
    throw new Error(
      "NEXT_PUBLIC_API_URL is not set. Copy frontend/.env.local.example to frontend/.env.local.",
    );
  }
  return baseUrl.replace(/\/$/, "");
}

async function parseError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { detail?: unknown };
    if (typeof data.detail === "string") {
      return data.detail;
    }
    if (Array.isArray(data.detail)) {
      return data.detail
        .map((item) => {
          if (typeof item === "object" && item && "msg" in item) {
            return String((item as { msg: string }).msg);
          }
          return JSON.stringify(item);
        })
        .join(", ");
    }
  } catch {
    // fall through
  }
  return `Request failed with status ${response.status}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const hasBody = init?.body !== undefined && init?.body !== null;
  if (hasBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function listProductCategories() {
  return request<ProductCategory[]>("/api/product-categories");
}

export function createProductCategory(payload: ProductCategoryInput) {
  return request<ProductCategory>("/api/product-categories", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateProductCategory(
  id: number,
  payload: ProductCategoryInput,
) {
  return request<ProductCategory>(`/api/product-categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteProductCategory(id: number) {
  return request<void>(`/api/product-categories/${id}`, {
    method: "DELETE",
  });
}

export function listCountries() {
  return request<Country[]>("/api/countries");
}

export function listRegulations() {
  return request<Regulation[]>("/api/regulations");
}

export function createRegulation(payload: RegulationInput) {
  return request<Regulation>("/api/regulations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateRegulation(id: number, payload: RegulationInput) {
  return request<Regulation>(`/api/regulations/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteRegulation(id: number) {
  return request<void>(`/api/regulations/${id}`, {
    method: "DELETE",
  });
}

export type Requirement = {
  id: number;
  regulation_id: number;
  title: string;
  description: string | null;
  type: string | null;
  regulation: Regulation;
};

export type RequirementInput = {
  regulation_id: number;
  title: string;
  description?: string | null;
  type?: string | null;
};

export function listRequirements() {
  return request<Requirement[]>("/api/requirements");
}

export function createRequirement(payload: RequirementInput) {
  return request<Requirement>("/api/requirements", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateRequirement(id: number, payload: RequirementInput) {
  return request<Requirement>(`/api/requirements/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteRequirement(id: number) {
  return request<void>(`/api/requirements/${id}`, {
    method: "DELETE",
  });
}

export type RiskRule = {
  id: number;
  condition: string;
  risk_level: string;
  explanation: string | null;
};

export type RiskRuleInput = {
  condition: string;
  risk_level: string;
  explanation?: string | null;
};

export function listRiskRules() {
  return request<RiskRule[]>("/api/risk-rules");
}

export function createRiskRule(payload: RiskRuleInput) {
  return request<RiskRule>("/api/risk-rules", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateRiskRule(id: number, payload: RiskRuleInput) {
  return request<RiskRule>(`/api/risk-rules/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteRiskRule(id: number) {
  return request<void>(`/api/risk-rules/${id}`, {
    method: "DELETE",
  });
}

export type Source = {
  id: number;
  organization: string;
  url: string;
  publication_date: string | null;
  last_checked: string | null;
};

export type SourceInput = {
  organization: string;
  url: string;
  publication_date?: string | null;
  last_checked?: string | null;
};

export function listSources() {
  return request<Source[]>("/api/sources");
}

export function createSource(payload: SourceInput) {
  return request<Source>("/api/sources", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateSource(id: number, payload: SourceInput) {
  return request<Source>(`/api/sources/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteSource(id: number) {
  return request<void>(`/api/sources/${id}`, {
    method: "DELETE",
  });
}
