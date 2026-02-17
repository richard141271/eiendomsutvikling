import {
  Attachment,
  DocumentMetadata,
  EconomyLine,
  EvidenceItem,
  ReportDocument,
  Section,
  ContentBlock,
} from "./report-types";

export class ReportBuilder {
  private metadata: DocumentMetadata;
  private sections: Section[] = [];
  private evidenceIndex: EvidenceItem[] = [];
  private economyLines: EconomyLine[] = [];
  private attachments: Attachment[] = [];

  constructor(metadata: DocumentMetadata) {
    this.metadata = metadata;
  }

  addSection(section: Omit<Section, "children"> & { children?: Section[] }) {
    this.sections.push({ ...section });
    return this;
  }

  addSectionBlock(sectionId: string, block: ContentBlock) {
    const visit = (sections: Section[]): boolean => {
      for (const section of sections) {
        if (section.id === sectionId) {
          section.blocks.push(block);
          return true;
        }
        if (section.children && visit(section.children)) {
          return true;
        }
      }
      return false;
    };
    visit(this.sections);
    return this;
  }

  addEvidence(item: EvidenceItem) {
    this.evidenceIndex.push(item);
    return this;
  }

  addEconomyLine(line: EconomyLine) {
    this.economyLines.push(line);
    return this;
  }

  addAttachment(attachment: Attachment) {
    this.attachments.push(attachment);
    return this;
  }

  build(): ReportDocument {
    const perPartyTotals: Record<string, number> = {};
    for (const line of this.economyLines) {
      if (!line.party) continue;
      perPartyTotals[line.party] = (perPartyTotals[line.party] || 0) + line.amount;
    }

    const totalAmount = this.economyLines.reduce(
      (sum, line) => sum + line.amount,
      0
    );

    return {
      metadata: this.metadata,
      sections: this.sections,
      evidenceIndex: this.evidenceIndex,
      economyLines: this.economyLines,
      economySummary: {
        totalAmount,
        perParty:
          Object.keys(perPartyTotals).length > 0
            ? Object.entries(perPartyTotals).map(([party, amount]) => ({
                party,
                amount,
              }))
            : undefined,
      },
      attachments: this.attachments,
    };
  }
}

