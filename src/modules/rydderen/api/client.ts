import type {
  CleanupCost,
  CleanupCostCreateInput,
  CleanupImportResult,
  CleanupItem,
  CleanupItemUpdateInput,
  CleanupProject,
  CleanupProjectCreateInput,
  CleanupProjectUpdateInput,
  CleanupReportSummary,
  LegacyCleanupImportPayload,
} from "@/src/modules/rydderen/types";

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Request failed");
  }

  return response.json();
}

export const cleanupApiClient = {
  listProjects(query?: { contextType?: string | null; contextId?: string | null }) {
    const params = new URLSearchParams();
    if (query?.contextType) params.set("contextType", query.contextType);
    if (query?.contextId) params.set("contextId", query.contextId);
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return request<CleanupProject[]>(`/api/rydderen/projects${suffix}`);
  },
  createProject(body: CleanupProjectCreateInput) {
    return request<CleanupProject>("/api/rydderen/projects", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  getProject(cleanupProjectId: string) {
    return request<CleanupProject>(`/api/rydderen/projects/${cleanupProjectId}`);
  },
  updateProject(cleanupProjectId: string, body: CleanupProjectUpdateInput) {
    return request<CleanupProject>(`/api/rydderen/projects/${cleanupProjectId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },
  listItems(cleanupProjectId: string, query?: { action?: string | null }) {
    const params = new URLSearchParams();
    if (query?.action) params.set("action", query.action);
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return request<CleanupItem[]>(`/api/rydderen/projects/${cleanupProjectId}/items${suffix}`);
  },
  uploadCapturedItem(cleanupProjectId: string, formData: FormData) {
    return request<CleanupItem>(`/api/rydderen/projects/${cleanupProjectId}/items/upload`, {
      method: "POST",
      body: formData,
    });
  },
  updateItem(cleanupProjectId: string, itemId: string, body: CleanupItemUpdateInput) {
    return request<CleanupItem>(`/api/rydderen/projects/${cleanupProjectId}/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },
  listCosts(cleanupProjectId: string) {
    return request<CleanupCost[]>(`/api/rydderen/projects/${cleanupProjectId}/costs`);
  },
  createCost(cleanupProjectId: string, body: CleanupCostCreateInput) {
    return request<CleanupCost>(`/api/rydderen/projects/${cleanupProjectId}/costs`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  getReport(cleanupProjectId: string) {
    return request<CleanupReportSummary>(`/api/rydderen/projects/${cleanupProjectId}/report`);
  },
  importLegacyPayload(body: LegacyCleanupImportPayload) {
    return request<CleanupImportResult>("/api/rydderen/import", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
};
