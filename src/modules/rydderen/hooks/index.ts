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

type PendingDocumentationImageRecord = {
  key: string;
  cleanupProjectId: string;
  entryId: string;
  index: number;
  file: File;
  imageHash?: string | null;
  originalName?: string | null;
  createdAt: number;
};

let documentationUploadDbPromise: Promise<IDBDatabase> | null = null;

function openDocumentationUploadDb(): Promise<IDBDatabase> {
  if (documentationUploadDbPromise) {
    return documentationUploadDbPromise;
  }

  documentationUploadDbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open("rydderen-doc-upload-v1", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("pending")) {
        const store = db.createObjectStore("pending", { keyPath: "key" });
        store.createIndex("byProject", "cleanupProjectId", { unique: false });
        store.createIndex("byEntry", "entryId", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Kunne ikke apne lokal lagring"));
  });

  return documentationUploadDbPromise;
}

async function putPendingDocumentationImage(record: PendingDocumentationImageRecord) {
  const db = await openDocumentationUploadDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("pending", "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("Kunne ikke lagre bilde lokalt"));
    tx.objectStore("pending").put(record);
  });
}

async function deletePendingDocumentationImage(key: string) {
  const db = await openDocumentationUploadDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("pending", "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("Kunne ikke oppdatere lokal lagring"));
    tx.objectStore("pending").delete(key);
  });
}

async function listPendingDocumentationImages(cleanupProjectId: string) {
  const db = await openDocumentationUploadDb();
  return new Promise<PendingDocumentationImageRecord[]>((resolve, reject) => {
    const tx = db.transaction("pending", "readonly");
    const store = tx.objectStore("pending");
    const index = store.index("byProject");
    const request = index.getAll(cleanupProjectId);
    request.onsuccess = () => resolve((request.result || []) as PendingDocumentationImageRecord[]);
    request.onerror = () => reject(request.error || new Error("Kunne ikke lese lokal lagring"));
  });
}

function buildPendingDocumentationImageKey(input: { cleanupProjectId: string; entryId: string; index: number; file: File; imageHash?: string | null }) {
  const hashPart = input.imageHash || "";
  return `${input.cleanupProjectId}:${input.entryId}:${input.index}:${hashPart || `${input.file.name}:${input.file.size}:${input.file.lastModified}`}`;
}

function reportDebugEvent(hypothesisId: "A" | "B" | "C" | "D" | "E", location: string, msg: string, data: Record<string, unknown>) {
  // #region debug-point C:rydderen-report
  if (typeof window === "undefined") {
    return;
  }

  if (window.localStorage.getItem("trae-debug") !== "1") {
    return;
  }

  fetch(window.localStorage.getItem("trae-debug-url") || "http://127.0.0.1:7777/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId: "app-speed-lag", runId: "pre-fix", hypothesisId, location, msg, data, ts: Date.now() }),
    keepalive: true,
  }).catch(() => undefined);
  // #endregion
}

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

function mergeCleanupEvidenceEntry(existing: CleanupEvidenceEntry | null, incoming: CleanupEvidenceEntry) {
  if (!existing) {
    return incoming;
  }

  const mergedImages = Array.from(
    [...existing.images, ...incoming.images].reduce((map, image) => {
      const current = map.get(image.id);
      if (!current || (image.updatedAt || "") >= (current.updatedAt || "")) {
        map.set(image.id, image);
      }
      return map;
    }, new Map<string, CleanupEvidenceEntry["images"][number]>()).values()
  ).sort((left, right) => left.sortOrder - right.sortOrder);

  return {
    ...existing,
    ...incoming,
    imageCount: Math.max(existing.imageCount, incoming.imageCount, mergedImages.length),
    images: mergedImages,
  };
}

function upsertDocumentationEntryInCache(cleanupProjectId: string, entry: CleanupEvidenceEntry) {
  const currentEntries = cleanupDocumentationEntriesCache.get(cleanupProjectId) ?? [];
  const existingEntry = currentEntries.find((currentEntry) => currentEntry.id === entry.id) ?? null;
  const mergedEntry = mergeCleanupEvidenceEntry(existingEntry, entry);
  const nextEntries = [mergedEntry, ...currentEntries.filter((currentEntry) => currentEntry.id !== entry.id)];
  cleanupDocumentationEntriesCache.set(cleanupProjectId, nextEntries);
  return nextEntries;
}

