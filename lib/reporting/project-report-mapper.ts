import { ReportBuilder } from "./report";
import {
  DocumentMetadata,
  ReportDocument,
  ContentBlock,
} from "./report-types";

interface ProjectEntry {
  id: string;
  type: "NOTE" | "IMAGE";
  createdAt: Date;
  content?: string | null;
  imageUrl?: string | null;
}

interface ProjectTask {
  id: string;
  task: string;
  done: boolean;
}

interface ProjectForReport {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  property?: {
    name?: string | null;
  } | null;
  unit?: {
    unitNumber?: string | null;
    name?: string | null;
  } | null;
  entries: ProjectEntry[];
  tasks: ProjectTask[];
  evidenceItems?: {
    id: string;
    evidenceNumber: number;
    originalEntryId: string | null;
    title: string;
    description: string | null;
  }[];
}

export function mapProjectToReport(project: ProjectForReport): ReportDocument {
  const now = new Date();

  const metadata: DocumentMetadata = {
    documentType: "PROSJEKTRAPPORT",
    caseNumber: project.id,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt || now,
    responsible: "Prosjekteier",
    parties: [],
    status: project.status,
    referenceId: project.id,
  };

  const builder = new ReportBuilder(metadata);

  const propertyName =
    project.property?.name || "Prosjekt uten tilknyttet eiendom";
  const unitName = project.unit?.unitNumber || project.unit?.name;

  const summaryBlocks: ContentBlock[] = [
    {
      kind: "PARAGRAPH",
      text: project.description || "Ingen beskrivelse registrert.",
    },
  ];

  summaryBlocks.push({
    kind: "LIST",
    items: [
      `Eiendom: ${propertyName}`,
      unitName ? `Enhet: ${unitName}` : "Enhet: Ikke satt",
      `Status: ${project.status}`,
      `Opprettet: ${project.createdAt.toLocaleDateString("no-NO")}`,
    ],
  });

  builder.addSection({
    id: "summary",
    title: "Sammendrag",
    blocks: summaryBlocks,
  });

  const logBlocks: ContentBlock[] = [];

  project.entries.forEach((entry, index) => {
    let typeLabel = "Oppføring";
    if (entry.type === "NOTE") typeLabel = "Notat";
    else if (entry.type === "IMAGE") typeLabel = "Bilde";
    else if ((entry as any).type === "DOCUMENT") typeLabel = "Dokument";

    logBlocks.push({
      kind: "HEADING",
      text: `${typeLabel} ${
        index + 1
      } – ${entry.createdAt.toLocaleDateString("no-NO")} ${entry.createdAt.toLocaleTimeString("no-NO", {
        hour: "2-digit",
        minute: "2-digit",
      })}`,
      level: 3,
    });

    if (entry.content) {
      logBlocks.push({
        kind: "PARAGRAPH",
        text: entry.content,
      });
    }

    if (entry.imageUrl) {
      logBlocks.push({
        kind: "IMAGE",
        caption: entry.content || "Bilde uten tekst",
        imageUrl: entry.imageUrl,
      });
    }
  });

  if (logBlocks.length > 0) {
    builder.addSection({
      id: "log",
      title: "Logg",
      blocks: logBlocks,
    });
  }

  const taskBlocks: ContentBlock[] = [];

  project.tasks.forEach((task) => {
    taskBlocks.push({
      kind: "PARAGRAPH",
      text: `${task.done ? "[x]" : "[ ]"} ${task.task}`,
    });
  });

  if (taskBlocks.length > 0) {
    builder.addSection({
      id: "tasks",
      title: "Sjekkliste",
      blocks: taskBlocks,
    });
  }

  let evidenceCounter = 1;
  const evidenceMap = new Map<string, { evidenceNumber: number; title: string; description: string | null }>();

  if (project.evidenceItems) {
    project.evidenceItems.forEach((item) => {
      if (item.originalEntryId) {
        evidenceMap.set(item.originalEntryId, {
          evidenceNumber: item.evidenceNumber,
          title: item.title,
          description: item.description,
        });
      }
    });
  }

  project.entries
    .filter((entry) => entry.imageUrl)
    .forEach((entry) => {
      const mapped = evidenceMap.get(entry.id);
      let evidenceCode: string;
      let title = entry.content || "Prosjektbilde";
      let description = entry.content || undefined;

      if (mapped) {
        evidenceCode = `B-${String(mapped.evidenceNumber).padStart(3, "0")}`;
        title = mapped.title;
        description = mapped.description || undefined;
      } else {
        // SSOT: Never generate "B-xxx" for items not in Bevisbanken.
        // Use "L-" (Logg) prefix to avoid collision and clearly distinguish non-evidence.
        evidenceCode = `L-${String(evidenceCounter).padStart(3, "0")}`;
        evidenceCounter += 1;
      }

      builder.addEvidence({
        id: entry.id,
        evidenceCode,
        title,
        description,
        category: "Bilde",
        date: entry.createdAt,
        source: propertyName,
        imageUrl: entry.imageUrl || undefined,
      });
    });

  return builder.build();
}

