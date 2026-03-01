
import { ReportBuilder } from "./report";
import {
  DocumentMetadata,
  ReportDocument,
  ContentBlock,
  EvidenceItem,
} from "./report-types";

interface LegalReportDraft {
  summary?: string;
  factualBasis?: string;
  technicalAnalysis?: string;
  includeTechnical?: boolean;
  liabilityBasis?: string;
  legalNormReference?: string;
  causationAnalysis?: string;
  foreseeabilityAssessment?: string;
  economicLoss?: string;
  legalConclusion?: string;
  includeLegal?: boolean;
  conclusion?: string;
}

interface ProjectForLegalReport {
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

export function mapLegalDraftToReport(
  project: ProjectForLegalReport,
  draft: LegalReportDraft,
  evidenceItems: EvidenceItem[],
  reportVersion: number
): ReportDocument {
  const now = new Date();

  // 1. Metadata
  const metadata: DocumentMetadata = {
    documentType: "LEGAL_CASE",
    caseNumber: `JUR-${project.id.substring(0, 8).toUpperCase()}-V${reportVersion}`,
    createdAt: now,
    updatedAt: now,
    responsible: project.participants.find(p => p.role === "OWNER" || p.role === "ADMIN")?.user.name || "Prosjekteier",
    parties: project.participants.map(p => ({
      role: p.role as any,
      name: p.user.name || p.user.email,
      contact: p.user.email
    })),
    status: "DRAFT", // Will be finalized upon generation
    referenceId: project.id,
  };

  const builder = new ReportBuilder(metadata);

  // 2. Project Info Section (Introduction)
  const propertyName = project.property?.name || "Prosjekt uten tilknyttet eiendom";
  const propertyAddress = project.property?.address ? `${project.property.address}, ${project.property.zipCode} ${project.property.city}` : "";
  const unitName = project.unit?.unitNumber || project.unit?.name;

  const introBlocks: ContentBlock[] = [
    {
      kind: "LIST",
      items: [
        `Prosjekt: ${project.title}`,
        `Eiendom: ${propertyName} ${propertyAddress ? `(${propertyAddress})` : ""}`,
        unitName ? `Enhet: ${unitName}` : "Enhet: Ikke spesifisert",
        `Dato: ${now.toLocaleDateString("no-NO")}`,
        `Rapportversjon: ${reportVersion}`,
      ],
    },
  ];

  builder.addSection({
    id: "intro",
    title: "Prosjektinformasjon",
    blocks: introBlocks,
  });

  // 3. Summary
  if (draft.summary) {
    builder.addSection({
      id: "summary",
      title: "1. Sammendrag",
      blocks: [
        { kind: "PARAGRAPH", text: draft.summary }
      ],
    });
  }

  // 4. Factual Basis
  if (draft.factualBasis) {
    builder.addSection({
      id: "factual",
      title: "2. Faktisk grunnlag",
      blocks: [
        { kind: "PARAGRAPH", text: draft.factualBasis }
      ],
    });
  }

  // 5. Technical Analysis (Optional)
  if (draft.includeTechnical && draft.technicalAnalysis) {
    builder.addSection({
      id: "technical",
      title: "3. Teknisk vurdering",
      blocks: [
        { kind: "PARAGRAPH", text: draft.technicalAnalysis }
      ],
    });
  }

  // 6. Legal Assessment (Optional)
  if (draft.includeLegal) {
    const legalBlocks: ContentBlock[] = [];
    
    if (draft.liabilityBasis) {
      legalBlocks.push({ kind: "HEADING", text: "Ansvarsgrunnlag", level: 3 });
      legalBlocks.push({ kind: "PARAGRAPH", text: draft.liabilityBasis });
    }
    
    if (draft.legalNormReference) {
      legalBlocks.push({ kind: "HEADING", text: "Lovhenvisning", level: 3 });
      legalBlocks.push({ kind: "PARAGRAPH", text: draft.legalNormReference });
    }
    
    if (draft.causationAnalysis) {
      legalBlocks.push({ kind: "HEADING", text: "Årsakssammenheng", level: 3 });
      legalBlocks.push({ kind: "PARAGRAPH", text: draft.causationAnalysis });
    }
    
    if (draft.foreseeabilityAssessment) {
      legalBlocks.push({ kind: "HEADING", text: "Påregnelighet", level: 3 });
      legalBlocks.push({ kind: "PARAGRAPH", text: draft.foreseeabilityAssessment });
    }
    
    if (draft.economicLoss) {
      legalBlocks.push({ kind: "HEADING", text: "Økonomisk tap", level: 3 });
      legalBlocks.push({ kind: "PARAGRAPH", text: draft.economicLoss });
    }
    
    if (draft.legalConclusion) {
      legalBlocks.push({ kind: "HEADING", text: "Juridisk Konklusjon", level: 3 });
      legalBlocks.push({ kind: "PARAGRAPH", text: draft.legalConclusion });
    }

    if (legalBlocks.length > 0) {
      builder.addSection({
        id: "legal",
        title: "4. Juridisk vurdering",
        blocks: legalBlocks,
      });
    }
  }

  // 7. Conclusion
  if (draft.conclusion) {
    builder.addSection({
      id: "conclusion",
      title: "5. Endelig konklusjon",
      blocks: [
        { kind: "PARAGRAPH", text: draft.conclusion }
      ],
    });
  }

  // 8. Evidence List (Summary in main report)
  if (evidenceItems.length > 0) {
    builder.addSection({
      id: "evidence-list",
      title: "Vedleggsoversikt",
      blocks: [
        { kind: "PARAGRAPH", text: `Totalt ${evidenceItems.length} bevis er vedlagt denne rapporten.` },
        { 
          kind: "LIST", 
          items: evidenceItems.map(e => `${e.evidenceCode}: ${e.title} (${e.date ? e.date.toLocaleDateString("no-NO") : "Ingen dato"})`) 
        }
      ],
    });

    // Add evidence items to builder so they are processed by the renderer
    evidenceItems.forEach(item => builder.addEvidence(item));
  }

  return builder.build();
}
