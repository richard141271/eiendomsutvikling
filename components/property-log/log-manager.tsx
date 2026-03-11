"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import type { PropertyLogCategory, PropertyLogStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createPropertyLogEntry, deletePropertyLogEntry, updatePropertyLogEntry } from "@/app/actions/property-log";

type LogEntry = {
  id: string;
  propertyId: string;
  unitId: string | null;
  roomId: string | null;
  title: string;
  description: string | null;
  category: PropertyLogCategory;
  status: PropertyLogStatus;
  performedAt: string | Date | null;
  costAmount: number | null;
  costCurrency: string;
  vendorName: string | null;
  vendorOrgNumber: string | null;
  invoiceNumber: string | null;
  performedByName: string | null;
  performedByCompany: string | null;
  performedByPhone: string | null;
  performedByEmail: string | null;
  tags: string[];
  createdAt: string | Date;
  updatedAt: string | Date;
  createdByUser: { id: string; name: string };
  performedByUser: { id: string; name: string } | null;
  unit: { id: string; name: string } | null;
  room: { id: string; name: string } | null;
  attachments: Array<{
    id: string;
    url: string;
    fileName: string | null;
    fileType: string | null;
    fileSize: number | null;
    createdAt: string | Date;
  }>;
};

type UnitOption = { id: string; name: string };
type RoomOption = { id: string; name: string };

const categoryOptions: Array<{ value: PropertyLogCategory; label: string }> = [
  { value: "PAINT", label: "Maling" },
  { value: "ELECTRICAL", label: "Elektrisk" },
  { value: "PLUMBING", label: "Rør/VA" },
  { value: "HVAC", label: "Ventilasjon" },
  { value: "APPLIANCES", label: "Hvitevarer" },
  { value: "CLEANING", label: "Rengjøring" },
  { value: "COMMON_AREA", label: "Fellesareal" },
  { value: "GARDEN", label: "Hage" },
  { value: "FACADE", label: "Fasade" },
  { value: "ROOF", label: "Tak" },
  { value: "EXTERIOR", label: "Utvendig" },
  { value: "RENOVATION", label: "Oppussing" },
  { value: "OTHER", label: "Annet" },
];

const statusOptions: Array<{ value: PropertyLogStatus; label: string }> = [
  { value: "PLANNED", label: "Planlagt" },
  { value: "IN_PROGRESS", label: "Pågår" },
  { value: "COMPLETED", label: "Ferdig" },
  { value: "CANCELLED", label: "Avbrutt" },
];

function asDate(value: string | Date | null | undefined) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function formatDateOrDash(value: string | Date | null | undefined) {
  const d = asDate(value);
  if (!d) return "-";
  return format(d, "dd.MM.yyyy", { locale: nb });
}

