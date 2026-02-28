"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase-server";
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import crypto from 'crypto';
import { revalidatePath } from "next/cache";
import { ReportEvidenceSnapshot, File as PrismaFile } from "@prisma/client";

// --- Interfaces ---

interface LegalReportContent {
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
}

// --- PDF Generation Constants ---
const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const MARGIN = 50;
const CONTENT_WIDTH = A4_WIDTH - (MARGIN * 2);

export async function generateLegalPdfFromSnapshot(reportId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // 1. Fetch Report & Snapshot Data
  const report = await prisma.reportInstance.findUnique({
    where: { id: reportId },
    include: {
      project: true,
      snapshots: {
        orderBy: { evidenceNumber: 'asc' }
      }
    }
  });

  if (!report) throw new Error("Rapport ikke funnet");
  if (!report.contentSnapshot) throw new Error("Mangler innholds-snapshot");

  // If PDF already exists, return it (idempotency)
  if (report.pdfUrl) {
    return { 
      success: true, 
      pdfUrl: report.pdfUrl, 
      isNew: false 
    };
  }

  const content = report.contentSnapshot as unknown as LegalReportContent;
  const snapshots: ReportEvidenceSnapshot[] = report.snapshots;

  // 2. Fetch Files (Single Pass)
  // We need to get the storage paths for all files referenced in snapshots
  const fileIds = snapshots.map((s: ReportEvidenceSnapshot) => s.fileId);
  const files = await prisma.file.findMany({
    where: { id: { in: fileIds } }
  });
  
  const fileMap = new Map<string, PrismaFile>(files.map((f: PrismaFile) => [f.id, f]));

  // 3. Initialize PDF
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  // Helper: Add Page
  let currentPage = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  let yPosition = A4_HEIGHT - MARGIN;

  const addNewPage = () => {
    currentPage = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
    yPosition = A4_HEIGHT - MARGIN;
  };

  const checkPageBreak = (heightNeeded: number) => {
    if (yPosition - heightNeeded < MARGIN) {
      addNewPage();
    }
  };

  const drawText = (text: string, options: { font?: any, size?: number, color?: any } = {}) => {
    const font = options.font || fontRegular;
    const size = options.size || 12;
    const color = options.color || rgb(0, 0, 0);
    const lineHeight = size * 1.2;

    // Handle newlines first
    const paragraphs = text.split('\n');
    
    for (const paragraph of paragraphs) {
      if (paragraph === "") {
        yPosition -= lineHeight;
        continue;
      }

      const words = paragraph.split(' ');
      let line = "";

      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + " ";
        const testWidth = font.widthOfTextAtSize(testLine, size);
        
        if (testWidth > CONTENT_WIDTH && n > 0) {
          checkPageBreak(lineHeight);
          currentPage.drawText(line, { x: MARGIN, y: yPosition, size, font, color });
          yPosition -= lineHeight;
          line = words[n] + " ";
        } else {
          line = testLine;
        }
      }
      checkPageBreak(lineHeight);
      currentPage.drawText(line, { x: MARGIN, y: yPosition, size, font, color });
      yPosition -= lineHeight;
    }
    // Add extra space after paragraph
    yPosition -= (size * 0.5); 
  };

  // --- A) Front Page ---
  drawText(report.project.title, { font: fontBold, size: 24 });
  yPosition -= 20;
  drawText(`Juridisk Rapport v${report.versionNumber}`, { font: fontBold, size: 18, color: rgb(0.4, 0.4, 0.4) });
  yPosition -= 10;
  drawText(`Dato: ${new Date().toLocaleDateString('no-NO')}`, { size: 12 });
  drawText(`Antall bevis: ${report.totalEvidenceCount}`, { size: 12 });
  
  addNewPage();

  // --- B) Summary ---
  if (content.summary) {
    drawText("Sammendrag", { font: fontBold, size: 16 });
    yPosition -= 10;
    drawText(content.summary);
    yPosition -= 20;
  }

  // --- C) Factual Basis ---
  if (content.factualBasis) {
    checkPageBreak(100);
    drawText("Faktisk Grunnlag", { font: fontBold, size: 16 });
    yPosition -= 10;
    drawText(content.factualBasis);
    yPosition -= 20;
  }

  // --- D) Technical Analysis ---
  if (content.includeTechnical && content.technicalAnalysis) {
    checkPageBreak(100);
    drawText("Teknisk Vurdering", { font: fontBold, size: 16 });
    yPosition -= 10;
    drawText(content.technicalAnalysis);
    yPosition -= 20;
  }

  // --- E) Legal Assessment ---
  if (content.includeLegal) {
    checkPageBreak(100);
    drawText("Juridisk Vurdering", { font: fontBold, size: 16 });
    yPosition -= 10;

    const legalFields = [
      { label: "Ansvarsgrunnlag", value: content.liabilityBasis },
      { label: "Lovhenvisning", value: content.legalNormReference },
      { label: "Årsakssammenheng", value: content.causationAnalysis },
      { label: "Påregnelighet", value: content.foreseeabilityAssessment },
      { label: "Økonomisk tap", value: content.economicLoss },
      { label: "Juridisk konklusjon", value: content.legalConclusion },
    ];

    for (const field of legalFields) {
      if (field.value) {
        checkPageBreak(60);
        drawText(field.label, { font: fontBold, size: 12 });
        drawText(field.value);
        yPosition -= 10;
      }
    }
  }

  // --- F) Conclusion ---
  if (content.conclusion) {
    checkPageBreak(100);
    drawText("Konklusjon", { font: fontBold, size: 16 });
    yPosition -= 10;
    drawText(content.conclusion);
    yPosition -= 20;
  }

  // --- G) Evidence Index ---
  addNewPage();
  drawText("Bevisindeks", { font: fontBold, size: 16 });
  yPosition -= 20;

  for (const snap of snapshots) {
    checkPageBreak(20);
    const line = `B-${snap.evidenceNumber}: ${snap.title}`;
    drawText(line, { size: 10 });
    yPosition += 5; // Compact list
  }

  // --- H) Attachments (Images) ---
  addNewPage();
  drawText("Vedlegg", { font: fontBold, size: 16 });
  yPosition -= 20;

  for (const snap of snapshots) {
    const fileRecord = fileMap.get(snap.fileId);
    if (!fileRecord || !fileRecord.storagePath) continue;

    // Fetch Image
    try {
      let imageUrl = fileRecord.storagePath;
      
      // Handle relative paths (assume property-images bucket)
      if (!imageUrl.startsWith('http')) {
        const { data } = supabase.storage
          .from('property-images')
          .getPublicUrl(imageUrl);
        imageUrl = data.publicUrl;
      }

      const imageBytes = await fetch(imageUrl).then(res => {
        if (!res.ok) throw new Error(`Failed to fetch image: ${res.statusText}`);
        return res.arrayBuffer();
      });
      
      let image;
      if (fileRecord.fileType.includes('png')) {
        image = await pdfDoc.embedPng(imageBytes);
      } else if (fileRecord.fileType.includes('jpg') || fileRecord.fileType.includes('jpeg')) {
        image = await pdfDoc.embedJpg(imageBytes);
      } else {
        console.warn(`Unsupported file type for embedding: ${fileRecord.fileType}`);
        continue;
      }

      const imgDims = image.scaleToFit(CONTENT_WIDTH, A4_HEIGHT / 2);

      checkPageBreak(imgDims.height + 100);
      
      // Title
      drawText(`Bevis B-${snap.evidenceNumber}: ${snap.title}`, { font: fontBold, size: 14 });
      
      // Image
      currentPage.drawImage(image, {
        x: MARGIN,
        y: yPosition - imgDims.height,
        width: imgDims.width,
        height: imgDims.height,
      });
      yPosition -= (imgDims.height + 10);

      // Description
      if (snap.description) {
        drawText(snap.description, { size: 10, color: rgb(0.3, 0.3, 0.3) });
      }
      
      yPosition -= 30; // Spacing between items

    } catch (e) {
      console.error(`Failed to embed image for evidence ${snap.evidenceNumber}:`, e);
      checkPageBreak(20);
      drawText(`[Feil ved lasting av bilde for bevis B-${snap.evidenceNumber}]`, { color: rgb(1, 0, 0) });
      yPosition -= 20;
    }
  }

  // 4. Finalize PDF & Hash
  const pdfBytes = await pdfDoc.save();
  const pdfBuffer = Buffer.from(pdfBytes);
  const pdfHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

  // 5. Upload to Storage
  const fileName = `legal-report-${report.project.id}-v${report.versionNumber}-${Date.now()}.pdf`;
  
  // Use admin client if possible for storage, or authenticated user client
  // Using user client since we have user context
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('reports') // Target bucket
    .upload(fileName, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true
    });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { data: { publicUrl } } = supabase.storage
    .from('reports')
    .getPublicUrl(fileName);

  // 6. Update ReportInstance
  await prisma.reportInstance.update({
    where: { id: reportId },
    data: {
      pdfUrl: publicUrl,
      pdfHash: pdfHash,
      pdfSize: pdfBytes.length,
      pdfGeneratedAt: new Date(),
    }
  });

  return { success: true, pdfUrl: publicUrl, isNew: true };
}

