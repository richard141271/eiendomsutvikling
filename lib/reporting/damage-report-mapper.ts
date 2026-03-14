import { ReportBuilder } from "./report";
import { ContentBlock, DocumentMetadata, EvidenceItem, ReportDocument } from "./report-types";

interface DamageReportDraft {
  projectName?: string;
  address?: string;
  gnrBnr?: string;
  client?: string;
  author?: string;
  company?: string;
  reportDate?: Date | string;
  caseNumber?: string;
  shortDescription?: string;
  observations?: string;
  technicalAssessment?: string;
  measurements?: any;
  diagrams?: string;
  drawings?: string;
  calculations?: string;
  causeOptions?: string;
  probableCause?: string;
  alternativeExplanations?: string;
  technicalJustification?: string;
  scope?: string;
  risk?: string;
  secondaryDamage?: string;
  sanitationNeed?: string;
  futureIssues?: string;
  conclusion?: string;
}

interface DamageReportSnapshot {
  draft?: DamageReportDraft;
  events?: { title: string; description?: string | null; date: Date | string; evidenceNumbers?: number[] }[];
}

interface ProjectForDamageReport {
  id: string;
  title: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  property?: {
    name?: string | null;
    address?: string | null;
    zipCode?: string | null;
    city?: string | null;
    gnr?: string | null;
    bnr?: string | null;
  } | null;
  unit?: {
    unitNumber?: string | null;
    name?: string | null;
  } | null;
  participants: {
    role: string;
    user: {
      name: string | null;
      email: string;
    };
  }[];
}

const isImageEvidence = (e: EvidenceItem) => Boolean(e.imageUrl);

const toVedleggCode = (index: number) => {
  let n = index;
  let code = "";
  while (n >= 0) {
    code = String.fromCharCode(65 + (n % 26)) + code;
    n = Math.floor(n / 26) - 1;
  }
  return code;
};

const resolveEvidenceRefs = (text: string, evidenceCodeMap: Map<string, string>) => {
  return text.replace(/\[\[REF:([a-zA-Z0-9-]+)\]\]/g, (_m, id) => evidenceCodeMap.get(id) || _m);
};

const toMeasurementRows = (measurements: any) => {
  const items = Array.isArray(measurements)
    ? measurements
    : typeof measurements === "object" && Array.isArray((measurements as any)?.items)
      ? (measurements as any).items
      : [];

  return (items || [])
    .filter(Boolean)
    .map((m: any) => ({
      label: typeof m?.label === "string" ? m.label : "",
      value: typeof m?.value === "number" ? String(m.value) : typeof m?.value === "string" ? m.value : "",
      unit: typeof m?.unit === "string" ? m.unit : "",
      method: typeof m?.method === "string" ? m.method : "",
      comment: typeof m?.comment === "string" ? m.comment : typeof m?.optionalComment === "string" ? m.optionalComment : "",
    }))
    .filter((m: any) => Boolean(m.label || m.value || m.unit || m.method || m.comment));
};

