"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  RydderenAppShell,
  RydderenCostForm,
  RydderenCostList,
  RydderenHeader,
  RydderenItemsList,
  RydderenPrintLayout,
  RydderenProjectCreateDialog,
  RydderenProjectManager,
  RydderenReportView,
  RydderenRegisterFlow,
  RydderenStatsCards,
  RydderenValuationQueue,
} from "@/src/modules/rydderen/components";
import {
  useCleanupCosts,
  useCleanupFilters,
  useCleanupItems,
  useCleanupProject,
  useCleanupProjects,
  useCleanupRegisterFlow,
  useCleanupReport,
  useCleanupValuationQueue,
} from "@/src/modules/rydderen/hooks";
import type { CleanupContextOptions, CleanupCost, CleanupItem, CleanupProject, CleanupProjectContextType } from "@/src/modules/rydderen/types";
import { CLEANUP_MODULE_BRAND, formatCurrency } from "@/src/modules/rydderen/utils";

function createLoadingProject(cleanupProjectId: string) {
  const now = new Date().toISOString();
  return {
    id: cleanupProjectId,
    tenantId: "",
    name: "Laster prosjekt...",
    slug: null,
    moduleType: "rydderen",
    contextType: "standalone" as const,
    contextId: null,
    context: { type: "standalone" as const, id: null, label: "Laster..." },
    description: null,
    status: "active" as const,
    coverImagePath: null,
    coverImageUrl: null,
    createdBy: "",
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
    itemCount: 0,
    unvaluedCount: 0,
    totalValue: 0,
    costsTotal: 0,
    links: [],
  };
}

function scrollWorkAreaIntoView(element: HTMLElement | null) {
  if (!element || typeof window === "undefined") {
    return;
  }

  window.requestAnimationFrame(() => {
    const top = element.getBoundingClientRect().top + window.scrollY - 88;
    window.scrollTo({ top: Math.max(0, top), behavior: "auto" });
  });
}

function buildOverviewSummary(items: CleanupItem[], costs: CleanupCost[], project: CleanupProject | null) {
  const castCount = items.filter((item) => item.action === "kast").length;
  const sellCount = items.filter((item) => item.action === "selg").length;
  const keepCount = items.filter((item) => item.action === "behold").length;
  const totalValue = items.reduce((sum, item) => sum + (item.value ?? 0), 0);
  const totalSellValue = items
    .filter((item) => item.action === "selg")
    .reduce((sum, item) => sum + (item.value ?? 0), 0);
  const totalCastValue = items
    .filter((item) => item.action === "kast")
    .reduce((sum, item) => sum + (item.value ?? 0), 0);
  const totalKeepValue = items
    .filter((item) => item.action === "behold")
    .reduce((sum, item) => sum + (item.value ?? 0), 0);
  const projectCosts = costs.reduce((sum, cost) => sum + cost.amount, 0);

  return {
    castCount,
    sellCount,
    keepCount,
    totalItems: items.length,
    totalValue,
    totalSellValue,
    totalCastValue,
    totalKeepValue,
    projectCosts,
    netValue: totalValue - projectCosts,
    project,
  };
}

export function RydderenModulePage({ basePath }: { basePath: string }) {
  return (
    <div className="space-y-6">
      <RydderenHeader title={CLEANUP_MODULE_BRAND} description="Mobil-først registreringsmodul for objekter, verdier og rapport." basePath={basePath} />
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Registrer raskt</CardTitle>
            <CardDescription>Kamera, kategori, handling og direkte videre.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`${basePath}/projects`}>
              <Button className="w-full">Åpne prosjekter</Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Verdisetting</CardTitle>
            <CardDescription>Sett verdi uten lagre-knapp med fokus på numerisk input.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Objekter uten verdi prioriteres først i køen.</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Rapport og print</CardTitle>
            <CardDescription>Utvidet rapport med kostnader, bilder og summer.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Optimalisert for mobil og desktop print/PDF.</CardContent>
        </Card>
      </div>
    </div>
  );
}

