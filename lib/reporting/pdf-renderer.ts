import { PDFDocument, StandardFonts } from "pdf-lib";
import { ReportDocument, Section, ContentBlock } from "./report-types";

export interface ReportRenderer {
  render(document: ReportDocument): Promise<Uint8Array>;
}

export class PdfReportRenderer implements ReportRenderer {
  async render(document: ReportDocument): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage();
    let { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    let y = height - 50;

    const ensureSpace = (neededHeight: number) => {
      if (y - neededHeight < 50) {
        page = pdfDoc.addPage();
        const size = page.getSize();
        width = size.width;
        height = size.height;
        y = height - 50;
      }
    };

    const drawLine = (text: string, size = 12) => {
      ensureSpace(size + 6);
      page.drawText(text, {
        x: 50,
        y,
        size,
        font,
      });
      y -= size + 6;
    };

    const maxTextWidth = () => width - 100;

    const drawWrappedText = (text: string, size = 12) => {
      const words = text.split(" ");
      let currentLine = "";

      for (const word of words) {
        const testLine = currentLine ? currentLine + " " + word : word;
        const testWidth = font.widthOfTextAtSize(testLine, size);

        if (testWidth > maxTextWidth()) {
          if (currentLine) {
            drawLine(currentLine, size);
            currentLine = word;
          } else {
            drawLine(testLine, size);
            currentLine = "";
          }
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) {
        drawLine(currentLine, size);
      }
    };

    drawLine(document.metadata.documentType, 18);
    drawLine(`Saksnummer: ${document.metadata.caseNumber}`);
    drawLine(`Opprettet: ${document.metadata.createdAt.toLocaleString()}`);
    drawLine(`Ansvarlig: ${document.metadata.responsible}`);
    drawLine(`Status: ${document.metadata.status}`);
    drawLine(`Referanse-ID: ${document.metadata.referenceId}`);
    drawLine("");

    const drawImage = async (imageUrl: string, caption?: string) => {
      try {
        console.log("FETCHING IMAGE:", imageUrl);
        const response = await fetch(imageUrl);
        console.log("IMAGE STATUS:", response.status);
        if (!response.ok) {
          console.log("FAILED URL:", imageUrl);
          drawLine(
            caption
              ? `[Bilde kunne ikke lastes: ${caption}]`
              : "[Bilde kunne ikke lastes]"
          );
          return;
        }

        const contentType = response.headers.get("content-type") || "";
        const arrayBuffer = await response.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);

        const image =
          contentType.includes("png") || contentType.includes("image/png")
            ? await pdfDoc.embedPng(bytes)
            : await pdfDoc.embedJpg(bytes);

        const imageDims = image.scale(1);
        const maxWidth = width - 100;
        const scale = imageDims.width > maxWidth ? maxWidth / imageDims.width : 1;
        const displayWidth = imageDims.width * scale;
        const displayHeight = imageDims.height * scale;

        ensureSpace(displayHeight + 20);

        page.drawImage(image, {
          x: 50,
          y: y - displayHeight,
          width: displayWidth,
          height: displayHeight,
        });

        y -= displayHeight + 20;

        if (caption) {
          drawLine(caption, 10);
        }
      } catch (error) {
        console.log("FAILED URL:", imageUrl);
        drawLine(
          caption
            ? `[Feil ved lasting av bilde: ${caption}]`
            : "[Feil ved lasting av bilde]"
        );
      }
    };

    const drawSection = async (section: Section, level: number) => {
      const prefix = "#".repeat(level);
      drawWrappedText(`${prefix} ${section.title}`, 14);
      for (const block of section.blocks) {
        await this.drawBlock(block, drawWrappedText, drawImage);
      }
      if (section.children) {
        for (const child of section.children) {
          await drawSection(child, Math.min(level + 1, 3));
        }
      }
    };

    for (const section of document.sections) {
      await drawSection(section, 1);
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

  private async drawBlock(
    block: ContentBlock,
    drawWrappedText: (text: string, size?: number) => void,
    drawImage: (imageUrl: string, caption?: string) => Promise<void>
  ) {
    if (block.kind === "PARAGRAPH") {
      drawWrappedText(block.text);
    } else if (block.kind === "HEADING") {
      const size = block.level === 1 ? 16 : block.level === 2 ? 14 : 12;
      drawWrappedText(block.text, size);
    } else if (block.kind === "LIST") {
      for (const item of block.items) {
        drawWrappedText(`• ${item}`);
      }
    } else if (block.kind === "IMAGE") {
      if (block.imageUrl) {
        await drawImage(block.imageUrl, block.caption);
      } else {
        drawWrappedText(`[Bilde: ${block.caption}]`);
      }
    }
  }
}