export async function getProjectWithEvidence(projectId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      evidenceItems: {
        where: { deletedAt: null },
        orderBy: { evidenceNumber: 'asc' }
      },
      legalReportDraft: true,
      sequence: true, // Check for lock status if needed
      reportInstances: {
        orderBy: { versionNumber: 'desc' },
        include: { snapshots: true }
      }
    }
  });

  return project;
}

export async function updateEvidenceInclusion(evidenceId: string, includeInReport: boolean) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  
  await prisma.evidenceItem.update({
    where: { id: evidenceId },
    data: { includeInReport }
  });
}

// --- Archiving & Backup Actions ---

export async function markReportAsDownloaded(reportId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  await prisma.reportInstance.update({
    where: { id: reportId },
    data: {
      backupDownloaded: true,
      backupDownloadedAt: new Date(),
    }
  });
  
  // Revalidate might be tricky as we don't know the project ID here directly without fetching
  // But usually the client will handle state or refresh
}

export async function archiveReport(reportId: string, projectId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // 1. Check if downloaded
  const report = await prisma.reportInstance.findUnique({
    where: { id: reportId },
  });

  if (!report) throw new Error("Report not found");

  if (!report.backupDownloaded) {
    throw new Error("Rapporten må lastes ned før den kan arkiveres.");
  }

  // 2. Archive
  await prisma.reportInstance.update({
    where: { id: reportId },
    data: {
      archived: true,
      archivedAt: new Date(),
      archivedBy: user.email, // Or user.id if preferred, schema says String?
    }
  });

  // 3. Revalidate
  // We need revalidatePath, but we need to import it.
  // Assuming the caller will handle revalidation or we return success.
}

export async function downloadProjectArchive(projectId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // TODO: V2 - Implement ZIP generation of all legal reports
  // This function will:
  // 1. Fetch all reports for the project
  // 2. Generate PDFs for each report (using the snapshot data)
  // 3. Create a ZIP file containing all PDFs
  // 4. Mark all included reports as downloaded (backupDownloaded = true)
  // 5. Return the ZIP file stream/blob

  /* 
  const reports = await prisma.reportInstance.findMany({
    where: { projectId, archived: false }, // Should we include archived ones too? usually yes for full backup
  });

  // ... Generate ZIP logic ...

  // Update status
  await prisma.reportInstance.updateMany({
    where: { projectId },
    data: {
      backupDownloaded: true,
      backupDownloadedAt: new Date()
    }
  });
  */

  throw new Error("Project Archive Download (ZIP) is coming in V2");
}
