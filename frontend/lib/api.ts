export type ProductCategory = {
  id: number;
  name: string;
  description: string | null;
};

export type ProductCategoryInput = {
  name: string;
  description?: string | null;
};

export type Product = {
  id: number;
  name: string;
  description: string | null;
  product_category_id: number;
  product_category_name: string | null;
  created_at: string;
};

export type ProductInput = {
  name: string;
  description?: string | null;
  product_category_id: number;
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
  product_category_id: number | null;
  effective_date: string | null;
  status: RegulationStatus;
  country: Country;
};

export type RegulationInput = {
  title: string;
  description?: string | null;
  country_id: number;
  product_category_id?: number | null;
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

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
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
  const isFormData =
    typeof FormData !== "undefined" && init?.body instanceof FormData;
  // Let the browser set multipart boundary for FormData uploads.
  if (hasBody && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    throw new ApiError(response.status, await parseError(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function listProductCategories(params?: { has_products?: boolean }) {
  const query = new URLSearchParams();
  if (params?.has_products === true) query.set("has_products", "true");
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return request<ProductCategory[]>(`/api/product-categories${suffix}`);
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

export function listProducts(params?: { product_category_id?: number }) {
  const query = new URLSearchParams();
  if (params?.product_category_id != null) {
    query.set("product_category_id", String(params.product_category_id));
  }
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return request<Product[]>(`/api/products${suffix}`);
}

export function createProduct(payload: ProductInput) {
  return request<Product>("/api/products", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateProduct(id: number, payload: ProductInput) {
  return request<Product>(`/api/products/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteProduct(id: number) {
  return request<void>(`/api/products/${id}`, {
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

export type EvaluationInput = {
  product_name: string;
  product_id: number;
  product_category_id?: number | null;
  product_description: string;
  supplier_country: string;
  product_url?: string | null;
};

export type EvaluationProduct = {
  product_name: string;
  product_id?: number | null;
  product_category_id: number;
  product_category_name: string;
  product_description: string;
  supplier_country: string;
  product_url: string | null;
};

export type EvaluationRegulation = {
  id: number;
  title: string;
  description: string | null;
  status: string;
  country: Country;
};

export type EvaluationRequirement = {
  id: number;
  title: string;
  description: string | null;
  type: string | null;
  regulation_id: number;
};

export type EvaluationRiskRule = {
  id: number;
  condition: string;
  risk_level: string;
  explanation: string | null;
};

export type EvaluationSource = {
  id: number;
  organization: string;
  url: string;
  publication_date: string | null;
  last_checked: string | null;
};

export type EvaluationResult = {
  product: EvaluationProduct;
  regulations: EvaluationRegulation[];
  requirements: EvaluationRequirement[];
  risk_rules: EvaluationRiskRule[];
  sources: EvaluationSource[];
  limitations: string[];
  evaluation_mode: "deterministic" | "llm";
  ai_assessment: AiAssessment | null;
};

export type AiRiskAssessment = {
  level: string;
  reason: string;
};

export type AiAssessment = {
  summary: string;
  missing_information: string[];
  risk_assessment: AiRiskAssessment;
  recommended_actions: string[];
  limitations: string[];
};

export type EvaluationResponse = {
  success: boolean;
  message: string;
  evaluation: EvaluationResult;
  evaluation_id?: number | null;
};

export type AuthUser = {
  id: number;
  email: string;
  role: string;
  created_at: string;
};

export type AuthMessageResponse = {
  success: boolean;
  message: string;
};

export type EvaluationHistoryItem = {
  id: number;
  product_name: string;
  product_id?: number | null;
  product_category_id: number;
  product_category_name: string;
  supplier_country: string;
  evaluation_mode: string;
  created_at: string;
};

export type EvaluationDetailResponse = {
  success: boolean;
  message: string;
  evaluation_id: number;
  evaluation: EvaluationResult;
  created_at: string;
};

export function registerUser(payload: { email: string; password: string }) {
  return request<AuthUser>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function loginUser(payload: { email: string; password: string }) {
  return request<AuthUser>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function logoutUser() {
  return request<AuthMessageResponse>("/api/auth/logout", {
    method: "POST",
  });
}

export function getCurrentUser() {
  return request<AuthUser>("/api/auth/me");
}

export function listMyEvaluations() {
  return request<EvaluationHistoryItem[]>("/api/evaluations/me");
}

export function getMyEvaluation(id: number) {
  return request<EvaluationDetailResponse>(`/api/evaluations/${id}`);
}

export function createEvaluation(payload: EvaluationInput) {
  return request<EvaluationResponse>("/api/evaluations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type DocumentType = "declaration_of_conformity";

export type EvaluationDocument = {
  id: number;
  evaluation_id: number;
  original_filename: string;
  document_type: string;
  mime_type: string;
  file_size: number;
  page_count: number | null;
  extraction_status: string;
  created_at: string;
};

export type DocumentAiAssessment = {
  summary: string;
  observations: string[];
  attention_points: string[];
  limitations: string[];
};

export type DocumentRequirementFinding = {
  requirement_id: number;
  title: string;
  description?: string | null;
  status: "found" | "not_found" | "not_applicable" | string;
  matched_keywords?: string[];
  missing_keywords?: string[];
  explanation?: string | null;
};

export type DocumentAnalysisResult = {
  analysis_mode?: string;
  document_type?: string;
  summary?: {
    total_requirements_checked?: number;
    found?: number;
    not_found?: number;
    not_applicable?: number;
  };
  requirements?: DocumentRequirementFinding[];
  ai_assessment?: DocumentAiAssessment | null;
  limitations?: string[];
};

export type EvaluationDocumentDetail = EvaluationDocument & {
  analysis_result: DocumentAnalysisResult | null;
};

export function uploadEvaluationDocument(
  evaluationId: number,
  file: File,
  documentType: DocumentType = "declaration_of_conformity",
) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("document_type", documentType);
  return request<EvaluationDocument>(
    `/api/evaluations/${evaluationId}/documents`,
    {
      method: "POST",
      body: formData,
    },
  );
}

export function listEvaluationDocuments(evaluationId: number) {
  return request<EvaluationDocument[]>(
    `/api/evaluations/${evaluationId}/documents`,
  );
}

export function getDocument(documentId: number) {
  return request<EvaluationDocumentDetail>(`/api/documents/${documentId}`);
}

export function analyzeDocument(documentId: number) {
  return request<EvaluationDocumentDetail>(
    `/api/documents/${documentId}/analyze`,
    {
      method: "POST",
    },
  );
}

export type ProductDistributionRecord = {
  id: number;
  product_name: string;
  product_category_id: number;
  product_id: number | null;
  city: string;
  city_code: string;
  quantity: number;
  distribution_date: string;
  import_country_id: number;
  is_demo: boolean;
  created_at: string;
};

export function listDistributions() {
  return request<ProductDistributionRecord[]>("/api/distributions");
}

export function getDistribution(id: number) {
  return request<ProductDistributionRecord>(`/api/distributions/${id}`);
}
