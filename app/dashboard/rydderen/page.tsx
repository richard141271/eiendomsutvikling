"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCleanupProjects } from "@/src/modules/rydderen/hooks";
import { AsyncState } from "@/components/ui/async-state";
import { logClientPerformance } from "@/lib/performance/client";

export default function RydderenEntryRoute() {
  const router = useRouter();
  const { projects, loading, error, refresh } = useCleanupProjects();

  useEffect(() => {
    const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
    return () => {
      logClientPerformance("rydderen-entry", (typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt, {
        projectCount: projects.length,
        hadError: Boolean(error),
      });
    };
  }, [error, projects.length]);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!projects.length) {
      router.replace("/dashboard/rydderen/projects");
      return;
    }

    const stored = window.localStorage.getItem("rydderen-activeProjectId");
    const preferred = stored && projects.some((project) => project.id === stored) ? stored : projects[0].id;
    window.localStorage.setItem("rydderen-activeProjectId", preferred);
    // #region debug-point C:rydderen-entry-ready
    if (window.localStorage.getItem("trae-debug") === "1") {
      fetch(window.localStorage.getItem("trae-debug-url") || "http://127.0.0.1:7777/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "app-speed-lag",
          runId: "pre-fix",
          hypothesisId: "C",
          location: "app/dashboard/rydderen/page.tsx:router:replace",
          msg: "[DEBUG] Rydderen entry resolved and redirecting",
          data: { projectCount: projects.length, preferredProjectId: preferred, tsDeltaMs: Date.now() },
          ts: Date.now(),
        }),
        keepalive: true,
      }).catch(() => undefined);
    }
    // #endregion
    router.replace(`/dashboard/rydderen/projects/${preferred}/register`);
  }, [loading, projects, router]);

  if (error) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <AsyncState
          mode="error"
          title="Kunne ikke apne Rydder'n"
          description={error}
          actionLabel="Prov igjen"
          onAction={() => void refresh({ showLoading: true })}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <AsyncState
        mode="loading"
        title="Apner Rydder'n"
        description={loading ? "Henter prosjekt og klargjor arbeidsflaten." : "Sender deg videre til riktig prosjekt."}
        progress={loading ? 45 : 85}
      />
    </div>
  );
}
