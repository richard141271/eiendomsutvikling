"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CleanupDocumentationDraftImage,
  CleanupDocumentationView,
  RydderenDocumentationEntryForm,
  RydderenDocumentationMapForm,
  RydderenDocumentationMenu,
  RydderenDocumentationReportView,
} from "@/src/modules/rydderen/documentation-components";
import { exportDocumentationDocx, exportDocumentationZip, saveAllDocumentationImages } from "@/src/modules/rydderen/documentation-export";
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
  useCleanupDocumentationEntries,
  useCleanupDocumentationMap,
  useCleanupFilters,
  useCleanupItems,
  useCleanupProject,
  useCleanupProjects,
  useCleanupRegisterFlow,
  useCleanupReport,
  useCleanupValuationQueue,
} from "@/src/modules/rydderen/hooks";
import type { CleanupContextOptions, CleanupCost, CleanupItem, CleanupProject, CleanupProjectContextType } from "@/src/modules/rydderen/types";
import {
  CLEANUP_DOCUMENTATION_CATEGORIES,
  CLEANUP_MODULE_BRAND,
  buildCleanupZones,
  formatCleanupEvidenceNumber,
  formatCurrency,
  getCleanupDocumentationTypeConfig,
} from "@/src/modules/rydderen/utils";

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

async function hashDocumentationFile(file: File) {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function compressDocumentationImage(file: File) {
  if (typeof window === "undefined" || !file.type.startsWith("image/")) {
    return file;
  }

  if (file.size <= 1_500_000) {
    return file;
  }

  try {
    const imageUrl = URL.createObjectURL(file);
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Kunne ikke lese bilde"));
      element.src = imageUrl;
    });

    const maxDimension = 2000;
    const longestSide = Math.max(image.naturalWidth, image.naturalHeight);
    const scale = longestSide > maxDimension ? maxDimension / longestSide : 1;
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      URL.revokeObjectURL(imageUrl);
      return file;
    }

    context.drawImage(image, 0, 0, width, height);

    const compressedBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.8);
    });

    URL.revokeObjectURL(imageUrl);

    if (!compressedBlob || compressedBlob.size >= file.size * 0.92) {
      return file;
    }

    const baseName = file.name.replace(/\.[^.]+$/, "") || "dokumentasjon";
    return new File([compressedBlob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  }
}

function getProjectConfirmationKey(cleanupProjectId: string) {
  return `rydderen-project-confirmed:${cleanupProjectId}`;
}

