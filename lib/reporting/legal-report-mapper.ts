
import { ReportDocument, DocumentMetadata, Section, ContentBlock, EvidenceItem } from "./report-types";
import { ReportBuilder } from "./report";

interface LegalReportData {
  project: {
    id: string;
    title: string;
    createdAt: Date;
    updatedAt: Date;
    property?: { name: string } | null;
    unit?: { unitNumber?: string; name?: string } | null;
  };
  draft: {
    summary?: string;
    factualBasis?: string;
    includeTechnical?: boolean;
    technicalAnalysis?: string;
    includeLegal?: boolean;
    liabilityBasis?: string;
    legalNormReference?: string;
    causationAnalysis?: string;
    foreseeabilityAssessment?: string;
    economicLoss?: string;
    legalConclusion?: string;
    conclusion?: string;
  };
  evidenceItems: {
    id: string;
    evidenceNumber: number;
    title: string;
    description?: string;
    fileId?: string;
    file?: {
      url: string;
      contentType: string;
    };
  }[];
  versionNumber: number;
}

export function mapLegalReportToDocument(data: LegalReportData): ReportDocument {
  const { project, draft, evidenceItems, versionNumber } = data;
  const now = new Date();

  const metadata: DocumentMetadata = {
    documentType: "LEGAL_CASE",
    caseNumber: `JUR-${project.id.slice(0, 8).toUpperCase()}-V${versionNumber}`,
    createdAt: now,
    updatedAt: now,
    responsible: "Juridisk Ansvarlig", // Could be dynamic if we had user info
    parties: [], // Could be populated if we had parties
    status: "UTKAST", // Or FINAL based on context
    referenceId: project.id,
  };

  const builder = new ReportBuilder(metadata);

  // 1. Sammendrag
  if (draft.summary) {
    builder.addSection({
      id: "summary",
      title: "1. Sammendrag",
      blocks: [
        { kind: "PARAGRAPH", text: draft.summary }
      ]
    });
  }

  // 2. Faktisk Grunnlag
  if (draft.factualBasis) {
    builder.addSection({
      id: "factualBasis",
      title: "2. Faktisk Grunnlag",
      blocks: [
        { kind: "PARAGRAPH", text: draft.factualBasis }
      ]
    });
  }

  // 3. Teknisk Vurdering
  if (draft.includeTechnical && draft.technicalAnalysis) {
    builder.addSection({
      id: "technicalAnalysis",
      title: "3. Teknisk Vurdering",
      blocks: [
        { kind: "PARAGRAPH", text: draft.technicalAnalysis }
      ]
    });
  }

  // 4. Juridisk Vurdering
  if (draft.includeLegal) {
    const legalBlocks: ContentBlock[] = [];
    
    if (draft.liabilityBasis) {
      legalBlocks.push({ kind: "HEADING", text: "4.1 Ansvarsgrunnlag", level: 2 });
      legalBlocks.push({ kind: "PARAGRAPH", text: draft.liabilityBasis });
    }
    
    if (draft.legalNormReference) {
      legalBlocks.push({ kind: "HEADING", text: "4.2 Lovhenvisning", level: 2 });
      legalBlocks.push({ kind: "PARAGRAPH", text: draft.legalNormReference });
    }

    if (draft.causationAnalysis) {
      legalBlocks.push({ kind: "HEADING", text: "4.3 Årsakssammenheng", level: 2 });
      legalBlocks.push({ kind: "PARAGRAPH", text: draft.causationAnalysis });
    }

    if (draft.foreseeabilityAssessment) {
      legalBlocks.push({ kind: "HEADING", text: "4.4 Påregnelighet", level: 2 });
      legalBlocks.push({ kind: "PARAGRAPH", text: draft.foreseeabilityAssessment });
    }

    if (draft.economicLoss) {
      legalBlocks.push({ kind: "HEADING", text: "4.5 Økonomisk tap", level: 2 });
      legalBlocks.push({ kind: "PARAGRAPH", text: draft.economicLoss });
    }

    if (draft.legalConclusion) {
      legalBlocks.push({ kind: "HEADING", text: "4.6 Juridisk Konklusjon", level: 2 });
      legalBlocks.push({ kind: "PARAGRAPH", text: draft.legalConclusion });
    }

    if (legalBlocks.length > 0) {
      builder.addSection({
        id: "legalAssessment",
        title: "4. Juridisk Vurdering",
        blocks: legalBlocks
      });
    }
  }

  // 5. Endelig Konklusjon
  if (draft.conclusion) {
    builder.addSection({
      id: "conclusion",
      title: "5. Endelig Konklusjon",
      blocks: [
        { kind: "PARAGRAPH", text: draft.conclusion }
      ]
    });
  }

  // Add Evidence Items
  evidenceItems.forEach(item => {
    builder.addEvidence({
      id: item.id,
      evidenceCode: `B-${String(item.evidenceNumber).padStart(3, '0')}`,
      title: item.title,
      description: item.description,
      category: "Dokumentasjon",
      date: project.createdAt, // Or evidence date if available
      imageUrl: item.file?.url,
    });
  });

  return builder.build();
}
