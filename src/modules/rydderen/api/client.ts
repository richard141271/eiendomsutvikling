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

// #region debug-point A:client-request-logger
const DEBUG_SERVER_URL = "http://192.168.0.35:7777/event";
const DEBUG_SESSION_ID = "slow-app-performance";
function reportDebugEvent(hypothesisId: string, location: string, msg: string, data: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  fetch(DEBUG_SERVER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: DEBUG_SESSION_ID,
      runId: "pre-fix",
      hypothesisId,
      location,
      msg,
      data,
      ts: Date.now(),
    }),
    keepalive: true,
  }).catch(() => {});
}
// #endregion

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  // #region debug-point A:request-start
  const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
  reportDebugEvent("A", "api/client.ts:request:start", "[DEBUG] cleanup request start", {
    input,
    method: init?.method || "GET",
    hasBody: Boolean(init?.body),
  });
  // #endregion
  const response = await fetch(input, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    // #region debug-point A:request-error
    reportDebugEvent("A", "api/client.ts:request:error", "[DEBUG] cleanup request error", {
      input,
      method: init?.method || "GET",
      status: response.status,
      durationMs: Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt),
    });
    // #endregion
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Request failed");
  }

  // #region debug-point A:request-success
  reportDebugEvent("A", "api/client.ts:request:success", "[DEBUG] cleanup request success", {
    input,
    method: init?.method || "GET",
    status: response.status,
    durationMs: Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt),
  });
  // #endregion
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
  deleteProject(cleanupProjectId: string) {
    return request<{ success: boolean }>(`/api/rydderen/projects/${cleanupProjectId}`, {
      method: "DELETE",
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
