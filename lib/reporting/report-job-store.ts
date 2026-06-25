type ReportJobState = "queued" | "running" | "success" | "error";

export type ReportJobSnapshot = {
  id: string;
  key: string;
  state: ReportJobState;
  phase: string;
  message: string;
  progress: number;
  url?: string;
  attachments?: Array<{ title: string; url: string }>;
  error?: string;
  createdAt: number;
  updatedAt: number;
};

type StoreShape = {
  byId: Map<string, ReportJobSnapshot>;
  idByKey: Map<string, string>;
};

declare global {
  // eslint-disable-next-line no-var
  var __reportJobStore: StoreShape | undefined;
}

function getStore(): StoreShape {
  if (!globalThis.__reportJobStore) {
    globalThis.__reportJobStore = {
      byId: new Map(),
      idByKey: new Map(),
    };
  }
  return globalThis.__reportJobStore;
}

function createJobSnapshot(id: string, key: string): ReportJobSnapshot {
  const now = Date.now();
  return {
    id,
    key,
    state: "queued",
    phase: "Venter",
    message: "Jobben er opprettet.",
    progress: 5,
    createdAt: now,
    updatedAt: now,
  };
}

export function getReportJob(jobId: string) {
  return getStore().byId.get(jobId) ?? null;
}

export function updateReportJob(jobId: string, patch: Partial<ReportJobSnapshot>) {
  const store = getStore();
  const current = store.byId.get(jobId);
  if (!current) {
    return null;
  }

  const next: ReportJobSnapshot = {
    ...current,
    ...patch,
    updatedAt: Date.now(),
  };
  store.byId.set(jobId, next);
  return next;
}

export function queueReportJob(
  key: string,
  run: (helpers: { update: (patch: Partial<ReportJobSnapshot>) => void }) => Promise<{
    url: string;
    attachments?: Array<{ title: string; url: string }>;
  }>
) {
  const store = getStore();
  const existingId = store.idByKey.get(key);
  const existing = existingId ? store.byId.get(existingId) : null;

  if (existing && (existing.state === "queued" || existing.state === "running")) {
    return existing;
  }

  const jobId = crypto.randomUUID();
  const snapshot = createJobSnapshot(jobId, key);
  store.idByKey.set(key, jobId);
  store.byId.set(jobId, snapshot);

  void (async () => {
    try {
      updateReportJob(jobId, {
        state: "running",
        phase: "Starter",
        message: "Starter rapportjobben.",
        progress: 10,
      });

      const result = await run({
        update: (patch) => {
          updateReportJob(jobId, patch);
        },
      });

      updateReportJob(jobId, {
        state: "success",
        phase: "Ferdig",
        message: "Rapporten er klar.",
        progress: 100,
        url: result.url,
        attachments: result.attachments || [],
      });
    } catch (error) {
      updateReportJob(jobId, {
        state: "error",
        phase: "Feil",
        message: "Rapportjobben feilet.",
        progress: 100,
        error: error instanceof Error ? error.message : "Ukjent feil",
      });
    }
  })();

  return snapshot;
}
