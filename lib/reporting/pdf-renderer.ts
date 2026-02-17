import { PDFDocument, StandardFonts } from "pdf-lib";
import { ReportDocument, Section, ContentBlock } from "./report-types";

export interface ReportRenderer {
  render(document: ReportDocument): Promise<Uint8Array>;
}

export class PdfReportRenderer implements ReportRenderer {
  async render(document: ReportDocument): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    let y = height - 50;

    const drawLine = (text: string, size = 12) => {
      if (y < 50) {
        y = height - 50;
        pdfDoc.addPage();
      }
      const currentPage = pdfDoc.getPage(pdfDoc.getPageCount() - 1);
      currentPage.drawText(text, {
        x: 50,
        y,
        size,
        font,
      });
      y -= size + 6;
    };

    drawLine(document.metadata.documentType, 18);
    drawLine(`Saksnummer: ${document.metadata.caseNumber}`);
    drawLine(`Opprettet: ${document.metadata.createdAt.toLocaleString()}`);
    drawLine(`Ansvarlig: ${document.metadata.responsible}`);
    drawLine(`Status: ${document.metadata.status}`);
    drawLine(`Referanse-ID: ${document.metadata.referenceId}`);
    drawLine("");

    const drawSection = (section: Section, level: number) => {
      const prefix = "#".repeat(level);
      drawLine(`${prefix} ${section.title}`, 14);
      for (const block of section.blocks) {
        this.drawBlock(block, drawLine);
      }
      if (section.children) {
        for (const child of section.children) {
          drawSection(child, Math.min(level + 1, 3));
        }
      }
    };

    for (const section of document.sections) {
      drawSection(section, 1);
      drawLine("");
    }

    if (document.evidenceIndex.length > 0) {
      pdfDoc.addPage();
      y = height - 50;
      drawLine("Bevisindeks", 16);
      for (const item of document.evidenceIndex) {
        drawLine(
          `${item.evidenceCode} - ${item.title}${
            item.date ? " (" + item.date.toLocaleDateString("no-NO") + ")" : ""
          }`
        );
      }
    }

    if (document.economySummary && document.economyLines.length > 0) {
      pdfDoc.addPage();
      y = height - 50;
      drawLine("Økonomi", 16);
      for (const line of document.economyLines) {
        drawLine(
          `${line.description}: ${line.amount.toFixed(2)}${
            line.party ? " (" + line.party + ")" : ""
          }`
        );
      }
      drawLine("");
      drawLine(
        `Totalt krav: ${document.economySummary.totalAmount.toFixed(2)}`,
        14
      );
    }

    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
  }

  private drawBlock(block: ContentBlock, drawLine: (text: string, size?: number) => void) {
    if (block.kind === "PARAGRAPH") {
      drawLine(block.text);
    } else if (block.kind === "HEADING") {
      const size = block.level === 1 ? 16 : block.level === 2 ? 14 : 12;
      drawLine(block.text, size);
    } else if (block.kind === "LIST") {
      for (const item of block.items) {
        drawLine(`• ${item}`);
      }
    } else if (block.kind === "IMAGE") {
      drawLine(`[Bilde: ${block.caption}]`);
    }
  }
}

