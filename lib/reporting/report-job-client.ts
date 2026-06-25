export type ReportJobClientState = {
  id: string;
  state: "queued" | "running" | "success" | "error";
  phase: string;
  message: string;
  progress: number;
  url?: string;
  attachments?: Array<{ title: string; url: string }>;
  error?: string;
};

async function delay(ms: number) {
  await new Promise((resolve) => window.setTimeout(resolve, ms));
}

export async function pollReportJob(
  jobId: string,
  onUpdate: (state: ReportJobClientState) => void,
  options?: { intervalMs?: number; timeoutMs?: number }
) {
  const intervalMs = options?.intervalMs ?? 800;
  const timeoutMs = options?.timeoutMs ?? 300000;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const response = await fetch(`/api/report-jobs/${jobId}`, {
      cache: "no-store",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Kunne ikke hente rapportstatus");
    }

    const state = (await response.json()) as ReportJobClientState;
    onUpdate(state);

    if (state.state === "success") {
      return state;
    }

    if (state.state === "error") {
      throw new Error(state.error || "Rapportjobben feilet");
    }

    await delay(intervalMs);
  }

  throw new Error("Rapportjobben brukte for lang tid");
}