function reportDebugEvent(hypothesisId: "A" | "B" | "C" | "D" | "E", location: string, msg: string, data: Record<string, unknown>) {
  void hypothesisId;
  void location;
  void msg;
  void data;
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

function useProjectRegistrationConfirmation(cleanupProjectId: string, projectName: string, basePath: string) {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    setConfirmed(window.sessionStorage.getItem(getProjectConfirmationKey(cleanupProjectId)) === "1");
  }, [cleanupProjectId]);

  const ensureConfirmed = async () => {
    if (confirmed) {
      return true;
    }

    const isConfirmed = window.confirm(`Dette registreres i "${projectName}". Er dette riktig?`);
    if (!isConfirmed) {
      router.push(`${basePath}/projects/${cleanupProjectId}`);
      return false;
    }

    window.sessionStorage.setItem(getProjectConfirmationKey(cleanupProjectId), "1");
    setConfirmed(true);
    return true;
  };

  const resetConfirmation = () => {
    if (typeof window === "undefined") {
      return;
    }
    window.sessionStorage.removeItem(getProjectConfirmationKey(cleanupProjectId));
    setConfirmed(false);
  };

  return { confirmed, ensureConfirmed, resetConfirmation };
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
            <Link key={project.id} href={`${props.basePath}/projects/${project.id}/register`}>
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
          <Button
            variant="outline"
            className="min-h-12 rounded-[18px] px-5 text-base font-bold"
            onClick={() => router.push(`${props.basePath}/projects/${activeProject.id}/report?print=1`)}
          >
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
  const { ensureConfirmed } = useProjectRegistrationConfirmation(props.cleanupProjectId, activeProject.name, props.basePath);

  if (error && !project) {
    return <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>;
  }

  return (
    <RydderenAppShell project={activeProject} projects={visibleProjects} cleanupProjectId={activeProject.id} basePath={props.basePath} active="register">
      {loading && !project ? <div className="text-sm text-muted-foreground">Laster prosjekt i bakgrunnen...</div> : null}
      <RydderenRegisterFlow
        previewUrl={flow.previewUrl}
        projectName={activeProject.name}
        category={flow.category}
        step={flow.step}
        saving={flow.actionLocked}
        error={flow.error}
        autoOpenCameraCount={flow.cameraReopenCount}
        onCapture={flow.chooseFile}
        onRequestCapture={ensureConfirmed}
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

export function RydderenDocumentationPage(props: { cleanupProjectId: string; basePath: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedView = searchParams.get("view");
  const { project, loading, error } = useCleanupProject(props.cleanupProjectId);
  const { projects } = useCleanupProjects();
  const entriesState = useCleanupDocumentationEntries(props.cleanupProjectId);
  const mapState = useCleanupDocumentationMap(props.cleanupProjectId);
  const activeProject = project ?? createLoadingProject(props.cleanupProjectId);
  const visibleProjects = projects.length ? projects : [activeProject];
  const { ensureConfirmed } = useProjectRegistrationConfirmation(props.cleanupProjectId, activeProject.name, props.basePath);
  const [view, setView] = useState<CleanupDocumentationView>("menu");
  const [entryType, setEntryType] = useState("finding");
  const [category, setCategory] = useState<string>(CLEANUP_DOCUMENTATION_CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [zone, setZone] = useState("");
  const [comment, setComment] = useState("");
  const [count, setCount] = useState("1");
  const [risk, setRisk] = useState<string>("Middels");
  const [images, setImages] = useState<CleanupDocumentationDraftImage[]>([]);
  const [moreOpen, setMoreOpen] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [preparingImages, setPreparingImages] = useState(false);
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const latestImagesRef = useRef<CleanupDocumentationDraftImage[]>([]);

  const zoneOptions = mapState.map?.zones?.length ? mapState.map.zones : buildCleanupZones(3, 3);
  const nextSequence =
    entriesState.entries.filter((entry) => entry.entryType === entryType).reduce((max, entry) => Math.max(max, entry.sequence), 0) + 1;
  const nextEntryNumber = formatCleanupEvidenceNumber(entryType, nextSequence);
  const timestampLabel = `${new Date().toLocaleDateString("no-NO")} ${new Date().toLocaleTimeString("no-NO", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;

  useEffect(() => {
    if (requestedView === "entry" || requestedView === "map" || requestedView === "report") {
      setView(requestedView);
      return;
    }
    setView("menu");
  }, [requestedView]);

  useEffect(() => {
    latestImagesRef.current = images;
  }, [images]);

  useEffect(() => {
    return () => {
      latestImagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    };
  }, []);

  const openDocumentationPdf = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }
    setExporting(true);
    const params = new URLSearchParams();
    if (search.trim()) {
      params.set("search", search.trim());
    }
    const suffix = params.toString() ? `?${params.toString()}` : "";
    const reportUrl = `/api/rydderen/projects/${props.cleanupProjectId}/documentation/report${suffix}`;
    window.open(reportUrl, "_blank");
    window.setTimeout(() => setExporting(false), 1200);
  }, [props.cleanupProjectId, search]);

  const resetDraft = (nextType = entryType) => {
    images.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    setEntryType(nextType);
    setCategory(CLEANUP_DOCUMENTATION_CATEGORIES[0]);
    setDescription("");
    setZone("");
    setComment("");
    setCount("1");
    setRisk("Middels");
    setImages([]);
    setMoreOpen(false);
    setGpsStatus(null);
    setDraftError(null);
  };

  const handleFiles = async (fileList: FileList | null) => {
    const files = Array.from(fileList || []);
    if (!files.length) {
      return;
    }

    const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
    try {
      // #region debug-point E:documentation-handle-files-start
      reportDebugEvent("E", "src/modules/rydderen/pages/index.tsx:RydderenDocumentationPage:handleFiles:start", "[DEBUG] Documentation handleFiles started", {
        cleanupProjectId: props.cleanupProjectId,
        fileCount: files.length,
        totalSize: files.reduce((sum, file) => sum + file.size, 0),
      });
      // #endregion
      setPreparingImages(true);
      const existingHashes = new Set(entriesState.entries.flatMap((entry) => entry.images.map((image) => image.imageHash || "")));
      const draftHashes = new Set(images.map((image) => image.imageHash));
      const nextImages: CleanupDocumentationDraftImage[] = [];
      let duplicateFound = false;

      for (const file of files) {
        const imageHash = await hashDocumentationFile(file);
        if (!imageHash || existingHashes.has(imageHash) || draftHashes.has(imageHash)) {
          duplicateFound = true;
          continue;
        }

        const uploadFile = await compressDocumentationImage(file);
        draftHashes.add(imageHash);
        nextImages.push({
          file: uploadFile,
          imageHash,
          previewUrl: URL.createObjectURL(uploadFile),
        });
      }

      if (nextImages.length) {
        setImages((current) => [...current, ...nextImages]);
        setDraftError(null);
      } else if (duplicateFound) {
        setDraftError("Dette bildet er allerede registrert i dokumentasjonen for prosjektet.");
      }
      // #region debug-point E:documentation-handle-files-finished
      reportDebugEvent("E", "src/modules/rydderen/pages/index.tsx:RydderenDocumentationPage:handleFiles:finished", "[DEBUG] Documentation handleFiles finished", {
        cleanupProjectId: props.cleanupProjectId,
        fileCount: files.length,
        acceptedCount: nextImages.length,
        duplicateFound,
        durationMs: Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt),
      });
      // #endregion
    } catch (error) {
      // #region debug-point E:documentation-handle-files-error
      reportDebugEvent("E", "src/modules/rydderen/pages/index.tsx:RydderenDocumentationPage:handleFiles:error", "[DEBUG] Documentation handleFiles failed", {
        cleanupProjectId: props.cleanupProjectId,
        fileCount: files.length,
        durationMs: Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt),
        error: error instanceof Error ? error.message : String(error),
      });
      // #endregion
      throw error;
    } finally {
      setPreparingImages(false);
    }
  };

  const requestGps = async () => {
    if (!("geolocation" in navigator)) {
      return null;
    }
    return new Promise<{ lat: number; lon: number } | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 900, maximumAge: 300000 }
      );
    });
  };

  if (error && !project) {
    return <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>;
  }

  return (
    <RydderenAppShell project={activeProject} projects={visibleProjects} cleanupProjectId={activeProject.id} basePath={props.basePath} active="documentation">
      <input
        ref={cameraInputRef}
        className="hidden"
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={(event) => {
          void handleFiles(event.target.files);
          event.currentTarget.value = "";
        }}
      />
      <input
        ref={galleryInputRef}
        className="hidden"
        type="file"
        accept="image/*"
        multiple
        onChange={(event) => {
          void handleFiles(event.target.files);
          event.currentTarget.value = "";
        }}
      />

      {loading && !project ? <div className="text-sm text-muted-foreground">Laster prosjekt i bakgrunnen...</div> : null}
      {mapState.error ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{mapState.error}</div> : null}
      {entriesState.backgroundUploading ? (
        <div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-700">
          Laster opp {entriesState.pendingUploads} bilde{entriesState.pendingUploads === 1 ? "" : "r"} i bakgrunnen. Ikke lukk appen for opplastingen er ferdig.
        </div>
      ) : null}
      {entriesState.backgroundError ? (
        <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          Noen bilder ble ikke lastet opp i bakgrunnen: {entriesState.backgroundError}{" "}
          <Button type="button" variant="outline" className="ml-2 h-8 rounded-lg px-3" onClick={() => void entriesState.retryPendingUploads()}>
            Prøv igjen
          </Button>
        </div>
      ) : null}

      {view === "menu" ? (
        <RydderenDocumentationMenu
          onSelectEntryType={(nextType) => {
            resetDraft(nextType);
            setView("entry");
            router.replace(`${pathname}?view=entry`);
          }}
          onOpenMap={() => {
            setView("map");
            router.replace(`${pathname}?view=map`);
          }}
          onOpenReport={() => {
            setView("report");
            router.replace(`${pathname}?view=report`);
          }}
        />
      ) : null}

      {view === "entry" ? (
        <RydderenDocumentationEntryForm
          entryType={entryType}
          nextEntryNumber={nextEntryNumber}
          timestampLabel={timestampLabel}
          images={images}
          category={category}
          description={description}
          zone={zone}
          comment={comment}
          count={count}
          risk={risk}
          moreOpen={moreOpen}
          saving={entriesState.saving}
          preparingImages={preparingImages}
          error={draftError || entriesState.error}
          gpsStatus={gpsStatus}
          zoneOptions={zoneOptions}
          onBack={() => {
            setView("menu");
            router.replace(pathname);
          }}
          onToggleMore={() => setMoreOpen((current) => !current)}
          onRequestCamera={() => cameraInputRef.current?.click()}
          onRequestGallery={() => galleryInputRef.current?.click()}
          onRemoveImage={(index) => {
            setImages((current) => {
              const next = [...current];
              const removed = next.splice(index, 1)[0];
              if (removed) {
                URL.revokeObjectURL(removed.previewUrl);
              }
              return next;
            });
          }}
          onChange={(field, value) => {
            setDraftError(null);
            if (field === "category") setCategory(value);
            if (field === "description") setDescription(value);
            if (field === "zone") setZone(value);
            if (field === "comment") setComment(value);
            if (field === "count") setCount(value);
            if (field === "risk") setRisk(value);
          }}
          onSave={() => {
            void (async () => {
              const hasQuickContent = images.length > 0 || description.trim() || comment.trim();
              if (!hasQuickContent) {
                setDraftError("Ta bilde eller skriv en kort beskrivelse for a lagre.");
                return;
              }
              if (!(await ensureConfirmed())) {
                return;
              }
              try {
                setDraftError(null);
                setGpsStatus("Henter GPS hvis tilgjengelig ...");
                const gps = await requestGps();
                const imageCount = images.length;
                const saved = await entriesState.createEntry({
                  entryType,
                  category,
                  description: description.trim() || null,
                  comment: comment.trim() || null,
                  zone: zone.trim() || null,
                  count: Math.max(1, Number(count) || 1),
                  risk,
                  gps,
                  images: images.map((image) => ({
                    file: image.file,
                    imageHash: image.imageHash,
                  })),
                });
                resetDraft(saved.entryType);
                if (imageCount > 0) {
                  setGpsStatus(`Funnet er lagret. ${imageCount} bilde${imageCount === 1 ? "" : "r"} lastes opp i bakgrunnen.`);
                } else {
                  setGpsStatus(gps ? "GPS lagret." : "GPS ikke tilgjengelig. Funnet er lagret uten GPS.");
                }
              } catch (error) {
                setGpsStatus(null);
                setDraftError(error instanceof Error ? error.message : "Kunne ikke lagre dokumentasjonsfunn.");
              }
            })();
          }}
        />
      ) : null}

      {view === "map" ? (
        <RydderenDocumentationMapForm
          map={mapState.map}
          entries={entriesState.entries}
          saving={mapState.saving}
          onBack={() => {
            setView("menu");
            router.replace(pathname);
          }}
          onSave={(payload) => {
            void mapState.saveMap(payload);
          }}
          onSelectZone={(selectedZone) => {
            resetDraft(entryType);
            setZone(selectedZone);
            setView("entry");
            router.replace(`${pathname}?view=entry`);
          }}
        />
      ) : null}

      {view === "report" ? (
        <RydderenDocumentationReportView
          projectName={activeProject.name}
          map={mapState.map}
          entries={entriesState.entries}
          search={search}
          exporting={exporting}
          onSearchChange={setSearch}
          onClearSearch={() => setSearch("")}
          onBack={() => {
            setView("menu");
            router.replace(pathname);
          }}
          onPrintPdf={() => {
            openDocumentationPdf();
          }}
          onExportPages={() => {
            void (async () => {
              try {
                setExporting(true);
                await exportDocumentationDocx({
                  project: activeProject,
                  map: mapState.map,
                  entries: entriesState.entries.filter((entry) =>
                    [
                      entry.entryNumber,
                      entry.category,
                      entry.createdDate,
                      entry.zone,
                      entry.description,
                      entry.comment,
                      getCleanupDocumentationTypeConfig(entry.entryType).shortLabel,
                    ]
                      .join(" ")
                      .toLowerCase()
                      .includes(search.trim().toLowerCase())
                  ),
                });
                window.alert("Pages-dokumentet er lastet ned. Aapne filen i Filer eller Pages for a vise rapporten.");
              } catch (exportError) {
                window.alert(`Pages-eksport feilet: ${exportError instanceof Error ? exportError.message : String(exportError)}`);
              } finally {
                setExporting(false);
              }
            })();
          }}
          onSaveImages={() => {
            void (async () => {
              try {
                setExporting(true);
                await saveAllDocumentationImages({ project: activeProject, entries: entriesState.entries });
              } catch (exportError) {
                window.alert(exportError instanceof Error ? exportError.message : String(exportError));
              } finally {
                setExporting(false);
              }
            })();
          }}
          onExportZip={() => {
            void (async () => {
              try {
                setExporting(true);
                await exportDocumentationZip({ project: activeProject, entries: entriesState.entries });
              } catch (exportError) {
                window.alert(exportError instanceof Error ? exportError.message : String(exportError));
              } finally {
                setExporting(false);
              }
            })();
          }}
        />
      ) : null}
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const shouldAutoPrint = searchParams.get("print") === "1";
  const autoPrintTriggeredRef = useRef(false);

  useEffect(() => {
    if (!report || !shouldAutoPrint || autoPrintTriggeredRef.current) {
      return;
    }

    autoPrintTriggeredRef.current = true;
    window.history.replaceState({}, "", pathname);

    const timeout = window.setTimeout(() => {
      window.print();
    }, 120);

    return () => window.clearTimeout(timeout);
  }, [pathname, report, shouldAutoPrint]);

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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 print:block print:max-w-none print:p-0">
      <div className="print:hidden">
        <RydderenHeader title={`${report.project.name} • Rapport`} description="Rapport for print og PDF med utvidede objektdetaljer." project={report.project} basePath={props.basePath} active="report" />
      </div>
      <RydderenPrintLayout>
        <RydderenReportView report={report} />
      </RydderenPrintLayout>
    </div>
  );
}
