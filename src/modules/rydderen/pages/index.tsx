"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, Camera, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  RydderenCostForm,
  RydderenCostList,
  RydderenHeader,
  RydderenItemsList,
  RydderenPrintLayout,
  RydderenProjectCreateDialog,
  RydderenRegisterFlow,
  RydderenReportView,
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
import type { CleanupContextOptions, CleanupProjectContextType } from "@/src/modules/rydderen/types";
import { CLEANUP_MODULE_BRAND, formatCurrency } from "@/src/modules/rydderen/utils";

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
  const { items, loading: itemsLoading } = useCleanupItems(props.cleanupProjectId);
  const { costs, saving: costSaving, addCost } = useCleanupCosts(props.cleanupProjectId);
  const { report, loading: reportLoading } = useCleanupReport(props.cleanupProjectId);
  const { actionFilter, setActionFilter, filteredItems } = useCleanupFilters(items);

  if (projectLoading || !project) {
    return <div className="text-sm text-muted-foreground">Laster ryddeprosjekt...</div>;
  }

  if (projectError) {
    return <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{projectError}</div>;
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <RydderenHeader title={project.name} description={project.description} project={project} basePath={props.basePath} active="overview" />

      {report && !reportLoading ? <RydderenStatsCards report={report} /> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Link href={`${props.basePath}/projects/${project.id}/register`}>
          <Card className="rounded-3xl border-2 border-slate-900 bg-slate-900 text-white">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <div className="text-lg font-semibold">Registrer</div>
                <div className="text-sm text-slate-200">Kamera, kategori, handling</div>
              </div>
              <Camera className="h-5 w-5" />
            </CardContent>
          </Card>
        </Link>
        <Link href={`${props.basePath}/projects/${project.id}/valuation`}>
          <Card className="rounded-3xl">
            <CardContent className="p-5">
              <div className="text-lg font-semibold">Verdisetting</div>
              <div className="text-sm text-muted-foreground">Sett verdi uten lagre-knapp.</div>
            </CardContent>
          </Card>
        </Link>
        <Link href={`${props.basePath}/projects/${project.id}/report`}>
          <Card className="rounded-3xl">
            <CardContent className="p-5">
              <div className="text-lg font-semibold">Rapport</div>
              <div className="text-sm text-muted-foreground">Oversikt, summer og print/PDF.</div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle>Objekter</CardTitle>
              <CardDescription>Mobil-først oversikt med filter på handling.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
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
              {itemsLoading ? <div className="text-sm text-muted-foreground">Laster objekter...</div> : <RydderenItemsList items={filteredItems} />}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <RydderenCostForm
            saving={costSaving}
            onSubmit={({ costType, amount, description }) => {
              void addCost({ costType, amount, description });
            }}
          />
          <RydderenCostList costs={costs} />
        </div>
      </div>
    </div>
  );
}

export function RydderenRegisterPage(props: { cleanupProjectId: string; basePath: string }) {
  const { project, loading, error } = useCleanupProject(props.cleanupProjectId);
  const flow = useCleanupRegisterFlow(props.cleanupProjectId);

  if (loading || !project) {
    return <div className="text-sm text-muted-foreground">Laster registreringsflyt...</div>;
  }

  if (error) {
    return <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>;
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <RydderenHeader title={`${project.name} • Registrer`} description="Kamera først, få trykk og direkte videre til neste objekt." project={project} basePath={props.basePath} active="register" />
      <RydderenRegisterFlow
        previewUrl={flow.previewUrl}
        category={flow.category}
        step={flow.step}
        saving={flow.uploading}
        error={flow.error}
        lastSavedItem={flow.lastSavedItem}
        onCapture={flow.chooseFile}
        onCategory={flow.chooseCategory}
        onAction={(action) => {
          void flow.saveAction(action);
        }}
        onExitHref={`${props.basePath}/projects/${project.id}`}
      />
    </div>
  );
}

export function RydderenValuationPage(props: { cleanupProjectId: string; basePath: string }) {
  const { project, loading, error } = useCleanupProject(props.cleanupProjectId);
  const queue = useCleanupValuationQueue(props.cleanupProjectId);

  if (loading || !project) {
    return <div className="text-sm text-muted-foreground">Laster verdisetting...</div>;
  }

  if (error) {
    return <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>;
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <RydderenHeader title={`${project.name} • Verdisetting`} description="Sett verdi med tastaturfokus og autosave ved Neste." project={project} basePath={props.basePath} active="valuation" />
      {queue.error ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{queue.error}</div> : null}
      <RydderenValuationQueue
        items={queue.items}
        currentItem={queue.currentItem}
        saving={queue.saving}
        onNext={(payload) => {
          void queue.saveCurrentAndAdvance(payload);
        }}
        onExitHref={`${props.basePath}/projects/${project.id}`}
      />
    </div>
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