function splitTags(value: string) {
  return value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

type EntryDraft = {
  id?: string;
  propertyId: string;
  unitId: string | null;
  roomId: string | null;
  title: string;
  description: string;
  category: PropertyLogCategory;
  status: PropertyLogStatus;
  performedAt: string;
  costAmount: string;
  costCurrency: string;
  vendorName: string;
  vendorOrgNumber: string;
  invoiceNumber: string;
  performedByName: string;
  performedByCompany: string;
  performedByPhone: string;
  performedByEmail: string;
  tags: string;
  performedByUserId: string | null;
};

export function LogManager(props: {
  propertyId: string;
  unitId?: string;
  initialEntries: LogEntry[];
  units?: UnitOption[];
  rooms?: RoomOption[];
}) {
  const router = useRouter();
  const [entries, setEntries] = useState<LogEntry[]>(props.initialEntries);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"ALL" | PropertyLogCategory>("ALL");
  const [status, setStatus] = useState<"ALL" | PropertyLogStatus>("ALL");
  const [scopeUnitId, setScopeUnitId] = useState<string>(props.unitId ?? "ALL");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [draft, setDraft] = useState<EntryDraft>(() => ({
    propertyId: props.propertyId,
    unitId: props.unitId ?? null,
    roomId: null,
    title: "",
    description: "",
    category: "OTHER",
    status: "COMPLETED",
    performedAt: "",
    costAmount: "",
    costCurrency: "NOK",
    vendorName: "",
    vendorOrgNumber: "",
    invoiceNumber: "",
    performedByName: "",
    performedByCompany: "",
    performedByPhone: "",
    performedByEmail: "",
    tags: "",
    performedByUserId: null,
  }));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (props.unitId) {
        if (e.unitId !== props.unitId) return false;
      } else if (scopeUnitId !== "ALL") {
        if (scopeUnitId === "COMMON") {
          if (e.unitId) return false;
        } else if (e.unitId !== scopeUnitId) {
          return false;
        }
      }

      if (category !== "ALL" && e.category !== category) return false;
      if (status !== "ALL" && e.status !== status) return false;

      if (!q) return true;
      const haystack = [
        e.title,
        e.description ?? "",
        e.vendorName ?? "",
        e.invoiceNumber ?? "",
        e.performedByName ?? "",
        e.unit?.name ?? "",
        e.room?.name ?? "",
        e.tags?.join(",") ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [category, entries, props.unitId, scopeUnitId, search, status]);

  function openNew() {
    setFiles([]);
    setDraft({
      propertyId: props.propertyId,
      unitId: props.unitId ?? null,
      roomId: null,
      title: "",
      description: "",
      category: "OTHER",
      status: "COMPLETED",
      performedAt: "",
      costAmount: "",
      costCurrency: "NOK",
      vendorName: "",
      vendorOrgNumber: "",
      invoiceNumber: "",
      performedByName: "",
      performedByCompany: "",
      performedByPhone: "",
      performedByEmail: "",
      tags: "",
      performedByUserId: null,
    });
    setOpen(true);
  }

  function openEdit(entry: LogEntry) {
    setFiles([]);
    setDraft({
      id: entry.id,
      propertyId: entry.propertyId,
      unitId: entry.unitId,
      roomId: entry.roomId,
      title: entry.title,
      description: entry.description ?? "",
      category: entry.category,
      status: entry.status,
      performedAt: entry.performedAt ? format(asDate(entry.performedAt)!, "yyyy-MM-dd") : "",
      costAmount: entry.costAmount !== null && entry.costAmount !== undefined ? String(entry.costAmount) : "",
      costCurrency: entry.costCurrency || "NOK",
      vendorName: entry.vendorName ?? "",
      vendorOrgNumber: entry.vendorOrgNumber ?? "",
      invoiceNumber: entry.invoiceNumber ?? "",
      performedByName: entry.performedByName ?? "",
      performedByCompany: entry.performedByCompany ?? "",
      performedByPhone: entry.performedByPhone ?? "",
      performedByEmail: entry.performedByEmail ?? "",
      tags: entry.tags?.join(", ") ?? "",
      performedByUserId: entry.performedByUser?.id ?? null,
    });
    setOpen(true);
  }

  async function uploadAttachments(entryId: string) {
    if (files.length === 0) return;

    for (const file of files) {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("propertyId", props.propertyId);
      formData.set("entryId", entryId);

      const res = await fetch("/api/property-log/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || "Kunne ikke laste opp vedlegg");
      }
    }
  }

  async function onSave() {
    if (!draft.title.trim()) {
      toast.error("Tittel er påkrevd");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        propertyId: draft.propertyId,
        unitId: draft.unitId,
        roomId: draft.roomId,
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        category: draft.category,
        status: draft.status,
        performedAt: draft.performedAt ? new Date(draft.performedAt) : null,
        costAmount: draft.costAmount ? Number(draft.costAmount) : null,
        costCurrency: draft.costCurrency || "NOK",
        vendorName: draft.vendorName.trim() || null,
        vendorOrgNumber: draft.vendorOrgNumber.trim() || null,
        invoiceNumber: draft.invoiceNumber.trim() || null,
        performedByName: draft.performedByName.trim() || null,
        performedByCompany: draft.performedByCompany.trim() || null,
        performedByPhone: draft.performedByPhone.trim() || null,
        performedByEmail: draft.performedByEmail.trim() || null,
        tags: splitTags(draft.tags),
        performedByUserId: draft.performedByUserId,
      };

      if (draft.id) {
        const res = await updatePropertyLogEntry(draft.id, payload);
        if (!res.success) throw new Error("Kunne ikke oppdatere loggpost");
        await uploadAttachments(draft.id);
      } else {
        const res = await createPropertyLogEntry(payload);
        if (!res.success) throw new Error("Kunne ikke opprette loggpost");
        await uploadAttachments(res.data.id);
      }

      toast.success("Lagret");
      setOpen(false);
      router.refresh();
    } catch (error: any) {
      toast.error(error?.message || "Noe gikk galt");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(entryId: string) {
    if (!confirm("Slette loggposten?")) return;
    try {
      const res = await deletePropertyLogEntry(entryId);
      if (!res.success) throw new Error("Kunne ikke slette loggpost");
      toast.success("Slettet");
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
      router.refresh();
    } catch (error: any) {
      toast.error(error?.message || "Noe gikk galt");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Logg</h1>
          <p className="text-muted-foreground">
            {props.unitId ? "Logg for utleieenheten" : "Logg for eiendommen"}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            Skriv ut
          </Button>
          <Button onClick={openNew}>Ny loggpost</Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Filtrer</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="search">Søk</Label>
            <Input
              id="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Søk i tittel, beskrivelse, tags…"
            />
          </div>

          {!props.unitId && (
            <div className="space-y-2">
              <Label>Område</Label>
              <Select value={scopeUnitId} onValueChange={setScopeUnitId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Alt</SelectItem>
                  <SelectItem value="COMMON">Felles/eiendom</SelectItem>
                  {(props.units || []).map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Kategori</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Alle</SelectItem>
                {categoryOptions.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Alle</SelectItem>
                {statusOptions.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Ingen loggposter ennå.
            </CardContent>
          </Card>
        ) : (
          filtered.map((e) => (
            <Card key={e.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{e.title}</CardTitle>
                    <div className="text-sm text-muted-foreground">
                      {formatDateOrDash(e.performedAt || e.createdAt)}
                      {e.unit?.name ? ` • ${e.unit.name}` : ""}
                      {e.room?.name ? ` • ${e.room.name}` : ""}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 items-center justify-end">
                    <Badge variant="secondary">
                      {categoryOptions.find((c) => c.value === e.category)?.label ?? e.category}
                    </Badge>
                    <Badge variant={e.status === "COMPLETED" ? "default" : "outline"}>
                      {statusOptions.find((s) => s.value === e.status)?.label ?? e.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {e.description && (
                  <div className="whitespace-pre-wrap text-sm">{e.description}</div>
                )}

                <div className="grid gap-2 text-sm md:grid-cols-3">
                  <div>
                    <div className="text-muted-foreground">Utført av</div>
                    <div className="font-medium">
                      {e.performedByUser?.name || e.performedByName || "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Leverandør</div>
                    <div className="font-medium">{e.vendorName || "-"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Kostnad</div>
                    <div className="font-medium">
                      {e.costAmount !== null && e.costAmount !== undefined
                        ? `${e.costAmount} ${e.costCurrency || "NOK"}`
                        : "-"}
                    </div>
                  </div>
                </div>

                {e.tags?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {e.tags.map((t) => (
                      <Badge key={t} variant="outline">
                        {t}
                      </Badge>
                    ))}
                  </div>
                ) : null}

                {e.attachments?.length ? (
                  <div className="flex flex-col gap-2">
                    <div className="text-sm text-muted-foreground">Vedlegg</div>
                    <div className="flex flex-wrap gap-2">
                      {e.attachments.map((a) => (
                        <a
                          key={a.id}
                          href={a.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm underline"
                        >
                          {a.fileName || "Vedlegg"}
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => openEdit(e)}>
                    Rediger
                  </Button>
                  <Button variant="destructive" onClick={() => onDelete(e.id)}>
                    Slett
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{draft.id ? "Rediger loggpost" : "Ny loggpost"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="title">Tittel</Label>
              <Input
                id="title"
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              />
            </div>

            {!props.unitId && (
              <div className="space-y-2">
                <Label>Utleieenhet</Label>
                <Select
                  value={draft.unitId ?? "COMMON"}
                  onValueChange={(v) =>
                    setDraft((d) => ({
                      ...d,
                      unitId: v === "COMMON" ? null : v,
                      roomId: null,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COMMON">Felles/eiendom</SelectItem>
                    {(props.units || []).map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Rom</Label>
              <Select
                value={draft.roomId ?? "NONE"}
                onValueChange={(v) =>
                  setDraft((d) => ({ ...d, roomId: v === "NONE" ? null : v }))
                }
                disabled={!draft.unitId || (props.rooms || []).length === 0}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Ingen</SelectItem>
                  {(props.rooms || []).map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select
                value={draft.category}
                onValueChange={(v) =>
                  setDraft((d) => ({ ...d, category: v as PropertyLogCategory }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={draft.status}
                onValueChange={(v) =>
                  setDraft((d) => ({ ...d, status: v as PropertyLogStatus }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="performedAt">Dato</Label>
              <Input
                id="performedAt"
                type="date"
                value={draft.performedAt}
                onChange={(e) => setDraft((d) => ({ ...d, performedAt: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="costAmount">Kostnad</Label>
              <Input
                id="costAmount"
                inputMode="decimal"
                value={draft.costAmount}
                onChange={(e) => setDraft((d) => ({ ...d, costAmount: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendorName">Leverandør</Label>
              <Input
                id="vendorName"
                value={draft.vendorName}
                onChange={(e) => setDraft((d) => ({ ...d, vendorName: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoiceNumber">Fakturanr</Label>
              <Input
                id="invoiceNumber"
                value={draft.invoiceNumber}
                onChange={(e) => setDraft((d) => ({ ...d, invoiceNumber: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="performedByName">Utført av (navn)</Label>
              <Input
                id="performedByName"
                value={draft.performedByName}
                onChange={(e) => setDraft((d) => ({ ...d, performedByName: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="performedByCompany">Firma</Label>
              <Input
                id="performedByCompany"
                value={draft.performedByCompany}
                onChange={(e) => setDraft((d) => ({ ...d, performedByCompany: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="performedByPhone">Telefon</Label>
              <Input
                id="performedByPhone"
                value={draft.performedByPhone}
                onChange={(e) => setDraft((d) => ({ ...d, performedByPhone: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="performedByEmail">E-post</Label>
              <Input
                id="performedByEmail"
                value={draft.performedByEmail}
                onChange={(e) => setDraft((d) => ({ ...d, performedByEmail: e.target.value }))}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="tags">Tags (kommaseparert)</Label>
              <Input
                id="tags"
                value={draft.tags}
                onChange={(e) => setDraft((d) => ({ ...d, tags: e.target.value }))}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Beskrivelse</Label>
              <Textarea
                id="description"
                className="min-h-[120px]"
                value={draft.description}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="attachments">Vedlegg</Label>
              <Input
                id="attachments"
                type="file"
                multiple
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
              />
              {files.length ? (
                <div className="text-sm text-muted-foreground">
                  {files.length} valgt
                </div>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Avbryt
            </Button>
            <Button onClick={onSave} disabled={saving}>
              Lagre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
