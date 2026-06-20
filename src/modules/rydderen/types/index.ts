export type CleanupAction = "kast" | "selg" | "behold";
export type CleanupCostType = "container" | "transport" | "arbeid" | "bortkjoring" | "annet";
export type CleanupProjectContextType = "property" | "case" | "project" | "standalone";
export type CleanupProjectStatus = "active" | "completed" | "archived";
export type CleanupModuleType =
  | "rydderen"
  | "dodsbo"
  | "inventory"
  | "moving"
  | "insurance"
  | "auction";

export interface CleanupProjectContext {
  type: CleanupProjectContextType | null;
  id: string | null;
  label: string | null;
}

export interface CleanupProjectLink {
  id: string;
  cleanupProjectId: string;
  linkedEntityType: Exclude<CleanupProjectContextType, "standalone">;
  linkedEntityId: string;
  createdAt: string;
}

export interface CleanupProject {
  id: string;
  tenantId: string;
  name: string;
  slug: string | null;
  moduleType: CleanupModuleType | string;
  contextType: CleanupProjectContextType | null;
  contextId: string | null;
  context: CleanupProjectContext;
  description: string | null;
  status: CleanupProjectStatus | string;
  coverImagePath: string | null;
  coverImageUrl: string | null;
  createdBy: string;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
  unvaluedCount: number;
  totalValue: number;
  costsTotal: number;
  links: CleanupProjectLink[];
}

export interface CleanupItem {
  id: string;
  tenantId: string;
  cleanupProjectId: string;
  itemNumber: number;
  category: string;
  action: CleanupAction;
  value: number | null;
  comment: string | null;
  condition: string | null;
  note: string | null;
  imagePath: string | null;
  imageThumbnailPath: string | null;
  imageUrl: string | null;
  imageThumbnailUrl: string | null;
  capturedAt: string;
  valuedAt: string | null;
  createdBy: string;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
  projectName?: string;
}

export interface CleanupCost {
  id: string;
  tenantId: string;
  cleanupProjectId: string;
  costType: CleanupCostType | string;
  amount: number;
  description: string | null;
  incurredAt: string;
  createdBy: string;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CleanupSummary {
  totalItems: number;
  unvaluedItems: number;
  castCount: number;
  sellCount: number;
  keepCount: number;
  totalValue: number;
  totalSellValue: number;
  totalCastValue: number;
  totalKeepValue: number;
  projectCosts: number;
  netValue: number;
}

export interface CleanupReportSummary extends CleanupSummary {
  project: CleanupProject;
  items: CleanupItem[];
  costs: CleanupCost[];
  generatedAt: string;
}

export interface CleanupProjectCreateInput {
  name: string;
  slug?: string;
  description?: string;
  moduleType?: CleanupModuleType | string;
  contextType?: CleanupProjectContextType;
  contextId?: string | null;
}

export interface CleanupProjectUpdateInput {
  name?: string;
  slug?: string;
  description?: string | null;
  status?: CleanupProjectStatus | string;
  coverImagePath?: string | null;
}

export interface CleanupItemCreateInput {
  category: string;
  action: CleanupAction;
  itemNumber?: number;
  value?: number | null;
  comment?: string | null;
  condition?: string | null;
  note?: string | null;
  imagePath?: string | null;
  imageThumbnailPath?: string | null;
  capturedAt?: string;
  valuedAt?: string | null;
  metadata?: Record<string, unknown>;
}

export interface CleanupItemUpdateInput {
  category?: string;
  action?: CleanupAction;
  value?: number | null;
  comment?: string | null;
  condition?: string | null;
  note?: string | null;
  imagePath?: string | null;
  imageThumbnailPath?: string | null;
  valuedAt?: string | null;
  metadata?: Record<string, unknown>;
}

export interface CleanupCostCreateInput {
  costType: CleanupCostType | string;
  amount: number;
  description?: string | null;
  incurredAt?: string;
}

export interface CleanupContextOption {
  id: string;
  type: Exclude<CleanupProjectContextType, "standalone">;
  label: string;
  description?: string | null;
}

export interface CleanupContextOptions {
  properties: CleanupContextOption[];
  projects: CleanupContextOption[];
  cases: CleanupContextOption[];
}

export interface LegacyCleanupImportItem {
  itemNumber?: number;
  category: string;
  action: CleanupAction;
  value?: number | null;
  comment?: string | null;
  condition?: string | null;
  note?: string | null;
  imageDataUrl?: string | null;
  capturedAt?: string;
  createdAt?: string;
  metadata?: Record<string, unknown>;
}

export interface LegacyCleanupImportCost {
  costType: CleanupCostType | string;
  amount: number;
  description?: string | null;
  incurredAt?: string;
}

export interface LegacyCleanupImportPayload {
  dryRun?: boolean;
  project: CleanupProjectCreateInput;
  items: LegacyCleanupImportItem[];
  costs?: LegacyCleanupImportCost[];
}

export interface CleanupImportResult {
  dryRun: boolean;
  projectId: string | null;
  importedItems: number;
  importedCosts: number;
  errors: Array<{ itemNumber?: number; message: string }>;
}
