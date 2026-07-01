"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Camera, FileArchive, FileText, Image as ImageIcon, Search, Upload, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CleanupEvidenceEntry, CleanupEvidenceMap, CleanupProject } from "@/src/modules/rydderen/types";
import {
  buildCleanupZones,
  CLEANUP_DOCUMENTATION_CATEGORIES,
  CLEANUP_DOCUMENTATION_RISK_OPTIONS,
  CLEANUP_DOCUMENTATION_TYPES,
  formatDate,
  formatTime,
  getHiddenCleanupEvidenceImages,
  getCleanupDocumentationTypeConfig,
  getVisibleCleanupEvidenceImageCount,
  getVisibleCleanupEvidenceImages,
  isCleanupEvidenceEntryHidden,
} from "@/src/modules/rydderen/utils";

export type CleanupDocumentationDraftImage = {
  file: File;
  imageHash: string;
  previewUrl: string;
};

export type CleanupDocumentationView = "menu" | "entry" | "map" | "report";

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function DocumentationImageFrame(props: {
  src?: string | null;
  alt: string;
  className?: string;
  imageClassName?: string;
  emptyIconClassName?: string;
  chrome?: "default" | "compact" | "none";
}) {
  const outerClassName =
    props.chrome === "none"
      ? "overflow-hidden bg-white"
      : props.chrome === "compact"
        ? "overflow-hidden rounded-[3mm] border border-slate-200 bg-white p-0.5"
        : "overflow-hidden rounded-[5mm] border border-slate-200 bg-slate-100 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]";
  const innerClassName =
    props.chrome === "none"
      ? "flex h-full w-full items-center justify-center overflow-hidden bg-white"
      : props.chrome === "compact"
        ? "flex h-full w-full items-center justify-center overflow-hidden rounded-[2.4mm] bg-white"
        : "flex h-full w-full items-center justify-center overflow-hidden rounded-[4mm] bg-white";

  return (
    <div className={`${outerClassName} ${props.className || ""}`}>
      <div className={innerClassName}>
        {props.src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={props.src} alt={props.alt} className={props.imageClassName || "h-full w-full object-contain"} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-400">
            <ImageIcon className={props.emptyIconClassName || "h-8 w-8"} />
          </div>
        )}
      </div>
    </div>
  );
}

export function RydderenDocumentationMenu(props: {
  onSelectEntryType: (entryType: string) => void;
  onOpenMap: () => void;
  onOpenReport: () => void;
}) {
  return (
    <section className="space-y-4 rounded-[20px] bg-white p-5 shadow-[0_16px_40px_rgba(17,24,39,0.10)]">
      <div>
        <p className="mb-1 text-xs uppercase tracking-[0.08em] text-slate-500">Dokumentasjon forst</p>
        <h2 className="text-2xl font-bold">Dokumentasjon & Bevis</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {CLEANUP_DOCUMENTATION_TYPES.map((type) => (
          <button
            key={type.id}
            type="button"
            className="min-h-20 rounded-[18px] bg-slate-900 px-4 py-4 text-left text-base font-bold text-white"
            onClick={() => props.onSelectEntryType(type.id)}
          >
            {type.label}
          </button>
        ))}
        <button
          type="button"
          className="min-h-20 rounded-[18px] border border-slate-300 bg-slate-100 px-4 py-4 text-left text-base font-bold text-slate-900"
          onClick={props.onOpenMap}
        >
          Kartlegging
        </button>
        <button
          type="button"
          className="min-h-20 rounded-[18px] border border-slate-300 bg-slate-100 px-4 py-4 text-left text-base font-bold text-slate-900"
          onClick={props.onOpenReport}
        >
          Rapportoversikt
        </button>
      </div>
      <p className="text-sm text-slate-500">Ta bilde, skriv to ord, lagre. Alt annet er frivillig ekstra.</p>
    </section>
  );
}

