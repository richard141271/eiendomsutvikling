"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cleanupApiClient } from "@/src/modules/rydderen/api/client";
import type {
  CleanupCost,
  CleanupCostCreateInput,
  CleanupEvidenceEntry,
  CleanupEvidenceMap,
  CleanupEvidenceMapUpsertInput,
  CleanupItem,
  CleanupItemUpdateInput,
  CleanupProject,
  CleanupProjectCreateInput,
  CleanupProjectUpdateInput,
  CleanupReportSummary,
} from "@/src/modules/rydderen/types";

const cleanupProjectCache = new Map<string, CleanupProject>();
const cleanupProjectListCache = new Map<string, CleanupProject[]>();
const cleanupItemsCache = new Map<string, CleanupItem[]>();
const cleanupReportCache = new Map<string, CleanupReportSummary>();
const cleanupCostsCache = new Map<string, CleanupCost[]>();
const cleanupDocumentationEntriesCache = new Map<string, CleanupEvidenceEntry[]>();
const cleanupDocumentationMapCache = new Map<string, CleanupEvidenceMap | null>();

function getProjectListCacheKey(filters?: { contextType?: string | null; contextId?: string | null }) {
  return JSON.stringify({
    contextType: filters?.contextType ?? null,
    contextId: filters?.contextId ?? null,
  });
}

function getItemsCacheKey(cleanupProjectId: string, filters?: { action?: string | null }) {
  return JSON.stringify({
    cleanupProjectId,
    action: filters?.action ?? null,
  });
}

function primeProjectCache(projects: CleanupProject[]) {
  projects.forEach((project) => {
    cleanupProjectCache.set(project.id, project);
  });
}

function updateProjectInListCaches(project: CleanupProject) {
  cleanupProjectListCache.forEach((projects, cacheKey) => {
    const nextProjects = projects.map((entry) => (entry.id === project.id ? project : entry));
    cleanupProjectListCache.set(cacheKey, nextProjects);
  });
}

