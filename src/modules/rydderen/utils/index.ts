import type { CleanupCost, CleanupItem } from "@/src/modules/rydderen/types";

export const CLEANUP_MODULE_BRAND = "Rydder'n";
export const CLEANUP_BUCKET = "cleanup-media";

export const CLEANUP_ACTIONS = [
  { value: "kast", label: "Kast", description: "Objektet skal kastes." },
  { value: "selg", label: "Selg", description: "Objektet skal selges." },
  { value: "behold", label: "Behold", description: "Objektet beholdes." },
] as const;

export const CLEANUP_COST_TYPES = [
  { value: "container", label: "Container" },
  { value: "transport", label: "Transport" },
  { value: "arbeid", label: "Arbeid" },
  { value: "bortkjoring", label: "Bortkjøring" },
  { value: "annet", label: "Annet" },
] as const;

export const CLEANUP_CONTEXT_TYPES = [
  { value: "property", label: "Eiendom" },
  { value: "case", label: "Sak" },
  { value: "project", label: "Prosjekt" },
  { value: "standalone", label: "Frittstående" },
] as const;

export const DEFAULT_RYDDEREN_CATEGORIES = [
  "Materialer",
  "Verktøy",
  "Maskiner",
  "Inventar",
  "Kontorutstyr",
  "Deler",
  "Diverse",
];

export const CLEANUP_DOCUMENTATION_CATEGORIES = [
  "Kloakkrelatert",
  "Vannskade",
  "Fukt",
  "Lukt",
  "Mugg",
  "Avfall",
  "Stikkpilleemballasje",
  "Papir",
  "Fremmedlegeme",
  "Bygningsskade",
  "Elektrisk",
  "Annet",
] as const;

export const CLEANUP_DOCUMENTATION_TYPES = [
  { id: "finding", label: "Nytt funn", prefix: "FUNN", shortLabel: "Funn" },
  { id: "observation", label: "Ny observasjon", prefix: "OBS", shortLabel: "Observasjon" },
  { id: "damage", label: "Ny skade", prefix: "SKADE", shortLabel: "Skade" },
  { id: "measurement", label: "Ny måling", prefix: "MAL", shortLabel: "Maling" },
  { id: "sample", label: "Ny prove", prefix: "SP", shortLabel: "Prove" },
] as const;

export const CLEANUP_DOCUMENTATION_RISK_OPTIONS = ["Lav", "Middels", "Hoy", "Kritisk"] as const;

export function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function toNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  if (typeof value === "object" && value && "toNumber" in value && typeof (value as { toNumber: () => number }).toNumber === "function") {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value) || 0;
}

export function calculateCleanupSummary(
  items: Array<Pick<CleanupItem, "action" | "value">>,
  costs: Array<Pick<CleanupCost, "amount">>
) {
  const totalItems = items.length;
  const unvaluedItems = items.filter((item) => item.value === null || item.value === undefined).length;
  const castItems = items.filter((item) => item.action === "kast");
  const sellItems = items.filter((item) => item.action === "selg");
  const keepItems = items.filter((item) => item.action === "behold");
  const totalValue = items.reduce((sum, item) => sum + toNumber(item.value), 0);
  const totalSellValue = sellItems.reduce((sum, item) => sum + toNumber(item.value), 0);
  const totalCastValue = castItems.reduce((sum, item) => sum + toNumber(item.value), 0);
  const totalKeepValue = keepItems.reduce((sum, item) => sum + toNumber(item.value), 0);
  const projectCosts = costs.reduce((sum, cost) => sum + toNumber(cost.amount), 0);

  return {
    totalItems,
    unvaluedItems,
    castCount: castItems.length,
    sellCount: sellItems.length,
    keepCount: keepItems.length,
    totalValue,
    totalSellValue,
    totalCastValue,
    totalKeepValue,
    projectCosts,
    netValue: totalValue - projectCosts,
  };
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("no-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("no-NO");
}

export function formatTime(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleTimeString("no-NO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatCleanupObjectLabel(itemNumber: number | null | undefined) {
  if (!itemNumber && itemNumber !== 0) return "Objekt";
  return `Objekt #${String(itemNumber).padStart(3, "0")}`;
}

export function formatCleanupActionLabel(action: string | null | undefined) {
  if (action === "kast") return "Kast";
  if (action === "selg") return "Selg";
  if (action === "behold") return "Behold";
  return action || "";
}

export function getCleanupDocumentationTypeConfig(entryType: string | null | undefined) {
  return CLEANUP_DOCUMENTATION_TYPES.find((type) => type.id === entryType) || CLEANUP_DOCUMENTATION_TYPES[0];
}

export function formatCleanupEvidenceNumber(entryType: string, sequence: number) {
  const type = getCleanupDocumentationTypeConfig(entryType);
  return `${type.prefix}-${String(sequence).padStart(3, "0")}`;
}

export function buildCleanupZones(rows: number, columns: number) {
  const safeRows = Math.max(1, Math.min(8, Number(rows) || 1));
  const safeColumns = Math.max(1, Math.min(8, Number(columns) || 1));
  const zones: string[] = [];
  for (let row = 0; row < safeRows; row += 1) {
    const rowLabel = String.fromCharCode(65 + row);
    for (let column = 1; column <= safeColumns; column += 1) {
      zones.push(`${rowLabel}${column}`);
    }
  }
  return zones;
}
