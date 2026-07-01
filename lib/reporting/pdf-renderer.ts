import { readFileSync } from "fs";
import { readFile } from "fs/promises";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { DocumentationEntryMetadata, ReportDocument } from "./report-types";

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

let debugServerUrl = "http://127.0.0.1:7777/event";
let debugSessionId = "pdf-report-500";

function loadDebugConfig() {
  try {
    const env = readFileSync(".dbg/pdf-report-500.env", "utf8");
    debugServerUrl = env.match(/DEBUG_SERVER_URL=(.+)/)?.[1] || debugServerUrl;
    debugSessionId = env.match(/DEBUG_SESSION_ID=(.+)/)?.[1] || debugSessionId;
  } catch {}
}

function reportDebugEvent(
  runId: string,
  hypothesisId: string,
  location: string,
  msg: string,
  data: Record<string, unknown>,
  traceId = "renderer-no-trace"
) {
  loadDebugConfig();
  fetch(debugServerUrl, {
    method: "POST",
    body: JSON.stringify({
      sessionId: debugSessionId,
      runId,
      hypothesisId,
      location,
      msg,
      data,
      traceId,
      ts: Date.now(),
    }),
  }).catch(() => {});
}

async function fetchImageBytes(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Status ${response.status}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

async function optimizeDocumentationImageBytes(bytes: Uint8Array) {
  if (!sharp) {
    return bytes;
  }

  try {
    const pipeline = sharp(Buffer.from(bytes), { failOn: "none" }).rotate().resize({
      width: 1200,
      height: 1200,
      fit: "inside",
      withoutEnlargement: true,
    });
    const optimized = await pipeline.jpeg({ quality: 70, mozjpeg: true }).toBuffer();
    return new Uint8Array(optimized);
  } catch {
    return bytes;
  }
}

async function embedImage(pdf: PDFDocument, bytes: Uint8Array) {
  return pdf.embedJpg(bytes).catch(() => pdf.embedPng(bytes));
}

async function tryLoadLogo(pdf: PDFDocument, logoPath?: string) {
  if (!logoPath) {
    return null;
  }

  try {
    // #region debug-point A:logo-load-start
    reportDebugEvent("pre-fix", "A", "pdf-renderer.ts:tryLoadLogo:start", "[DEBUG] Attempting to load documentation logo", {
      logoPath,
    });
    // #endregion
    const bytes = new Uint8Array(await readFile(logoPath));
    // #region debug-point A:logo-load-success
    reportDebugEvent("pre-fix", "A", "pdf-renderer.ts:tryLoadLogo:success", "[DEBUG] Loaded documentation logo bytes", {
      logoPath,
      byteLength: bytes.byteLength,
    });
    // #endregion
    return embedImage(pdf, bytes);
  } catch (error) {
    // #region debug-point A:logo-load-error
    reportDebugEvent("pre-fix", "A", "pdf-renderer.ts:tryLoadLogo:error", "[DEBUG] Failed to load documentation logo", {
      logoPath,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    // #endregion
    return null;
  }
}

async function renderDocumentationReportPackage(document: ReportDocument): Promise<ReportPackage> {
  const documentation = document.metadata.documentationReport;
  if (!documentation) {
    throw new Error("Mangler dokumentasjonsdata for PDF-rendering");
  }

  const traceId = `renderer-${Date.now()}`;
  // #region debug-point C:render-start
  reportDebugEvent("pre-fix", "C", "pdf-renderer.ts:renderDocumentationReportPackage:start", "[DEBUG] Starting documentation report renderer", {
    title: documentation.title,
    entryCount: documentation.entries.length,
    zoneRowCount: documentation.zoneRows.length,
    totalImages: documentation.totalImages,
  }, traceId);
  // #endregion

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await tryLoadLogo(pdf, documentation.logoPath);

  const colors = {
    ink: rgb(0.1, 0.15, 0.23),
    muted: rgb(0.42, 0.47, 0.56),
    line: rgb(0.84, 0.87, 0.9),
    panel: rgb(0.96, 0.97, 0.985),
    blue: rgb(0.13, 0.27, 0.52),
    blueSoft: rgb(0.9, 0.94, 0.99),
    greenSoft: rgb(0.91, 0.97, 0.94),
    amberSoft: rgb(0.99, 0.96, 0.89),
  };

  const pagesNeedingChrome: number[] = [];

  const newPage = () => {
    const page = pdf.addPage();
    const { width, height } = page.getSize();
    return { page, width, height };
  };

  const cover = newPage();
  {
    const { page, width, height } = cover;
    page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(1, 1, 1) });
    page.drawRectangle({ x: 0, y: height - 130, width, height: 130, color: colors.blue });

    if (logo) {
      const dims = logo.scale(1);
      const logoScale = Math.min(120 / Math.max(dims.width, 1), 44 / Math.max(dims.height, 1));
      page.drawImage(logo, {
        x: 52,
        y: height - 84,
        width: dims.width * logoScale,
        height: dims.height * logoScale,
      });
    } else {
      page.drawText("RYDDER'N", { x: 52, y: height - 70, size: 20, font: bold, color: rgb(1, 1, 1) });
    }

    page.drawText(documentation.title, { x: 52, y: height - 190, size: 28, font: bold, color: colors.ink });
    if (documentation.subtitle) {
      page.drawText(documentation.subtitle, { x: 52, y: height - 216, size: 13, font, color: colors.muted });
    }

    page.drawText(documentation.projectName, { x: 52, y: height - 270, size: 24, font: bold, color: colors.ink });
    page.drawText(documentation.address, { x: 52, y: height - 298, size: 13, font, color: colors.muted });

    const infoTop = height - 360;
    const info = [
      ["Saksnummer", documentation.caseNumber],
      ["Prosjektnavn", documentation.projectName],
      ["Adresse", documentation.address],
      ["Saksnavn", documentation.caseName],
      ["Dato", documentation.dateLabel],
      ["Opprettet tidspunkt", documentation.createdAtLabel],
      ["Ansvarlig person", documentation.responsibleLabel],
      ["Totalt antall funn", String(documentation.totalFindings)],
      ["Totalt antall bilder", String(documentation.totalImages)],
    ];

    let y = infoTop;
    for (let i = 0; i < info.length; i += 1) {
      const [label, value] = info[i];
      const isRight = i % 2 === 1;
      const x = isRight ? width / 2 + 12 : 52;
      if (!isRight && i > 0) {
        y -= 56;
      }

      page.drawRectangle({
        x,
        y: y - 30,
        width: width / 2 - 64,
        height: 42,
        color: colors.panel,
        borderColor: colors.line,
        borderWidth: 1,
      });
      page.drawText(label, { x: x + 12, y: y - 10, size: 9, font: bold, color: colors.muted });
      page.drawText(sanitizeText(value), { x: x + 12, y: y - 25, size: 11, font, color: colors.ink });
    }

    page.drawText("Generert av Eiendomsutvikling", {
      x: 52,
      y: 34,
      size: 10,
      font,
      color: colors.muted,
    });
  }

  const drawChrome = (pageIndex: number, pageObj: { page: any; width: number; height: number }) => {
    const { page, width, height } = pageObj;
    page.drawLine({
      start: { x: 48, y: height - 34 },
      end: { x: width - 48, y: height - 34 },
      thickness: 1,
      color: colors.line,
    });
    page.drawText("RYDDER'N | Dokumentasjonsrapport", {
      x: 48,
      y: height - 24,
      size: 10,
      font: bold,
      color: colors.muted,
    });
    page.drawLine({
      start: { x: 48, y: 34 },
      end: { x: width - 48, y: 34 },
      thickness: 1,
      color: colors.line,
    });
    page.drawText(`Side ${pageIndex + 1} av ${pdf.getPageCount()}`, {
      x: 48,
      y: 20,
      size: 10,
      font,
      color: colors.muted,
    });
    const footerText = `Saksnummer: ${documentation.caseNumber}`;
    const footerWidth = font.widthOfTextAtSize(footerText, 10);
    page.drawText(footerText, {
      x: width - 48 - footerWidth,
      y: 20,
      size: 10,
      font,
      color: colors.muted,
    });
  };

  const summary = newPage();
  pagesNeedingChrome.push(pdf.getPageCount() - 1);
  {
    const { page, width, height } = summary;
    let y = height - 72;
    page.drawText("Sammendrag", { x: 48, y, size: 22, font: bold, color: colors.ink });
    y -= 28;
    page.drawText("Rapportsammendrag og nøkkeltall", { x: 48, y, size: 11, font, color: colors.muted });
    y -= 34;

    const cardWidth = (width - 48 * 2 - 16) / 2;
    const cardHeight = 86;
    documentation.summaryCards.forEach((card, index) => {
      const row = Math.floor(index / 2);
      const col = index % 2;
      const x = 48 + col * (cardWidth + 16);
      const boxY = y - row * (cardHeight + 14);
      const cardColor = card.tone === "primary" ? colors.blueSoft : card.tone === "success" ? colors.greenSoft : card.tone === "warning" ? colors.amberSoft : colors.panel;
      page.drawRectangle({
        x,
        y: boxY - cardHeight,
        width: cardWidth,
        height: cardHeight,
        color: cardColor,
        borderColor: colors.line,
        borderWidth: 1,
      });
      page.drawText(card.value, { x: x + 16, y: boxY - 34, size: 26, font: bold, color: colors.ink });
      page.drawText(card.label.toUpperCase(), { x: x + 16, y: boxY - 56, size: 10, font: bold, color: colors.muted });
    });

    let tableY = y - 2 * (cardHeight + 14) - 28;
    page.drawText("Fordeling per kategori", { x: 48, y: tableY, size: 15, font: bold, color: colors.ink });
    tableY -= 22;
    const colX = [48, 280, 410, 490];
    const headers = ["Kategori", "Funn", "Bilder"];
    headers.forEach((header, index) => {
      page.drawText(header, { x: colX[index], y: tableY, size: 10, font: bold, color: colors.muted });
    });
    tableY -= 12;
    page.drawLine({ start: { x: 48, y: tableY }, end: { x: width - 48, y: tableY }, thickness: 1, color: colors.line });
    tableY -= 18;
    documentation.categoryBreakdown.slice(0, 12).forEach((row) => {
      page.drawText(sanitizeText(row.label), { x: colX[0], y: tableY, size: 11, font, color: colors.ink });
      page.drawText(String(row.findings), { x: colX[1], y: tableY, size: 11, font, color: colors.ink });
      page.drawText(String(row.images), { x: colX[2], y: tableY, size: 11, font, color: colors.ink });
      tableY -= 18;
    });
  }

  if (documentation.zoneRows.length > 0) {
    const zonePage = newPage();
    pagesNeedingChrome.push(pdf.getPageCount() - 1);
    const { page, width, height } = zonePage;
    let y = height - 72;
    page.drawText("Soneoversikt", { x: 48, y, size: 22, font: bold, color: colors.ink });
    y -= 24;
    page.drawText("Dokumenterte soner med antall funn og bilder", { x: 48, y, size: 11, font, color: colors.muted });
    y -= 32;

    const columnCount = Math.max(...documentation.zoneRows.map((row) => row.length));
    const gap = 10;
    const cellWidth = (width - 96 - gap * (columnCount - 1)) / Math.max(columnCount, 1);
    const cellHeight = 72;

    documentation.zoneRows.forEach((row, rowIndex) => {
      const cellY = y - rowIndex * (cellHeight + 12);
      row.forEach((zone, colIndex) => {
        const x = 48 + colIndex * (cellWidth + gap);
        page.drawRectangle({
          x,
          y: cellY - cellHeight,
          width: cellWidth,
          height: cellHeight,
          color: zone.documented ? colors.greenSoft : colors.panel,
          borderColor: zone.documented ? colors.blue : colors.line,
          borderWidth: 1,
        });
        page.drawText(zone.zone, { x: x + 12, y: cellY - 18, size: 16, font: bold, color: colors.ink });
        page.drawText(zone.documented ? "Dokumentert" : "Ikke dokumentert", { x: x + 12, y: cellY - 36, size: 9, font, color: colors.muted });
        page.drawText(`Funn: ${zone.findings}`, { x: x + 12, y: cellY - 50, size: 9, font, color: colors.ink });
        page.drawText(`Bilder: ${zone.images}`, { x: x + 12, y: cellY - 62, size: 9, font, color: colors.ink });
      });
    });
  }

  const entryImageCache = new Map<string, Uint8Array | null>();
  const loadEntryImage = async (url: string) => {
    if (entryImageCache.has(url)) {
      return entryImageCache.get(url) || null;
    }
    try {
      const bytes = await fetchImageBytes(url);
      const optimizedBytes = await optimizeDocumentationImageBytes(bytes);
      entryImageCache.set(url, optimizedBytes);
      return optimizedBytes;
    } catch (error) {
      // #region debug-point B:image-fetch-error
      reportDebugEvent("pre-fix", "B", "pdf-renderer.ts:loadEntryImage:error", "[DEBUG] Failed to fetch documentation image", {
        url,
        error: error instanceof Error ? error.message : "Unknown error",
      }, traceId);
      // #endregion
      entryImageCache.set(url, null);
      return null;
    }
  };

  const drawEntryHeader = (
    pageObj: { page: any; width: number; height: number },
    entry: DocumentationEntryMetadata,
    continuationLabel?: string
  ) => {
    const { page, width, height } = pageObj;
    let y = height - 74;

    page.drawText(entry.entryNumber, { x: 48, y, size: 22, font: bold, color: colors.ink });
    const badgeText = `${entry.typeLabel} | ${entry.category}`;
    const badgeWidth = bold.widthOfTextAtSize(badgeText, 10) + 18;
    page.drawRectangle({ x: width - 48 - badgeWidth, y: y - 2, width: badgeWidth, height: 18, color: colors.blueSoft });
    page.drawText(badgeText, { x: width - 48 - badgeWidth + 9, y: y + 4, size: 10, font: bold, color: colors.blue });
    y -= 28;

    if (continuationLabel) {
      page.drawText(sanitizeText(continuationLabel), { x: 48, y, size: 10, font: bold, color: colors.muted });
      y -= 18;
    }

    const infoRows = [
      ["Kategori", entry.category],
      ["Sone", entry.zone],
      ["Dato", entry.dateLabel],
      ["Tid", entry.timeLabel],
      ["Risiko", entry.risk],
      ["Antall bilder", String(entry.imageCount)],
    ];
    const infoWidth = (width - 96 - 14) / 2;
    for (let i = 0; i < infoRows.length; i += 2) {
      const boxY = y;
      [infoRows[i], infoRows[i + 1]].forEach((item, column) => {
        if (!item) {
          return;
        }
        const [label, value] = item;
        const x = 48 + column * (infoWidth + 14);
        page.drawRectangle({
          x,
          y: boxY - 32,
          width: infoWidth,
          height: 40,
          color: colors.panel,
          borderColor: colors.line,
          borderWidth: 1,
        });
        page.drawText(label, { x: x + 10, y: boxY - 10, size: 9, font: bold, color: colors.muted });
        page.drawText(sanitizeText(value), { x: x + 10, y: boxY - 24, size: 11, font, color: colors.ink });
      });
      y -= 48;
    }

    return y;
  };

  const renderEntryTextPages = (entry: DocumentationEntryMetadata) => {
    const sections = [
      { title: "Beskrivelse", lines: wordWrap(entry.description, font, 11, cover.width - 96) },
      { title: "Kommentar", lines: wordWrap(entry.comment, font, 11, cover.width - 96) },
    ];
    let sectionIndex = 0;
    let lineIndex = 0;
    let firstPage = true;

    while (sectionIndex < sections.length) {
      const pageObj = newPage();
      pagesNeedingChrome.push(pdf.getPageCount() - 1);
      const { page } = pageObj;
      let y = drawEntryHeader(pageObj, entry, firstPage ? undefined : "Tekst fortsetter");
      const bottomLimit = 66;
      const lineHeight = 14;

      while (sectionIndex < sections.length) {
        const section = sections[sectionIndex];
        const heading = lineIndex > 0 ? `${section.title} (fortsetter)` : section.title;

        if (y - 22 < bottomLimit) {
          break;
        }

        page.drawText(heading, { x: 48, y, size: 14, font: bold, color: colors.ink });
        y -= 18;

        const availableLines = Math.max(1, Math.floor((y - bottomLimit) / lineHeight));
        const linesForPage = section.lines.slice(lineIndex, lineIndex + availableLines);

        linesForPage.forEach((line) => {
          if (line) {
            page.drawText(line, { x: 48, y, size: 11, font, color: colors.ink });
          }
          y -= lineHeight;
        });

        lineIndex += linesForPage.length;
        if (lineIndex < section.lines.length) {
          break;
        }

        sectionIndex += 1;
        lineIndex = 0;
        y -= 10;
      }

      firstPage = false;
    }
  };

  const renderEntryImagePage = async (entry: DocumentationEntryMetadata, imageOffset: number) => {
    const pageObj = newPage();
    pagesNeedingChrome.push(pdf.getPageCount() - 1);
    const { page, width } = pageObj;
    let y = drawEntryHeader(pageObj, entry, imageOffset > 0 ? "Bilder fortsetter" : undefined);

    page.drawText("Bilder", { x: 48, y, size: 15, font: bold, color: colors.ink });
    y -= 18;

    const remainingImages = entry.images.slice(imageOffset);
    if (remainingImages.length === 0) {
      page.drawText("Ingen bilder registrert.", { x: 48, y: y - 8, size: 11, font, color: colors.muted });
      return entry.images.length;
    }

    const columns = remainingImages.length >= 10 ? 4 : 2;
    const gap = 10;
    const captionHeight = 24;
    const imageAreaBottom = 56;
    const cellWidth = (width - 96 - gap * (columns - 1)) / columns;
    const imageHeight = columns === 4 ? 80 : 140;
    const rowHeight = imageHeight + captionHeight + 12;
    const rowsAvailable = Math.max(1, Math.floor((y - imageAreaBottom) / rowHeight));
    const capacity = Math.max(1, rowsAvailable * columns);
    const imagesForPage = remainingImages.slice(0, capacity);

    const loadedImages = await Promise.all(
      imagesForPage.map(async (image) => ({
        meta: image,
        bytes: await loadEntryImage(image.imageUrl),
      }))
    );

    // #region debug-point B:image-batch-loaded
    reportDebugEvent("pre-fix", "B", "pdf-renderer.ts:renderEntryImagePage:image-batch", "[DEBUG] Loaded documentation image batch", {
      entryNumber: entry.entryNumber,
      requestedImages: imagesForPage.length,
      resolvedImages: loadedImages.filter((image) => Boolean(image.bytes)).length,
      imageOffset,
    }, traceId);
    // #endregion

    loadedImages.forEach(({ bytes }, index) => {
      const row = Math.floor(index / columns);
      const col = index % columns;
      const cellX = 48 + col * (cellWidth + gap);
      const cellTop = y - row * rowHeight;
      page.drawRectangle({
        x: cellX,
        y: cellTop - imageHeight,
        width: cellWidth,
        height: imageHeight,
        borderColor: colors.line,
        borderWidth: 1,
        color: colors.panel,
      });

      if (bytes) {
        void bytes;
      }
    });

    for (let index = 0; index < loadedImages.length; index += 1) {
      const { meta, bytes } = loadedImages[index];
      const row = Math.floor(index / columns);
      const col = index % columns;
      const cellX = 48 + col * (cellWidth + gap);
      const cellTop = y - row * rowHeight;

      if (bytes) {
        try {
          const image = await embedImage(pdf, bytes);
          const dims = image.scale(1);
          const scale = Math.min(cellWidth / Math.max(dims.width, 1), imageHeight / Math.max(dims.height, 1));
          const drawWidth = dims.width * scale;
          const drawHeight = dims.height * scale;
          page.drawImage(image, {
            x: cellX + (cellWidth - drawWidth) / 2,
            y: cellTop - imageHeight + (imageHeight - drawHeight) / 2,
            width: drawWidth,
            height: drawHeight,
          });
        } catch {
          page.drawText("Kunne ikke vise bilde", { x: cellX + 8, y: cellTop - 34, size: 9, font, color: colors.muted });
        }
      } else {
        page.drawText("Kunne ikke vise bilde", { x: cellX + 8, y: cellTop - 34, size: 9, font, color: colors.muted });
      }

      page.drawText(meta.code, { x: cellX, y: cellTop - imageHeight - 12, size: 9, font: bold, color: colors.ink });
      page.drawText(meta.dateLabel, { x: cellX, y: cellTop - imageHeight - 23, size: 8, font, color: colors.muted });
    }

    return imageOffset + imagesForPage.length;
  };

  for (const entry of documentation.entries) {
    renderEntryTextPages(entry);
    let offset = 0;
    do {
      offset = await renderEntryImagePage(entry, offset);
    } while (offset < entry.images.length);
  }

  const conclusion = newPage();
  pagesNeedingChrome.push(pdf.getPageCount() - 1);
  {
    const { page, height } = conclusion;
    let y = height - 72;
    page.drawText("Konklusjon", { x: 48, y, size: 24, font: bold, color: colors.ink });
    y -= 34;
    const lines = [
      "Denne rapporten omfatter:",
      `- totalt ${documentation.totalFindings} funn`,
      `- totalt ${documentation.totalImages} bilder`,
      `- dokumenterte soner: ${documentation.conclusionZones.join(", ") || "-"}`,
      "",
      "Alt materiale er lagret digitalt og kan spores tilbake til opprinnelig registrering i databasen.",
      "",
      `Dato: ${documentation.dateLabel}`,
      `Ansvarlig: ${documentation.responsibleLabel}`,
    ];
    lines.forEach((line) => {
      page.drawText(sanitizeText(line), { x: 48, y, size: line === "Denne rapporten omfatter:" ? 13 : 12, font: line === "Denne rapporten omfatter:" ? bold : font, color: colors.ink });
      y -= line ? 20 : 14;
    });
  }

  pagesNeedingChrome.forEach((pageIndex) => {
    const page = pdf.getPage(pageIndex);
    const { width, height } = page.getSize();
    drawChrome(pageIndex, { page, width, height });
  });

  // #region debug-point E:render-save
  reportDebugEvent("pre-fix", "E", "pdf-renderer.ts:renderDocumentationReportPackage:before-save", "[DEBUG] Saving documentation PDF", {
    pageCount: pdf.getPageCount(),
    chromePages: pagesNeedingChrome.length,
  }, traceId);
  // #endregion

  return {
    main: await pdf.save(),
    parts: [],
  };
}

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
    if (document.metadata.documentType === "DOKUMENTASJONSRAPPORT" && document.metadata.documentationReport) {
      return renderDocumentationReportPackage(document);
    }

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
    const BATCH_SIZE = 4; // Small parallelism cuts wait time without exploding memory
    
    if (document.evidenceIndex.length > 0) {
      page = mainPdf.addPage();
      y = height - 50;
      drawLine("Bevisindeks", 16, mainBoldFont);
      
      for (let i = 0; i < document.evidenceIndex.length; i += BATCH_SIZE) {
        const batch = document.evidenceIndex.slice(i, i + BATCH_SIZE);
        
        // Process a few images at a time to reduce wait without blowing memory
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
          
          const titleText = `${item.evidenceCode} - ${item.title}`;
          const titleLines = wordWrap(titleText, mainBoldFont, 12, width - 100);
          const metadataLineCount = 1 + (item.date ? 1 : 0) + (item.linkedEvidenceNumber ? 1 : 0);
          const textBlockHeight = titleLines.length * (12 + 6) + metadataLineCount * (10 + 6);

          let mainThumbImage: any = null;
          let thumbWidth = 0;
          let thumbHeight = 0;
          let blockExtraHeight = 20;

          if (thumbBytes) {
            try {
              mainThumbImage = await mainPdf.embedJpg(thumbBytes).catch(() => mainPdf.embedPng(thumbBytes).catch(() => null));
              if (mainThumbImage) {
                const dims = mainThumbImage.scale(1);
                const maxThumbHeight = 160;
                const maxThumbWidth = 240;
                let thumbScale = maxThumbHeight / Math.max(dims.height, 1);
                if (dims.width * thumbScale > maxThumbWidth) {
                  thumbScale = maxThumbWidth / Math.max(dims.width, 1);
                }
                thumbWidth = dims.width * thumbScale;
                thumbHeight = dims.height * thumbScale;
                blockExtraHeight = thumbHeight + 10;
              }
            } catch (e) {
              console.error("Thumbnail embedding failed:", e);
              blockExtraHeight = 22;
            }
          } else if (error) {
            blockExtraHeight = 26;
          } else if (item.sourceType) {
            blockExtraHeight = 30;
          }

          // Keep title, metadata and thumbnail together so text can never belong to the wrong image.
          ensureSpace(textBlockHeight + blockExtraHeight + 12);

          for (const line of titleLines) {
            drawLine(line, 12, mainBoldFont);
          }

          if (item.date) drawLine(`Dato: ${item.date.toLocaleDateString("no-NO")}`, 10);

          if (item.linkedEvidenceNumber) {
             drawLine(`Refererer til: Bevis B-${String(item.linkedEvidenceNumber).padStart(3, '0')}`, 10, mainFont, 50, rgb(0, 0.4, 0.8));
          }

          // Use the calculated partIndex for the text, which should align with our splitting logic
          drawLine(`Se Vedlegg Del ${partIndex}`, 10, mainFont);

          // 1. Add Thumbnail to Main Report
          if (mainThumbImage) {
            page.drawImage(mainThumbImage, {
              x: 50,
              y: y - thumbHeight,
              width: thumbWidth,
              height: thumbHeight
            });
            y -= thumbHeight + 10;
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
    if (document.metadata.documentType === "DOKUMENTASJONSRAPPORT" && document.metadata.documentationReport) {
      const pkg = await renderDocumentationReportPackage(document);
      return pkg.main;
    }

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