export function RydderenDocumentationEntryForm(props: {
  entryType: string;
  nextEntryNumber: string;
  timestampLabel: string;
  images: CleanupDocumentationDraftImage[];
  category: string;
  description: string;
  zone: string;
  comment: string;
  count: string;
  risk: string;
  moreOpen: boolean;
  saving?: boolean;
  preparingImages?: boolean;
  error?: string | null;
  gpsStatus?: string | null;
  zoneOptions: string[];
  onBack: () => void;
  onToggleMore: () => void;
  onRequestCamera: () => void;
  onRequestGallery: () => void;
  onRemoveImage: (index: number) => void;
  onChange: (field: "category" | "description" | "zone" | "comment" | "count" | "risk", value: string) => void;
  onSave: () => void;
}) {
  const descriptionRef = useRef<HTMLInputElement | null>(null);
  const typeConfig = getCleanupDocumentationTypeConfig(props.entryType);

  return (
    <section className="space-y-4 rounded-[20px] bg-white p-5 shadow-[0_16px_40px_rgba(17,24,39,0.10)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-xs uppercase tracking-[0.08em] text-slate-500">{typeConfig.label}</p>
          <h2 className="text-2xl font-bold">Registrer bevis</h2>
        </div>
        <Button variant="ghost" className="rounded-[18px]" onClick={props.onBack}>
          Avslutt
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge className="rounded-full bg-blue-100 px-4 py-2 text-blue-900 hover:bg-blue-100">{props.nextEntryNumber}</Badge>
        <Badge variant="outline" className="rounded-full px-4 py-2">{props.timestampLabel}</Badge>
      </div>

      {props.error ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{props.error}</div> : null}
      {props.preparingImages ? <div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-700">Klargjør bilder for raskere opplasting ...</div> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Button type="button" className="min-h-16 rounded-[18px] text-base font-bold" onClick={props.onRequestCamera} disabled={props.preparingImages}>
          <Camera className="mr-2 h-5 w-5" />
          Kamera
        </Button>
        <Button type="button" variant="outline" className="min-h-16 rounded-[18px] text-base font-bold" onClick={props.onRequestGallery} disabled={props.preparingImages}>
          <Upload className="mr-2 h-5 w-5" />
          Galleri
        </Button>
      </div>

      {props.images.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {props.images.map((image, index) => (
            <div key={`${image.imageHash}-${index}`} className="relative overflow-hidden rounded-[18px] border border-slate-300 bg-slate-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.previewUrl} alt={`Bilde ${index + 1}`} className="h-28 w-full object-cover" />
              <button
                type="button"
                className="absolute right-2 top-2 rounded-full bg-white/90 p-1 text-slate-900"
                onClick={() => props.onRemoveImage(index)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <label className="grid gap-2">
          <span className="text-sm font-medium">Kategori</span>
          <select
            className="min-h-14 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base"
            value={props.category}
            onChange={(event) => props.onChange("category", event.target.value)}
          >
            {CLEANUP_DOCUMENTATION_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 md:col-span-2">
          <span className="text-sm font-medium">Beskrivelse</span>
          <Input
            ref={descriptionRef}
            className="min-h-14 rounded-2xl"
            value={props.description}
            onChange={(event) => props.onChange("description", event.target.value)}
            placeholder="Kort beskrivelse"
            autoComplete="off"
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium">Sone</span>
          <Input list="rydderen-doc-zones" className="min-h-14 rounded-2xl" value={props.zone} onChange={(event) => props.onChange("zone", event.target.value)} />
          <datalist id="rydderen-doc-zones">
            {props.zoneOptions.map((zone) => (
              <option key={zone} value={zone} />
            ))}
          </datalist>
        </label>
      </div>

      {props.moreOpen ? (
        <div className="grid gap-3 rounded-[18px] border border-slate-200 bg-slate-50 p-4">
          <label className="grid gap-2">
            <span className="text-sm font-medium">Kommentar</span>
            <Textarea value={props.comment} onChange={(event) => props.onChange("comment", event.target.value)} rows={3} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium">Antall</span>
              <Input type="number" inputMode="numeric" min="1" step="1" value={props.count} onChange={(event) => props.onChange("count", event.target.value)} />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium">Risikovurdering</span>
              <select
                className="min-h-14 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base"
                value={props.risk}
                onChange={(event) => props.onChange("risk", event.target.value)}
              >
                {CLEANUP_DOCUMENTATION_RISK_OPTIONS.map((risk) => (
                  <option key={risk} value={risk}>
                    {risk}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      ) : null}

      <p className="text-sm text-slate-500">{props.gpsStatus || "GPS lagres hvis tilgjengelig. Ellers lagres funnet uten GPS."}</p>

      <div className="grid gap-3 md:grid-cols-3">
        <Button type="button" className="min-h-16 rounded-[18px] text-base font-bold" disabled={props.saving || props.preparingImages} onClick={props.onSave}>
          {props.preparingImages ? "Klargjør bilder..." : props.saving ? "Lagrer..." : "Lagre"}
        </Button>
        <Button type="button" variant="outline" className="min-h-16 rounded-[18px] text-base font-bold" onClick={props.onToggleMore}>
          Mer
        </Button>
        <Button type="button" variant="ghost" className="min-h-16 rounded-[18px] text-base font-bold" onClick={props.onBack}>
          Avslutt
        </Button>
      </div>
    </section>
  );
}

export function RydderenDocumentationMapForm(props: {
  map: CleanupEvidenceMap | null;
  entries: CleanupEvidenceEntry[];
  saving?: boolean;
  onBack: () => void;
  onSave: (payload: { rows: number; columns: number; zones: string[]; sketch: string; caseName: string; address: string }) => void;
  onSelectZone: (zone: string) => void;
}) {
  const rows = props.map?.rows || 3;
  const columns = props.map?.columns || 3;
  const zones = props.map?.zones?.length ? props.map.zones : buildCleanupZones(rows, columns);
  const counts = useMemo(() => {
    return props.entries.reduce<Record<string, number>>((result, entry) => {
      if (entry.zone) {
        result[entry.zone] = (result[entry.zone] || 0) + 1;
      }
      return result;
    }, {});
  }, [props.entries]);

  return (
    <Card className="rounded-[20px] border bg-white shadow-[0_16px_40px_rgba(17,24,39,0.10)]">
      <CardHeader className="space-y-1">
        <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Kartleggingsmodus</p>
        <CardTitle>Soner og skisse</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-medium">Saksnavn</span>
            <Input defaultValue={props.map?.caseName || ""} id="rydderen-doc-caseName" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium">Adresse</span>
            <Input defaultValue={props.map?.address || ""} id="rydderen-doc-address" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium">Rader</span>
            <Input defaultValue={String(rows)} type="number" min="1" max="8" id="rydderen-doc-rows" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium">Kolonner</span>
            <Input defaultValue={String(columns)} type="number" min="1" max="8" id="rydderen-doc-columns" />
          </label>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {zones.map((zone) => (
            <button
              key={zone}
              type="button"
              className="grid min-h-20 rounded-[18px] border border-slate-300 bg-slate-50 px-3 py-4 text-left"
              onClick={() => props.onSelectZone(zone)}
            >
              <span className="text-lg font-bold">{zone}</span>
              <span className="text-sm text-slate-500">{counts[zone] || 0} funn</span>
            </button>
          ))}
        </div>

        <label className="grid gap-2">
          <span className="text-sm font-medium">Skisse / notat</span>
          <Textarea defaultValue={props.map?.sketch || ""} id="rydderen-doc-sketch" rows={6} placeholder="Dor, sluk, vegg, ror, malepunkt ..." />
        </label>

        <div className="grid gap-3 md:grid-cols-2">
          <Button
            type="button"
            className="min-h-16 rounded-[18px] text-base font-bold"
            disabled={props.saving}
            onClick={() => {
              const nextRows = Number((document.getElementById("rydderen-doc-rows") as HTMLInputElement | null)?.value || rows) || rows;
              const nextColumns = Number((document.getElementById("rydderen-doc-columns") as HTMLInputElement | null)?.value || columns) || columns;
              props.onSave({
                rows: nextRows,
                columns: nextColumns,
                zones: buildCleanupZones(nextRows, nextColumns),
                sketch: (document.getElementById("rydderen-doc-sketch") as HTMLTextAreaElement | null)?.value || "",
                caseName: (document.getElementById("rydderen-doc-caseName") as HTMLInputElement | null)?.value || "",
                address: (document.getElementById("rydderen-doc-address") as HTMLInputElement | null)?.value || "",
              });
            }}
          >
            {props.saving ? "Lagrer..." : "Lagre kartlegging"}
          </Button>
          <Button type="button" variant="ghost" className="min-h-16 rounded-[18px] text-base font-bold" onClick={props.onBack}>
            Avslutt
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DocumentationEntryScreenCard(props: {
  entry: CleanupEvidenceEntry;
  saving?: boolean;
  onSave: (entryId: string, payload: {
    category: string;
    zone: string;
    description: string;
    comment: string;
    risk: string;
    count: number;
    createdDate: string;
    createdTime: string;
  }) => void;
  onToggleEntryVisibility: (entry: CleanupEvidenceEntry, hidden: boolean) => void;
  onAddImages: (entryId: string, files: FileList | null) => void;
  onToggleImageVisibility: (entry: CleanupEvidenceEntry, imageId: string, hidden: boolean) => void;
}) {
  const type = getCleanupDocumentationTypeConfig(props.entry.entryType);
  const [editing, setEditing] = useState(false);
  const [showHiddenImages, setShowHiddenImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState({
    category: props.entry.category || "",
    zone: props.entry.zone || "",
    description: props.entry.description || "",
    comment: props.entry.comment || "",
    risk: props.entry.risk || "Middels",
    count: props.entry.count || 1,
    createdDate: props.entry.createdDate || "",
    createdTime: props.entry.createdTime || "",
  });
  const visibleImages = useMemo(() => getVisibleCleanupEvidenceImages(props.entry), [props.entry]);
  const hiddenImages = useMemo(() => getHiddenCleanupEvidenceImages(props.entry), [props.entry]);
  const isHidden = isCleanupEvidenceEntryHidden(props.entry);

  useEffect(() => {
    setForm({
      category: props.entry.category || "",
      zone: props.entry.zone || "",
      description: props.entry.description || "",
      comment: props.entry.comment || "",
      risk: props.entry.risk || "Middels",
      count: props.entry.count || 1,
      createdDate: props.entry.createdDate || "",
      createdTime: props.entry.createdTime || "",
    });
  }, [props.entry]);

  return (
    <Card className={`rounded-[18px] border bg-slate-50 ${isHidden ? "opacity-70" : ""}`}>
      <CardContent className="space-y-3 p-4">
        <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
          <DocumentationImageFrame
            src={visibleImages[0]?.imageUrl || visibleImages[0]?.thumbnailUrl || ""}
            alt={props.entry.entryNumber}
            className="h-52 rounded-[14px] p-2"
            imageClassName="h-full w-full object-contain"
            emptyIconClassName="h-10 w-10"
          />
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-lg font-bold">{props.entry.entryNumber}</div>
              <Badge variant="outline">{type.shortLabel}</Badge>
              {isHidden ? <Badge variant="secondary">Skjult fra rapport</Badge> : null}
            </div>
            <p className="text-sm text-slate-500">
              {props.entry.category || "-"} • Sone {props.entry.zone || "-"}
            </p>
            <p className="text-sm text-slate-500">
              {props.entry.createdDate || formatDate(props.entry.createdAt)} {props.entry.createdTime || formatTime(props.entry.createdAt)}
            </p>
            <p className="text-base font-medium">{props.entry.description || "Ingen beskrivelse"}</p>
            <p className="text-sm text-slate-500">
              {getVisibleCleanupEvidenceImageCount(props.entry)} bilder • Risiko {props.entry.risk || "-"} • Kommentar {props.entry.comment || "-"}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button type="button" variant="outline" className="h-9 rounded-xl px-3 text-sm" onClick={() => setEditing((current) => !current)}>
                {editing ? "Avbryt" : "Rediger"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-xl px-3 text-sm"
                onClick={() => props.onToggleEntryVisibility(props.entry, !isHidden)}
              >
                {isHidden ? "Ta tilbake i rapport" : "Skjul fra rapport"}
              </Button>
            </div>
          </div>
        </div>

        {editing ? (
          <div className="grid gap-3 rounded-[14px] border border-slate-200 bg-white p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Input value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} placeholder="Kategori" />
              <Input value={form.zone} onChange={(event) => setForm((current) => ({ ...current, zone: event.target.value }))} placeholder="Sone" />
              <Input type="date" value={form.createdDate} onChange={(event) => setForm((current) => ({ ...current, createdDate: event.target.value }))} />
              <Input type="time" value={form.createdTime} onChange={(event) => setForm((current) => ({ ...current, createdTime: event.target.value }))} />
              <Input
                type="number"
                min={1}
                value={String(form.count)}
                onChange={(event) => setForm((current) => ({ ...current, count: Math.max(1, Number(event.target.value) || 1) }))}
                placeholder="Antall"
              />
              <Input value={form.risk} onChange={(event) => setForm((current) => ({ ...current, risk: event.target.value }))} placeholder="Risiko" list={`risk-options-${props.entry.id}`} />
              <datalist id={`risk-options-${props.entry.id}`}>
                {CLEANUP_DOCUMENTATION_RISK_OPTIONS.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </div>
            <Textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={3} placeholder="Beskrivelse" />
            <Textarea value={form.comment} onChange={(event) => setForm((current) => ({ ...current, comment: event.target.value }))} rows={3} placeholder="Kommentar" />
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileInputRef}
                className="hidden"
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => {
                  props.onAddImages(props.entry.id, event.target.files);
                  event.currentTarget.value = "";
                }}
              />
              <Button type="button" variant="outline" className="h-10 rounded-xl px-4" onClick={() => fileInputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                Legg til bilder
              </Button>
              <Button
                type="button"
                className="h-10 rounded-xl px-4"
                disabled={props.saving}
                onClick={() => {
                  props.onSave(props.entry.id, form);
                  setEditing(false);
                }}
              >
                {props.saving ? "Lagrer..." : "Lagre endringer"}
              </Button>
            </div>
          </div>
        ) : null}

        {visibleImages.length > 1 ? (
          <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
            {visibleImages.slice(1).map((image) => (
              <div key={image.id} className="space-y-1">
                <DocumentationImageFrame
                  src={image.thumbnailUrl || image.imageUrl || ""}
                  alt={props.entry.entryNumber}
                  className="h-20 rounded-[12px] p-1.5"
                  imageClassName="h-full w-full object-contain"
                  emptyIconClassName="h-6 w-6"
                />
                {editing ? (
                  <Button type="button" variant="ghost" className="h-8 w-full rounded-lg text-xs" onClick={() => props.onToggleImageVisibility(props.entry, image.id, true)}>
                    Fjern fra rapport
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {hiddenImages.length > 0 ? (
          <div className="space-y-2 rounded-[14px] border border-dashed border-slate-300 bg-white/80 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-700">Skjulte bilder: {hiddenImages.length}</p>
              <Button type="button" variant="ghost" className="h-8 rounded-lg px-3 text-sm" onClick={() => setShowHiddenImages((current) => !current)}>
                {showHiddenImages ? "Skjul listen" : "Vis skjulte"}
              </Button>
            </div>
            {showHiddenImages ? (
              <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
                {hiddenImages.map((image) => (
                  <div key={image.id} className="space-y-1">
                    <DocumentationImageFrame
                      src={image.thumbnailUrl || image.imageUrl || ""}
                      alt={props.entry.entryNumber}
                      className="h-20 rounded-[12px] p-1.5"
                      imageClassName="h-full w-full object-contain"
                      emptyIconClassName="h-6 w-6"
                    />
                    <Button type="button" variant="ghost" className="h-8 w-full rounded-lg text-xs" onClick={() => props.onToggleImageVisibility(props.entry, image.id, false)}>
                      Ta tilbake
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function DocumentationPrintPage(props: { children: React.ReactNode }) {
  return (
    <section
      className="hidden print:mx-auto print:mb-0 print:flex print:h-[237mm] print:w-[166mm] print:break-inside-avoid print:flex-col print:overflow-hidden print:bg-white print:box-border"
    >
      {props.children}
    </section>
  );
}

function DocumentationPrintCoverPage(props: {
  projectName: string;
  map: CleanupEvidenceMap | null;
  filteredEntries: CleanupEvidenceEntry[];
  totalImages: number;
  categories: string;
}) {
  return (
    <DocumentationPrintPage>
      <div className="flex h-full flex-1 flex-col overflow-hidden bg-white p-[2mm]">
        <div className="flex h-full flex-1 flex-col overflow-hidden rounded-[1.5mm] border border-slate-200 bg-white p-[2mm]">
        <div className="space-y-1 border-b border-slate-200 pb-2">
          <p className="text-[2.55mm] font-semibold uppercase tracking-[0.14em] text-slate-500">Dokumentasjonsrapport</p>
          <h1 className="break-words text-[4.5mm] font-bold leading-[1.02] text-slate-950">{props.projectName}</h1>
          <p className="max-w-[84mm] text-[2.4mm] leading-snug text-slate-600">
            Rapporten er satt opp for utskrift med én kontrollert side per visning, uten delte kort, avbrutte bilder eller tekst som flyter over mellom sider.
          </p>
        </div>

        <div className="mt-1.5 grid items-start gap-1.25 print:grid-cols-2">
          <div className="rounded-[1.5mm] bg-slate-50 p-1.75">
            <h2 className="mb-1 text-[2.9mm] font-bold text-slate-900">Oversikt</h2>
            <div className="grid gap-0.5 text-[2.35mm] text-slate-700">
              <p>Prosjekt: {props.projectName}</p>
              <p>Adresse: {props.map?.address || "-"}</p>
              <p>Saksnavn: {props.map?.caseName || "-"}</p>
              <p>Dato: {formatDate(new Date().toISOString())}</p>
              <p>Antall funn: {props.filteredEntries.length}</p>
              <p>Antall bilder: {props.totalImages}</p>
            </div>
          </div>
          <div className="rounded-[1.5mm] bg-slate-50 p-1.75">
            <h2 className="mb-1 text-[2.9mm] font-bold text-slate-900">Kategorier</h2>
            <p className="break-words text-[2.35mm] leading-snug text-slate-700">{props.categories || "-"}</p>
          </div>
        </div>
        </div>
      </div>
    </DocumentationPrintPage>
  );
}

function DocumentationPrintHeroPage(props: {
  entry: CleanupEvidenceEntry;
}) {
  const type = getCleanupDocumentationTypeConfig(props.entry.entryType);
  const visibleImages = getVisibleCleanupEvidenceImages(props.entry);
  const heroImage = visibleImages[0];

  return (
    <DocumentationPrintPage>
      <div className="flex h-full flex-1 flex-col overflow-hidden bg-white p-[2mm]">
        <div className="flex h-full flex-1 flex-col overflow-hidden rounded-[1.5mm] border border-slate-200 bg-white p-[1.75mm]">
        <div className="mb-0.75 flex items-start justify-between gap-1.5">
          <div>
            <h2 className="text-[3.3mm] font-bold text-slate-950">{props.entry.entryNumber}</h2>
            <p className="mt-0.25 text-[2.2mm] text-slate-600">{type.label}</p>
          </div>
          <Badge variant="outline" className="rounded-full border-slate-300 px-1.25 py-0 text-[2mm] uppercase tracking-[0.08em]">
            {type.shortLabel}
          </Badge>
        </div>

        <div className="grid flex-1 gap-0.75 print:grid-cols-[1fr_0.92fr]">
          <DocumentationImageFrame
            src={heroImage?.imageUrl}
            alt={props.entry.entryNumber}
            chrome="compact"
            className="min-h-0 print:h-[88mm]"
            imageClassName="h-full w-full object-contain"
            emptyIconClassName="h-12 w-12"
          />

          <div className="grid min-h-0 content-start gap-0.75 rounded-[1.5mm] bg-slate-50 p-1">
            <div className="grid gap-0.25 text-[2.15mm] text-slate-700">
              <p>Kategori: {props.entry.category || "-"}</p>
              <p>Sone: {props.entry.zone || "-"}</p>
              <p>Dato: {props.entry.createdDate || formatDate(props.entry.createdAt)}</p>
              <p>Tid: {props.entry.createdTime || formatTime(props.entry.createdAt)}</p>
              <p>Risiko: {props.entry.risk || "-"}</p>
              <p>Antall bilder: {getVisibleCleanupEvidenceImageCount(props.entry)}</p>
            </div>

            <div className="rounded-[1.25mm] bg-white p-1">
              <p className="mb-0.5 text-[1.95mm] font-semibold uppercase tracking-[0.08em] text-slate-500">Beskrivelse</p>
              <p className="max-h-[10mm] overflow-hidden text-[2.15mm] leading-snug text-slate-900">{props.entry.description || "Ingen beskrivelse"}</p>
            </div>

            <div className="rounded-[1.25mm] bg-white p-1">
              <p className="mb-0.5 text-[1.95mm] font-semibold uppercase tracking-[0.08em] text-slate-500">Kommentar</p>
              <p className="max-h-[6mm] overflow-hidden text-[2.15mm] leading-snug text-slate-700">{props.entry.comment || "-"}</p>
            </div>
          </div>
        </div>
        </div>
      </div>
    </DocumentationPrintPage>
  );
}

function DocumentationPrintGalleryPage(props: {
  entry: CleanupEvidenceEntry;
  images: CleanupEvidenceEntry["images"];
  pageNumber: number;
  totalPages: number;
}) {
  return (
    <DocumentationPrintPage>
      <div className="flex h-full flex-1 flex-col overflow-hidden bg-white p-[2mm]">
        <div className="flex h-full flex-1 flex-col overflow-hidden rounded-[1.5mm] border border-slate-200 bg-white p-[1mm]">
        <div className="mb-0.25 flex items-end justify-between gap-1.25 border-b border-slate-200 pb-0">
          <div>
            <h3 className="text-[2.9mm] font-bold text-slate-950">{props.entry.entryNumber}</h3>
            <p className="text-[1.95mm] text-slate-600">Bildeflate {props.pageNumber} av {props.totalPages}</p>
          </div>
          <p className="text-[1.9mm] text-slate-500">{props.images.length} bilder</p>
        </div>

        <div className="grid h-full flex-[1.18] grid-cols-3 grid-rows-5 gap-[1mm] content-stretch">
          {props.images.map((image) => (
            <DocumentationImageFrame
              key={image.id}
              src={image.imageUrl || image.thumbnailUrl || ""}
              alt={props.entry.entryNumber}
              chrome="none"
              className="min-h-0 rounded-[1mm] border border-slate-200 bg-white p-[0.5mm]"
              imageClassName="h-full w-full object-contain"
              emptyIconClassName="h-8 w-8"
            />
          ))}
        </div>
        </div>
      </div>
    </DocumentationPrintPage>
  );
}

export function RydderenDocumentationReportView(props: {
  project: CleanupProject;
  projectName: string;
  map: CleanupEvidenceMap | null;
  entries: CleanupEvidenceEntry[];
  search: string;
  exporting?: boolean;
  projectSaving?: boolean;
  entrySavingId?: string | null;
  saveImagesLabel?: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  onBack: () => void;
  onPrintPdf: () => void;
  onExportPages: () => void;
  onSaveImages: () => void;
  onExportZip: () => void;
  onSaveReportMetadata: (payload: {
    projectName: string;
    caseNumber: string;
    responsiblePerson: string;
    caseName: string;
    address: string;
  }) => void;
  onSaveEntry: (entryId: string, payload: {
    category: string;
    zone: string;
    description: string;
    comment: string;
    risk: string;
    count: number;
    createdDate: string;
    createdTime: string;
  }) => void;
  onToggleEntryVisibility: (entry: CleanupEvidenceEntry, hidden: boolean) => void;
  onAddImagesToEntry: (entryId: string, files: FileList | null) => void;
  onToggleImageVisibility: (entry: CleanupEvidenceEntry, imageId: string, hidden: boolean) => void;
}) {
  const [projectName, setProjectName] = useState(props.project.name);
  const [caseNumber, setCaseNumber] = useState(props.project.caseNumber || "");
  const [responsiblePerson, setResponsiblePerson] = useState(props.project.responsiblePerson || "");
  const [caseName, setCaseName] = useState(props.map?.caseName || "");
  const [address, setAddress] = useState(props.map?.address || "");

  useEffect(() => {
    setProjectName(props.project.name);
    setCaseNumber(props.project.caseNumber || "");
    setResponsiblePerson(props.project.responsiblePerson || "");
  }, [props.project.caseNumber, props.project.name, props.project.responsiblePerson]);

  useEffect(() => {
    setCaseName(props.map?.caseName || "");
    setAddress(props.map?.address || "");
  }, [props.map?.address, props.map?.caseName]);

  const matchingEntries = useMemo(() => {
    const search = props.search.trim().toLowerCase();
    const nextEntries = !search
      ? props.entries
      : props.entries.filter((entry) =>
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
        .includes(search)
    );

    return [...nextEntries].sort((left, right) => {
      if (left.sequence !== right.sequence) {
        return left.sequence - right.sequence;
      }

      const leftTime = new Date(left.createdAt).getTime();
      const rightTime = new Date(right.createdAt).getTime();
      if (leftTime !== rightTime) {
        return leftTime - rightTime;
      }

      return left.entryNumber.localeCompare(right.entryNumber);
    });
  }, [props.entries, props.search]);
  const filteredEntries = useMemo(() => matchingEntries.filter((entry) => !isCleanupEvidenceEntryHidden(entry)), [matchingEntries]);
  const totalImages = filteredEntries.reduce((sum, entry) => sum + getVisibleCleanupEvidenceImageCount(entry), 0);
  const categories = Array.from(
    filteredEntries.reduce((map, entry) => {
      const key = entry.category || "Annet";
      map.set(key, (map.get(key) || 0) + 1);
      return map;
    }, new Map<string, number>())
  )
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => `${category}: ${count}`)
    .join(", ");
  return (
    <>
      <div className="print:hidden">
        <section className="space-y-4 rounded-[20px] bg-white p-5 shadow-[0_16px_40px_rgba(17,24,39,0.10)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="mb-1 text-xs uppercase tracking-[0.08em] text-slate-500">Rapportoversikt</p>
            <h2 className="text-2xl font-bold">Funn, skader og observasjoner</h2>
          </div>
          <Button variant="ghost" className="rounded-[18px]" onClick={props.onBack}>
            Avslutt
          </Button>
        </div>

          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input className="min-h-14 rounded-2xl pl-10" value={props.search} onChange={(event) => props.onSearchChange(event.target.value)} placeholder="Søk på nummer, kategori, dato, sone eller tekst" />
          </div>
          <Button variant="ghost" className="min-h-14 rounded-[18px] text-base font-bold" onClick={props.onClearSearch}>
            Nullstill
          </Button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <Button type="button" variant="outline" className="min-h-14 rounded-[18px] text-base font-bold" disabled={props.exporting} onClick={props.onPrintPdf}>
            <FileText className="mr-2 h-4 w-4" />
            PDF
          </Button>
          <Button type="button" variant="outline" className="min-h-14 rounded-[18px] text-base font-bold" disabled={props.exporting} onClick={props.onExportPages}>
            <FileText className="mr-2 h-4 w-4" />
            Pages
          </Button>
          <Button type="button" variant="outline" className="min-h-14 rounded-[18px] text-base font-bold" disabled={props.exporting} onClick={props.onSaveImages}>
            <ImageIcon className="mr-2 h-4 w-4" />
            {props.saveImagesLabel || "Til Bilder"}
          </Button>
          <Button type="button" variant="outline" className="min-h-14 rounded-[18px] text-base font-bold" disabled={props.exporting} onClick={props.onExportZip}>
            <FileArchive className="mr-2 h-4 w-4" />
            ZIP med bilder
          </Button>
        </div>
        </section>

        <Card className="mt-4 rounded-[18px] border bg-slate-50 shadow-none">
        <CardHeader>
          <CardTitle>Dokumentasjonsrapport</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <p>Forside: Dokumentasjonsrapport</p>
          <div className="grid gap-3 md:grid-cols-2">
            <Input value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="Prosjektnavn" />
            <Input value={caseNumber} onChange={(event) => setCaseNumber(event.target.value)} placeholder="Saksnummer" />
            <Input value={responsiblePerson} onChange={(event) => setResponsiblePerson(event.target.value)} placeholder="Ansvarlig person" />
            <Input value={caseName} onChange={(event) => setCaseName(event.target.value)} placeholder="Saksnavn" />
            <Input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Adresse" className="md:col-span-2" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="rounded-xl"
              disabled={props.projectSaving}
              onClick={() =>
                props.onSaveReportMetadata({
                  projectName,
                  caseNumber,
                  responsiblePerson,
                  caseName,
                  address,
                })
              }
            >
              {props.projectSaving ? "Lagrer..." : "Lagre rapportinfo"}
            </Button>
          </div>
          <p>Dato: {formatDate(new Date().toISOString())}</p>
          <p>Antall synlige funn: {filteredEntries.length}</p>
          <p>Antall synlige bilder: {totalImages}</p>
          <p>Kategorier: {categories || "-"}</p>
        </CardContent>
      </Card>

        <div className="mt-4 grid gap-4">
        {matchingEntries.length ? (
          matchingEntries.map((entry) => (
            <DocumentationEntryScreenCard
              key={entry.id}
              entry={entry}
              saving={props.entrySavingId === entry.id}
              onSave={props.onSaveEntry}
              onToggleEntryVisibility={props.onToggleEntryVisibility}
              onAddImages={props.onAddImagesToEntry}
              onToggleImageVisibility={props.onToggleImageVisibility}
            />
          ))
        ) : (
          <Card className="rounded-[18px] border bg-slate-50 shadow-none">
            <CardContent className="p-6 text-sm text-slate-500">Ingen funn registrert i valgt prosjekt.</CardContent>
          </Card>
        )}
        </div>
      </div>
      <div className="hidden print:block">
        <DocumentationPrintCoverPage
          projectName={props.projectName}
          map={props.map}
          filteredEntries={filteredEntries}
          totalImages={totalImages}
          categories={categories}
        />
        {filteredEntries.map((entry) => {
          const galleryChunks = chunkArray(getVisibleCleanupEvidenceImages(entry).slice(1), 15);

          return (
            <Fragment key={`print-${entry.id}`}>
              <DocumentationPrintHeroPage entry={entry} />
              {galleryChunks.map((chunk, chunkIndex) => {
                return (
                  <DocumentationPrintGalleryPage
                    key={`${entry.id}-gallery-${chunkIndex}`}
                    entry={entry}
                    images={chunk}
                    pageNumber={chunkIndex + 1}
                    totalPages={galleryChunks.length}
                  />
                );
              })}
            </Fragment>
          );
        })}
      </div>
    </>
  );
}