async function hashFile(file: File) {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function useCleanupProjects(filters?: { contextType?: string | null; contextId?: string | null }) {
  const cacheKey = getProjectListCacheKey(filters);
  const cachedProjects = cleanupProjectListCache.get(cacheKey) ?? [];
  const [projects, setProjects] = useState<CleanupProject[]>(cachedProjects);
  const [loading, setLoading] = useState(cachedProjects.length === 0);
  const [error, setError] = useState<string | null>(null);
  const contextType = filters?.contextType ?? null;
  const contextId = filters?.contextId ?? null;

  const refresh = useCallback(async (options?: { showLoading?: boolean }) => {
    try {
      if (options?.showLoading ?? projects.length === 0) {
        setLoading(true);
      }
      setError(null);
      const nextProjects = await cleanupApiClient.listProjects({ contextType, contextId });
      cleanupProjectListCache.set(cacheKey, nextProjects);
      primeProjectCache(nextProjects);
      setProjects(nextProjects);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke hente ryddeprosjekter");
    } finally {
      setLoading(false);
    }
  }, [cacheKey, contextId, contextType, projects.length]);

  useEffect(() => {
    void refresh({ showLoading: cachedProjects.length === 0 });
  }, [cachedProjects.length, refresh]);

  const createProject = useCallback(
    async (input: CleanupProjectCreateInput) => {
      const project = await cleanupApiClient.createProject(input);
      cleanupProjectCache.set(project.id, project);
      await refresh({ showLoading: false });
      return project;
    },
    [refresh]
  );

  const deleteProject = useCallback(
    async (cleanupProjectId: string) => {
      await cleanupApiClient.deleteProject(cleanupProjectId);
      cleanupProjectCache.delete(cleanupProjectId);
      cleanupProjectListCache.forEach((cachedList, cachedKey) => {
        cleanupProjectListCache.set(
          cachedKey,
          cachedList.filter((project) => project.id !== cleanupProjectId)
        );
      });
      await refresh({ showLoading: false });
      return true;
    },
    [refresh]
  );

  return { projects, loading, error, refresh, createProject, deleteProject };
}

export function useCleanupProject(cleanupProjectId: string) {
  const cachedProject = cleanupProjectCache.get(cleanupProjectId) ?? null;
  const [project, setProject] = useState<CleanupProject | null>(cachedProject);
  const [loading, setLoading] = useState(cachedProject === null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (options?: { showLoading?: boolean }) => {
    try {
      if (options?.showLoading ?? project === null) {
        setLoading(true);
      }
      setError(null);
      const nextProject = await cleanupApiClient.getProject(cleanupProjectId);
      cleanupProjectCache.set(cleanupProjectId, nextProject);
      updateProjectInListCaches(nextProject);
      setProject(nextProject);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke hente ryddeprosjekt");
    } finally {
      setLoading(false);
    }
  }, [cleanupProjectId, project]);

  useEffect(() => {
    void refresh({ showLoading: cachedProject === null });
  }, [cachedProject, refresh]);

  const updateProject = useCallback(
    async (input: CleanupProjectUpdateInput) => {
      const updated = await cleanupApiClient.updateProject(cleanupProjectId, input);
      cleanupProjectCache.set(cleanupProjectId, updated);
      updateProjectInListCaches(updated);
      setProject(updated);
      return updated;
    },
    [cleanupProjectId]
  );

  return { project, loading, error, refresh, updateProject };
}

export function useCleanupItems(cleanupProjectId: string, filters?: { action?: string | null }) {
  const cacheKey = getItemsCacheKey(cleanupProjectId, filters);
  const cachedItems = cleanupItemsCache.get(cacheKey) ?? [];
  const [items, setItems] = useState<CleanupItem[]>(cachedItems);
  const [loading, setLoading] = useState(cachedItems.length === 0);
  const [error, setError] = useState<string | null>(null);
  const action = filters?.action ?? null;

  const refresh = useCallback(async (options?: { showLoading?: boolean }) => {
    try {
      if (options?.showLoading ?? items.length === 0) {
        setLoading(true);
      }
      setError(null);
      const nextItems = await cleanupApiClient.listItems(cleanupProjectId, { action });
      cleanupItemsCache.set(cacheKey, nextItems);
      setItems(nextItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke hente objekter");
    } finally {
      setLoading(false);
    }
  }, [action, cacheKey, cleanupProjectId, items.length]);

  useEffect(() => {
    void refresh({ showLoading: cachedItems.length === 0 });
  }, [cachedItems.length, refresh]);

  const updateItem = useCallback(
    async (itemId: string, body: CleanupItemUpdateInput) => {
      const updated = await cleanupApiClient.updateItem(cleanupProjectId, itemId, body);
      setItems((current) => {
        const nextItems = current.map((item) => (item.id === itemId ? updated : item));
        cleanupItemsCache.set(cacheKey, nextItems);
        return nextItems;
      });
      return updated;
    },
    [cacheKey, cleanupProjectId]
  );

  return { items, loading, error, refresh, updateItem };
}

export function useCleanupUpload(cleanupProjectId: string) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadItem = useCallback(
    async (payload: {
      file: File;
      imageHash?: string | null;
      category: string;
      action: "kast" | "selg" | "behold";
      comment?: string | null;
      condition?: string | null;
      note?: string | null;
    }) => {
      const formData = new FormData();
      formData.set("file", payload.file);
      if (payload.imageHash) formData.set("imageHash", payload.imageHash);
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

export function useCleanupRegisterFlow(cleanupProjectId: string, existingItems: CleanupItem[] = []) {
  const { uploadItem, uploading, error } = useCleanupUpload(cleanupProjectId);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileHash, setSelectedFileHash] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [lastSavedItem, setLastSavedItem] = useState<CleanupItem | null>(null);
  const [cameraReopenCount, setCameraReopenCount] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);
  const [actionLocked, setActionLocked] = useState(false);
  const currentDraftSubmittedRef = useRef(false);
  const fileSelectionVersionRef = useRef(0);
  const uploadQueueRef = useRef<
    Array<{
      file: File;
      imageHash: string;
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

  const chooseFile = useCallback(async (file: File | null) => {
    const selectionVersion = fileSelectionVersionRef.current + 1;
    fileSelectionVersionRef.current = selectionVersion;
    currentDraftSubmittedRef.current = false;
    setActionLocked(false);
    setCategory(null);
    setLocalError(null);

    if (!file) {
      setSelectedFile(null);
      setSelectedFileHash(null);
      return;
    }

    const imageHash = await hashFile(file);
    if (fileSelectionVersionRef.current !== selectionVersion) {
      return;
    }

    const existsInLoadedItems = existingItems.some((item) => item.imageHash && item.imageHash === imageHash);
    const existsInQueue = uploadQueueRef.current.some((item) => item.imageHash === imageHash);
    const matchesLastSaved = lastSavedItem?.imageHash && lastSavedItem.imageHash === imageHash;

    if (existsInLoadedItems || existsInQueue || matchesLastSaved) {
      setSelectedFile(null);
      setSelectedFileHash(null);
      setLocalError("Dette bildet er allerede registrert i prosjektet.");
      return;
    }

    setSelectedFile(file);
    setSelectedFileHash(imageHash);
  }, [existingItems, lastSavedItem?.imageHash]);

  const chooseCategory = useCallback((value: string) => {
    setLocalError(null);
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
            imageHash: nextUpload.imageHash,
            category: nextUpload.category,
            action: nextUpload.action,
          });

          setLastSavedItem(saved);
        } catch {
          // Feil logges i API-laget, men UI skal videre uten å blokkeres.
        }
      }
    } finally {
      processingQueueRef.current = false;
      if (uploadQueueRef.current.length > 0) {
        void processUploadQueue();
      }
    }
  }, [uploadItem]);

  const saveAction = useCallback(
    async (action: "kast" | "selg" | "behold") => {
      if (currentDraftSubmittedRef.current) {
        return null;
      }
      if (!selectedFile || !category) {
        throw new Error("Bilde og kategori må velges");
      }
      if (!selectedFileHash) {
        throw new Error("Kunne ikke lese bildet. Prøv å ta bildet på nytt.");
      }
      currentDraftSubmittedRef.current = true;
      setActionLocked(true);

      const queuedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
      const queuedFile = selectedFile;
      const queuedImageHash = selectedFileHash;
      const queuedCategory = category;

      uploadQueueRef.current.push({
        file: queuedFile,
        imageHash: queuedImageHash,
        category: queuedCategory,
        action,
        queuedAt,
      });

      setSelectedFile(null);
      setSelectedFileHash(null);
      setCategory(null);
      setCameraReopenCount((current) => current + 1);

      void processUploadQueue();
      return null;
    },
    [category, processUploadQueue, selectedFile, selectedFileHash]
  );

  const reset = useCallback(() => {
    currentDraftSubmittedRef.current = false;
    setActionLocked(false);
    setLocalError(null);
    setSelectedFile(null);
    setSelectedFileHash(null);
    setCategory(null);
  }, []);

  return {
    selectedFile,
    previewUrl,
    category,
    step,
    lastSavedItem,
    cameraReopenCount,
    actionLocked,
    uploading,
    error: localError || error,
    chooseFile,
    chooseCategory,
    saveAction,
    reset,
  };
}

