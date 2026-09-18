export const EVALUATION_RESULT_STORAGE_KEY = "pca_last_evaluation_result";

let cachedRaw: string | null = null;
let cachedValue: unknown = null;

function setCache(raw: string | null, value: unknown): void {
  cachedRaw = raw;
  cachedValue = value;
}

export function storeEvaluationResult(result: unknown): void {
  if (typeof window === "undefined") return;
  const serialized = JSON.stringify(result);
  window.sessionStorage.setItem(EVALUATION_RESULT_STORAGE_KEY, serialized);
  // Keep a stable in-memory reference for useSyncExternalStore getSnapshot.
  setCache(serialized, result);
}

export function loadEvaluationResult<T>(): T | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(EVALUATION_RESULT_STORAGE_KEY);
  if (!raw) {
    setCache(null, null);
    return null;
  }
  // Same sessionStorage payload → return the same object reference.
  if (raw === cachedRaw) {
    return cachedValue as T;
  }
  try {
    const parsed = JSON.parse(raw) as T;
    setCache(raw, parsed);
    return parsed;
  } catch {
    setCache(null, null);
    return null;
  }
}
