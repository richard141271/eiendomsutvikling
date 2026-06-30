import { ReportBuilder } from "./report";
import {
  DocumentationCategoryBreakdown,
  DocumentationEntryMetadata,
  DocumentationReportMetadata,
  DocumentationSummaryCard,
  DocumentationZoneCell,
  DocumentMetadata,
  ReportDocument,
} from "./report-types";
import type { CleanupEvidenceEntry, CleanupEvidenceMap, CleanupProject } from "@/src/modules/rydderen/types";
import { buildCleanupZones, getCleanupDocumentationTypeConfig } from "@/src/modules/rydderen/utils";

type CleanupDocumentationReportInput = {
  project: CleanupProject;
  map: CleanupEvidenceMap | null;
  entries: CleanupEvidenceEntry[];
  search?: string;
};

function matchesSearch(entry: CleanupEvidenceEntry, search: string) {
  const normalized = search.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return [
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
    .includes(normalized);
}

function sortEntries(entries: CleanupEvidenceEntry[]) {
  return [...entries].sort((left, right) => {
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
}

function toEntryDate(entry: CleanupEvidenceEntry) {
  const combined = `${entry.createdDate || ""} ${entry.createdTime || ""}`.trim();
  if (combined) {
    const parsed = new Date(combined);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  const fallback = new Date(entry.createdAt);
  return Number.isNaN(fallback.getTime()) ? new Date() : fallback;
}

function normalizeSpacing(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

function normalizeSimpleText(value: string | null | undefined, fallback = "-") {
  const raw = normalizeSpacing((value || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n"));
  if (!raw) {
    return fallback;
  }

  const replacements: Array<[RegExp, string]> = [
    [/\bHoy\b/g, "Høy"],
    [/\bhoy\b/g, "høy"],
    [/\bProve\b/g, "Prøve"],
    [/\bprove\b/g, "prøve"],
    [/\bRegistrere\b/g, "Registrert"],
    [/\bregistrere\b/g, "registrert"],
    [/\bMaling\b/g, "Måling"],
    [/\bmaling\b/g, "måling"],
  ];

  const normalized = replacements.reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), raw);
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function normalizeParagraph(value: string | null | undefined, fallback = "-") {
  const normalized = (value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => normalizeSimpleText(line, ""))
    .filter(Boolean)
    .join("\n");

  return normalized || fallback;
}

function groupByCategory(entries: CleanupEvidenceEntry[]): DocumentationCategoryBreakdown[] {
  return Array.from(
    entries.reduce((map, entry) => {
      const key = normalizeSimpleText(entry.category || "Annet");
      const current = map.get(key) || { label: key, findings: 0, images: 0 };
      current.findings += 1;
      current.images += entry.images.length;
      map.set(key, current);
      return map;
    }, new Map<string, DocumentationCategoryBreakdown>())
  )
    .map(([, value]) => value)
    .sort((left, right) => {
      if (right.findings !== left.findings) {
        return right.findings - left.findings;
      }
      return left.label.localeCompare(right.label, "no");
    });
}

function buildZoneRows(map: CleanupEvidenceMap | null, entries: CleanupEvidenceEntry[]) {
  if (!map) {
    return [];
  }

  const zones = (map.zones?.length ? map.zones : buildCleanupZones(map.rows, map.columns)).map((zone) => zone.toUpperCase());
  if (zones.length === 0) {
    return [];
  }

  const zoneCounts = entries.reduce((acc, entry) => {
    const zone = (entry.zone || "").toUpperCase().trim();
    if (!zone) {
      return acc;
    }
    const current = acc.get(zone) || { findings: 0, images: 0 };
    current.findings += 1;
    current.images += entry.images.length;
    acc.set(zone, current);
    return acc;
  }, new Map<string, { findings: number; images: number }>());

  const columns = Math.max(1, Math.min(6, map.columns || 5));
  const cells: DocumentationZoneCell[] = zones.map((zone) => {
    const counts = zoneCounts.get(zone);
    return {
      zone,
      documented: Boolean(counts),
      findings: counts?.findings || 0,
      images: counts?.images || 0,
    };
  });

  const rows: DocumentationZoneCell[][] = [];
  for (let index = 0; index < cells.length; index += columns) {
    rows.push(cells.slice(index, index + columns));
  }
  return rows;
}

function buildSummaryCards(totalFindings: number, totalImages: number, totalCategories: number, zoneCount: number): DocumentationSummaryCard[] {
  return [
    { label: "Antall funn", value: String(totalFindings), tone: "primary" },
    { label: "Antall bilder", value: String(totalImages), tone: "success" },
    { label: "Antall kategorier", value: String(totalCategories), tone: "neutral" },
    { label: "Dokumenterte soner", value: String(zoneCount), tone: "warning" },
  ];
}

function mapEntries(entries: CleanupEvidenceEntry[]): DocumentationEntryMetadata[] {
  return entries.map((entry) => {
    const type = getCleanupDocumentationTypeConfig(entry.entryType);
    const entryDate = toEntryDate(entry);
    return {
      id: entry.id,
      entryNumber: entry.entryNumber,
      typeLabel: type.label,
      category: normalizeSimpleText(entry.category, "-"),
      zone: normalizeSimpleText(entry.zone, "-"),
      dateLabel: entry.createdDate || entryDate.toLocaleDateString("no-NO"),
      timeLabel: entry.createdTime || entryDate.toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" }),
      risk: normalizeSimpleText(entry.risk, "-"),
      description: normalizeParagraph(entry.description, "Ingen beskrivelse registrert."),
      comment: normalizeParagraph(entry.comment, "-"),
      imageCount: entry.images.length,
      images: entry.images
        .slice()
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .filter((image) => Boolean(image.imageUrl))
        .map((image, index) => ({
          id: image.id,
          code: `${entry.entryNumber}-${String(index + 1).padStart(2, "0")}`,
          dateLabel: entry.createdDate || entryDate.toLocaleDateString("no-NO"),
          imageUrl: image.imageUrl || image.thumbnailUrl || "",
          sortOrder: image.sortOrder,
        })),
    };
  });
}

export function mapCleanupDocumentationToReport(input: CleanupDocumentationReportInput): ReportDocument {
  const now = new Date();
  const filteredEntries = sortEntries(input.entries.filter((entry) => matchesSearch(entry, input.search || "")));
  const totalImages = filteredEntries.reduce((sum, entry) => sum + entry.images.length, 0);
  const categoryBreakdown = groupByCategory(filteredEntries);
  const zoneRows = buildZoneRows(input.map, filteredEntries);
  const entries = mapEntries(filteredEntries);
  const documentedZones = zoneRows.flat().filter((zone) => zone.documented).map((zone) => zone.zone);
  const summaryCards = buildSummaryCards(filteredEntries.length, totalImages, categoryBreakdown.length, documentedZones.length);
  const address = normalizeSimpleText(input.map?.address || input.project.context?.label || "-", "-");
  const caseName = normalizeSimpleText(input.map?.caseName || input.project.name || "-", "-");
  const responsibleLabel = normalizeSimpleText("Ikke oppgitt", "Ikke oppgitt");

  const documentationReport: DocumentationReportMetadata = {
    title: "DOKUMENTASJONSRAPPORT",
    subtitle: "Dokumentasjon og bevis",
    logoPath: "/Users/jornsmackbookpro/trae_projects/eiendomsutvikling/public/logo.png",
    projectName: normalizeSimpleText(input.project.name, input.project.id),
    address,
    caseName,
    caseNumber: input.project.slug || input.project.id,
    dateLabel: now.toLocaleDateString("no-NO"),
    createdAtLabel: now.toLocaleString("no-NO"),
    responsibleLabel,
    totalFindings: filteredEntries.length,
    totalImages,
    totalCategories: categoryBreakdown.length,
    summaryCards,
    categoryBreakdown,
    zoneRows,
    entries,
    conclusionZones: documentedZones,
  };

  const metadata: DocumentMetadata = {
    documentType: "DOKUMENTASJONSRAPPORT",
    caseNumber: input.project.slug || input.project.id,
    createdAt: now,
    updatedAt: now,
    responsible: responsibleLabel,
    parties: [],
    status: input.project.status,
    referenceId: input.project.id,
    documentationReport,
  };

  const builder = new ReportBuilder(metadata);

  builder.addSection({
    id: "cover",
    title: "Forside",
    blocks: [
      {
        kind: "PARAGRAPH",
        text: `${documentationReport.title}\n${documentationReport.projectName}`,
      },
    ],
  });

  builder.addSection({
    id: "summary",
    title: "Sammendrag",
    blocks: [
      {
        kind: "LIST",
        items: [
          ...summaryCards.map((card) => `${card.label}: ${card.value}`),
        ],
      },
    ],
  });

  builder.addSection({
    id: "category-breakdown",
    title: "Fordeling per kategori",
    blocks: categoryBreakdown.length
      ? [
          {
            kind: "TABLE",
            headers: ["Kategori", "Funn", "Bilder"],
            rows: categoryBreakdown.map((row) => ({
              cells: [
                row.label,
                String(row.findings),
                String(row.images),
              ],
            })),
          },
        ]
      : [{ kind: "PARAGRAPH", text: "Ingen kategorier registrert i valgt prosjekt." }],
  });

  if (zoneRows.length > 0) {
    builder.addSection({
      id: "zones",
      title: "Soneoversikt",
      blocks: [
        {
          kind: "TABLE",
          headers: ["Sone", "Dokumentert", "Funn", "Bilder"],
          rows: zoneRows.flat().map((zone) => ({
            cells: [
              zone.zone,
              zone.documented ? "Ja" : "Nei",
              String(zone.findings),
              String(zone.images),
            ],
          })),
        },
      ],
    });
  }

  entries.forEach((entry) => {
    builder.addSection({
      id: `entry-${entry.id}`,
      title: entry.entryNumber,
      blocks: [
        {
          kind: "LIST",
          items: [
            `Type: ${entry.typeLabel}`,
            `Kategori: ${entry.category}`,
            `Sone: ${entry.zone}`,
            `Dato: ${entry.dateLabel}`,
            `Tid: ${entry.timeLabel}`,
            `Risiko: ${entry.risk}`,
            `Antall bilder: ${entry.imageCount}`,
          ],
        },
        {
          kind: "PARAGRAPH",
          text: entry.description,
        },
        {
          kind: "PARAGRAPH",
          text: `Kommentar: ${entry.comment}`,
        },
      ],
    });

    entry.images.forEach((image) => {
      builder.addEvidence({
        id: image.id,
        evidenceCode: image.code,
        title: `${entry.entryNumber} - ${entry.category}`,
        description: `${entry.description}\nKommentar: ${entry.comment}\nSone: ${entry.zone}\nRisiko: ${entry.risk}`,
        category: entry.category,
        date: new Date(now),
        source: documentationReport.projectName,
        imageUrl: image.imageUrl,
        metadata: {
          entryId: entry.id,
          entryNumber: entry.entryNumber,
          dateLabel: image.dateLabel,
          sortOrder: image.sortOrder,
        },
      });
    });
  });

  builder.addSection({
    id: "conclusion",
    title: "Konklusjon",
    blocks: [
      {
        kind: "LIST",
        items: [
          `Totalt ${documentationReport.totalFindings} funn`,
          `Totalt ${documentationReport.totalImages} bilder`,
          `Dokumenterte soner: ${documentationReport.conclusionZones.join(", ") || "-"}`,
          "Alt materiale er lagret digitalt og kan spores tilbake til opprinnelig registrering i databasen.",
          `Dato: ${documentationReport.dateLabel}`,
          `Ansvarlig: ${documentationReport.responsibleLabel}`,
        ],
      },
    ],
  });

  return builder.build();
}
