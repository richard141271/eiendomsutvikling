"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Camera, FolderKanban, Printer, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type {
  CleanupContextOption,
  CleanupCost,
  CleanupItem,
  CleanupProject,
  CleanupProjectContextType,
  CleanupProjectCreateInput,
  CleanupReportSummary,
} from "@/src/modules/rydderen/types";
import {
  CLEANUP_ACTIONS,
  CLEANUP_CONTEXT_TYPES,
  CLEANUP_COST_TYPES,
  CLEANUP_MODULE_BRAND,
  DEFAULT_RYDDEREN_CATEGORIES,
  formatCleanupActionLabel,
  formatCleanupObjectLabel,
  formatCurrency,
  formatDate,
} from "@/src/modules/rydderen/utils";

function scrollWorkAreaIntoView(element: HTMLElement | null, offset = 88) {
  if (!element || typeof window === "undefined") {
    return;
  }

  window.requestAnimationFrame(() => {
    const top = element.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: Math.max(0, top), behavior: "auto" });
  });
}

export function RydderenHeader(props: {
  title: string;
  description?: string | null;
  project?: CleanupProject | null;
  basePath: string;
  active?: "overview" | "register" | "valuation" | "report" | "documentation";
}) {
  const tabs = props.project
    ? [
        { key: "overview", label: "Oversikt", href: `${props.basePath}/projects/${props.project.id}` },
        { key: "register", label: "Registrer", href: `${props.basePath}/projects/${props.project.id}/register` },
        { key: "valuation", label: "Verdisetting", href: `${props.basePath}/projects/${props.project.id}/valuation` },
        { key: "documentation", label: "Dokumentasjon & Bevis", href: `${props.basePath}/projects/${props.project.id}/documentation` },
        { key: "report", label: "Rapport", href: `${props.basePath}/projects/${props.project.id}/report` },
      ]
    : [];

  return (
    <div className="space-y-4 print:hidden">
      <div className="flex flex-col gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-slate-500" />
            <h1 className="text-2xl font-bold">{props.title}</h1>
          </div>
          {props.description ? <p className="text-sm text-muted-foreground">{props.description}</p> : null}
          {props.project ? <RydderenProjectContextBadge project={props.project} /> : null}
        </div>
      </div>

      {tabs.length ? (
        <div className="-mx-4 border-y bg-white/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-white/80 md:mx-0 md:rounded-2xl md:border md:bg-slate-50 md:px-2">
          <div className="flex gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <Link
              key={tab.key}
              href={tab.href}
              className={cn(
                "min-w-fit rounded-xl px-4 py-2 text-sm font-medium transition",
                props.active === tab.key ? "bg-slate-900 text-white shadow" : "bg-white text-slate-600 hover:bg-slate-100"
              )}
            >
              {tab.label}
            </Link>
          ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function RydderenProjectContextBadge({ project }: { project: CleanupProject }) {
  const label = project.context.label || "Frittstående";
  const tone =
    project.contextType === "property" ? "default" : project.contextType === "project" ? "secondary" : "outline";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant={tone as "default" | "secondary" | "outline"}>{project.contextType || "standalone"}</Badge>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm text-muted-foreground">• {project.itemCount} objekter</span>
      <span className="text-sm text-muted-foreground">• {project.unvaluedCount} uten verdi</span>
    </div>
  );
}

export function RydderenProjectStrip(props: {
  project: CleanupProject;
  projects: CleanupProject[];
  basePath: string;
  activeView: "register" | "valuation" | "overview" | "documentation";
}) {
  const getProjectHref = (projectId: string) => {
    if (props.activeView === "register") return `${props.basePath}/projects/${projectId}/register`;
    if (props.activeView === "valuation") return `${props.basePath}/projects/${projectId}/valuation`;
    if (props.activeView === "documentation") return `${props.basePath}/projects/${projectId}/documentation`;
    return `${props.basePath}/projects/${projectId}`;
  };

  return (
    <section className="grid gap-3 rounded-[20px] bg-white p-4 shadow-[0_16px_40px_rgba(17,24,39,0.10)] print:hidden">
      <div>
        <p className="mb-1 text-xs uppercase tracking-[0.08em] text-slate-500">Aktivt prosjekt</p>
        <h2 className="text-xl font-bold">{props.project.name}</h2>
      </div>
      <select
        aria-label="Aktivt prosjekt"
        className="min-h-14 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base"
        value={props.project.id}
        onChange={(event) => {
          window.localStorage.setItem("rydderen-activeProjectId", event.target.value);
          window.location.href = getProjectHref(event.target.value);
        }}
      >
        {props.projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
    </section>
  );
}

export function RydderenBottomNav(props: {
  cleanupProjectId: string;
  basePath: string;
  active: "register" | "valuation" | "overview" | "documentation";
}) {
  const items = [
    { key: "register", label: "Registrer", href: `${props.basePath}/projects/${props.cleanupProjectId}/register` },
    { key: "valuation", label: "Verdisetting", href: `${props.basePath}/projects/${props.cleanupProjectId}/valuation` },
    { key: "overview", label: "Oversikt", href: `${props.basePath}/projects/${props.cleanupProjectId}` },
  ] as const;

  return (
    <nav
      aria-label="Hovednavigasjon"
      className="fixed inset-x-0 bottom-0 z-20 mx-auto grid max-w-[820px] grid-cols-3 gap-3 bg-slate-100/95 px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 backdrop-blur print:hidden"
    >
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={cn(
            "flex min-h-16 items-center justify-center rounded-[18px] px-3 text-center text-base font-bold transition",
            props.active === item.key ? "bg-blue-700 text-white" : "bg-slate-300 text-slate-900"
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function RydderenAppShell(props: {
  project: CleanupProject;
  projects: CleanupProject[];
  cleanupProjectId: string;
  basePath: string;
  active: "register" | "valuation" | "overview" | "documentation";
  children: React.ReactNode;
}) {
  const moduleLinks = {
    rydderen: `${props.basePath}/projects/${props.cleanupProjectId}/register`,
    documentation: `${props.basePath}/projects/${props.cleanupProjectId}/documentation?view=menu`,
  };

  return (
    <div
      className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-[820px] flex-col gap-3 overflow-x-hidden px-3 pb-[calc(9rem+env(safe-area-inset-bottom))] pt-3 sm:px-4 sm:pb-[calc(8rem+env(safe-area-inset-bottom))] sm:pt-4 print:block print:max-w-none print:px-0 print:pb-0 print:pt-0"
      style={{ touchAction: "pan-y", overscrollBehaviorX: "none" }}
    >
      <header className="flex items-start justify-between gap-4 print:hidden">
        <div>
          <p className="mb-1 text-xs uppercase tracking-[0.08em] text-slate-500">Prosjektnavn</p>
          <h1 className="text-3xl font-bold">{CLEANUP_MODULE_BRAND}</h1>
        </div>
      </header>
      <RydderenProjectStrip project={props.project} projects={props.projects} basePath={props.basePath} activeView={props.active} />
      <section className="grid grid-cols-2 gap-3 rounded-[20px] bg-white p-4 shadow-[0_16px_40px_rgba(17,24,39,0.10)] print:hidden">
        <Link
          href={moduleLinks.rydderen}
          className={cn(
            "flex min-h-20 items-center justify-center rounded-[18px] px-4 text-base font-bold transition",
            props.active === "documentation" ? "bg-slate-200 text-slate-900" : "bg-blue-700 text-white"
          )}
        >
          {CLEANUP_MODULE_BRAND}
        </Link>
        <Link
          href={moduleLinks.documentation}
          className={cn(
            "flex min-h-20 items-center justify-center rounded-[18px] px-4 text-base font-bold transition",
            props.active === "documentation" ? "bg-blue-700 text-white" : "bg-slate-200 text-slate-900"
          )}
        >
          Dokumentasjon &amp; Bevis
        </Link>
      </section>
      {props.children}
      {props.active === "documentation" ? null : (
        <RydderenBottomNav cleanupProjectId={props.cleanupProjectId} basePath={props.basePath} active={props.active} />
      )}
    </div>
  );
}

export function RydderenProjectPicker(props: {
  projects: CleanupProject[];
  value?: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <select
      className="w-full rounded-lg border bg-white px-3 py-2 text-sm"
      value={props.value || ""}
      onChange={(event) => props.onChange(event.target.value)}
    >
      <option value="">Velg ryddeprosjekt</option>
      {props.projects.map((project) => (
        <option key={project.id} value={project.id}>
          {project.name}
        </option>
      ))}
    </select>
  );
}

export function RydderenCameraCapture(props: { previewUrl?: string | null; onCapture: (file: File | null) => void }) {
  return (
    <Card className="border-dashed">
      <CardContent className="space-y-4 p-4">
        <div className="flex aspect-[4/5] items-center justify-center overflow-hidden rounded-xl bg-slate-100">
          {props.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={props.previewUrl} alt="Forhåndsvisning" className="h-full w-full object-cover" />
          ) : (
            <div className="text-center text-slate-500">
              <Camera className="mx-auto mb-3 h-10 w-10" />
              <p>Kamera først</p>
            </div>
          )}
        </div>
        <label className="block">
          <span className="sr-only">Ta bilde</span>
          <input
            className="hidden"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(event) => props.onCapture(event.target.files?.[0] || null)}
          />
          <span className="inline-flex w-full cursor-pointer items-center justify-center rounded-xl bg-slate-900 px-4 py-4 text-base font-semibold text-white">
            {props.previewUrl ? "Ta nytt bilde" : "Ta bilde"}
          </span>
        </label>
      </CardContent>
    </Card>
  );
}

export function RydderenCategoryStep(props: {
  categories?: string[];
  onSelect: (category: string) => void;
  selected?: string | null;
}) {
  const categories = props.categories || DEFAULT_RYDDEREN_CATEGORIES;
  return (
    <div className="grid grid-cols-2 gap-3">
      {categories.map((category) => (
        <Button
          key={category}
          type="button"
          variant={props.selected === category ? "default" : "outline"}
          className="h-16 whitespace-normal text-base"
          onClick={() => props.onSelect(category)}
        >
          {category}
        </Button>
      ))}
    </div>
  );
}

export function RydderenActionStep(props: { onSelect: (action: "kast" | "selg" | "behold") => void; saving?: boolean }) {
  return (
    <div className="grid gap-3">
      {CLEANUP_ACTIONS.map((action) => (
        <Button
          key={action.value}
          type="button"
          className="h-16 justify-between px-5 text-base"
          variant={action.value === "kast" ? "destructive" : "default"}
          onClick={() => props.onSelect(action.value)}
          disabled={props.saving}
        >
          <span>{action.label}</span>
          <ArrowRight className="h-5 w-5" />
        </Button>
      ))}
    </div>
  );
}

export function RydderenRegisterFlow(props: {
  previewUrl?: string | null;
  projectName?: string | null;
  category?: string | null;
  step: "camera" | "category" | "action";
  saving?: boolean;
  error?: string | null;
  onCapture: (file: File | null) => void;
  onRequestCapture?: () => boolean | Promise<boolean>;
  onCategory: (category: string) => void;
  onAction: (action: "kast" | "selg" | "behold") => void;
  onExitHref: string;
  autoOpenCameraCount?: number;
}) {
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const cameraSectionRef = useRef<HTMLElement | null>(null);
  const categorySectionRef = useRef<HTMLElement | null>(null);
  const categoryButtonsRef = useRef<HTMLDivElement | null>(null);
  const actionSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!props.autoOpenCameraCount || props.step !== "camera") {
      return;
    }
    const timeout = window.setTimeout(() => {
      cameraInputRef.current?.click();
    }, 80);
    return () => window.clearTimeout(timeout);
  }, [props.autoOpenCameraCount, props.step]);

  useEffect(() => {
    if (props.step === "camera") {
      scrollWorkAreaIntoView(cameraSectionRef.current);
      return;
    }
    if (props.step === "category") {
      const extraOffset = typeof window === "undefined" ? 88 : Math.max(88, Math.round(window.innerHeight * 0.28));
      scrollWorkAreaIntoView(categoryButtonsRef.current || categorySectionRef.current, extraOffset);
      return;
    }
    scrollWorkAreaIntoView(actionSectionRef.current);
  }, [props.step]);

  return (
    <div className="space-y-4">
      {props.error ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{props.error}</div> : null}
      {props.step === "camera" ? (
        <section ref={cameraSectionRef} className="rounded-[20px] bg-white p-5 shadow-[0_16px_40px_rgba(17,24,39,0.10)]">
          <div className="mb-5">
            <p className="mb-1 text-xs uppercase tracking-[0.08em] text-slate-500">Registrering</p>
            <h2 className="text-2xl font-bold">Ta bilde av neste objekt</h2>
          </div>
          <div className="rounded-[18px] border border-slate-300 bg-slate-50 p-4">
            <input
              ref={cameraInputRef}
              className="hidden"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(event) => props.onCapture(event.target.files?.[0] || null)}
            />
            <button
              type="button"
              className="flex min-h-16 w-full items-center justify-center rounded-[18px] bg-blue-600 px-4 py-4 text-center text-xl font-bold text-white"
              onClick={async () => {
                const allowed = (await props.onRequestCapture?.()) ?? true;
                if (allowed) {
                  cameraInputRef.current?.click();
                }
              }}
            >
              Ta bilde
            </button>
            <p className="mt-3 text-sm text-slate-500">Bildet lagres i valgt prosjekt.</p>
            {props.projectName ? (
              <p className="mt-2 text-sm text-slate-500">
                Dette registreres i <span className="font-semibold text-slate-700">{props.projectName}</span>.
              </p>
            ) : null}
          </div>
          <div className="mt-4 grid gap-3">
            <Link href={props.onExitHref}>
              <Button variant="outline" className="min-h-16 rounded-[18px] text-base font-bold">
                Avslutt
              </Button>
            </Link>
          </div>
        </section>
      ) : null}

      {props.step === "category" ? (
        <section ref={categorySectionRef} className="overflow-hidden rounded-[20px] bg-white p-5 shadow-[0_16px_40px_rgba(17,24,39,0.10)]">
          <div className="mb-5">
            <p className="mb-1 text-xs uppercase tracking-[0.08em] text-slate-500">Steg 1 av 2</p>
            <h2 className="text-2xl font-bold">Velg kategori</h2>
          </div>
          {props.previewUrl ? (
            <div className="mb-4 overflow-hidden rounded-[18px] border border-slate-300 bg-slate-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={props.previewUrl} alt="Forhåndsvisning av valgt objekt" className="h-40 w-full object-cover" />
            </div>
          ) : null}
          <div ref={categoryButtonsRef} className="grid grid-cols-2 gap-3">
            {DEFAULT_RYDDEREN_CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                className="min-h-16 rounded-[18px] bg-slate-900 px-3 py-4 text-base font-bold text-white active:scale-[0.99]"
                onClick={() => props.onCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-3 pb-2 md:grid-cols-2">
            <button
              type="button"
              className="min-h-16 rounded-[18px] bg-slate-200 px-4 py-3 text-base font-bold text-slate-900"
              onClick={() => props.onCapture(null)}
            >
              Tilbake
            </button>
            <Link href={props.onExitHref}>
              <Button variant="ghost" className="min-h-16 w-full rounded-[18px] text-base font-bold">
                Avslutt
              </Button>
            </Link>
          </div>
        </section>
      ) : null}

      {props.step === "action" ? (
        <section ref={actionSectionRef} className="overflow-hidden rounded-[20px] bg-white p-5 shadow-[0_16px_40px_rgba(17,24,39,0.10)]">
          <div className="mb-5">
            <p className="mb-1 text-xs uppercase tracking-[0.08em] text-slate-500">Steg 2 av 2</p>
            <h2 className="text-2xl font-bold">Velg handling</h2>
          </div>
          {props.category ? (
            <div className="mb-4">
              <span className="inline-flex min-h-[42px] items-center rounded-full bg-blue-100 px-4 py-2 text-sm font-bold text-blue-900">
                {props.category}
              </span>
            </div>
          ) : null}
          {props.saving ? (
            <div className="mb-4 rounded-[18px] border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-900">
              Lagrer objekt og går videre til neste bilde...
            </div>
          ) : null}
          <div className="grid gap-3 md:grid-cols-3">
            {CLEANUP_ACTIONS.map((action) => (
              <button
                key={action.value}
                type="button"
                disabled={props.saving}
                className={cn(
                  "min-h-16 rounded-[18px] px-4 py-4 text-base font-bold text-white active:scale-[0.99]",
                  action.value === "kast" ? "bg-slate-900" : "bg-slate-900"
                )}
                onClick={() => props.onAction(action.value)}
              >
                {props.saving ? "Lagrer..." : action.label}
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-3 pb-2 md:grid-cols-2">
            <button
              type="button"
              className="min-h-16 rounded-[18px] bg-slate-200 px-4 py-3 text-base font-bold text-slate-900"
              onClick={() => props.category && props.onCategory("")}
            >
              Tilbake
            </button>
            <Link href={props.onExitHref}>
              <Button variant="ghost" className="min-h-16 w-full rounded-[18px] text-base font-bold">
                Avslutt
              </Button>
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}

export function RydderenMoreFields(props: {
  comment: string;
  condition: string;
  note: string;
  onChange: (field: "comment" | "condition" | "note", value: string) => void;
}) {
  return (
    <div className="grid gap-3 rounded-xl border p-4">
      <div className="grid gap-2">
        <Label>Kommentar</Label>
        <Textarea value={props.comment} onChange={(event) => props.onChange("comment", event.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label>Tilstand</Label>
        <Input value={props.condition} onChange={(event) => props.onChange("condition", event.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label>Notat</Label>
        <Textarea value={props.note} onChange={(event) => props.onChange("note", event.target.value)} />
      </div>
    </div>
  );
}

export function RydderenValuationCard(props: {
  item: CleanupItem;
  saving?: boolean;
  onNext: (payload: { value: number | null; comment: string; condition: string; note: string }) => void;
  onExitHref: string;
}) {
  const [value, setValue] = useState(props.item.value?.toString() || "");
  const [comment, setComment] = useState(props.item.comment || "");
  const [condition, setCondition] = useState(props.item.condition || "");
  const [note, setNote] = useState(props.item.note || "");
  const [showMore, setShowMore] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setValue(props.item.value?.toString() || "");
    setComment(props.item.comment || "");
    setCondition(props.item.condition || "");
    setNote(props.item.note || "");
    setShowMore(false);
  }, [props.item]);

  useEffect(() => {
    scrollWorkAreaIntoView(cardRef.current);
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [props.item.id]);

  return (
    <Card ref={cardRef} className="rounded-[20px] border bg-slate-50 shadow-none">
      <CardHeader className="space-y-2">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Verdisetting</p>
          <CardTitle>Objekter uten verdi</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {props.item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={props.item.imageUrl} alt={`Objekt ${props.item.itemNumber}`} className="max-h-[320px] w-full rounded-[14px] object-cover" />
        ) : null}
        <div className="grid gap-2 text-sm text-slate-500">
          <span className="inline-flex w-fit min-h-[42px] items-center rounded-full bg-blue-100 px-4 py-2 font-bold text-blue-900">
            {formatCleanupObjectLabel(props.item.itemNumber)}
          </span>
          <p>Kategori: {props.item.category}</p>
          <p>Handling: {props.item.action}</p>
          <p>Dato: {formatDate(props.item.createdAt)}</p>
        </div>
        <div className="grid gap-2">
          <Label>Pris</Label>
          <Input
            ref={inputRef}
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            placeholder="Pris"
            className="min-h-14 rounded-2xl text-2xl font-bold"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </div>
        {showMore ? (
          <RydderenMoreFields
            comment={comment}
            condition={condition}
            note={note}
            onChange={(field, nextValue) => {
              if (field === "comment") setComment(nextValue);
              if (field === "condition") setCondition(nextValue);
              if (field === "note") setNote(nextValue);
            }}
          />
        ) : null}
        <div className="grid gap-3 md:grid-cols-3">
          <Button
            type="button"
            className="min-h-16 rounded-[18px] text-base font-bold"
            disabled={props.saving}
            onClick={() =>
              props.onNext({
                value: value ? Number(value) : null,
                comment,
                condition,
                note,
              })
            }
          >
            {props.saving ? "Lagrer..." : "Neste"}
          </Button>
          <Button type="button" variant="outline" className="min-h-16 rounded-[18px] text-base font-bold" onClick={() => setShowMore((current) => !current)}>
            Mer
          </Button>
          <Link href={props.onExitHref}>
            <Button variant="ghost" className="min-h-16 w-full rounded-[18px] text-base font-bold">
              Avslutt
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export function RydderenValuationQueue(props: {
  items: CleanupItem[];
  currentItem: CleanupItem | null;
  saving?: boolean;
  onNext: (payload: { value: number | null; comment: string; condition: string; note: string }) => void;
  onExitHref: string;
}) {
  if (!props.currentItem) {
    return (
      <Card className="rounded-[20px] border bg-slate-50 shadow-none">
        <CardContent className="p-6 text-sm text-muted-foreground">Ingen objekter uten verdi i valgt prosjekt.</CardContent>
      </Card>
    );
  }

  return <RydderenValuationCard item={props.currentItem} saving={props.saving} onNext={props.onNext} onExitHref={props.onExitHref} />;
}

export function RydderenStatsCards(props: {
  report: Pick<CleanupReportSummary, "castCount" | "sellCount" | "keepCount" | "totalItems">;
}) {
  const stats = [
    { label: "Kast", value: props.report.castCount.toString() },
    { label: "Selg", value: props.report.sellCount.toString() },
    { label: "Behold", value: props.report.keepCount.toString() },
    { label: "Totalt", value: props.report.totalItems.toString() },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="rounded-2xl border bg-slate-50 shadow-none">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">{stat.label}</div>
            <div className="mt-1 text-3xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function RydderenItemCard({ item }: { item: CleanupItem }) {
  return (
    <Card className="rounded-[18px] border bg-slate-50 print:break-inside-avoid">
      <CardContent className="grid gap-3 p-3 md:grid-cols-[112px_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-[14px] bg-slate-200">
          {item.imageThumbnailUrl || item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.imageThumbnailUrl || item.imageUrl || ""} alt={`Objekt ${item.itemNumber}`} className="h-28 w-28 object-cover" />
          ) : (
            <div className="flex h-28 items-center justify-center text-slate-400">Ingen bilde</div>
          )}
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <div className="font-semibold">{formatCleanupObjectLabel(item.itemNumber)}</div>
            <Badge variant="outline">{formatCleanupActionLabel(item.action)}</Badge>
          </div>
          <div className="text-sm text-muted-foreground">{item.category}</div>
          <div className="text-sm text-muted-foreground">Dato: {formatDate(item.createdAt)}</div>
          <div className="text-sm">{item.value === null ? "Verdi mangler" : `Verdi: ${formatCurrency(item.value)}`}</div>
          {item.comment ? <div className="text-sm text-muted-foreground">Kommentar: {item.comment}</div> : null}
          {item.condition ? <div className="text-sm text-muted-foreground">Tilstand: {item.condition}</div> : null}
          {item.note ? <div className="text-sm text-muted-foreground">Notat: {item.note}</div> : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function RydderenItemsList(props: { items: CleanupItem[] }) {
  return (
    <div className="grid gap-3">
      {props.items.length ? props.items.map((item) => <RydderenItemCard key={item.id} item={item} />) : <Card><CardContent className="p-6 text-sm text-muted-foreground">Ingen objekter ennå.</CardContent></Card>}
    </div>
  );
}

export function RydderenProjectManager(props: {
  projects: CleanupProject[];
  activeProjectId: string;
  creating?: boolean;
  deletingId?: string | null;
  onCreate: (name: string) => void;
  onDelete?: (projectId: string) => void;
}) {
  const [name, setName] = useState("");

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <Input
          className="min-h-14 rounded-2xl"
          type="text"
          autoComplete="off"
          placeholder="Nytt prosjekt"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          className="min-h-14 rounded-[18px] px-6 text-base font-bold"
          disabled={props.creating || !name.trim()}
          onClick={() => {
            props.onCreate(name);
            setName("");
          }}
        >
          Legg til
        </Button>
      </div>
      <div className="grid gap-3">
        {props.projects.map((project) => (
          <div key={project.id} className="flex items-center justify-between gap-3 rounded-[14px] border bg-white px-4 py-3">
            <div className="min-w-0">
              <div className="font-semibold">{project.name}</div>
              <div className="text-sm text-muted-foreground">{project.id === props.activeProjectId ? "Aktivt prosjekt" : "Prosjekt"}</div>
            </div>
            {props.onDelete ? (
              <Button
                type="button"
                variant="ghost"
                className="min-h-11 rounded-[14px] bg-red-100 px-4 font-bold text-red-700 hover:bg-red-200 hover:text-red-800"
                disabled={props.deletingId === project.id}
                onClick={() => props.onDelete?.(project.id)}
              >
                Slett
              </Button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export function RydderenCostList(props: { costs: CleanupCost[] }) {
  return (
    <div className="grid gap-3">
      {props.costs.length ? (
        props.costs.map((cost) => (
          <div key={cost.id} className="flex items-center justify-between gap-3 rounded-[14px] border bg-white px-4 py-3 text-sm">
            <div>
              <div className="font-semibold">
                {CLEANUP_COST_TYPES.find((type) => type.value === cost.costType)?.label || cost.costType}
              </div>
              <div className="text-muted-foreground">{formatDate(cost.createdAt)}</div>
            </div>
            <div className="font-semibold">{formatCurrency(cost.amount)}</div>
          </div>
        ))
      ) : null}
    </div>
  );
}

export function RydderenCostForm(props: { saving?: boolean; onSubmit: (payload: { costType: string; amount: number; description: string }) => void }) {
  const [costType, setCostType] = useState("container");
  const [amount, setAmount] = useState("");

  return (
    <div className="grid gap-3">
      <select className="min-h-14 rounded-2xl border bg-white px-4 py-3 text-base" value={costType} onChange={(event) => setCostType(event.target.value)}>
        {CLEANUP_COST_TYPES.map((type) => (
          <option key={type.value} value={type.value}>
            {type.label}
          </option>
        ))}
      </select>
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <Input type="number" inputMode="numeric" min="0" step="1" placeholder="Beløp" value={amount} onChange={(event) => setAmount(event.target.value)} className="min-h-14 rounded-2xl" />
        <Button
          type="button"
          variant="outline"
          className="min-h-14 rounded-[18px] px-6 text-base font-bold"
          disabled={props.saving || !amount}
          onClick={() => {
            props.onSubmit({ costType, amount: Number(amount), description: "" });
            setAmount("");
          }}
        >
          Legg til
        </Button>
      </div>
    </div>
  );
}

export function RydderenReportView({ report }: { report: CleanupReportSummary }) {
  return (
    <div className="space-y-6 print:space-y-4">
      <div className="flex items-start justify-between gap-4 print:gap-2">
        <div>
          <h2 className="text-xl font-bold">{CLEANUP_MODULE_BRAND} rapport</h2>
          <p className="text-sm text-muted-foreground">
            {report.project.name} • {formatDate(report.generatedAt)}
          </p>
        </div>
        <Button type="button" variant="outline" className="print:hidden" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Print / PDF
        </Button>
      </div>
      <RydderenStatsCards report={report} />
      <div className="grid gap-3 md:grid-cols-2 print:grid-cols-2">
        <Card className="print:break-inside-avoid">
          <CardHeader>
            <CardTitle>Oppsummering</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <div>Antall kast: {report.castCount}</div>
            <div>Antall selg: {report.sellCount}</div>
            <div>Antall behold: {report.keepCount}</div>
            <div>Total salgsverdi: {formatCurrency(report.totalSellValue)}</div>
            <div>Total kastet verdi: {formatCurrency(report.totalCastValue)}</div>
            <div>Total beholdt verdi: {formatCurrency(report.totalKeepValue)}</div>
          </CardContent>
        </Card>
        <div className="print:break-inside-avoid">
          <RydderenCostList costs={report.costs} />
        </div>
      </div>
      <RydderenItemsList items={report.items} />
    </div>
  );
}

export function RydderenPrintLayout(props: { children: React.ReactNode }) {
  return <div className="space-y-6 print:max-w-none print:space-y-4 print:px-0">{props.children}</div>;
}

export function RydderenProjectLinkSelector(props: {
  contextType: CleanupProjectContextType;
  contextId: string;
  options: CleanupContextOption[];
  onContextTypeChange: (value: CleanupProjectContextType) => void;
  onContextIdChange: (value: string) => void;
}) {
  const availableContextTypes = CLEANUP_CONTEXT_TYPES.filter((type) => type.value !== "case");
  const contextLabel = props.contextType === "property" ? "eiendom" : "prosjekt";

  return (
    <div className="grid gap-3">
      <div className="space-y-1">
        <Label>Kobling</Label>
        <p className="text-sm text-muted-foreground">Valgfritt. La prosjektet være frittstående hvis det ikke skal knyttes til noe.</p>
      </div>
      <select
        className="rounded-lg border bg-white px-3 py-2 text-sm"
        value={props.contextType}
        onChange={(event) => props.onContextTypeChange(event.target.value as CleanupProjectContextType)}
      >
        {availableContextTypes.map((type) => (
          <option key={type.value} value={type.value}>
            {type.value === "standalone" ? "Ingen kobling" : `Knytt til ${type.label.toLowerCase()}`}
          </option>
        ))}
      </select>
      {props.contextType !== "standalone" ? (
        <select className="rounded-lg border bg-white px-3 py-2 text-sm" value={props.contextId} onChange={(event) => props.onContextIdChange(event.target.value)}>
          <option value="">{`Velg ${contextLabel}`}</option>
          {props.options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-muted-foreground">Prosjektet opprettes som frittstående.</div>
      )}
    </div>
  );
}

export function RydderenProjectCreateDialog(props: {
  open: boolean;
  creating?: boolean;
  error?: string | null;
  initialContextType?: CleanupProjectContextType;
  initialContextId?: string | null;
  propertyOptions: CleanupContextOption[];
  projectOptions: CleanupContextOption[];
  onClose: () => void;
  onCreate: (input: CleanupProjectCreateInput) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [contextType, setContextType] = useState<CleanupProjectContextType>(props.initialContextType || "standalone");
  const [contextId, setContextId] = useState(props.initialContextId || "");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (props.open) {
      setName("");
      setDescription("");
      setContextType(props.initialContextType || "standalone");
      setContextId(props.initialContextId || "");
      setLocalError(null);
    }
  }, [props.initialContextId, props.initialContextType, props.open]);

  if (!props.open) return null;

  const options = contextType === "property" ? props.propertyOptions : contextType === "project" ? props.projectOptions : [];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 p-4">
      <div className="mx-auto max-w-lg rounded-2xl bg-white p-4 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Nytt ryddeprosjekt</h3>
          <Button variant="ghost" size="icon" onClick={props.onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid gap-3">
          <Input placeholder="Prosjektnavn" value={name} onChange={(event) => setName(event.target.value)} />
          <Textarea placeholder="Kort beskrivelse" value={description} onChange={(event) => setDescription(event.target.value)} />
          <RydderenProjectLinkSelector
            contextType={contextType}
            contextId={contextId}
            options={options}
            onContextTypeChange={(value) => {
              setContextType(value);
              setContextId(value === "standalone" ? "" : props.initialContextType === value ? props.initialContextId || "" : "");
              setLocalError(null);
            }}
            onContextIdChange={setContextId}
          />
          {localError || props.error ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{localError || props.error}</div> : null}
          <Button
            disabled={props.creating || !name}
            onClick={() => {
              if (contextType !== "standalone" && !contextId) {
                setLocalError("Velg en faktisk kobling, eller sett denne til Ingen kobling.");
                return;
              }
              setLocalError(null);
              void props.onCreate({
                name,
                description,
                contextType,
                contextId: contextType === "standalone" ? null : contextId || null,
              });
            }}
          >
            {props.creating ? "Oppretter..." : "Opprett prosjekt"}
          </Button>
        </div>
      </div>
    </div>
  );
}
