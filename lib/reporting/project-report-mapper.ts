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
    logBlocks.push({
      kind: "HEADING",
      text: `${entry.type === "NOTE" ? "Notat" : "Bilde"} ${
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

  project.entries
    .filter((entry) => entry.imageUrl)
    .forEach((entry) => {
      const evidenceCode = `B-${String(evidenceCounter).padStart(3, "0")}`;
      evidenceCounter += 1;

      builder.addEvidence({
        id: entry.id,
        evidenceCode,
        title: entry.content || "Prosjektbilde",
        description: entry.content || undefined,
        category: "Bilde",
        date: entry.createdAt,
        source: propertyName,
        imageUrl: entry.imageUrl || undefined,
      });
    });

  return builder.build();
}

