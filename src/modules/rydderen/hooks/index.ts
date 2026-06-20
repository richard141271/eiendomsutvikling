"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cleanupApiClient } from "@/src/modules/rydderen/api/client";
import type {
  CleanupCost,
  CleanupCostCreateInput,
  CleanupItem,
  CleanupItemUpdateInput,
  CleanupProject,
  CleanupProjectCreateInput,
  CleanupProjectUpdateInput,
  CleanupReportSummary,
} from "@/src/modules/rydderen/types";

// #region debug-point B:hook-logger
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

export function useCleanupProjects(filters?: { contextType?: string | null; contextId?: string | null }) {
  const [projects, setProjects] = useState<CleanupProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const contextType = filters?.contextType ?? null;
  const contextId = filters?.contextId ?? null;

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setProjects(await cleanupApiClient.listProjects({ contextType, contextId }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke hente ryddeprosjekter");
    } finally {
      setLoading(false);
    }
  }, [contextId, contextType]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createProject = useCallback(
    async (input: CleanupProjectCreateInput) => {
      const project = await cleanupApiClient.createProject(input);
      await refresh();
      return project;
    },
    [refresh]
  );

  const deleteProject = useCallback(
    async (cleanupProjectId: string) => {
      await cleanupApiClient.deleteProject(cleanupProjectId);
      await refresh();
      return true;
    },
    [refresh]
  );

  return { projects, loading, error, refresh, createProject, deleteProject };
}