export function RydderenProjectListPage(props: {
  basePath: string;
  contextOptions: CleanupContextOptions;
  initialContextType?: CleanupProjectContextType | null;
  initialContextId?: string | null;
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const projectFilters = useMemo(
    () => ({
      contextType: props.initialContextType || undefined,
      contextId: props.initialContextId || undefined,
    }),
    [props.initialContextId, props.initialContextType]
  );
  const { projects, loading, error, createProject } = useCleanupProjects(projectFilters);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <RydderenHeader
        title={CLEANUP_MODULE_BRAND}
        description="Velg prosjekt og gå rett inn i registrering, verdisetting eller oversikt."
        basePath={props.basePath}
      />

      <div className="rounded-3xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-semibold">Prosjekter</p>
            <p className="text-sm text-muted-foreground">Samme raske flyt som før, men lagret i Eiendomssystemet.</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nytt prosjekt
          </Button>
        </div>
      </div>

      {error ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <div className="grid gap-4">
        {loading ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">Laster ryddeprosjekter...</CardContent>
          </Card>
        ) : projects.length ? (
          projects.map((project) => (
            <Link key={project.id} href={`${props.basePath}/projects/${project.id}`}>
              <Card className="rounded-3xl border transition hover:bg-slate-50">
                <CardContent className="flex items-center justify-between gap-4 p-5">
                  <div className="space-y-2">
                    <div className="font-semibold">{project.name}</div>
                    <div className="text-sm text-muted-foreground">{project.context.label || "Frittstående prosjekt"}</div>
                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                      <span>{project.itemCount} objekter</span>
                      <span>{project.unvaluedCount} uten verdi</span>
                      <span>{formatCurrency(project.totalValue)}</span>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-slate-400" />
                </CardContent>
              </Card>
            </Link>
          ))
        ) : (
          <Card className="rounded-3xl">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Ingen ryddeprosjekter ennå. Opprett et prosjekt og start direkte med kamera.
            </CardContent>
          </Card>
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>1. Ta bilde</CardTitle>
            <CardDescription>Åpner kamera først på mobil.</CardDescription>
          </CardHeader>
        </Card>
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>2. Velg kategori</CardTitle>
            <CardDescription>Store knapper med få trykk.</CardDescription>
          </CardHeader>
        </Card>
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>3. Velg handling</CardTitle>
            <CardDescription>Autosave og rett tilbake til neste objekt.</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <RydderenProjectCreateDialog
        open={dialogOpen}
        creating={creating}
        error={createError}
        initialContextType={props.initialContextType || "standalone"}
        initialContextId={props.initialContextId || null}
        propertyOptions={props.contextOptions.properties}
        projectOptions={props.contextOptions.projects}
        onClose={() => setDialogOpen(false)}
        onCreate={async (input) => {
          try {
            setCreating(true);
            setCreateError(null);
            const project = await createProject(input);
            setDialogOpen(false);
            router.push(`${props.basePath}/projects/${project.id}`);
          } catch (err) {
            setCreateError(err instanceof Error ? err.message : "Kunne ikke opprette prosjekt");
          } finally {
            setCreating(false);
          }
        }}
      />
    </div>
  );
}

export function RydderenProjectDetailsPage(props: { cleanupProjectId: string; basePath: string }) {
  const { project, loading: projectLoading, error: projectError } = useCleanupProject(props.cleanupProjectId);
  const router = useRouter();
  const [creatingProject, setCreatingProject] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const { projects, createProject, deleteProject } = useCleanupProjects();
  const { items, loading: itemsLoading } = useCleanupItems(props.cleanupProjectId);
  const { costs, saving: costSaving, addCost } = useCleanupCosts(props.cleanupProjectId);
  const { actionFilter, setActionFilter, filteredItems } = useCleanupFilters(items);
  const activeProject = project ?? createLoadingProject(props.cleanupProjectId);
  const visibleProjects = projects.length ? projects : [activeProject];
  const summary = useMemo(() => buildOverviewSummary(items, costs, project), [costs, items, project]);
  const overviewSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    scrollWorkAreaIntoView(overviewSectionRef.current);
  }, [props.cleanupProjectId]);

  if (projectError && !project) {
    return <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{projectError}</div>;
  }

  return (
    <RydderenAppShell project={activeProject} projects={visibleProjects} cleanupProjectId={activeProject.id} basePath={props.basePath} active="overview">
      <section ref={overviewSectionRef} className="rounded-[20px] bg-white p-5 shadow-sm">
        <div className="mb-5">
          <p className="mb-1 text-xs uppercase tracking-[0.08em] text-slate-500">Oversikt</p>
          <h2 className="text-2xl font-bold">Registrerte objekter</h2>
        </div>

        {projectLoading && !project ? <div className="mb-4 text-sm text-muted-foreground">Laster ryddeprosjekt i bakgrunnen...</div> : null}

        <RydderenStatsCards report={summary} />

        <div className="mb-4 mt-4 flex flex-wrap gap-2">
          <Button variant={actionFilter === "alle" ? "default" : "outline"} onClick={() => setActionFilter("alle")}>
            Alle
          </Button>
          <Button variant={actionFilter === "kast" ? "default" : "outline"} onClick={() => setActionFilter("kast")}>
            Kast
          </Button>
          <Button variant={actionFilter === "selg" ? "default" : "outline"} onClick={() => setActionFilter("selg")}>
            Selg
          </Button>
          <Button variant={actionFilter === "behold" ? "default" : "outline"} onClick={() => setActionFilter("behold")}>
            Behold
          </Button>
        </div>

        <div className="mb-4">
          <Button variant="outline" className="min-h-12 rounded-[18px] px-5 text-base font-bold" onClick={() => window.print()}>
            Skriv ut rapport
          </Button>
        </div>

        <div className="mb-4 grid gap-4 md:grid-cols-2">
          <Card className="rounded-[18px] border bg-slate-50">
            <CardHeader>
              <CardTitle>Prosjekter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RydderenProjectManager
                projects={visibleProjects}
                activeProjectId={activeProject.id}
                creating={creatingProject}
                deletingId={deletingProjectId}
                onCreate={async (name) => {
                  try {
                    setCreatingProject(true);
                    const created = await createProject({ name, moduleType: "rydderen", contextType: "standalone" });
                    router.push(`${props.basePath}/projects/${created.id}`);
                  } finally {
                    setCreatingProject(false);
                  }
                }}
                onDelete={async (projectId) => {
                  const target = projects.find((entry) => entry.id !== projectId);
                  if (!window.confirm("Slette prosjektet? Dette sletter også objekter og kostnader.")) {
                    return;
                  }

                  try {
                    setDeletingProjectId(projectId);
                    await deleteProject(projectId);
                    if (projectId === activeProject.id) {
                      router.push(target ? `${props.basePath}/projects/${target.id}` : `${props.basePath}/projects`);
                    }
                  } finally {
                    setDeletingProjectId(null);
                  }
                }}
              />
            </CardContent>
          </Card>
          <Card className="rounded-[18px] border bg-slate-50">
            <CardHeader>
              <CardTitle>Prosjektkostnader</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RydderenCostForm
                saving={costSaving}
                onSubmit={({ costType, amount, description }) => {
                  void addCost({ costType, amount, description });
                }}
              />
              <RydderenCostList costs={costs} />
            </CardContent>
          </Card>
        </div>

        <Card className="mb-4 rounded-[18px] border bg-slate-50">
          <CardHeader>
            <CardTitle>Lageroppryddingsrapport</CardTitle>
            <CardDescription>Dato: {new Date().toLocaleDateString("no-NO")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>Prosjekt: {activeProject.name}</p>
            <p>Kast: {summary.castCount} objekter</p>
            <p>Selg: {summary.sellCount} objekter</p>
            <p>Behold: {summary.keepCount} objekter</p>
            <p>Totalt: {summary.totalItems} objekter</p>
            <p>Totalt registrert verdi: {formatCurrency(summary.totalValue)}</p>
            <p>Totale prosjektkostnader: {formatCurrency(summary.projectCosts)}</p>
            <p>Netto verdi: {formatCurrency(summary.netValue)}</p>
          </CardContent>
        </Card>

        <div className="mt-4">
          {itemsLoading ? <div className="text-sm text-muted-foreground">Laster objekter...</div> : <RydderenItemsList items={filteredItems} />}
        </div>
      </section>
    </RydderenAppShell>
  );
}

export function RydderenRegisterPage(props: { cleanupProjectId: string; basePath: string }) {
  const { project, loading, error } = useCleanupProject(props.cleanupProjectId);
  const { projects } = useCleanupProjects();
  const { items } = useCleanupItems(props.cleanupProjectId);
  const flow = useCleanupRegisterFlow(props.cleanupProjectId, items);
  const activeProject = project ?? createLoadingProject(props.cleanupProjectId);
  const visibleProjects = projects.length ? projects : [activeProject];

  if (error && !project) {
    return <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>;
  }

  return (
    <RydderenAppShell project={activeProject} projects={visibleProjects} cleanupProjectId={activeProject.id} basePath={props.basePath} active="register">
      {loading && !project ? <div className="text-sm text-muted-foreground">Laster prosjekt i bakgrunnen...</div> : null}
      <RydderenRegisterFlow
        previewUrl={flow.previewUrl}
        category={flow.category}
        step={flow.step}
        saving={flow.actionLocked}
        error={flow.error}
        autoOpenCameraCount={flow.cameraReopenCount}
        onCapture={flow.chooseFile}
        onCategory={(category) => {
          if (!category) {
            flow.chooseCategory("");
            return;
          }
          flow.chooseCategory(category);
        }}
        onAction={(action) => {
          void flow.saveAction(action);
        }}
        onExitHref={`${props.basePath}/projects/${activeProject.id}`}
      />
    </RydderenAppShell>
  );
}

export function RydderenValuationPage(props: { cleanupProjectId: string; basePath: string }) {
  const { project, loading, error } = useCleanupProject(props.cleanupProjectId);
  const { projects } = useCleanupProjects();
  const queue = useCleanupValuationQueue(props.cleanupProjectId);
  const activeProject = project ?? createLoadingProject(props.cleanupProjectId);
  const visibleProjects = projects.length ? projects : [activeProject];
  const valuationSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    scrollWorkAreaIntoView(valuationSectionRef.current);
  }, [props.cleanupProjectId, queue.currentItem?.id]);

  if (error && !project) {
    return <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>;
  }

  return (
    <RydderenAppShell project={activeProject} projects={visibleProjects} cleanupProjectId={activeProject.id} basePath={props.basePath} active="valuation">
      {loading && !project ? <div className="text-sm text-muted-foreground">Laster prosjekt i bakgrunnen...</div> : null}
      {queue.error ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{queue.error}</div> : null}
      <section ref={valuationSectionRef}>
        <RydderenValuationQueue
          items={queue.items}
          currentItem={queue.currentItem}
          saving={queue.saving}
          onNext={(payload) => {
            void queue.saveCurrentAndAdvance(payload);
          }}
          onExitHref={`${props.basePath}/projects/${activeProject.id}`}
        />
      </section>
    </RydderenAppShell>
  );
}

export function RydderenReportPage(props: { cleanupProjectId: string; basePath: string }) {
  const { report, loading, error } = useCleanupReport(props.cleanupProjectId);

  if (loading || !report) {
    return <div className="text-sm text-muted-foreground">Laster rapport...</div>;
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
        <AlertTriangle className="mr-2 inline h-4 w-4" />
        {error}
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <RydderenHeader title={`${report.project.name} • Rapport`} description="Rapport for print og PDF med utvidede objektdetaljer." project={report.project} basePath={props.basePath} active="report" />
      <RydderenPrintLayout>
        <RydderenReportView report={report} />
      </RydderenPrintLayout>
    </div>
  );
}
