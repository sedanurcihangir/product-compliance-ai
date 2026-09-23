/** Display-only Turkish labels for admin UI. API/DB values stay unchanged. */

const RISK_LEVEL_TR: Record<string, string> = {
  low: "Düşük",
  medium: "Orta",
  high: "Yüksek",
  düşük: "Düşük",
  dusuk: "Düşük",
  orta: "Orta",
  yüksek: "Yüksek",
  yuksek: "Yüksek",
};

const REQUIREMENT_TYPE_TR: Record<string, string> = {
  document: "Belge",
  marking: "İşaretleme",
  labeling: "Etiketleme",
  import_control: "İthalat Kontrolü",
  belge: "Belge",
  işaretleme: "İşaretleme",
  isaretleme: "İşaretleme",
  etiketleme: "Etiketleme",
};

export function formatRiskLevelLabel(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw) return "—";
  const key = raw.toLocaleLowerCase("tr-TR");
  return RISK_LEVEL_TR[key] ?? raw;
}

export function formatRequirementTypeLabel(
  value: string | null | undefined,
): string {
  const raw = (value ?? "").trim();
  if (!raw) return "—";
  const key = raw.toLocaleLowerCase("tr-TR");
  return REQUIREMENT_TYPE_TR[key] ?? raw;
}
