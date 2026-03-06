export type DocumentType = "PROJECT" | "LEGAL_CASE" | "SHOWCASE" | "RENTAL" | "PROSJEKTRAPPORT";

export interface Party {
  role: "OWNER" | "TENANT" | "CONTRACTOR" | "OTHER";
  name: string;
  contact?: string;
}

export interface DocumentMetadata {
  documentType: DocumentType;
  caseNumber: string;
  createdAt: Date;
  updatedAt: Date;
  responsible: string;
  parties: Party[];
  status: string;
  referenceId: string;
}

export type ContentBlockKind =
  | "PARAGRAPH"
  | "HEADING"
  | "IMAGE"
  | "TABLE"
  | "LIST";

export interface ParagraphBlock {
  kind: "PARAGRAPH";
  text: string;
}

export interface HeadingBlock {
  kind: "HEADING";
  text: string;
  level: 1 | 2 | 3;
}

export interface ImageBlock {
  kind: "IMAGE";
  evidenceId?: string;
  caption: string;
  imageUrl: string;
}

export interface ListBlock {
  kind: "LIST";
  items: string[];
}

export interface TableCell {
  text: string;
  backgroundColor?: string;
  textColor?: string;
  fontStyle?: "normal" | "bold";
}

export interface TableRow {
  cells: (string | TableCell)[];
}

export interface TableBlock {
  kind: "TABLE";
  headers: string[];
  rows: TableRow[];
}

export type ContentBlock =
  | ParagraphBlock
  | HeadingBlock
  | ImageBlock
  | ListBlock
  | TableBlock;

export interface Section {
  id: string;
  title: string;
  blocks: ContentBlock[];
  children?: Section[];
}

export interface EvidenceItem {
  id: string;
  evidenceCode: string;
  title: string;
  description?: string;
  category?: string;
  date?: Date;
  source?: string;
  sourceType?: string;
  imageUrl?: string;
  attachmentId?: string;
  missingLink?: boolean;
  missingLinkNote?: string;
  missingLinkResolved?: boolean;
  linkedEvidenceNumber?: number;
}

export interface EconomyLine {
  id: string;
  description: string;
  amount: number;
  party?: string;
  interestFromDate?: Date;
}

export interface EconomySummary {
  totalAmount: number;
  totalInterest?: number;
  perParty?: {
    party: string;
    amount: number;
  }[];
}

export interface Attachment {
  id: string;
  title: string;
  type: "PDF" | "IMAGE" | "OTHER";
  url: string;
  reference?: string;
}

export interface ClaimItem {
  id: string;
  statement: string;
  status: "UNVERIFIED" | "SUPPORTED" | "CONTRADICTED" | "PARTLY_TRUE";
  source?: string;
  sourceDate?: Date;
  evidence: EvidenceItem[];
}

export interface ReportDocument {
  metadata: DocumentMetadata;
  sections: Section[];
  evidenceIndex: EvidenceItem[];
  claims?: ClaimItem[];
  economyLines: EconomyLine[];
  economySummary?: EconomySummary;
  attachments: Attachment[];
}