async function hashFile(file: File) {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function useCleanupProjects(filters?: { contextType?: string | null; contextId?: string | null }) {
  const cacheKey = getProjectListCacheKey(filters);
  const cachedProjects = cleanupProjectListCache.get(cacheKey) ?? [];
  const hasCachedProjects = cachedProjects.length > 0;
  const [projects, setProjects] = useState<CleanupProject[]>(cachedProjects);
  const [loading, setLoading] = useState(!hasCachedProjects);
  const [error, setError] = useState<string | null>(null);
  const contextType = filters?.contextType ?? null;
  const contextId = filters?.contextId ?? null;

  const refresh = useCallback(async (options?: { showLoading?: boolean }) => {
    const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
    try {
      // #region debug-point C:projects-refresh-start
      reportDebugEvent("C", "src/modules/rydderen/hooks/index.ts:useCleanupProjects:refresh:start", "[DEBUG] Cleanup projects refresh started", {
        cacheKey,
        contextType,
        contextId,
        showLoading: options?.showLoading ?? !hasCachedProjects,
        hasCachedProjects,
      });
      // #endregion
      if (options?.showLoading ?? !hasCachedProjects) {
        setLoading(true);
      }
      setError(null);
      const nextProjects = await cleanupApiClient.listProjects({ contextType, contextId });
      cleanupProjectListCache.set(cacheKey, nextProjects);
      primeProjectCache(nextProjects);
      setProjects(nextProjects);
      // #region debug-point C:projects-refresh-success
      reportDebugEvent("C", "src/modules/rydderen/hooks/index.ts:useCleanupProjects:refresh:success", "[DEBUG] Cleanup projects refresh finished", {
        cacheKey,
        projectCount: nextProjects.length,
        durationMs: Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt),
      });
      // #endregion
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke hente ryddeprosjekter");
      // #region debug-point C:projects-refresh-error
      reportDebugEvent("C", "src/modules/rydderen/hooks/index.ts:useCleanupProjects:refresh:error", "[DEBUG] Cleanup projects refresh failed", {
        cacheKey,
        durationMs: Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt),
        error: err instanceof Error ? err.message : String(err),
      });
      // #endregion
    } finally {
      setLoading(false);
    }
  }, [cacheKey, contextId, contextType, hasCachedProjects]);

  useEffect(() => {
    void refresh({ showLoading: !hasCachedProjects });
  }, [hasCachedProjects, refresh]);

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
  const hasCachedProject = cachedProject !== null;
  const [project, setProject] = useState<CleanupProject | null>(cachedProject);
  const [loading, setLoading] = useState(!hasCachedProject);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (options?: { showLoading?: boolean }) => {
    const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
    try {
      // #region debug-point C:project-refresh-start
      reportDebugEvent("C", "src/modules/rydderen/hooks/index.ts:useCleanupProject:refresh:start", "[DEBUG] Project refresh started", {
        cleanupProjectId,
        showLoading: options?.showLoading ?? !hasCachedProject,
        hasCachedProject,
      });
      // #endregion
      if (options?.showLoading ?? !hasCachedProject) {
        setLoading(true);
      }
      setError(null);
      const nextProject = await cleanupApiClient.getProject(cleanupProjectId);
      cleanupProjectCache.set(cleanupProjectId, nextProject);
      updateProjectInListCaches(nextProject);
      setProject(nextProject);
      // #region debug-point C:project-refresh-success
      reportDebugEvent("C", "src/modules/rydderen/hooks/index.ts:useCleanupProject:refresh:success", "[DEBUG] Project refresh completed", {
        cleanupProjectId,
        durationMs: Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt),
      });
      // #endregion
    } catch (err) {
      // #region debug-point C:project-refresh-error
      reportDebugEvent("C", "src/modules/rydderen/hooks/index.ts:useCleanupProject:refresh:error", "[DEBUG] Project refresh failed", {
        cleanupProjectId,
        durationMs: Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt),
        error: err instanceof Error ? err.message : String(err),
      });
      // #endregion
      setError(err instanceof Error ? err.message : "Kunne ikke hente ryddeprosjekt");
    } finally {
      setLoading(false);
    }
  }, [cleanupProjectId, hasCachedProject]);

  useEffect(() => {
    void refresh({ showLoading: !hasCachedProject });
  }, [hasCachedProject, refresh]);

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
  const hasCachedItems = cachedItems.length > 0;
  const [items, setItems] = useState<CleanupItem[]>(cachedItems);
  const [loading, setLoading] = useState(!hasCachedItems);
  const [error, setError] = useState<string | null>(null);
  const action = filters?.action ?? null;

  const refresh = useCallback(async (options?: { showLoading?: boolean }) => {
    try {
      if (options?.showLoading ?? !hasCachedItems) {
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
  }, [action, cacheKey, cleanupProjectId, hasCachedItems]);

  useEffect(() => {
    void refresh({ showLoading: !hasCachedItems });
  }, [hasCachedItems, refresh]);

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
  const hasCachedItems = cachedItems.length > 0;
  const [items, setItems] = useState<CleanupItem[]>(cachedItems);
  const [loading, setLoading] = useState(!hasCachedItems);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savingRef = useRef(false);

  const refresh = useCallback(async (options?: { showLoading?: boolean }) => {
    try {
      if (options?.showLoading ?? !hasCachedItems) {
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
  }, [cacheKey, cleanupProjectId, hasCachedItems]);

  useEffect(() => {
    void refresh({ showLoading: !hasCachedItems });
  }, [hasCachedItems, refresh]);

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
  const hasCachedReport = cachedReport !== null;
  const [report, setReport] = useState<CleanupReportSummary | null>(cachedReport);
  const [loading, setLoading] = useState(!hasCachedReport);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (options?: { showLoading?: boolean }) => {
    try {
      if (options?.showLoading ?? !hasCachedReport) {
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
  }, [cleanupProjectId, hasCachedReport]);

  useEffect(() => {
    void refresh({ showLoading: !hasCachedReport });
  }, [hasCachedReport, refresh]);

  return { report, loading, error, refresh };
}

export function useCleanupCosts(cleanupProjectId: string) {
  const cachedCosts = cleanupCostsCache.get(cleanupProjectId) ?? [];
  const hasCachedCosts = cachedCosts.length > 0;
  const [costs, setCosts] = useState<CleanupCost[]>(cachedCosts);
  const [loading, setLoading] = useState(!hasCachedCosts);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (options?: { showLoading?: boolean }) => {
    try {
      if (options?.showLoading ?? !hasCachedCosts) {
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
  }, [cleanupProjectId, hasCachedCosts]);

  useEffect(() => {
    void refresh({ showLoading: !hasCachedCosts });
  }, [hasCachedCosts, refresh]);

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
  const MAX_BACKGROUND_UPLOADS = 3;
  const MAX_UPLOAD_RETRIES = 6;
  const cachedEntries = cleanupDocumentationEntriesCache.get(cleanupProjectId) ?? [];
  const hasCachedEntries = cachedEntries.length > 0;
  const [entries, setEntries] = useState<CleanupEvidenceEntry[]>(cachedEntries);
  const [loading, setLoading] = useState(!hasCachedEntries);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backgroundUploading, setBackgroundUploading] = useState(false);
  const [pendingUploads, setPendingUploads] = useState(0);
  const [backgroundError, setBackgroundError] = useState<string | null>(null);
  const uploadQueueRef = useRef<
    Array<{
      key: string;
      entryId: string;
      index: number;
      attempt: number;
      nextAttemptAt: number;
      image: { file: File; imageHash?: string | null; originalName?: string | null };
    }>
  >([]);
  const activeUploadCountRef = useRef(0);
  const processUploadQueueRef = useRef<(() => void) | null>(null);
  const retryTimeoutRef = useRef<number | null>(null);

  const upsertEntry = useCallback(
    (entry: CleanupEvidenceEntry) => {
      setEntries(() => upsertDocumentationEntryInCache(cleanupProjectId, entry));
    },
    [cleanupProjectId]
  );

  const refresh = useCallback(async (options?: { showLoading?: boolean }) => {
    const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
    try {
      // #region debug-point C:documentation-refresh-start
      reportDebugEvent("C", "src/modules/rydderen/hooks/index.ts:useCleanupDocumentationEntries:refresh:start", "[DEBUG] Documentation refresh started", {
        cleanupProjectId,
        showLoading: options?.showLoading ?? !hasCachedEntries,
        cachedEntries: cachedEntries.length,
      });
      // #endregion
      if (options?.showLoading ?? !hasCachedEntries) {
        setLoading(true);
      }
      setError(null);
      const nextEntries = await cleanupApiClient.listDocumentationEntries(cleanupProjectId);
      cleanupDocumentationEntriesCache.set(cleanupProjectId, nextEntries);
      setEntries(nextEntries);
      // #region debug-point C:documentation-refresh-success
      reportDebugEvent("C", "src/modules/rydderen/hooks/index.ts:useCleanupDocumentationEntries:refresh:success", "[DEBUG] Documentation refresh completed", {
        cleanupProjectId,
        durationMs: Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt),
        entryCount: nextEntries.length,
      });
      // #endregion
    } catch (err) {
      // #region debug-point C:documentation-refresh-error
      reportDebugEvent("C", "src/modules/rydderen/hooks/index.ts:useCleanupDocumentationEntries:refresh:error", "[DEBUG] Documentation refresh failed", {
        cleanupProjectId,
        durationMs: Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt),
        error: err instanceof Error ? err.message : String(err),
      });
      // #endregion
      setError(err instanceof Error ? err.message : "Kunne ikke hente dokumentasjonsfunn");
    } finally {
      setLoading(false);
    }
  }, [cleanupProjectId, hasCachedEntries, cachedEntries.length]);

  useEffect(() => {
    void refresh({ showLoading: !hasCachedEntries });
  }, [hasCachedEntries, refresh]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const pending = await listPendingDocumentationImages(cleanupProjectId);
        if (cancelled || pending.length === 0) {
          return;
        }

        const existingKeys = new Set(uploadQueueRef.current.map((item) => item.key));
        let added = 0;
        for (const record of pending) {
          if (existingKeys.has(record.key)) {
            continue;
          }
          uploadQueueRef.current.push({
            key: record.key,
            entryId: record.entryId,
            index: record.index,
            attempt: 0,
            nextAttemptAt: 0,
            image: { file: record.file, imageHash: record.imageHash, originalName: record.originalName },
          });
          existingKeys.add(record.key);
          added += 1;
        }
        if (added > 0) {
          setPendingUploads((current) => current + added);
          setBackgroundUploading(true);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Kunne ikke lese lokal opplastingsko";
        setBackgroundError(message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cleanupProjectId]);

  const scheduleRetry = useCallback((delayMs: number) => {
    if (typeof window === "undefined") {
      return;
    }

    const safeDelay = Math.max(50, Math.min(60_000, Math.round(delayMs)));
    if (retryTimeoutRef.current) {
      window.clearTimeout(retryTimeoutRef.current);
    }
    retryTimeoutRef.current = window.setTimeout(() => {
      retryTimeoutRef.current = null;
      processUploadQueueRef.current?.();
    }, safeDelay);
  }, []);

  const processUploadQueue = useCallback(() => {
    if (uploadQueueRef.current.length === 0 && activeUploadCountRef.current === 0) {
      setBackgroundUploading(false);
      return;
    }

    setBackgroundUploading(true);

    while (activeUploadCountRef.current < MAX_BACKGROUND_UPLOADS && uploadQueueRef.current.length > 0) {
      const nextUpload = uploadQueueRef.current.shift();
      if (!nextUpload) {
        continue;
      }

      const now = Date.now();
      if (nextUpload.nextAttemptAt > now) {
        uploadQueueRef.current.unshift(nextUpload);
        scheduleRetry(nextUpload.nextAttemptAt - now);
        break;
      }

      activeUploadCountRef.current += 1;
      const imageFormData = new FormData();
      imageFormData.set("image", nextUpload.image.file);
      imageFormData.set("sortOrder", String(nextUpload.index));
      if (nextUpload.image.imageHash) {
        imageFormData.set("imageHash", nextUpload.image.imageHash);
      }
      if (nextUpload.image.file.name) {
        imageFormData.set("originalName", nextUpload.image.file.name);
      }

      const uploadStartedAt = typeof performance !== "undefined" ? performance.now() : Date.now();

      void (async () => {
        try {
          // #region debug-point B:queued-image-upload-start
          reportDebugEvent("B", "src/modules/rydderen/hooks/index.ts:useCleanupDocumentationEntries:queue:image:start", "[DEBUG] Documentation background image upload started", {
            cleanupProjectId,
            entryId: nextUpload.entryId,
            imageIndex: nextUpload.index,
            imageName: nextUpload.image.file.name,
            imageSize: nextUpload.image.file.size,
            remainingQueue: uploadQueueRef.current.length,
            activeUploads: activeUploadCountRef.current,
          });
          // #endregion
          const updatedEntry = await cleanupApiClient.uploadDocumentationEntryImage(cleanupProjectId, nextUpload.entryId, imageFormData);
          upsertEntry(updatedEntry);
          setBackgroundError(null);
          void deletePendingDocumentationImage(nextUpload.key);
          setPendingUploads((current) => Math.max(0, current - 1));
          // #region debug-point B:queued-image-upload-success
          reportDebugEvent("B", "src/modules/rydderen/hooks/index.ts:useCleanupDocumentationEntries:queue:image:success", "[DEBUG] Documentation background image upload completed", {
            cleanupProjectId,
            entryId: nextUpload.entryId,
            imageIndex: nextUpload.index,
            imageCountAfterUpload: updatedEntry.imageCount,
            durationMs: Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - uploadStartedAt),
            remainingQueue: uploadQueueRef.current.length,
            activeUploads: activeUploadCountRef.current,
          });
          // #endregion
        } catch (uploadError) {
          const message = uploadError instanceof Error ? uploadError.message : "Kunne ikke laste opp dokumentasjonsbilde";
          if (message.toLowerCase().includes("allerede registrert")) {
            void deletePendingDocumentationImage(nextUpload.key);
            setPendingUploads((current) => Math.max(0, current - 1));
            setBackgroundError(null);
          } else {
            const attempt = nextUpload.attempt + 1;
            if (attempt <= MAX_UPLOAD_RETRIES) {
              const baseDelay = Math.min(30_000, 800 * Math.pow(2, Math.min(6, attempt)));
              const jitter = Math.round(baseDelay * (0.15 * Math.random()));
              nextUpload.attempt = attempt;
              nextUpload.nextAttemptAt = Date.now() + baseDelay + jitter;
              uploadQueueRef.current.push(nextUpload);
              scheduleRetry(baseDelay + jitter);
              setBackgroundError(message);
            } else {
              setBackgroundError(message);
            }
          }
          // #region debug-point B:queued-image-upload-error
          reportDebugEvent("B", "src/modules/rydderen/hooks/index.ts:useCleanupDocumentationEntries:queue:image:error", "[DEBUG] Documentation background image upload failed", {
            cleanupProjectId,
            entryId: nextUpload.entryId,
            imageIndex: nextUpload.index,
            durationMs: Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - uploadStartedAt),
            error: message,
            remainingQueue: uploadQueueRef.current.length,
            activeUploads: activeUploadCountRef.current,
          });
          // #endregion
        } finally {
          activeUploadCountRef.current = Math.max(0, activeUploadCountRef.current - 1);
          if (uploadQueueRef.current.length > 0 || activeUploadCountRef.current > 0) {
            processUploadQueue();
          } else {
            setBackgroundUploading(false);
          }
        }
      })();
    }
  }, [cleanupProjectId, scheduleRetry, upsertEntry]);

  useEffect(() => {
    processUploadQueueRef.current = processUploadQueue;
  }, [processUploadQueue]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        processUploadQueue();
      }
    };

    window.addEventListener("online", processUploadQueue);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("online", processUploadQueue);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [processUploadQueue]);

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

      const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
      try {
        // #region debug-point A:create-entry-start
        reportDebugEvent("A", "src/modules/rydderen/hooks/index.ts:useCleanupDocumentationEntries:createEntry:start", "[DEBUG] Documentation createEntry started", {
          cleanupProjectId,
          entryType: payload.entryType,
          imageCount: payload.images?.length || 0,
        });
        // #endregion
        setSaving(true);
        setError(null);
        setBackgroundError(null);
        let created = await cleanupApiClient.createDocumentationEntry(cleanupProjectId, formData);
        upsertEntry(created);
        // #region debug-point A:create-entry-metadata-created
        reportDebugEvent("A", "src/modules/rydderen/hooks/index.ts:useCleanupDocumentationEntries:createEntry:metadata", "[DEBUG] Documentation metadata created", {
          cleanupProjectId,
          entryId: created.id,
          imageCount: payload.images?.length || 0,
          durationMs: Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt),
        });
        // #endregion

        const imagesToQueue = payload.images || [];
        if (imagesToQueue.length > 0) {
          await Promise.all(
            imagesToQueue.map(async (image, index) => {
              const key = buildPendingDocumentationImageKey({
                cleanupProjectId,
                entryId: created.id,
                index,
                file: image.file,
                imageHash: image.imageHash ?? null,
              });
              await putPendingDocumentationImage({
                key,
                cleanupProjectId,
                entryId: created.id,
                index,
                file: image.file,
                imageHash: image.imageHash ?? null,
                originalName: image.file.name || null,
                createdAt: Date.now(),
              });
              uploadQueueRef.current.push({
                key,
                entryId: created.id,
                index,
                attempt: 0,
                nextAttemptAt: 0,
                image,
              });
            })
          );

          setPendingUploads((current) => current + imagesToQueue.length);
          void processUploadQueue();
        }

        // #region debug-point A:create-entry-finished
        reportDebugEvent("A", "src/modules/rydderen/hooks/index.ts:useCleanupDocumentationEntries:createEntry:finished", "[DEBUG] Documentation createEntry finished", {
          cleanupProjectId,
          entryId: created.id,
          finalImageCount: created.imageCount,
          queuedImages: payload.images?.length || 0,
          durationMs: Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt),
        });
        // #endregion
        return created;
      } catch (err) {
        // #region debug-point B:create-entry-error
        reportDebugEvent("B", "src/modules/rydderen/hooks/index.ts:useCleanupDocumentationEntries:createEntry:error", "[DEBUG] Documentation createEntry failed", {
          cleanupProjectId,
          entryType: payload.entryType,
          imageCount: payload.images?.length || 0,
          durationMs: Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt),
          error: err instanceof Error ? err.message : String(err),
        });
        // #endregion
        setError(err instanceof Error ? err.message : "Kunne ikke lagre dokumentasjonsfunn");
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [cleanupProjectId, processUploadQueue, upsertEntry]
  );

  const retryPendingUploads = useCallback(async () => {
    try {
      setBackgroundError(null);
      const pending = await listPendingDocumentationImages(cleanupProjectId);
      if (pending.length === 0) {
        return;
      }

      const existingKeys = new Set(uploadQueueRef.current.map((item) => item.key));
      let added = 0;
      for (const record of pending) {
        if (existingKeys.has(record.key)) {
          continue;
        }
        uploadQueueRef.current.push({
          key: record.key,
          entryId: record.entryId,
          index: record.index,
          attempt: 0,
          nextAttemptAt: 0,
          image: { file: record.file, imageHash: record.imageHash, originalName: record.originalName },
        });
        existingKeys.add(record.key);
        added += 1;
      }

      if (added > 0) {
        setPendingUploads((current) => current + added);
      }
      void processUploadQueue();
    } catch (err) {
      setBackgroundError(err instanceof Error ? err.message : "Kunne ikke starte opplasting pa nytt");
    }
  }, [cleanupProjectId, processUploadQueue]);

  return { entries, loading, saving, error, backgroundUploading, pendingUploads, backgroundError, refresh, createEntry, retryPendingUploads };
}

export function useCleanupDocumentationMap(cleanupProjectId: string) {
  const cachedMap = cleanupDocumentationMapCache.get(cleanupProjectId) ?? null;
  const hasCachedMap = cachedMap !== null;
  const [map, setMap] = useState<CleanupEvidenceMap | null>(cachedMap);
  const [loading, setLoading] = useState(!hasCachedMap);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (options?: { showLoading?: boolean }) => {
    try {
      if (options?.showLoading ?? !hasCachedMap) {
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
  }, [cleanupProjectId, hasCachedMap]);

  useEffect(() => {
    void refresh({ showLoading: !hasCachedMap });
  }, [hasCachedMap, refresh]);

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
