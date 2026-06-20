"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
    setSelectedFile(file);
    setCategory(null);
  }, []);

  const chooseCategory = useCallback((value: string) => {
    setCategory(value);
  }, []);

  const saveAction = useCallback(
    async (action: "kast" | "selg" | "behold") => {
      if (!selectedFile || !category) {
        throw new Error("Bilde og kategori må velges");
      }
      const saved = await uploadItem({ file: selectedFile, category, action });
      setLastSavedItem(saved);
      setSelectedFile(null);
      setCategory(null);
      setCameraReopenCount((current) => current + 1);
      return saved;
    },
    [category, selectedFile, uploadItem]
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
  const [activeIndex, setActiveIndex] = useState(0);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const nextItems = await cleanupApiClient.listItems(cleanupProjectId);
      const queue = [...nextItems].sort((a, b) => {
        const aRank = a.value === null ? 0 : 1;
        const bRank = b.value === null ? 0 : 1;
        if (aRank !== bRank) return aRank - bRank;
        return a.itemNumber - b.itemNumber;
      });
      setItems(queue);
      setActiveIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke hente verdisettingskø");
    } finally {
      setLoading(false);
    }
  }, [cleanupProjectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const currentItem = useMemo(() => items[activeIndex] || null, [activeIndex, items]);

  const saveCurrentAndAdvance = useCallback(
    async (payload: { value: number | null; comment?: string | null; condition?: string | null; note?: string | null }) => {
      if (!currentItem) return null;
      try {
        setSaving(true);
        const updated = await cleanupApiClient.updateItem(cleanupProjectId, currentItem.id, {
          value: payload.value,
          comment: payload.comment ?? null,
          condition: payload.condition ?? null,
          note: payload.note ?? null,
          valuedAt: payload.value === null ? null : new Date().toISOString(),
        });
        setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        setActiveIndex((current) => Math.min(current + 1, Math.max(items.length - 1, 0)));
        return updated;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Kunne ikke lagre verdisetting");
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [cleanupProjectId, currentItem, items.length]
  );

  return { items, currentItem, activeIndex, loading, saving, error, refresh, saveCurrentAndAdvance };
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
