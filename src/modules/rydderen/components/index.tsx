"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Camera, FolderKanban, Printer, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  formatCurrency,
  formatDate,
} from "@/src/modules/rydderen/utils";

export function RydderenHeader(props: {
  title: string;
  description?: string | null;
  project?: CleanupProject | null;
  basePath: string;
  active?: "overview" | "register" | "valuation" | "report";
}) {
  const tabs = props.project
    ? [
        { key: "overview", label: "Oversikt", href: `${props.basePath}/projects/${props.project.id}` },
        { key: "register", label: "Registrer", href: `${props.basePath}/projects/${props.project.id}/register` },
        { key: "valuation", label: "Verdisetting", href: `${props.basePath}/projects/${props.project.id}/valuation` },
        { key: "report", label: "Rapport", href: `${props.basePath}/projects/${props.project.id}/report` },
      ]
    : [];

  return (
    <div className="space-y-4">
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
  category?: string | null;
  step: "camera" | "category" | "action";
  saving?: boolean;
  error?: string | null;
  lastSavedItem?: CleanupItem | null;
  onCapture: (file: File | null) => void;
  onCategory: (category: string) => void;
  onAction: (action: "kast" | "selg" | "behold") => void;
  onExitHref: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className={cn("rounded-full px-3 py-1", props.step === "camera" ? "bg-slate-900 text-white" : "bg-slate-100")}>
            1. Bilde
          </span>
          <span className={cn("rounded-full px-3 py-1", props.step === "category" ? "bg-slate-900 text-white" : "bg-slate-100")}>
            2. Kategori
          </span>
          <span className={cn("rounded-full px-3 py-1", props.step === "action" ? "bg-slate-900 text-white" : "bg-slate-100")}>
            3. Handling
          </span>
        </div>
        <Link href={props.onExitHref}>
          <Button variant="ghost">Avslutt</Button>
        </Link>
      </div>
      {props.lastSavedItem ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          Lagret objekt #{props.lastSavedItem.itemNumber} ({props.lastSavedItem.category})
        </div>
      ) : null}
      {props.error ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{props.error}</div> : null}
      {props.step === "camera" ? <RydderenCameraCapture previewUrl={props.previewUrl} onCapture={props.onCapture} /> : null}

      {props.step !== "camera" ? (
        <Card className="overflow-hidden">
          <CardContent className="space-y-4 p-4">
            <div className="overflow-hidden rounded-2xl bg-slate-100">
              {props.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={props.previewUrl} alt="Forhåndsvisning" className="aspect-[4/5] w-full object-cover" />
              ) : (
                <div className="flex aspect-[4/5] items-center justify-center text-sm text-muted-foreground">Mangler bilde</div>
              )}
            </div>
            <label className="block">
              <span className="sr-only">Ta nytt bilde</span>
              <input
                className="hidden"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(event) => props.onCapture(event.target.files?.[0] || null)}
              />
              <span className="inline-flex w-full cursor-pointer items-center justify-center rounded-xl border px-4 py-3 text-sm font-medium">
                Ta nytt bilde
              </span>
            </label>
          </CardContent>
        </Card>
      ) : null}

      {props.step === "category" ? <RydderenCategoryStep selected={props.category} onSelect={props.onCategory} /> : null}
      {props.step === "action" ? (
        <div className="space-y-3">
          {props.category ? (
            <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-medium">Kategori: {props.category}</div>
          ) : null}
          <RydderenActionStep onSelect={props.onAction} saving={props.saving} />
        </div>
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

  useEffect(() => {
    setValue(props.item.value?.toString() || "");
    setComment(props.item.comment || "");
    setCondition(props.item.condition || "");
    setNote(props.item.note || "");
    setShowMore(false);
  }, [props.item]);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [props.item.id]);

  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Objekt #{props.item.itemNumber}</CardTitle>
            <CardDescription>
              {props.item.category} • {props.item.action}
            </CardDescription>
          </div>
          <Link href={props.onExitHref}>
            <Button variant="ghost">Avslutt</Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {props.item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={props.item.imageUrl} alt={`Objekt ${props.item.itemNumber}`} className="aspect-square w-full rounded-xl object-cover" />
        ) : null}
        <div className="grid gap-2">
          <Label>Verdi</Label>
          <Input
            ref={inputRef}
            type="number"
            inputMode="numeric"
            placeholder="0"
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
        <div className="sticky bottom-0 grid grid-cols-3 gap-3 bg-white pt-2">
          <Button type="button" variant="outline" onClick={() => setShowMore((current) => !current)}>
            Mer
          </Button>
          <Button
            type="button"
            className="col-span-2"
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
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
      <div className="space-y-3">
        {props.items.map((item) => (
          <div
            key={item.id}
            className={`rounded-xl border p-3 text-sm ${props.currentItem?.id === item.id ? "border-slate-900 bg-slate-50" : ""}`}
          >
            <div className="font-semibold">#{item.itemNumber}</div>
            <div className="text-muted-foreground">
              {item.category} • {item.action}
            </div>
            <div className="text-muted-foreground">{item.value === null ? "Uten verdi" : formatCurrency(item.value)}</div>
          </div>
        ))}
      </div>
      <div>{props.currentItem ? <RydderenValuationCard item={props.currentItem} saving={props.saving} onNext={props.onNext} onExitHref={props.onExitHref} /> : <Card><CardContent className="p-6 text-sm text-muted-foreground">Ingen flere objekter i kø.</CardContent></Card>}</div>
    </div>
  );
}

