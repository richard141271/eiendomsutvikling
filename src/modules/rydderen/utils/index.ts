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