export function mapDamageDraftToReport(
  project: ProjectForDamageReport,
  snapshot: DamageReportSnapshot,
  evidenceItems: EvidenceItem[],
  reportVersion: number
): ReportDocument {
  const now = new Date();
  const draft = (snapshot?.draft || {}) as DamageReportDraft;
  const events = (snapshot?.events || []).slice().sort((a, b) => new Date(a.date as any).getTime() - new Date(b.date as any).getTime());

  const reportDate = draft.reportDate ? new Date(draft.reportDate as any) : now;

  const responsible =
    draft.author ||
    project.participants.find((p) => p.role === "OWNER" || p.role === "ADMIN")?.user.name ||
    project.participants[0]?.user.name ||
    "Rapportforfatter";

  const metadata: DocumentMetadata = {
    documentType: "DAMAGE_REPORT",
    caseNumber: draft.caseNumber || `SKADE-${project.id.substring(0, 8).toUpperCase()}-V${reportVersion}`,
    createdAt: reportDate,
    updatedAt: now,
    responsible,
    parties: project.participants.map((p) => ({
      role: p.role as any,
      name: p.user.name || p.user.email,
      contact: p.user.email,
    })),
    status: "DRAFT",
    referenceId: project.id,
  };

  const images = evidenceItems.filter(isImageEvidence).sort((a, b) => (a.date?.getTime() || 0) - (b.date?.getTime() || 0));
  const attachments = evidenceItems.filter((e) => !isImageEvidence(e)).sort((a, b) => (a.date?.getTime() || 0) - (b.date?.getTime() || 0));

  const evidenceCodeMap = new Map<string, string>();
  images.forEach((e, idx) => evidenceCodeMap.set(e.id, `Figur ${idx + 1}`));
  attachments.forEach((e, idx) => evidenceCodeMap.set(e.id, `Vedlegg ${toVedleggCode(idx)}`));

  const remappedEvidence = evidenceItems.map((e) => ({
    ...e,
    evidenceCode: evidenceCodeMap.get(e.id) || e.evidenceCode,
  }));

  const builder = new ReportBuilder(metadata);

  const propertyName = project.property?.name || "Prosjekt uten tilknyttet eiendom";
  const propertyAddress = project.property?.address ? `${project.property.address}, ${project.property.zipCode} ${project.property.city}` : "";
  const unitName = project.unit?.unitNumber || project.unit?.name;
  const gnrBnrFromProperty = project.property?.gnr && project.property?.bnr ? `${project.property.gnr}/${project.property.bnr}` : "";

  const introItems: string[] = [];
  introItems.push(`Prosjekt: ${draft.projectName || project.title}`);
  introItems.push(`Eiendom: ${propertyName} ${propertyAddress ? `(${propertyAddress})` : ""}`);
  if (unitName) introItems.push(`Enhet: ${unitName}`);
  if (draft.address) introItems.push(`Adresse: ${draft.address}`);
  if (draft.gnrBnr || gnrBnrFromProperty) introItems.push(`Gnr/Bnr: ${draft.gnrBnr || gnrBnrFromProperty}`);
  if (draft.client) introItems.push(`Oppdragsgiver: ${draft.client}`);
  if (draft.company) introItems.push(`Firma: ${draft.company}`);
  if (draft.author) introItems.push(`Rapportforfatter: ${draft.author}`);
  introItems.push(`Dato: ${reportDate.toLocaleDateString("nb-NO")}`);
  introItems.push(`Rapportversjon: ${reportVersion}`);

  builder.addSection({
    id: "intro",
    title: "Prosjektinformasjon",
    blocks: [{ kind: "LIST", items: introItems }],
  });

  if (draft.shortDescription) {
    builder.addSection({
      id: "short",
      title: "1. Kort beskrivelse",
      blocks: [{ kind: "PARAGRAPH", text: resolveEvidenceRefs(draft.shortDescription, evidenceCodeMap) }],
    });
  }

  const timelineBlocks: ContentBlock[] = [];
  if (events.length === 0) {
    timelineBlocks.push({ kind: "PARAGRAPH", text: "Ingen hendelser er registrert i tidslinjen." });
  } else {
    events.forEach((e) => {
      timelineBlocks.push({ kind: "HEADING", text: `${new Date(e.date as any).toLocaleDateString("nb-NO")} – ${e.title}`, level: 3 });
      if (e.description) {
        timelineBlocks.push({ kind: "PARAGRAPH", text: resolveEvidenceRefs(e.description, evidenceCodeMap) });
      }
      const codes = (e.evidenceNumbers || [])
        .map((num) => remappedEvidence.find((x) => x.evidenceNumber === num)?.evidenceCode)
        .filter(Boolean) as string[];
      if (codes.length > 0) {
        const figures = codes.filter((c) => c.startsWith("Figur"));
        const attachments = codes.filter((c) => c.startsWith("Vedlegg"));
        if (figures.length > 0) {
          timelineBlocks.push({ kind: "PARAGRAPH", text: `Figurer: ${figures.join(", ")}` });
        }
        if (attachments.length > 0) {
          timelineBlocks.push({ kind: "PARAGRAPH", text: `Vedlegg: ${attachments.join(", ")}` });
        }
      }
    });
  }

  builder.addSection({
    id: "timeline",
    title: "2. Hendelsesforløp",
    blocks: timelineBlocks,
  });

  const documentationBlocks: ContentBlock[] = [];
  documentationBlocks.push({ kind: "PARAGRAPH", text: `Totalt ${remappedEvidence.length} dokumentasjons-elementer er vedlagt denne rapporten.` });
  documentationBlocks.push({
    kind: "LIST",
    items: remappedEvidence.map((e) => `${e.evidenceCode}: ${e.title}`),
  });
  builder.addSection({
    id: "documentation",
    title: "3. Dokumentasjon",
    blocks: documentationBlocks,
  });

  const technicalBlocks: ContentBlock[] = [];
  if (draft.observations) {
    technicalBlocks.push({ kind: "HEADING", text: "Observasjoner", level: 3 });
    technicalBlocks.push({ kind: "PARAGRAPH", text: resolveEvidenceRefs(draft.observations, evidenceCodeMap) });
  }
  if (draft.technicalAssessment) {
    technicalBlocks.push({ kind: "HEADING", text: "Tekniske vurderinger", level: 3 });
    technicalBlocks.push({ kind: "PARAGRAPH", text: resolveEvidenceRefs(draft.technicalAssessment, evidenceCodeMap) });
  }
  const measurementRows = toMeasurementRows(draft.measurements);
  if (measurementRows.length > 0) {
    technicalBlocks.push({ kind: "HEADING", text: "Målinger", level: 3 });
    technicalBlocks.push({
      kind: "TABLE",
      headers: ["Måling", "Verdi", "Enhet", "Metode", "Kommentar"],
      rows: measurementRows.map((m: any) => ({
        cells: [m.label, m.value, m.unit, m.method, m.comment || ""],
      })),
    });
  } else {
    const legacyMeasurementsText =
      typeof draft.measurements === "string"
        ? draft.measurements
        : typeof (draft.measurements as any)?.text === "string"
          ? (draft.measurements as any).text
          : "";
    if (legacyMeasurementsText) {
      technicalBlocks.push({ kind: "HEADING", text: "Målinger", level: 3 });
      technicalBlocks.push({ kind: "PARAGRAPH", text: resolveEvidenceRefs(legacyMeasurementsText, evidenceCodeMap) });
    }
  }
  if (draft.drawings) {
    technicalBlocks.push({ kind: "HEADING", text: "Tegninger", level: 3 });
    technicalBlocks.push({ kind: "PARAGRAPH", text: resolveEvidenceRefs(draft.drawings, evidenceCodeMap) });
  }
  if (draft.calculations) {
    technicalBlocks.push({ kind: "HEADING", text: "Beregninger", level: 3 });
    technicalBlocks.push({ kind: "PARAGRAPH", text: resolveEvidenceRefs(draft.calculations, evidenceCodeMap) });
  }
  if (technicalBlocks.length === 0) {
    technicalBlocks.push({ kind: "PARAGRAPH", text: "Ingen teknisk analyse er utfylt." });
  }
  builder.addSection({
    id: "technical",
    title: "4. Teknisk analyse",
    blocks: technicalBlocks,
  });

  const causeBlocks: ContentBlock[] = [];
  if (draft.causeOptions) {
    causeBlocks.push({ kind: "HEADING", text: "Mulige årsaker", level: 3 });
    causeBlocks.push({ kind: "PARAGRAPH", text: resolveEvidenceRefs(draft.causeOptions, evidenceCodeMap) });
  }
  if (draft.probableCause) {
    causeBlocks.push({ kind: "HEADING", text: "Sannsynlig årsak", level: 3 });
    causeBlocks.push({ kind: "PARAGRAPH", text: resolveEvidenceRefs(draft.probableCause, evidenceCodeMap) });
  }
  if (draft.alternativeExplanations) {
    causeBlocks.push({ kind: "HEADING", text: "Alternative forklaringer", level: 3 });
    causeBlocks.push({ kind: "PARAGRAPH", text: resolveEvidenceRefs(draft.alternativeExplanations, evidenceCodeMap) });
  }
  if (draft.technicalJustification) {
    causeBlocks.push({ kind: "HEADING", text: "Teknisk begrunnelse", level: 3 });
    causeBlocks.push({ kind: "PARAGRAPH", text: resolveEvidenceRefs(draft.technicalJustification, evidenceCodeMap) });
  }
  if (causeBlocks.length === 0) {
    causeBlocks.push({ kind: "PARAGRAPH", text: "Ingen årsaksvurdering er utfylt." });
  }
  builder.addSection({
    id: "cause",
    title: "5. Årsaksvurdering",
    blocks: causeBlocks,
  });

  const consequenceBlocks: ContentBlock[] = [];
  if (draft.scope) {
    consequenceBlocks.push({ kind: "HEADING", text: "Skadeomfang", level: 3 });
    consequenceBlocks.push({ kind: "PARAGRAPH", text: resolveEvidenceRefs(draft.scope, evidenceCodeMap) });
  }
  if (draft.risk) {
    consequenceBlocks.push({ kind: "HEADING", text: "Risiko", level: 3 });
    consequenceBlocks.push({ kind: "PARAGRAPH", text: resolveEvidenceRefs(draft.risk, evidenceCodeMap) });
  }
  if (draft.secondaryDamage) {
    consequenceBlocks.push({ kind: "HEADING", text: "Følgeskader", level: 3 });
    consequenceBlocks.push({ kind: "PARAGRAPH", text: resolveEvidenceRefs(draft.secondaryDamage, evidenceCodeMap) });
  }
  if (draft.sanitationNeed) {
    consequenceBlocks.push({ kind: "HEADING", text: "Saneringsbehov", level: 3 });
    consequenceBlocks.push({ kind: "PARAGRAPH", text: resolveEvidenceRefs(draft.sanitationNeed, evidenceCodeMap) });
  }
  if (draft.futureIssues) {
    consequenceBlocks.push({ kind: "HEADING", text: "Mulige fremtidige problemer", level: 3 });
    consequenceBlocks.push({ kind: "PARAGRAPH", text: resolveEvidenceRefs(draft.futureIssues, evidenceCodeMap) });
  }
  if (consequenceBlocks.length === 0) {
    consequenceBlocks.push({ kind: "PARAGRAPH", text: "Ingen konsekvensvurdering er utfylt." });
  }
  builder.addSection({
    id: "consequence",
    title: "6. Konsekvens",
    blocks: consequenceBlocks,
  });

  builder.addSection({
    id: "conclusion",
    title: "7. Konklusjon",
    blocks: [
      { kind: "PARAGRAPH", text: "Konklusjonen er en faglig vurdering basert på dokumentasjon og observasjoner. Den er ikke juridisk bindende." },
      { kind: "PARAGRAPH", text: draft.conclusion ? resolveEvidenceRefs(draft.conclusion, evidenceCodeMap) : "Ingen konklusjon er utfylt." },
    ],
  });

  const missingLinkItems = remappedEvidence.filter((e) => e.missingLink && !e.missingLinkResolved);
  if (missingLinkItems.length > 0) {
    builder.addSection({
      id: "missing-links",
      title: "Ufullstendige koblinger",
      blocks: [
        { kind: "PARAGRAPH", text: "Følgende dokumentasjons-elementer refererer til noe som foreløpig ikke er koblet i systemet:" },
        {
          kind: "LIST",
          items: missingLinkItems.map((e) => `${e.evidenceCode}: ${e.title} - Manglende referanse: ${e.missingLinkNote || "Ingen beskrivelse"}`),
        },
      ],
    });
  }

  remappedEvidence.forEach((item) => builder.addEvidence(item));

  return builder.build();
}