export function useCleanupValuationQueue(cleanupProjectId: string) {
  const cacheKey = getItemsCacheKey(cleanupProjectId, { action: null });
  const cachedItems = cleanupItemsCache.get(cacheKey) ?? [];
  const [items, setItems] = useState<CleanupItem[]>(cachedItems);
  const [loading, setLoading] = useState(cachedItems.length === 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savingRef = useRef(false);

  const refresh = useCallback(async (options?: { showLoading?: boolean }) => {
    try {
      if (options?.showLoading ?? items.length === 0) {
        setLoading(true);
      }
      setError(null);
      const nextItems = await cleanupApiClient.listItems(cleanupProjectId);
      cleanupItemsCache.set(cacheKey, nextItems);
      setItems(nextItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke hente verdisettingskø");
    } finally {
      setLoading(false);
    }
  }, [cacheKey, cleanupProjectId, items.length]);

  useEffect(() => {
    void refresh({ showLoading: cachedItems.length === 0 });
  }, [cachedItems.length, refresh]);

  const queueItems = useMemo(() => items.filter((item) => item.value === null || item.value === undefined), [items]);
  const currentItem = useMemo(() => queueItems[0] || null, [queueItems]);

  const saveCurrentAndAdvance = useCallback(
    async (payload: { value: number | null; comment?: string | null; condition?: string | null; note?: string | null }) => {
      if (!currentItem || savingRef.current) return null;
      try {
        savingRef.current = true;
        setSaving(true);
        const updated = await cleanupApiClient.updateItem(cleanupProjectId, currentItem.id, {
          value: payload.value,
          comment: payload.comment ?? null,
          condition: payload.condition ?? null,
          note: payload.note ?? null,
          valuedAt: payload.value === null ? null : new Date().toISOString(),
        });
        setItems((current) => {
          const nextItems = current.map((item) => (item.id === updated.id ? updated : item));
          cleanupItemsCache.set(cacheKey, nextItems);
          return nextItems;
        });
        return updated;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Kunne ikke lagre verdisetting");
        throw err;
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
    [cacheKey, cleanupProjectId, currentItem]
  );

  return { items: queueItems, currentItem, loading, saving, error, refresh, saveCurrentAndAdvance };
}

export function useCleanupReport(cleanupProjectId: string) {
  const cachedReport = cleanupReportCache.get(cleanupProjectId) ?? null;
  const [report, setReport] = useState<CleanupReportSummary | null>(cachedReport);
  const [loading, setLoading] = useState(cachedReport === null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (options?: { showLoading?: boolean }) => {
    try {
      if (options?.showLoading ?? report === null) {
        setLoading(true);
      }
      setError(null);
      const nextReport = await cleanupApiClient.getReport(cleanupProjectId);
      cleanupReportCache.set(cleanupProjectId, nextReport);
      cleanupProjectCache.set(nextReport.project.id, nextReport.project);
      updateProjectInListCaches(nextReport.project);
      setReport(nextReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke hente rapport");
    } finally {
      setLoading(false);
    }
  }, [cleanupProjectId, report]);

  useEffect(() => {
    void refresh({ showLoading: cachedReport === null });
  }, [cachedReport, refresh]);

  return { report, loading, error, refresh };
}

export function useCleanupCosts(cleanupProjectId: string) {
  const cachedCosts = cleanupCostsCache.get(cleanupProjectId) ?? [];
  const [costs, setCosts] = useState<CleanupCost[]>(cachedCosts);
  const [loading, setLoading] = useState(cachedCosts.length === 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (options?: { showLoading?: boolean }) => {
    try {
      if (options?.showLoading ?? costs.length === 0) {
        setLoading(true);
      }
      setError(null);
      const nextCosts = await cleanupApiClient.listCosts(cleanupProjectId);
      cleanupCostsCache.set(cleanupProjectId, nextCosts);
      setCosts(nextCosts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke hente kostnader");
    } finally {
      setLoading(false);
    }
  }, [cleanupProjectId, costs.length]);

  useEffect(() => {
    void refresh({ showLoading: cachedCosts.length === 0 });
  }, [cachedCosts.length, refresh]);

  const addCost = useCallback(
    async (input: CleanupCostCreateInput) => {
      try {
        setSaving(true);
        const created = await cleanupApiClient.createCost(cleanupProjectId, input);
        setCosts((current) => {
          const nextCosts = [created, ...current];
          cleanupCostsCache.set(cleanupProjectId, nextCosts);
          return nextCosts;
        });
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

export function useCleanupDocumentationEntries(cleanupProjectId: string) {
  const cachedEntries = cleanupDocumentationEntriesCache.get(cleanupProjectId) ?? [];
  const [entries, setEntries] = useState<CleanupEvidenceEntry[]>(cachedEntries);
  const [loading, setLoading] = useState(cachedEntries.length === 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (options?: { showLoading?: boolean }) => {
    try {
      if (options?.showLoading ?? entries.length === 0) {
        setLoading(true);
      }
      setError(null);
      const nextEntries = await cleanupApiClient.listDocumentationEntries(cleanupProjectId);
      cleanupDocumentationEntriesCache.set(cleanupProjectId, nextEntries);
      setEntries(nextEntries);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke hente dokumentasjonsfunn");
    } finally {
      setLoading(false);
    }
  }, [cleanupProjectId, entries.length]);

  useEffect(() => {
    void refresh({ showLoading: cachedEntries.length === 0 });
  }, [cachedEntries.length, refresh]);

  const createEntry = useCallback(
    async (payload: {
      entryType: string;
      category?: string | null;
      description?: string | null;
      comment?: string | null;
      zone?: string | null;
      count?: number;
      risk?: string | null;
      gps?: { lat: number; lon: number } | null;
      createdDate?: string | null;
      createdTime?: string | null;
      images?: Array<{ file: File; imageHash?: string | null }>;
    }) => {
      const formData = new FormData();
      formData.set("entryType", payload.entryType);
      if (payload.category) formData.set("category", payload.category);
      if (payload.description) formData.set("description", payload.description);
      if (payload.comment) formData.set("comment", payload.comment);
      if (payload.zone) formData.set("zone", payload.zone);
      if (payload.count) formData.set("count", String(payload.count));
      if (payload.risk) formData.set("risk", payload.risk);
      if (payload.gps) formData.set("gps", JSON.stringify(payload.gps));
      if (payload.createdDate) formData.set("createdDate", payload.createdDate);
      if (payload.createdTime) formData.set("createdTime", payload.createdTime);

      try {
        setSaving(true);
        setError(null);
        let created = await cleanupApiClient.createDocumentationEntry(cleanupProjectId, formData);
        setEntries((current) => {
          const nextEntries = [created, ...current];
          cleanupDocumentationEntriesCache.set(cleanupProjectId, nextEntries);
          return nextEntries;
        });

        for (let index = 0; index < (payload.images?.length || 0); index += 1) {
          const image = payload.images?.[index];
          if (!image) continue;

          const imageFormData = new FormData();
          imageFormData.set("image", image.file);
          imageFormData.set("sortOrder", String(index));
          if (image.imageHash) {
            imageFormData.set("imageHash", image.imageHash);
          }
          if (image.file.name) {
            imageFormData.set("originalName", image.file.name);
          }

          created = await cleanupApiClient.uploadDocumentationEntryImage(cleanupProjectId, created.id, imageFormData);
        }

        setEntries((current) => {
          const nextEntries = [created, ...current.filter((entry) => entry.id !== created.id)];
          cleanupDocumentationEntriesCache.set(cleanupProjectId, nextEntries);
          return nextEntries;
        });
        return created;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Kunne ikke lagre dokumentasjonsfunn");
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [cleanupProjectId]
  );

  return { entries, loading, saving, error, refresh, createEntry };
}

export function useCleanupDocumentationMap(cleanupProjectId: string) {
  const cachedMap = cleanupDocumentationMapCache.get(cleanupProjectId) ?? null;
  const [map, setMap] = useState<CleanupEvidenceMap | null>(cachedMap);
  const [loading, setLoading] = useState(cachedMap === null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (options?: { showLoading?: boolean }) => {
    try {
      if (options?.showLoading ?? map === null) {
        setLoading(true);
      }
      setError(null);
      const nextMap = await cleanupApiClient.getDocumentationMap(cleanupProjectId);
      cleanupDocumentationMapCache.set(cleanupProjectId, nextMap);
      setMap(nextMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke hente kartlegging");
    } finally {
      setLoading(false);
    }
  }, [cleanupProjectId, map]);

  useEffect(() => {
    void refresh({ showLoading: cachedMap === null });
  }, [cachedMap, refresh]);

  const saveMap = useCallback(
    async (input: CleanupEvidenceMapUpsertInput) => {
      try {
        setSaving(true);
        setError(null);
        const saved = await cleanupApiClient.upsertDocumentationMap(cleanupProjectId, input);
        cleanupDocumentationMapCache.set(cleanupProjectId, saved);
        setMap(saved);
        return saved;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Kunne ikke lagre kartlegging");
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [cleanupProjectId]
  );

  return { map, loading, saving, error, refresh, saveMap };
}
