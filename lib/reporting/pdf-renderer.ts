import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { ReportDocument, Section, ContentBlock, EvidenceItem } from "./report-types";
// @ts-ignore
import sharp from "sharp";

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
    const BATCH_SIZE = 5; // Restore to 5, we handle timeouts better now
    
    if (document.evidenceIndex.length > 0) {
      page = mainPdf.addPage();
      y = height - 50;
      drawLine("Bevisindeks", 16, mainBoldFont);
      
      for (let i = 0; i < document.evidenceIndex.length; i += BATCH_SIZE) {
        const batch = document.evidenceIndex.slice(i, i + BATCH_SIZE);
        
        // Process batch in parallel
        const processedBatch = await Promise.all(batch.map(async (item, batchIdx) => {
          const globalIdx = i + batchIdx;
          // Calculate part index dynamically based on MAX_PART_IMAGES
          // This is an estimate for the Main Report text. 
          // Actual splitting depends on size/count during iteration.
          const partIndex = Math.floor(globalIdx / MAX_PART_IMAGES) + 1;
          
          if (!item.imageUrl) return { item, globalIdx, partIndex, imgBytes: null, thumbBytes: null, error: null };

          try {
            // Fetch with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000); 
            
            const response = await fetch(item.imageUrl, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (!response.ok) throw new Error(`Status ${response.status}`);
            
            const buffer = await response.arrayBuffer();
            const imgBytes = new Uint8Array(buffer);
            
            // Generate thumbnail
            let thumbBytes: Uint8Array | null = null;
            try {
              const sharpBuffer = await sharp(buffer).resize(300).jpeg({ quality: 60 }).toBuffer();
              thumbBytes = new Uint8Array(sharpBuffer);
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
          }

          // 2. Add Full Image (or Error Placeholder) to Appendix
          if (item.imageUrl) {
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
                        // Calculate available height based on current pY, leaving 50px margin at bottom
                        const availableHeight = pY - 50;
                        const maxHeight = availableHeight > 0 ? availableHeight : pHeight - 150; 

                        let scale = 1;
                        if (dims.width > maxWidth) scale = maxWidth / dims.width;
                        if (dims.height * scale > maxHeight) scale = maxHeight / dims.height;
                        const w = dims.width * scale;
                        const h = dims.height * scale;
                        pPage.drawImage(img, { x: 50, y: pY - h, width: w, height: h });
                    } else {
                        pPage.drawText(`[Feil: Kunne ikke bygge inn bildeformat]`, { x: 50, y: pY, size: 12, font: partFont });
                    }
                } catch (e) {
                    console.error("Failed to embed evidence image into appendix:", e);
                    pPage.drawText(`[Feil ved innsetting av bilde: ${e}]`, { x: 50, y: pY, size: 12, font: partFont });
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

      for (const item of document.evidenceIndex) {
        ensureSpace(40);
        drawLine(`${item.evidenceCode} - ${item.title}`, 12, bold);
        if (item.date) drawLine(`Dato: ${item.date.toLocaleDateString("no-NO")}`, 10);
        
        // Retrieve image if available
        if (item.imageUrl) {
            try {
                const response = await fetch(item.imageUrl);
                if (response.ok) {
                    const buffer = await response.arrayBuffer();
                    const imgBytes = new Uint8Array(buffer);
                    
                    // Embed as thumbnail
                    let image;
                    try {
                        image = await pdfDoc.embedJpg(imgBytes).catch(() => pdfDoc.embedPng(imgBytes).catch(() => null));
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
            } catch (e) {
                console.error("Failed to fetch/embed thumbnail:", e);
            }
        }
        y -= 10;
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

      for (const item of document.evidenceIndex) {
        if (!item.imageUrl) continue;

        // New page per evidence item
        page = pdfDoc.addPage();
        y = height - 50;

        drawLine(`${item.evidenceCode} - ${item.title}`, 16, bold);
        y -= 10;

        try {
            const response = await fetch(item.imageUrl);
            if (response.ok) {
                const buffer = await response.arrayBuffer();
                const imgBytes = new Uint8Array(buffer);
                
                const image = await pdfDoc.embedJpg(imgBytes).catch(() => pdfDoc.embedPng(imgBytes).catch(() => null));
                if (image) {
                    const dims = image.scale(1);
                    const maxWidth = width - 100;
                    const maxHeight = height - 150; // Leave space for title

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
            }
        } catch (e) {
            drawLine("[Kunne ikke vise bilde i full størrelse]", 12, font, 50, rgb(1,0,0));
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
