import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { ReportDocument, Section, ContentBlock, EvidenceItem } from "./report-types";

// Dynamic import for sharp to avoid build/runtime crashes if missing
let sharp: any;
try {
  sharp = require("sharp");
} catch (e) {
  console.warn("Sharp module not found, image processing will be limited.");
}

const sanitizeText = (text: string): string => {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00A0/g, " ")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2022\u2023\u25E6]/g, "- ")
    .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\u00FF]/g, "");
};

// Helper for breaking text into lines without drawing
const wordWrap = (text: string, font: any, size: number, maxWidth: number): string[] => {
  const normalized = sanitizeText(text);
  const paragraphs = normalized.split("\n");
  const lines: string[] = [];

  for (const p of paragraphs) {
    if (!p) {
      lines.push("");
      continue;
    }
    const words = p.split(" ");
    let line = "";
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (font.widthOfTextAtSize(test, size) > maxWidth) {
        if (line) lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
};

export interface ReportPackage {
  main: Uint8Array;
  parts: { name: string; data: Uint8Array }[];
}

export interface ReportRenderer {
  render(document: ReportDocument): Promise<Uint8Array>;
  renderPackage(document: ReportDocument): Promise<ReportPackage>;
}

export class PdfReportRenderer implements ReportRenderer {
  async renderPackage(document: ReportDocument): Promise<ReportPackage> {
    // --- 1. Generate Main Report ---
    const mainPdf = await PDFDocument.create();
    const mainFont = await mainPdf.embedFont(StandardFonts.Helvetica);
    const mainBoldFont = await mainPdf.embedFont(StandardFonts.HelveticaBold);
    
    let page = mainPdf.addPage();
    let { width, height } = page.getSize();
    let y = height - 50;

    const ensureSpace = (needed: number) => {
      if (y - needed < 50) {
        page = mainPdf.addPage();
        y = height - 50;
      }
    };

    const drawLine = (text: string, size = 12, font = mainFont, x = 50, color = rgb(0, 0, 0)) => {
      const safe = sanitizeText(text).replace(/\n/g, " ");
      ensureSpace(size + 6);
      page.drawText(safe, { x, y, size, font, color });
      y -= size + 6;
    };

    const drawWrappedText = (text: string, size = 12, font = mainFont, x = 50, maxWidth = width - 100) => {
      const normalized = sanitizeText(text);
      const paragraphs = normalized.split("\n");
      for (const p of paragraphs) {
        if (!p) { y -= size + 6; continue; }
        const words = p.split(" ");
        let line = "";
        for (const w of words) {
          const test = line ? line + " " + w : w;
          if (font.widthOfTextAtSize(test, size) > maxWidth) {
            drawLine(line, size, font, x);
            line = w;
          } else {
            line = test;
          }
        }
        if (line) drawLine(line, size, font, x);
      }
    };

    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? rgb(
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255
      ) : undefined;
    };

    const drawTable = (
      headers: string[],
      rows: { cells: (string | { text: string; backgroundColor?: string; textColor?: string; fontStyle?: "normal" | "bold" })[] }[]
    ) => {
      const startX = 50;
      const tableWidth = width - 100;
      const colCount = Math.max(headers.length, 1);
      const colWidths = colCount === 3 ? [tableWidth * 0.4, tableWidth * 0.4, tableWidth * 0.2] : Array.from({ length: colCount }, () => tableWidth / colCount);
      const fontSize = 10;
      const padding = 5;
      const lineHeight = fontSize + 4;

      // Draw Headers
      ensureSpace(lineHeight + 10);
      let currentX = startX;
      headers.forEach((header, i) => {
        page.drawText(header, { x: currentX + padding, y, size: fontSize, font: mainBoldFont });
        currentX += colWidths[i] || 0;
      });
      y -= lineHeight + 5;
      
      // Draw horizontal line below header
      page.drawLine({
        start: { x: startX, y: y + 5 },
        end: { x: startX + tableWidth, y: y + 5 },
        thickness: 1,
        color: rgb(0, 0, 0),
      });

      // Draw Rows
      for (const row of rows) {
        // Normalize cells to objects for easier processing
        const normalizedCells = row.cells.map(cell => 
          typeof cell === 'string' ? { text: cell } : cell
        );

        // Calculate row height based on max lines in any cell
        const cellLines: string[][] = normalizedCells.map((cell, i) =>
          wordWrap(
            cell.text,
            cell.fontStyle === "bold" ? mainBoldFont : mainFont,
            fontSize,
            (colWidths[i] || tableWidth / colCount) - padding * 2
          )
        );
        const maxLines = Math.max(...cellLines.map(lines => lines.length));
        const rowHeight = (maxLines * lineHeight) + (padding * 2);

        ensureSpace(rowHeight);

        // Draw cells
        currentX = startX;
        normalizedCells.forEach((cell, i) => {
          // Draw background if present
          if (cell.backgroundColor) {
            const bgRgb = hexToRgb(cell.backgroundColor);
            if (bgRgb) {
              page.drawRectangle({
                x: currentX,
                y: y - rowHeight,
                width: colWidths[i] || tableWidth / colCount,
                height: rowHeight,
                color: bgRgb,
              });
            }
          }

          const lines = cellLines[i];
          const textRgb = cell.textColor ? hexToRgb(cell.textColor) : rgb(0, 0, 0);
          
          lines.forEach((line, lineIdx) => {
            page.drawText(line, {
              x: currentX + padding,
              y: y - padding - (lineIdx * lineHeight),
              size: fontSize,
              font: cell.fontStyle === 'bold' ? mainBoldFont : mainFont,
              color: textRgb || rgb(0, 0, 0),
            });
          });
          currentX += colWidths[i] || tableWidth / colCount;
        });

        y -= rowHeight;
        
        // Draw bottom border for row
        page.drawLine({
          start: { x: startX, y: y },
          end: { x: startX + tableWidth, y: y },
          thickness: 0.5,
          color: rgb(0.8, 0.8, 0.8),
        });
      }
      y -= 10; // Extra space after table
    };

    // Metadata & Cover Page
    if (document.metadata.documentType === "LEGAL_CASE") {
      // Legal Report Cover Page
      y = height - 150;
      drawLine("JURIDISK DOKUMENTASJONSRAPPORT", 24, mainBoldFont, 50, rgb(0, 0.2, 0.4));
      y -= 20;
      drawLine(document.metadata.caseNumber, 16, mainFont, 50, rgb(0.4, 0.4, 0.4));
      y -= 40;
      
      drawLine("Sak:", 12, mainBoldFont);
      drawLine(document.metadata.referenceId, 12, mainFont); // Usually Project Title/ID
      
      y -= 20;
      drawLine("Dato:", 12, mainBoldFont);
      drawLine(document.metadata.createdAt.toLocaleDateString("no-NO"), 12, mainFont);
      
      y -= 20;
      drawLine("Ansvarlig:", 12, mainBoldFont);
      drawLine(document.metadata.responsible, 12, mainFont);

      // Footer
      page.drawText("Generert av Eiendomsappen", {
        x: 50,
        y: 50,
        size: 10,
        font: mainFont,
        color: rgb(0.6, 0.6, 0.6),
      });

      // New page for content
      page = mainPdf.addPage();
      y = height - 50;
    } else {
      // Standard Report Header
      drawLine(document.metadata.documentType, 18, mainBoldFont);
      drawLine(`Saksnummer: ${document.metadata.caseNumber}`);
      drawLine(`Opprettet: ${document.metadata.createdAt.toLocaleString("no-NO")}`);
      drawLine(`Ansvarlig: ${document.metadata.responsible}`);
      drawLine("");
    }

    // Sections (Summary, Analysis, etc.)
    // Note: We skip images in sections for Main Report to keep it small, 
    // unless strictly necessary. Assuming text-heavy sections here.
    for (const section of document.sections) {
      drawLine(section.title, 16, mainBoldFont);
      for (const block of section.blocks) {
        if (block.kind === "PARAGRAPH") drawWrappedText(block.text);
        if (block.kind === "HEADING") drawLine(block.text, 14, mainBoldFont);
        if (block.kind === "LIST") block.items.forEach(i => drawWrappedText("- " + i));
        if (block.kind === "TABLE") drawTable(block.headers, block.rows);
        // Skip heavy images in main report sections if possible, or keep logic simple
      }
      drawLine("");
    }

    // --- Evidence Index & Appendices (Integrated Loop with Batching) ---
    const parts: { name: string; data: Uint8Array }[] = [];
    const MAX_PART_SIZE = 45 * 1024 * 1024; // 45MB
    const MAX_PART_IMAGES = 250;
    
    let currentPartNum = 1;
    let currentPartSize = 0;
    let currentPartImages = 0;
    let currentPartStartEvidenceCode = document.evidenceIndex[0]?.evidenceCode || "";
    
    // Helper to init new part
    const initPart = async () => {
      const pdf = await PDFDocument.create();
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
      return { pdf, font, bold };
    };

    let { pdf: partPdf, font: partFont, bold: partBold } = await initPart();

    // Batch processing configuration
    const BATCH_SIZE = 1; // Strictly sequential for maximum stability
    
    if (document.evidenceIndex.length > 0) {
      page = mainPdf.addPage();
      y = height - 50;
      drawLine("Bevisindeks", 16, mainBoldFont);
      
      for (let i = 0; i < document.evidenceIndex.length; i += BATCH_SIZE) {
        const batch = document.evidenceIndex.slice(i, i + BATCH_SIZE);
        
        // Process batch sequentially (effectively) due to BATCH_SIZE=1
        const processedBatch = await Promise.all(batch.map(async (item, batchIdx) => {
          const globalIdx = i + batchIdx;
          // Calculate part index dynamically based on MAX_PART_IMAGES
          // This is an estimate for the Main Report text. 
          // Actual splitting depends on size/count during iteration.
          const partIndex = Math.floor(globalIdx / MAX_PART_IMAGES) + 1;
          
          if (!item.imageUrl && !item.sourceType) return { item, globalIdx, partIndex, imgBytes: null, thumbBytes: null, error: null };

          // If source type exists but no image URL (e.g. audio/video), return placeholder info immediately
          if (!item.imageUrl && item.sourceType) {
             return { item, globalIdx, partIndex, imgBytes: null, thumbBytes: null, error: null };
          }

          try {
            // Fetch with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000); 
            
            const response = await fetch(item.imageUrl!, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (!response.ok) throw new Error(`Status ${response.status}`);
            
            const buffer = await response.arrayBuffer();
            const imgBytes = new Uint8Array(buffer);
            
            // Generate thumbnail
            let thumbBytes: Uint8Array | null = null;
            try {
              if (sharp) {
                const sharpBuffer = await sharp(buffer).resize(300).jpeg({ quality: 60 }).toBuffer();
                thumbBytes = new Uint8Array(sharpBuffer);
              } else {
                console.warn("Sharp not available, skipping resize");
                if (imgBytes.byteLength < 500 * 1024) {
                   thumbBytes = imgBytes;
                }
              }
            } catch (e) {
              console.warn("Sharp resize failed:", e);
              // Fallback: If image is small enough (<500KB), use original as thumb, else skip thumb to save memory
              if (imgBytes.byteLength < 500 * 1024) {
                thumbBytes = imgBytes;
              }
            }

            return { item, globalIdx, partIndex, imgBytes, thumbBytes, error: null };
          } catch (e) {
            console.error(`Failed to process image ${item.evidenceCode}:`, e);
            return { item, globalIdx, partIndex, imgBytes: null, thumbBytes: null, error: e instanceof Error ? e.message : "Unknown error" };
          }
        }));

        // Embed processed batch into PDFs sequentially
        for (const result of processedBatch) {
          const { item, partIndex, imgBytes, thumbBytes, error } = result;
          
          // --- Main Report: Evidence Item Entry ---
          // Don't rely on a big ensureSpace upfront for the whole block, 
          // because text length is unknown. Just ensure enough for the first line of text.
          ensureSpace(20); 
          
          // Text info
          const titleText = `${item.evidenceCode} - ${item.title}`;
          drawWrappedText(titleText, 12, mainBoldFont);
          
          if (item.date) drawLine(`Dato: ${item.date.toLocaleDateString("no-NO")}`, 10);
          
          if (item.linkedEvidenceNumber) {
             drawLine(`Refererer til: Bevis B-${String(item.linkedEvidenceNumber).padStart(3, '0')}`, 10, mainFont, 50, rgb(0, 0.4, 0.8));
          }

          // Use the calculated partIndex for the text, which should align with our splitting logic
          drawLine(`Se Vedlegg Del ${partIndex}`, 10, mainFont);

          // 1. Add Thumbnail to Main Report
          if (thumbBytes) {
            try {
              const image = await mainPdf.embedJpg(thumbBytes).catch(() => mainPdf.embedPng(thumbBytes).catch(() => null));
              if (image) {
                const dims = image.scale(1);
                const aspect = dims.width / dims.height;
                const thumbHeight = 80;
                const thumbWidth = thumbHeight * aspect;
                
                // CRITICAL FIX: Check space for image specifically to prevent it going off-page
                if (y - thumbHeight < 50) {
                    page = mainPdf.addPage();
                    y = height - 50;
                }

                page.drawImage(image, {
                  x: 50,
                  y: y - thumbHeight,
                  width: thumbWidth,
                  height: thumbHeight
                });
                y -= thumbHeight + 10;
              }
            } catch (e) {
              console.error("Thumbnail embedding failed:", e);
            }
          } else if (error) {
             drawLine(`[Feil ved bildehenting: ${error}]`, 10, mainFont);
             y -= 10;
          } else if (item.imageUrl) {
             y -= 20; 
          } else if (item.sourceType) {
             let typeLabel = "ANNET FILVEDLEGG";
             if (item.sourceType === 'audio') typeLabel = "LYDOPPTAK";
             if (item.sourceType === 'video') typeLabel = "VIDEO";
             if (item.sourceType === 'sms') typeLabel = "SMS / MELDING";
             if (item.sourceType === 'public_document') typeLabel = "OFFENTLIG DOKUMENT";
             if (item.sourceType === 'measurement') typeLabel = "TEKNISK MÅLING";
             if (item.sourceType === 'expert_report') typeLabel = "SAKKYNDIG RAPPORT";
             if (item.sourceType === 'witness_statement') typeLabel = "VITNEFORKLARING";
             if (item.sourceType === 'email') typeLabel = "E-POST";
             if (item.sourceType === 'document') typeLabel = "DOKUMENT";
             
             drawLine(`[${typeLabel}] (Se vedlegg)`, 10, mainFont);
             y -= 20;
          }

          // 2. Add Full Image (or Error Placeholder) to Appendix
          if (item.imageUrl || item.sourceType) {
            const imgSize = imgBytes ? imgBytes.byteLength : 0;
            
            // Check limits: If adding this image exceeds limit, save current part and start new
            // Strict check: if we hit the limit, we MUST split.
            // Using >= for count to ensure we don't exceed MAX_PART_IMAGES per part.
            if (currentPartImages >= MAX_PART_IMAGES || (currentPartImages > 0 && currentPartSize + imgSize > MAX_PART_SIZE)) {
                console.log(`Splitting part ${currentPartNum}. Images: ${currentPartImages}, Size: ${currentPartSize}`);
                
                // Add title page to the completed part
                const titlePage = partPdf.insertPage(0);
                const { height: tpHeight } = titlePage.getSize();
                let pY = tpHeight - 100;
                titlePage.drawText(sanitizeText(`Vedlegg Del ${currentPartNum}`), { x: 50, y: pY, size: 24, font: partBold });
                pY -= 40;
                titlePage.drawText(sanitizeText(`Til sak: ${document.metadata.caseNumber}`), { x: 50, y: pY, size: 14, font: partFont });
                pY -= 20;
                
                // Calculate end code for this part
                const endCode = document.evidenceIndex[result.globalIdx - 1]?.evidenceCode || "Ukjent";
                titlePage.drawText(sanitizeText(`Inneholder bevis ${currentPartStartEvidenceCode} til ${endCode}`), { x: 50, y: pY, size: 12, font: partFont });

                parts.push({
                    name: `Vedlegg Del ${currentPartNum}`,
                    data: await partPdf.save()
                });

                // Reset for new part
                currentPartNum++;
                currentPartSize = 0;
                currentPartImages = 0;
                currentPartStartEvidenceCode = item.evidenceCode;
                
                // Init new PDF document to clear memory
                const newPart = await initPart();
                partPdf = newPart.pdf;
                partFont = newPart.font;
                partBold = newPart.bold;
            }

            // Add page to current part
            let pPage = partPdf.addPage();
            const { width: pWidth, height: pHeight } = pPage.getSize();
            let pY = pHeight - 50;
            
            // Wrapped Title with proper spacing
            const titleLines = wordWrap(`${item.evidenceCode} - ${item.title}`, partBold, 14, pWidth - 100);
            for (const line of titleLines) {
                if (pY < 60) {
                     pPage = partPdf.addPage();
                     pY = pHeight - 50;
                }
                pPage.drawText(line, { x: 50, y: pY, size: 14, font: partBold });
                pY -= 20; // Line height
            }
            pY -= 10; // Extra padding between text and image

            if (imgBytes) {
                try {
                    const img = await partPdf.embedJpg(imgBytes).catch(() => partPdf.embedPng(imgBytes).catch(() => null));
                    if (img) {
                        const dims = img.scale(1);
                        const maxWidth = pWidth - 100;
                        
                        // User request: "Standard på bilder. halv side"
                        // Vi setter maks høyde til 50% av sidehøyden (ca A5 landskap høyde)
                        const targetMaxHeight = pHeight * 0.5; 
                        
                        let scale = 1;
                        // 1. Scale to fit width first
                        if (dims.width > maxWidth) scale = maxWidth / dims.width;
                        
                        // 2. Then limit by height (standard size)
                        if (dims.height * scale > targetMaxHeight) scale = targetMaxHeight / dims.height;
                        
                        const w = dims.width * scale;
                        const h = dims.height * scale;
                        
                        // 3. Check if it fits on current page. If not, add new page.
                        // "trengs mer plass, så kjører man bare på neste side"
                        if (pY - h < 50) {
                            pPage = partPdf.addPage();
                            pY = pHeight - 50;
                        }

                        pPage.drawImage(img, { x: 50, y: pY - h, width: w, height: h });
                        // Update pY (though we start new page for next item anyway)
                        pY -= (h + 10);

                    } else {
                        pPage.drawText(`[Feil: Kunne ikke bygge inn bildeformat]`, { x: 50, y: pY, size: 12, font: partFont });
                    }
                } catch (e) {
                     pPage.drawText(`[Feil ved bildebehandling: ${e instanceof Error ? e.message : 'Ukjent'}]`, { x: 50, y: pY, size: 12, font: partFont });
                }
            } else if (item.sourceType) {
                 let typeLabel = "ANNET FILVEDLEGG";
                 let desc = "Dette beviset er et filvedlegg som ikke kan vises direkte i PDF-en.";
                 
                 if (item.sourceType === 'audio') { 
                     typeLabel = "LYDOPPTAK"; 
                     desc = "Dette beviset er et lydopptak. Vennligst se vedlagt lydfil.";
                 }
                 else if (item.sourceType === 'video') { 
                     typeLabel = "VIDEO"; 
                     desc = "Dette beviset er en video. Vennligst se vedlagt videofil.";
                 }
                 else if (item.sourceType === 'sms') { 
                     typeLabel = "SMS / MELDING"; 
                     desc = "Dette beviset er en SMS/Melding. Se vedlagt fil.";
                 }
                 else if (item.sourceType === 'public_document') { 
                     typeLabel = "OFFENTLIG DOKUMENT"; 
                     desc = "Dette beviset er et offentlig dokument (PDF/Bilde). Se vedlagt fil.";
                 }
                 else if (item.sourceType === 'measurement') { 
                     typeLabel = "TEKNISK MÅLING"; 
                     desc = "Dette beviset er en teknisk måling. Se vedlagt fil.";
                 }
                 else if (item.sourceType === 'expert_report') {
                     typeLabel = "SAKKYNDIG RAPPORT";
                     desc = "Dette beviset er en sakkyndig rapport. Se vedlagt dokument.";
                 }
                 else if (item.sourceType === 'witness_statement') {
                     typeLabel = "VITNEFORKLARING";
                     desc = "Dette beviset er en vitneforklaring. Se vedlagt dokument/lyd/video.";
                 }
                 else if (item.sourceType === 'email') {
                     typeLabel = "E-POST";
                     desc = "Dette beviset er en e-post. Se vedlagt fil.";
                 }
                 else if (item.sourceType === 'document') {
                     typeLabel = "DOKUMENT";
                     desc = "Dette beviset er et dokument. Se vedlagt fil.";
                 }

                 pPage.drawText(`[${typeLabel}]`, { x: 50, y: pY, size: 18, font: partBold });
                 pY -= 30;
                 
                 const descLines = wordWrap(desc, partFont, 12, pWidth - 100);
                 for (const line of descLines) {
                     pPage.drawText(line, { x: 50, y: pY, size: 12, font: partFont });
                     pY -= 16;
                 }
            } else {
                // Fetch failed
                pPage.drawText(`[Bilde kunne ikke lastes ned: ${error || "Ukjent feil"}]`, { x: 50, y: pY, size: 12, font: partFont });
                pPage.drawText(`URL: ${item.imageUrl}`, { x: 50, y: pY - 20, size: 8, font: partFont });
            }
            
            currentPartSize += imgSize;
            currentPartImages++;
          }
        }
      }
    }
    
    // Save last part if it has content
    if (currentPartImages > 0) {
         const titlePage = partPdf.insertPage(0);
         const { height: tpHeight } = titlePage.getSize();
         let pY = tpHeight - 100;
         titlePage.drawText(sanitizeText(`Vedlegg Del ${currentPartNum}`), { x: 50, y: pY, size: 24, font: partBold });
         pY -= 40;
         titlePage.drawText(sanitizeText(`Til sak: ${document.metadata.caseNumber}`), { x: 50, y: pY, size: 14, font: partFont });
         pY -= 20;
         const endCode = document.evidenceIndex[document.evidenceIndex.length-1]?.evidenceCode || currentPartStartEvidenceCode;
         titlePage.drawText(sanitizeText(`Inneholder bevis ${currentPartStartEvidenceCode} til ${endCode}`), { x: 50, y: pY, size: 12, font: partFont });

         parts.push({
             name: `Vedlegg Del ${currentPartNum}`,
             data: await partPdf.save()
         });
    }

    // Economy
    if (document.economySummary && document.economyLines.length > 0) {
      page = mainPdf.addPage();
      y = height - 50;
      drawLine("Økonomi", 16, mainBoldFont);
      for (const line of document.economyLines) {
        drawWrappedText(`${line.description}: ${line.amount.toFixed(2)}`);
      }
      drawLine("");
      drawLine(`Totalt: ${document.economySummary.totalAmount.toFixed(2)}`, 14, mainBoldFont);
    }

    const mainBytes = await mainPdf.save();

    return { main: mainBytes, parts };
  }

  async render(document: ReportDocument): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    let page = pdfDoc.addPage();
    let { width, height } = page.getSize();
    let y = height - 50;

    const ensureSpace = (needed: number) => {
      if (y - needed < 50) {
        page = pdfDoc.addPage();
        y = height - 50;
      }
    };

    const drawLine = (text: string, size = 12, f = font, x = 50, color = rgb(0, 0, 0)) => {
      const safe = sanitizeText(text).replace(/\n/g, " ");
      ensureSpace(size + 6);
      page.drawText(safe, { x, y, size, font: f, color });
      y -= size + 6;
    };

    const drawWrappedText = (text: string, size = 12, f = font, x = 50, maxWidth = width - 100) => {
      const normalized = sanitizeText(text);
      const paragraphs = normalized.split("\n");
      for (const p of paragraphs) {
        if (!p) { y -= size + 6; continue; }
        const words = p.split(" ");
        let line = "";
        for (const w of words) {
          const test = line ? line + " " + w : w;
          if (f.widthOfTextAtSize(test, size) > maxWidth) {
            drawLine(line, size, f, x);
            line = w;
          } else {
            line = test;
          }
        }
        if (line) drawLine(line, size, f, x);
      }
    };

    // --- 1. Metadata & Cover Page ---
    if (document.metadata.documentType === "LEGAL_CASE") {
      // Legal Report Cover Page
      y = height - 150;
      drawLine("JURIDISK DOKUMENTASJONSRAPPORT", 24, bold, 50, rgb(0, 0.2, 0.4));
      y -= 20;
      drawLine(document.metadata.caseNumber, 16, font, 50, rgb(0.4, 0.4, 0.4));
      y -= 40;
      
      drawLine("Sak:", 12, bold);
      drawLine(document.metadata.referenceId, 12, font);
      
      y -= 20;
      drawLine("Dato:", 12, bold);
      drawLine(document.metadata.createdAt.toLocaleDateString("no-NO"), 12, font);
      
      y -= 20;
      drawLine("Ansvarlig:", 12, bold);
      drawLine(document.metadata.responsible, 12, font);

      // Footer
      page.drawText("Generert av Eiendomsappen", {
        x: 50,
        y: 50,
        size: 10,
        font: font,
        color: rgb(0.6, 0.6, 0.6),
      });

      // New page for content
      page = pdfDoc.addPage();
      y = height - 50;
    } else {
      // Standard Header
      drawLine(document.metadata.documentType, 18, bold);
      drawLine(`Saksnummer: ${document.metadata.caseNumber}`);
      drawLine(`Opprettet: ${document.metadata.createdAt.toLocaleString("no-NO")}`);
      drawLine("");
    }

    // --- 2. Sections ---
    for (const section of document.sections) {
      ensureSpace(40);
      drawLine(section.title, 16, bold);
      for (const block of section.blocks) {
        if (block.kind === "PARAGRAPH") {
            drawWrappedText(block.text);
            y -= 10; // Paragraph spacing
        }
        if (block.kind === "HEADING") {
            ensureSpace(30);
            drawLine(block.text, 14, bold);
        }
        if (block.kind === "LIST") {
            block.items.forEach(i => drawWrappedText("- " + i));
            y -= 10;
        }
      }
      y -= 20; // Section spacing
    }

    // --- 3. Evidence Index (with Thumbnails) ---
    if (document.evidenceIndex.length > 0) {
      page = pdfDoc.addPage();
      y = height - 50;
      drawLine("Bevisindeks", 16, bold);
      y -= 10;

      // Use sequential processing (BATCH_SIZE = 1) to prevent OOM/Crashes on serverless
      const BATCH_SIZE = 1;
      for (let i = 0; i < document.evidenceIndex.length; i += BATCH_SIZE) {
        const batch = document.evidenceIndex.slice(i, i + BATCH_SIZE);
        
        // Fetch batch (effectively sequential)
        const results = await Promise.all(batch.map(async (item) => {
          if (!item.imageUrl) return { item, imgBytes: null };
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
            const response = await fetch(item.imageUrl, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (response.ok) {
              const buffer = await response.arrayBuffer();
              return { item, imgBytes: new Uint8Array(buffer) };
            }
          } catch (e) {
            console.error(`Failed to fetch thumbnail for ${item.evidenceCode}:`, e);
          }
          return { item, imgBytes: null };
        }));

        // Process results
        for (const { item, imgBytes } of results) {
          ensureSpace(40);
          drawLine(`${item.evidenceCode} - ${item.title}`, 12, bold);
          if (item.date) drawLine(`Dato: ${item.date.toLocaleDateString("no-NO")}`, 10);
          
          if (imgBytes) {
             let image;
             try {
                // Try to use sharp for resizing to save memory/size, but handle failure gracefully
                let thumbBuffer = imgBytes;
                try {
                    // Only use sharp if image is large (>200KB) to save CPU/Memory for small icons
                    if (imgBytes.byteLength > 200 * 1024) {
                        const sharpBuffer = await sharp(imgBytes).resize(300).jpeg({ quality: 60 }).toBuffer();
                        thumbBuffer = new Uint8Array(sharpBuffer);
                    }
                } catch (e) {
                    console.warn("Sharp resize failed, using original:", e);
                }

                image = await pdfDoc.embedJpg(thumbBuffer).catch(() => pdfDoc.embedPng(thumbBuffer).catch(() => null));
             } catch (e) {
                 // Ignore embed error
             }

             if (image) {
                const dims = image.scale(1);
                const aspect = dims.width / dims.height;
                const thumbHeight = 100;
                const thumbWidth = thumbHeight * aspect;

                if (y - thumbHeight < 50) {
                    page = pdfDoc.addPage();
                    y = height - 50;
                }

                page.drawImage(image, {
                    x: 50,
                    y: y - thumbHeight,
                    width: thumbWidth,
                    height: thumbHeight
                });
                y -= thumbHeight + 20;
             }
          }
          y -= 10;
        }
      }
    }

    // --- 4. Appendices (Full Images) ---
    if (document.evidenceIndex.length > 0) {
      page = pdfDoc.addPage();
      y = height - 50;
      
      // Title Page for Appendices
      page.drawText("Vedlegg", { x: 50, y: height/2, size: 24, font: bold });
      page = pdfDoc.addPage();
      y = height - 50;

      // Use sequential processing (BATCH_SIZE = 1) for stability
      const BATCH_SIZE = 1;
      for (let i = 0; i < document.evidenceIndex.length; i += BATCH_SIZE) {
        const batch = document.evidenceIndex.slice(i, i + BATCH_SIZE);
        
        // Fetch batch
        const results = await Promise.all(batch.map(async (item) => {
          if (!item.imageUrl) return { item, imgBytes: null };
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout for full images
            const response = await fetch(item.imageUrl, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (response.ok) {
              const buffer = await response.arrayBuffer();
              return { item, imgBytes: new Uint8Array(buffer) };
            }
          } catch (e) {
            console.error(`Failed to fetch full image for ${item.evidenceCode}:`, e);
          }
          return { item, imgBytes: null };
        }));

        for (const { item, imgBytes } of results) {
            if (!item.imageUrl) continue;

            // New page per evidence item
            page = pdfDoc.addPage();
            y = height - 50;

            drawLine(`${item.evidenceCode} - ${item.title}`, 16, bold);
            y -= 10;

            if (imgBytes) {
                try {
                    const image = await pdfDoc.embedJpg(imgBytes).catch(() => pdfDoc.embedPng(imgBytes).catch(() => null));
                    if (image) {
                        const dims = image.scale(1);
                        const maxWidth = width - 100;
                        const targetMaxHeight = height / 2; // A5 equivalent
                        const maxHeight = Math.min(height - 150, targetMaxHeight);

                        let scale = 1;
                        if (dims.width > maxWidth) scale = maxWidth / dims.width;
                        if (dims.height * scale > maxHeight) scale = maxHeight / dims.height;

                        const w = dims.width * scale;
                        const h = dims.height * scale;

                        page.drawImage(image, {
                            x: 50,
                            y: y - h,
                            width: w,
                            height: h
                        });
                    }
                } catch (e) {
                    drawLine("[Kunne ikke vise bilde i full størrelse]", 12, font, 50, rgb(1,0,0));
                }
            } else {
                 drawLine("[Kunne ikke laste ned bilde]", 12, font, 50, rgb(1,0,0));
            }
        }
      }
    }

    // Economy
    if (document.economySummary && document.economyLines.length > 0) {
        page = pdfDoc.addPage();
        y = height - 50;
        drawLine("Økonomi", 16, bold);
        for (const line of document.economyLines) {
            drawWrappedText(`${line.description}: ${line.amount.toFixed(2)}`);
        }
        drawLine("");
        drawLine(`Totalt: ${document.economySummary.totalAmount.toFixed(2)}`, 14, bold);
    }

    return await pdfDoc.save();
  }
}
