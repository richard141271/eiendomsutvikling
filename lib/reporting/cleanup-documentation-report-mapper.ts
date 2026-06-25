import { ReportBuilder } from "./report";
import { DocumentMetadata, ReportDocument } from "./report-types";
import type { CleanupEvidenceEntry, CleanupEvidenceMap, CleanupProject } from "@/src/modules/rydderen/types";
import { getCleanupDocumentationTypeConfig } from "@/src/modules/rydderen/utils";

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

export function mapCleanupDocumentationToReport(input: CleanupDocumentationReportInput): ReportDocument {
  const now = new Date();
  const filteredEntries = sortEntries(input.entries.filter((entry) => matchesSearch(entry, input.search || "")));
  const totalImages = filteredEntries.reduce((sum, entry) => sum + entry.images.length, 0);
  const categories = Array.from(
    filteredEntries.reduce((map, entry) => {
      const key = entry.category || "Annet";
      map.set(key, (map.get(key) || 0) + 1);
      return map;
    }, new Map<string, number>())
  )
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => `${category}: ${count}`);

  const metadata: DocumentMetadata = {
    documentType: "DOKUMENTASJONSRAPPORT",
    caseNumber: input.project.slug || input.project.id,
    createdAt: now,
    updatedAt: now,
    responsible: "Rydder'n",
    parties: [],
    status: input.project.status,
    referenceId: input.project.id,
  };

  const builder = new ReportBuilder(metadata);

  builder.addSection({
    id: "overview",
    title: "Oversikt",
    blocks: [
      {
        kind: "LIST",
        items: [
          `Prosjekt: ${input.project.name}`,
          `Adresse: ${input.map?.address || "-"}`,
          `Saksnavn: ${input.map?.caseName || "-"}`,
          `Dato: ${now.toLocaleDateString("no-NO")}`,
          `Antall funn: ${filteredEntries.length}`,
          `Antall bilder: ${totalImages}`,
          `Kategorier: ${categories.join(", ") || "-"}`,
        ],
      },
    ],
  });

  builder.addSection({
    id: "entries",
    title: "Registrerte funn",
    blocks: filteredEntries.length
      ? [
          {
            kind: "TABLE",
            headers: ["Nummer", "Type / kategori", "Sone", "Bilder"],
            rows: filteredEntries.map((entry) => ({
              cells: [
                entry.entryNumber,
                `${getCleanupDocumentationTypeConfig(entry.entryType).shortLabel}${entry.category ? ` / ${entry.category}` : ""}`,
                entry.zone || "-",
                String(entry.images.length),
              ],
            })),
          },
        ]
      : [{ kind: "PARAGRAPH", text: "Ingen funn registrert i valgt prosjekt." }],
  });

  filteredEntries.forEach((entry) => {
    const type = getCleanupDocumentationTypeConfig(entry.entryType);
    const entryDate = toEntryDate(entry);

    builder.addSection({
      id: `entry-${entry.id}`,
      title: `${entry.entryNumber} - ${type.shortLabel}`,
      blocks: [
        {
          kind: "LIST",
          items: [
            `Kategori: ${entry.category || "-"}`,
            `Sone: ${entry.zone || "-"}`,
            `Dato: ${entry.createdDate || entryDate.toLocaleDateString("no-NO")}`,
            `Tid: ${entry.createdTime || entryDate.toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" })}`,
            `Risiko: ${entry.risk || "-"}`,
            `Antall bilder: ${entry.images.length}`,
          ],
        },
        {
          kind: "PARAGRAPH",
          text: entry.description || "Ingen beskrivelse",
        },
        {
          kind: "PARAGRAPH",
          text: `Kommentar: ${entry.comment || "-"}`,
        },
      ],
    });

    entry.images
      .slice()
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .forEach((image, index) => {
        const imageUrl = image.imageUrl || image.thumbnailUrl || undefined;
        if (!imageUrl) {
          return;
        }

        builder.addEvidence({
          id: image.id,
          evidenceCode: `${entry.entryNumber}-${String(index + 1).padStart(2, "0")}`,
          title: `${entry.entryNumber}${entry.category ? ` - ${entry.category}` : ""}`,
          description: [
            `${type.label}`,
            entry.description || "Ingen beskrivelse",
            `Kommentar: ${entry.comment || "-"}`,
            `Sone: ${entry.zone || "-"}`,
            `Risiko: ${entry.risk || "-"}`,
          ].join("\n"),
          category: entry.category || undefined,
          date: entryDate,
          source: input.project.name,
          imageUrl,
        });
      });
  });

  return builder.build();
}
