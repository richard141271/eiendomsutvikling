"use client";

import { useMemo, useRef } from "react";
import { Camera, FileArchive, FileText, Image as ImageIcon, Search, Upload, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CleanupEvidenceEntry, CleanupEvidenceMap } from "@/src/modules/rydderen/types";
import {
  buildCleanupZones,
  CLEANUP_DOCUMENTATION_CATEGORIES,
  CLEANUP_DOCUMENTATION_RISK_OPTIONS,
  CLEANUP_DOCUMENTATION_TYPES,
  formatDate,
  formatTime,
  getCleanupDocumentationTypeConfig,
} from "@/src/modules/rydderen/utils";

export type CleanupDocumentationDraftImage = {
  file: File;
  imageHash: string;
  previewUrl: string;
};

export type CleanupDocumentationView = "menu" | "entry" | "map" | "report";

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

      <div className="grid gap-3 sm:grid-cols-2">
        <Button type="button" className="min-h-16 rounded-[18px] text-base font-bold" onClick={props.onRequestCamera}>
          <Camera className="mr-2 h-5 w-5" />
          Kamera
        </Button>
        <Button type="button" variant="outline" className="min-h-16 rounded-[18px] text-base font-bold" onClick={props.onRequestGallery}>
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
        <Button type="button" className="min-h-16 rounded-[18px] text-base font-bold" disabled={props.saving} onClick={props.onSave}>
          {props.saving ? "Lagrer..." : "Lagre"}
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

function DocumentationEntryCard(props: { entry: CleanupEvidenceEntry }) {
  const type = getCleanupDocumentationTypeConfig(props.entry.entryType);
  return (
    <Card className="rounded-[18px] border bg-slate-50 print:break-inside-avoid">
      <CardContent className="space-y-3 p-4">
        <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-[14px] bg-slate-200">
            {props.entry.images[0]?.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={props.entry.images[0].imageUrl || ""} alt={props.entry.entryNumber} className="h-52 w-full object-cover" />
            ) : (
              <div className="flex h-52 items-center justify-center text-slate-400">
                <ImageIcon className="h-10 w-10" />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-lg font-bold">{props.entry.entryNumber}</div>
              <Badge variant="outline">{type.shortLabel}</Badge>
            </div>
            <p className="text-sm text-slate-500">
              {props.entry.category || "-"} • Sone {props.entry.zone || "-"}
            </p>
            <p className="text-sm text-slate-500">
              {props.entry.createdDate || formatDate(props.entry.createdAt)} {props.entry.createdTime || formatTime(props.entry.createdAt)}
            </p>
            <p className="text-base font-medium">{props.entry.description || "Ingen beskrivelse"}</p>
            <p className="text-sm text-slate-500">
              {props.entry.imageCount || props.entry.images.length} bilder • Risiko {props.entry.risk || "-"} • Kommentar {props.entry.comment || "-"}
            </p>
          </div>
        </div>
        {props.entry.images.length > 1 ? (
          <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
            {props.entry.images.slice(1).map((image) => (
              <div key={image.id} className="overflow-hidden rounded-[12px] bg-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.thumbnailUrl || image.imageUrl || ""} alt={props.entry.entryNumber} className="h-20 w-full object-cover" />
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function RydderenDocumentationReportView(props: {
  projectName: string;
  map: CleanupEvidenceMap | null;
  entries: CleanupEvidenceEntry[];
  search: string;
  exporting?: boolean;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  onBack: () => void;
  onPrintPdf: () => void;
  onExportPages: () => void;
  onSaveImages: () => void;
  onExportZip: () => void;
}) {
  const filteredEntries = useMemo(() => {
    const search = props.search.trim().toLowerCase();
    if (!search) {
      return props.entries;
    }
    return props.entries.filter((entry) =>
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
  }, [props.entries, props.search]);

  const totalImages = filteredEntries.reduce((sum, entry) => sum + (entry.imageCount || entry.images.length), 0);
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
    <section className="space-y-4 rounded-[20px] bg-white p-5 shadow-[0_16px_40px_rgba(17,24,39,0.10)] print:rounded-none print:bg-white print:p-0 print:shadow-none">
      <div className="print:hidden">
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
            <Input className="min-h-14 rounded-2xl pl-10" value={props.search} onChange={(event) => props.onSearchChange(event.target.value)} placeholder="Sok pa nummer, kategori, dato, sone eller tekst" />
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
            Til Bilder
          </Button>
          <Button type="button" variant="outline" className="min-h-14 rounded-[18px] text-base font-bold" disabled={props.exporting} onClick={props.onExportZip}>
            <FileArchive className="mr-2 h-4 w-4" />
            ZIP med bilder
          </Button>
        </div>
      </div>

      <Card className="rounded-[18px] border bg-slate-50 shadow-none print:border-0 print:bg-white">
        <CardHeader>
          <CardTitle>Dokumentasjonsrapport</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-1 text-sm">
          <p>Forside: Dokumentasjonsrapport</p>
          <p>Prosjekt: {props.projectName}</p>
          <p>Adresse: {props.map?.address || "-"}</p>
          <p>Saksnavn: {props.map?.caseName || "-"}</p>
          <p>Dato: {formatDate(new Date().toISOString())}</p>
          <p>Antall funn: {filteredEntries.length}</p>
          <p>Antall bilder: {totalImages}</p>
          <p>Kategorier: {categories || "-"}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {filteredEntries.length ? (
          filteredEntries.map((entry) => <DocumentationEntryCard key={entry.id} entry={entry} />)
        ) : (
          <Card className="rounded-[18px] border bg-slate-50 shadow-none">
            <CardContent className="p-6 text-sm text-slate-500">Ingen funn registrert i valgt prosjekt.</CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}