export function useCleanupProject(cleanupProjectId: string) {
  const [project, setProject] = useState<CleanupProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setProject(await cleanupApiClient.getProject(cleanupProjectId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke hente ryddeprosjekt");
    } finally {
      setLoading(false);
    }
  }, [cleanupProjectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const updateProject = useCallback(
    async (input: CleanupProjectUpdateInput) => {
      const updated = await cleanupApiClient.updateProject(cleanupProjectId, input);
      setProject(updated);
      return updated;
    },
    [cleanupProjectId]
  );

  return { project, loading, error, refresh, updateProject };
}

export function useCleanupItems(cleanupProjectId: string, filters?: { action?: string | null }) {
  const [items, setItems] = useState<CleanupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const action = filters?.action ?? null;

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setItems(await cleanupApiClient.listItems(cleanupProjectId, { action }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke hente objekter");
    } finally {
      setLoading(false);
    }
  }, [action, cleanupProjectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const updateItem = useCallback(
    async (itemId: string, body: CleanupItemUpdateInput) => {
      const updated = await cleanupApiClient.updateItem(cleanupProjectId, itemId, body);
      setItems((current) => current.map((item) => (item.id === itemId ? updated : item)));
      return updated;
    },
    [cleanupProjectId]
  );

  return { items, loading, error, refresh, updateItem };
}

export function useCleanupUpload(cleanupProjectId: string) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadItem = useCallback(
    async (payload: {
      file: File;
      category: string;
      action: "kast" | "selg" | "behold";
      comment?: string | null;
      condition?: string | null;
      note?: string | null;
    }) => {
      const formData = new FormData();
      formData.set("file", payload.file);
      formData.set("category", payload.category);
      formData.set("action", payload.action);
      if (payload.comment) formData.set("comment", payload.comment);
      if (payload.condition) formData.set("condition", payload.condition);
      if (payload.note) formData.set("note", payload.note);

      try {
        setUploading(true);
        setError(null);
        return await cleanupApiClient.uploadCapturedItem(cleanupProjectId, formData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Kunne ikke laste opp objekt");
        throw err;
      } finally {
        setUploading(false);
      }
    },
    [cleanupProjectId]
  );

  return { uploadItem, uploading, error };
}

export function useCleanupRegisterFlow(cleanupProjectId: string) {
  const { uploadItem, uploading, error } = useCleanupUpload(cleanupProjectId);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [lastSavedItem, setLastSavedItem] = useState<CleanupItem | null>(null);
  const [cameraReopenCount, setCameraReopenCount] = useState(0);
  const currentDraftSubmittedRef = useRef(false);
  const uploadQueueRef = useRef<
    Array<{
      file: File;
      category: string;
      action: "kast" | "selg" | "behold";
      queuedAt: number;
    }>
  >([]);
  const processingQueueRef = useRef(false);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  const step = useMemo(() => {
    if (!selectedFile) return "camera" as const;
    if (!category) return "category" as const;
    return "action" as const;
  }, [category, selectedFile]);

  const chooseFile = useCallback((file: File | null) => {
    currentDraftSubmittedRef.current = false;
    setSelectedFile(file);
    setCategory(null);
  }, []);

  const chooseCategory = useCallback((value: string) => {
    setCategory(value);
  }, []);

  const processUploadQueue = useCallback(async () => {
    if (processingQueueRef.current) {
      return;
    }

    processingQueueRef.current = true;

    try {
      while (uploadQueueRef.current.length > 0) {
        const nextUpload = uploadQueueRef.current.shift();
        if (!nextUpload) {
          continue;
        }

        try {
          const saved = await uploadItem({
            file: nextUpload.file,
            category: nextUpload.category,
            action: nextUpload.action,
          });

          // #region debug-point B:register-save-success
          reportDebugEvent("B", "hooks/index.ts:saveAction:success", "[DEBUG] register save action success", {
            cleanupProjectId,
            action: nextUpload.action,
            category: nextUpload.category,
            savedItemId: saved.id,
            savedItemNumber: saved.itemNumber,
            durationMs: Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - nextUpload.queuedAt),
            queueLengthAfterSave: uploadQueueRef.current.length,
          });
          // #endregion

          setLastSavedItem(saved);
        } catch (err) {
          // #region debug-point B:register-save-error
          reportDebugEvent("B", "hooks/index.ts:saveAction:error", "[DEBUG] register save action error", {
            cleanupProjectId,
            action: nextUpload.action,
            category: nextUpload.category,
            error: err instanceof Error ? err.message : "unknown",
            queueLengthAfterError: uploadQueueRef.current.length,
          });
          // #endregion
        }
      }
    } finally {
      processingQueueRef.current = false;
      if (uploadQueueRef.current.length > 0) {
        void processUploadQueue();
      }
    }
  }, [cleanupProjectId, uploadItem]);

  const saveAction = useCallback(
    async (action: "kast" | "selg" | "behold") => {
      if (currentDraftSubmittedRef.current) {
        // #region debug-point B:register-duplicate-guard
        reportDebugEvent("B", "hooks/index.ts:saveAction:guard", "[DEBUG] register action ignored while upload in progress", {
          cleanupProjectId,
          action,
          hasSelectedFile: Boolean(selectedFile),
          category,
        });
        // #endregion
        return null;
      }
      if (!selectedFile || !category) {
        throw new Error("Bilde og kategori må velges");
      }
      currentDraftSubmittedRef.current = true;

      const queuedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
      const queuedFile = selectedFile;
      const queuedCategory = category;

      // #region debug-point B:register-save-start
      reportDebugEvent("B", "hooks/index.ts:saveAction:start", "[DEBUG] register save action queued", {
        cleanupProjectId,
        action,
        category: queuedCategory,
        fileName: queuedFile.name,
        fileSize: queuedFile.size,
        queueLengthBeforePush: uploadQueueRef.current.length,
      });
      // #endregion

      uploadQueueRef.current.push({
        file: queuedFile,
        category: queuedCategory,
        action,
        queuedAt,
      });

      setSelectedFile(null);
      setCategory(null);
      setCameraReopenCount((current) => current + 1);

      void processUploadQueue();
      return null;
    },
    [category, cleanupProjectId, processUploadQueue, selectedFile]
  );

  const reset = useCallback(() => {
    setSelectedFile(null);
    setCategory(null);
  }, []);

  return {
    selectedFile,
    previewUrl,
    category,
    step,
    lastSavedItem,
    cameraReopenCount,
    uploading,
    error,
    chooseFile,
    chooseCategory,
    saveAction,
    reset,
  };
}

export function useCleanupValuationQueue(cleanupProjectId: string) {
  const [items, setItems] = useState<CleanupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // #region debug-point D:valuation-refresh-start
      const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
      reportDebugEvent("D", "hooks/index.ts:valuation:refresh:start", "[DEBUG] valuation queue refresh start", {
        cleanupProjectId,
      });
      // #endregion
      const nextItems = await cleanupApiClient.listItems(cleanupProjectId);
      // #region debug-point D:valuation-refresh-success
      reportDebugEvent("D", "hooks/index.ts:valuation:refresh:success", "[DEBUG] valuation queue refresh success", {
        cleanupProjectId,
        totalItems: nextItems.length,
        unvaluedItems: nextItems.filter((item) => item.value === null || item.value === undefined).length,
        durationMs: Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt),
      });
      // #endregion
      setItems(nextItems);
    } catch (err) {
      // #region debug-point D:valuation-refresh-error
      reportDebugEvent("D", "hooks/index.ts:valuation:refresh:error", "[DEBUG] valuation queue refresh error", {
        cleanupProjectId,
        error: err instanceof Error ? err.message : "unknown",
      });
      // #endregion
      setError(err instanceof Error ? err.message : "Kunne ikke hente verdisettingskø");
    } finally {
      setLoading(false);
    }
  }, [cleanupProjectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const queueItems = useMemo(() => items.filter((item) => item.value === null || item.value === undefined), [items]);
  const currentItem = useMemo(() => queueItems[0] || null, [queueItems]);

  const saveCurrentAndAdvance = useCallback(
    async (payload: { value: number | null; comment?: string | null; condition?: string | null; note?: string | null }) => {
      if (!currentItem) return null;
      try {
        setSaving(true);
        // #region debug-point C:valuation-save-start
        const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
        reportDebugEvent("C", "hooks/index.ts:valuation:save:start", "[DEBUG] valuation save start", {
          cleanupProjectId,
          itemId: currentItem.id,
          itemNumber: currentItem.itemNumber,
          action: currentItem.action,
          inputValue: payload.value,
        });
        // #endregion
        const updated = await cleanupApiClient.updateItem(cleanupProjectId, currentItem.id, {
          value: payload.value,
          comment: payload.comment ?? null,
          condition: payload.condition ?? null,
          note: payload.note ?? null,
          valuedAt: payload.value === null ? null : new Date().toISOString(),
        });
        // #region debug-point C:valuation-save-success
        reportDebugEvent("C", "hooks/index.ts:valuation:save:success", "[DEBUG] valuation save success", {
          cleanupProjectId,
          itemId: updated.id,
          itemNumber: updated.itemNumber,
          action: updated.action,
          savedValue: updated.value,
          durationMs: Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt),
        });
        // #endregion
        setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        return updated;
      } catch (err) {
        // #region debug-point C:valuation-save-error
        reportDebugEvent("C", "hooks/index.ts:valuation:save:error", "[DEBUG] valuation save error", {
          cleanupProjectId,
          itemId: currentItem.id,
          itemNumber: currentItem.itemNumber,
          error: err instanceof Error ? err.message : "unknown",
        });
        // #endregion
        setError(err instanceof Error ? err.message : "Kunne ikke lagre verdisetting");
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [cleanupProjectId, currentItem]
  );

  return { items: queueItems, currentItem, loading, saving, error, refresh, saveCurrentAndAdvance };
}

export function useCleanupReport(cleanupProjectId: string) {
  const [report, setReport] = useState<CleanupReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setReport(await cleanupApiClient.getReport(cleanupProjectId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke hente rapport");
    } finally {
      setLoading(false);
    }
  }, [cleanupProjectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { report, loading, error, refresh };
}

export function useCleanupCosts(cleanupProjectId: string) {
  const [costs, setCosts] = useState<CleanupCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setCosts(await cleanupApiClient.listCosts(cleanupProjectId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke hente kostnader");
    } finally {
      setLoading(false);
    }
  }, [cleanupProjectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addCost = useCallback(
    async (input: CleanupCostCreateInput) => {
      try {
        setSaving(true);
        const created = await cleanupApiClient.createCost(cleanupProjectId, input);
        setCosts((current) => [created, ...current]);
        return created;
      } finally {
        setSaving(false);
      }
    },
    [cleanupProjectId]
  );

  return { costs, loading, saving, error, refresh, addCost };
}

export function useCleanupFilters(items: CleanupItem[]) {
  const [actionFilter, setActionFilter] = useState<string>("alle");

  const filteredItems = useMemo(() => {
    if (actionFilter === "alle") return items;
    return items.filter((item) => item.action === actionFilter);
  }, [actionFilter, items]);

  return { actionFilter, setActionFilter, filteredItems };
}
