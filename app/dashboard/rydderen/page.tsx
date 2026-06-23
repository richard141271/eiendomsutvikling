"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCleanupProjects } from "@/src/modules/rydderen/hooks";

export default function RydderenEntryRoute() {
  const router = useRouter();
  const { projects, loading } = useCleanupProjects();

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
    router.replace(`/dashboard/rydderen/projects/${preferred}/register`);
  }, [loading, projects, router]);

  return null;
}