export function RydderenStatsCards(props: { report: CleanupReportSummary }) {
  const stats = [
    { label: "Objekter", value: props.report.totalItems.toString() },
    { label: "Uten verdi", value: props.report.unvaluedItems.toString() },
    { label: "Total verdi", value: formatCurrency(props.report.totalValue) },
    { label: "Kostnader", value: formatCurrency(props.report.projectCosts) },
    { label: "Netto", value: formatCurrency(props.report.netValue) },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardHeader className="pb-2">
            <CardDescription>{stat.label}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function RydderenItemCard({ item }: { item: CleanupItem }) {
  return (
    <Card className="print:break-inside-avoid">
      <CardContent className="grid gap-3 p-4 md:grid-cols-[120px_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-xl bg-slate-100">
          {item.imageThumbnailUrl || item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.imageThumbnailUrl || item.imageUrl || ""} alt={`Objekt ${item.itemNumber}`} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-28 items-center justify-center text-slate-400">Ingen bilde</div>
          )}
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <div className="font-semibold">Objekt #{item.itemNumber}</div>
            <Badge variant="outline">{item.action}</Badge>
          </div>
          <div className="text-sm text-muted-foreground">{item.category}</div>
          <div className="text-sm">{item.value === null ? "Ikke verdisatt" : formatCurrency(item.value)}</div>
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

export function RydderenCostList(props: { costs: CleanupCost[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Kostnader</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {props.costs.length ? (
          props.costs.map((cost) => (
            <div key={cost.id} className="flex items-center justify-between rounded-xl border p-3 text-sm">
              <div>
                <div className="font-medium">{cost.costType}</div>
                <div className="text-muted-foreground">{cost.description || formatDate(cost.incurredAt)}</div>
              </div>
              <div className="font-semibold">{formatCurrency(cost.amount)}</div>
            </div>
          ))
        ) : (
          <div className="text-sm text-muted-foreground">Ingen kostnader registrert.</div>
        )}
      </CardContent>
    </Card>
  );
}

export function RydderenCostForm(props: { saving?: boolean; onSubmit: (payload: { costType: string; amount: number; description: string }) => void }) {
  const [costType, setCostType] = useState("container");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Legg til kostnad</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <select className="rounded-lg border bg-white px-3 py-2 text-sm" value={costType} onChange={(event) => setCostType(event.target.value)}>
          {CLEANUP_COST_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        <Input type="number" inputMode="decimal" placeholder="Beløp i NOK" value={amount} onChange={(event) => setAmount(event.target.value)} />
        <Input placeholder="Beskrivelse" value={description} onChange={(event) => setDescription(event.target.value)} />
        <Button
          type="button"
          disabled={props.saving || !amount}
          onClick={() => {
            props.onSubmit({ costType, amount: Number(amount), description });
            setAmount("");
            setDescription("");
          }}
        >
          {props.saving ? "Lagrer..." : "Legg til kostnad"}
        </Button>
      </CardContent>
    </Card>
  );
}

export function RydderenReportView({ report }: { report: CleanupReportSummary }) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">{CLEANUP_MODULE_BRAND} rapport</h2>
          <p className="text-sm text-muted-foreground">
            {report.project.name} • {formatDate(report.generatedAt)}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Print / PDF
        </Button>
      </div>
      <RydderenStatsCards report={report} />
      <div className="grid gap-3 md:grid-cols-2">
        <Card>
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
        <RydderenCostList costs={report.costs} />
      </div>
      <RydderenItemsList items={report.items} />
    </div>
  );
}

export function RydderenPrintLayout(props: { children: React.ReactNode }) {
  return <div className="space-y-6 print:max-w-none">{props.children}</div>;
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
