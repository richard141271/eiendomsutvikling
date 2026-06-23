"use client";

import type { CleanupEvidenceEntry, CleanupEvidenceEntryImage, CleanupEvidenceMap, CleanupProject } from "@/src/modules/rydderen/types";
import { formatDate, getCleanupDocumentationTypeConfig, slugify } from "@/src/modules/rydderen/utils";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function fetchBlobFromUrl(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Kunne ikke hente bilde (${response.status})`);
  }
  return response.blob();
}

function createCrc32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let current = i;
    for (let bit = 0; bit < 8; bit += 1) {
      current = current & 1 ? 0xedb88320 ^ (current >>> 1) : current >>> 1;
    }
    table[i] = current >>> 0;
  }
  return table;
}

const CRC32_TABLE = createCrc32Table();

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (let index = 0; index < bytes.length; index += 1) {
    const byte = bytes[index];
    crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function numberToBytes(value: number, length: number) {
  const bytes = new Uint8Array(length);
  for (let index = 0; index < length; index += 1) {
    bytes[index] = (value >>> (8 * index)) & 0xff;
  }
  return bytes;
}

function joinUint8Arrays(chunks: Uint8Array[]) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

async function buildStoredZip(files: Array<{ name: string; blob: Blob }>) {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const data = new Uint8Array(await file.blob.arrayBuffer());
    const crc = crc32(data);

    const localHeader = joinUint8Arrays([
      numberToBytes(0x04034b50, 4),
      numberToBytes(20, 2),
      numberToBytes(0, 2),
      numberToBytes(0, 2),
      numberToBytes(0, 2),
      numberToBytes(0, 2),
      numberToBytes(crc, 4),
      numberToBytes(data.length, 4),
      numberToBytes(data.length, 4),
      numberToBytes(nameBytes.length, 2),
      numberToBytes(0, 2),
      nameBytes,
      data,
    ]);

    const centralHeader = joinUint8Arrays([
      numberToBytes(0x02014b50, 4),
      numberToBytes(20, 2),
      numberToBytes(20, 2),
      numberToBytes(0, 2),
      numberToBytes(0, 2),
      numberToBytes(0, 2),
      numberToBytes(0, 2),
      numberToBytes(crc, 4),
      numberToBytes(data.length, 4),
      numberToBytes(data.length, 4),
      numberToBytes(nameBytes.length, 2),
      numberToBytes(0, 2),
      numberToBytes(0, 2),
      numberToBytes(0, 2),
      numberToBytes(0, 2),
      numberToBytes(0, 4),
      numberToBytes(offset, 4),
      nameBytes,
    ]);

    localParts.push(localHeader);
    centralParts.push(centralHeader);
    offset += localHeader.length;
  }

  const centralDirectory = joinUint8Arrays(centralParts);
  const endRecord = joinUint8Arrays([
    numberToBytes(0x06054b50, 4),
    numberToBytes(0, 2),
    numberToBytes(0, 2),
    numberToBytes(files.length, 2),
    numberToBytes(files.length, 2),
    numberToBytes(centralDirectory.length, 4),
    numberToBytes(offset, 4),
    numberToBytes(0, 2),
  ]);

  const archiveBytes = joinUint8Arrays([...localParts, centralDirectory, endRecord]);
  return new Blob([archiveBytes.buffer], { type: "application/zip" });
}

async function loadImage(blob: Blob) {
  const url = URL.createObjectURL(blob);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Kunne ikke laste bilde"));
      image.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function fitImageWithinBox(width: number, height: number, maxWidth: number, maxHeight: number) {
  const safeWidth = Math.max(1, width || 1);
  const safeHeight = Math.max(1, height || 1);
  const ratio = Math.min(maxWidth / safeWidth, maxHeight / safeHeight);
  return {
    width: Math.max(1, Math.round(safeWidth * ratio)),
    height: Math.max(1, Math.round(safeHeight * ratio)),
  };
}

async function createOptimizedImageBlob(blob: Blob, maxWidth: number, maxHeight: number, quality = 0.82) {
  const image = await loadImage(blob);
  const target = fitImageWithinBox(image.naturalWidth || 1600, image.naturalHeight || 1200, maxWidth, maxHeight);
  const canvas = document.createElement("canvas");
  canvas.width = target.width;
  canvas.height = target.height;
  const context = canvas.getContext("2d");
  if (!context) {
    return blob;
  }
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  return new Promise<Blob>((resolve) => {
    canvas.toBlob((converted) => resolve(converted || blob), "image/jpeg", quality);
  });
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function cmToEmu(value: number) {
  return Math.round(value * 360000);
}

function cmToTwip(value: number) {
  return Math.round(value * 567);
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function createDocxParagraph(text: string, options?: { style?: string; pageBreakBefore?: boolean }) {
  const style = options?.style || "";
  const pageBreakBefore = options?.pageBreakBefore || false;
  const parts = ["<w:p>"];
  if (style || pageBreakBefore) {
    parts.push("<w:pPr>");
    if (style) parts.push(`<w:pStyle w:val="${style}"/>`);
    if (pageBreakBefore) parts.push("<w:pageBreakBefore/>");
    parts.push("</w:pPr>");
  }
  parts.push(`<w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`);
  return parts.join("");
}

function createDocxPageBreak() {
  return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
}

function getImageExtension(type: string) {
  if (type === "image/png") return "png";
  return "jpg";
}

async function createDocxImageParagraph(imageBlob: Blob, imageName: string, relationshipId: string, docPrId: number, maxWidthCm: number, maxHeightCm: number) {
  const image = await loadImage(imageBlob);
  const target = fitImageWithinBox(image.naturalWidth || 1600, image.naturalHeight || 1200, cmToEmu(maxWidthCm), cmToEmu(maxHeightCm));
  return [
    "<w:p>",
    "<w:pPr><w:jc w:val=\"center\"/></w:pPr>",
    "<w:r><w:drawing>",
    "<wp:inline distT=\"0\" distB=\"0\" distL=\"0\" distR=\"0\" xmlns:wp=\"http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing\">",
    `<wp:extent cx="${target.width}" cy="${target.height}"/>`,
    "<wp:effectExtent l=\"0\" t=\"0\" r=\"0\" b=\"0\"/>",
    `<wp:docPr id="${docPrId}" name="${escapeXml(imageName)}"/>`,
    "<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\" noChangeAspect=\"1\"/></wp:cNvGraphicFramePr>",
    "<a:graphic xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\">",
    "<a:graphicData uri=\"http://schemas.openxmlformats.org/drawingml/2006/picture\">",
    "<pic:pic xmlns:pic=\"http://schemas.openxmlformats.org/drawingml/2006/picture\">",
    "<pic:nvPicPr>",
    `<pic:cNvPr id="${docPrId}" name="${escapeXml(imageName)}"/>`,
    "<pic:cNvPicPr/>",
    "</pic:nvPicPr>",
    "<pic:blipFill>",
    `<a:blip r:embed="${relationshipId}"/>`,
    "<a:stretch><a:fillRect/></a:stretch>",
    "</pic:blipFill>",
    "<pic:spPr>",
    `<a:xfrm><a:off x="0" y="0"/><a:ext cx="${target.width}" cy="${target.height}"/></a:xfrm>`,
    "<a:prstGeom prst=\"rect\"><a:avLst/></a:prstGeom>",
    "</pic:spPr>",
    "</pic:pic>",
    "</a:graphicData>",
    "</a:graphic>",
    "</wp:inline>",
    "</w:drawing></w:r>",
    "</w:p>",
  ].join("");
}

async function fetchEntryImageBlobs(entry: CleanupEvidenceEntry) {
  const result: Array<{ meta: CleanupEvidenceEntryImage; blob: Blob }> = [];
  for (const image of entry.images) {
    if (!image.imageUrl) continue;
    result.push({
      meta: image,
      blob: await fetchBlobFromUrl(image.imageUrl),
    });
  }
  return result;
}

export async function exportDocumentationZip(params: {
  project: CleanupProject;
  entries: CleanupEvidenceEntry[];
}) {
  const files: Array<{ name: string; blob: Blob }> = [
    {
      name: "rapport.json",
      blob: new Blob(
        [
          JSON.stringify(
            {
              project: params.project.name,
              createdAt: new Date().toISOString(),
              entries: params.entries.map((entry) => ({
                entryNumber: entry.entryNumber,
                category: entry.category,
                description: entry.description,
                comment: entry.comment,
                zone: entry.zone,
                risk: entry.risk,
                imageCount: entry.imageCount,
              })),
            },
            null,
            2
          ),
        ],
        { type: "application/json" }
      ),
    },
  ];

  for (const entry of params.entries) {
    const blobs = await fetchEntryImageBlobs(entry);
    for (let index = 0; index < blobs.length; index += 1) {
      files.push({
        name: `${entry.entryNumber}/${String(index + 1).padStart(2, "0")}.jpg`,
        blob: blobs[index].blob,
      });
    }
  }

  const zipBlob = await buildStoredZip(files);
  downloadBlob(zipBlob, `${slugify(params.project.name || "bilder")}-bilder.zip`);
}

export async function saveAllDocumentationImages(params: {
  project: CleanupProject;
  entries: CleanupEvidenceEntry[];
}) {
  const files: File[] = [];
  for (const entry of params.entries) {
    const blobs = await fetchEntryImageBlobs(entry);
    blobs.forEach(({ meta, blob }, index) => {
      const extension = blob.type === "image/png" ? "png" : "jpg";
      files.push(
        new File([blob], meta.originalName || `${slugify(entry.entryNumber)}-${String(index + 1).padStart(2, "0")}.${extension}`, {
          type: blob.type || "image/jpeg",
        })
      );
    });
  }

  if (files.length === 0) {
    throw new Error("Ingen bilder funnet i rapporten.");
  }

  if (navigator.canShare && navigator.canShare({ files })) {
    await navigator.share({
      files,
      title: "Dokumentasjonsbilder",
      text: "Velg 'Lagre i Bilder' i delingsarket for a lagre originalene i bildebiblioteket.",
    });
    return;
  }

  files.forEach((file) => downloadBlob(file, file.name));
}

export async function exportDocumentationDocx(params: {
  project: CleanupProject;
  map: CleanupEvidenceMap | null;
  entries: CleanupEvidenceEntry[];
}) {
  const reportTitle = "Dokumentasjonsrapport";
  const files: Array<{ name: string; blob: Blob }> = [];
  const relationships = [
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>',
  ];
  const bodyParts = [
    createDocxParagraph(reportTitle, { style: "Title" }),
    createDocxParagraph(`Prosjekt: ${params.project.name || "-"}`),
    createDocxParagraph(`Adresse: ${params.map?.address || "-"}`),
    createDocxParagraph(`Saksnavn: ${params.map?.caseName || "-"}`),
    createDocxParagraph(`Dato: ${formatDate(new Date().toISOString())}`),
    createDocxParagraph(`Antall funn: ${params.entries.length}`),
  ];

  let imageCounter = 1;
  let docPrId = 1;

  for (let entryIndex = 0; entryIndex < params.entries.length; entryIndex += 1) {
    const entry = params.entries[entryIndex];
    const docTypeLabel = getCleanupDocumentationTypeConfig(entry.entryType).shortLabel;
    const description = entry.description || "Ingen beskrivelse";
    const comment = entry.comment || "-";
    const imageBlobs = await fetchEntryImageBlobs(entry);

    bodyParts.push(createDocxPageBreak());
    bodyParts.push(createDocxParagraph(`${entry.entryNumber} - ${docTypeLabel}`, { style: "Heading1" }));
    bodyParts.push(createDocxParagraph(`Kategori: ${entry.category || "-"}`));
    bodyParts.push(createDocxParagraph(`Dato: ${entry.createdDate || formatDate(entry.createdAt)} ${entry.createdTime || ""}`));
    bodyParts.push(createDocxParagraph(`Sone: ${entry.zone || "-"}`));
    bodyParts.push(createDocxParagraph(`Risiko: ${entry.risk || "-"}`));
    bodyParts.push(createDocxParagraph(`Beskrivelse: ${description}`));
    bodyParts.push(createDocxParagraph(`Kommentar: ${comment}`));
    bodyParts.push(createDocxParagraph(`Bilder: ${imageBlobs.length}`));

    const coverImage = imageBlobs[0]?.blob;
    if (coverImage) {
      const normalized = await createOptimizedImageBlob(coverImage, 1600, 1200, 0.86);
      const extension = getImageExtension(normalized.type);
      const fileName = `image-${entryIndex + 1}-cover.${extension}`;
      const relationshipId = `rId${relationships.length + 1}`;
      relationships.push(
        `<Relationship Id="${relationshipId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${fileName}"/>`
      );
      files.push({ name: `word/media/${fileName}`, blob: normalized });
      bodyParts.push(await createDocxImageParagraph(normalized, fileName, relationshipId, docPrId, 16.5, 14.5));
      imageCounter += 1;
      docPrId += 1;
    }

    const galleryChunks = chunkArray(imageBlobs.slice(1), 12);
    for (const images of galleryChunks) {
      bodyParts.push(createDocxPageBreak());
      bodyParts.push(createDocxParagraph(`${entry.entryNumber} - bildegalleri`, { style: "Heading2" }));

      for (const row of chunkArray(images, 3)) {
        const cells: string[] = [];
        for (const item of row) {
          const normalized = await createOptimizedImageBlob(item.blob, 900, 900, 0.78);
          const extension = getImageExtension(normalized.type);
          const fileName = `image-${imageCounter}.${extension}`;
          const relationshipId = `rId${relationships.length + 1}`;
          relationships.push(
            `<Relationship Id="${relationshipId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${fileName}"/>`
          );
          files.push({ name: `word/media/${fileName}`, blob: normalized });
          const imageXml = await createDocxImageParagraph(normalized, fileName, relationshipId, docPrId, 5.1, 5.1);
          cells.push(
            [
              "<w:tc>",
              `<w:tcPr><w:tcW w:w="${cmToTwip(5.7)}" w:type="dxa"/></w:tcPr>`,
              imageXml,
              "</w:tc>",
            ].join("")
          );
          imageCounter += 1;
          docPrId += 1;
        }

        while (cells.length < 3) {
          cells.push(["<w:tc>", `<w:tcPr><w:tcW w:w="${cmToTwip(5.7)}" w:type="dxa"/></w:tcPr>`, "<w:p/>", "</w:tc>"].join(""));
        }

        bodyParts.push(
          [
            "<w:tbl>",
            "<w:tblPr><w:tblW w:w=\"0\" w:type=\"auto\"/><w:tblLayout w:type=\"fixed\"/></w:tblPr>",
            `<w:tblGrid><w:gridCol w:w="${cmToTwip(5.7)}"/><w:gridCol w:w="${cmToTwip(5.7)}"/><w:gridCol w:w="${cmToTwip(5.7)}"/></w:tblGrid>`,
            "<w:tr>",
            cells.join(""),
            "</w:tr>",
            "</w:tbl>",
          ].join("")
        );
      }
    }
  }

  const documentXml = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" mc:Ignorable="w14 wp14">',
    "<w:body>",
    bodyParts.join(""),
    `<w:sectPr><w:pgSz w:w="${cmToTwip(21)}" w:h="${cmToTwip(29.7)}"/><w:pgMar w:top="${cmToTwip(1.5)}" w:right="${cmToTwip(1.5)}" w:bottom="${cmToTwip(1.5)}" w:left="${cmToTwip(1.5)}" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>`,
    "</w:body></w:document>",
  ].join("");

  const stylesXml = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
    '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>',
    '<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:qFormat/><w:rPr><w:b/><w:sz w:val="34"/></w:rPr></w:style>',
    '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="Heading 1"/><w:basedOn w:val="Normal"/><w:qFormat/><w:rPr><w:b/><w:sz w:val="28"/></w:rPr></w:style>',
    '<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="Heading 2"/><w:basedOn w:val="Normal"/><w:qFormat/><w:rPr><w:b/><w:sz w:val="24"/></w:rPr></w:style>',
    "</w:styles>",
  ].join("");

  const contentTypesXml = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
    '<Default Extension="xml" ContentType="application/xml"/>',
    '<Default Extension="jpg" ContentType="image/jpeg"/>',
    '<Default Extension="jpeg" ContentType="image/jpeg"/>',
    '<Default Extension="png" ContentType="image/png"/>',
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>',
    '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>',
    '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>',
    '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>',
    "</Types>",
  ].join("");

  files.push(
    { name: "[Content_Types].xml", blob: new Blob([contentTypesXml], { type: "application/xml" }) },
    {
      name: "_rels/.rels",
      blob: new Blob(
        [
          [
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>',
            '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>',
            '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>',
            "</Relationships>",
          ].join(""),
        ],
        { type: "application/xml" }
      ),
    },
    { name: "word/document.xml", blob: new Blob([documentXml], { type: "application/xml" }) },
    { name: "word/styles.xml", blob: new Blob([stylesXml], { type: "application/xml" }) },
    {
      name: "word/_rels/document.xml.rels",
      blob: new Blob(
        [
          [
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
            relationships.join(""),
            "</Relationships>",
          ].join(""),
        ],
        { type: "application/xml" }
      ),
    },
    {
      name: "docProps/core.xml",
      blob: new Blob(
        [
          [
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
            '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">',
            `<dc:title>${escapeXml(reportTitle)}</dc:title>`,
            `<dc:creator>${escapeXml("Rydder'n")}</dc:creator>`,
            `<cp:lastModifiedBy>${escapeXml("Rydder'n")}</cp:lastModifiedBy>`,
            `<dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created>`,
            `<dcterms:modified xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:modified>`,
            "</cp:coreProperties>",
          ].join(""),
        ],
        { type: "application/xml" }
      ),
    },
    {
      name: "docProps/app.xml",
      blob: new Blob(
        [
          [
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
            '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">',
            `<Application>${escapeXml("Rydder'n")}</Application>`,
            "</Properties>",
          ].join(""),
        ],
        { type: "application/xml" }
      ),
    }
  );

  const docxZip = await buildStoredZip(files);
  downloadBlob(
    docxZip.slice(0, docxZip.size, "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
    `${slugify(params.project.name || "rapport")}.docx`
  );
}
