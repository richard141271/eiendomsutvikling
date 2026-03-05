"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase-server";

export async function getNextEvidenceNumber(projectId: string): Promise<number> {
  // Use ProjectSequence for atomic, concurrency-safe ID generation
  const sequence = await (prisma as any).projectSequence.upsert({
    where: { projectId },
    create: { 
      projectId, 
      lastEvidenceNumber: 1,
      lastReportVersion: 0 
    },
    update: { 
      lastEvidenceNumber: { increment: 1 } 
    }
  });

  return sequence.lastEvidenceNumber;
}

// Helper to ensure sequence is in sync with actual items
async function ensureSequenceSynced(projectId: string) {
  const lastItem = await (prisma as any).evidenceItem.findFirst({
    where: { projectId },
    orderBy: { evidenceNumber: 'desc' },
  });

  if (lastItem) {
    const sequence = await (prisma as any).projectSequence.findUnique({
      where: { projectId },
    });

    if (!sequence || sequence.lastEvidenceNumber < lastItem.evidenceNumber) {
      await (prisma as any).projectSequence.upsert({
        where: { projectId },
        create: {
          projectId,
          lastEvidenceNumber: lastItem.evidenceNumber,
        },
        update: {
          lastEvidenceNumber: lastItem.evidenceNumber,
        }
      });
    }
  }
}

// NOTE: This function is primarily for migration or bulk updates. 
// For single entry creation, use createEvidenceItemForEntry.
export async function ensureEvidenceItems(projectId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { entries: true, evidenceItems: true },
  }) as any;

  if (!project) throw new Error("Project not found");

  // Map existing evidence by original entry ID
  const existingEvidenceMap = new Set(project.evidenceItems.map((e: any) => e.originalEntryId).filter(Boolean));

  // Filter entries that need evidence items (Images primarily)
  // Sort by createdAt to ensure chronological numbering
  const entriesToProcess = project.entries
    .filter((e: any) => (e.type === "IMAGE" || e.imageUrl) && !existingEvidenceMap.has(e.id))
    .sort((a: any, b: any) => a.createdAt.getTime() - b.createdAt.getTime());

  if (entriesToProcess.length === 0) return;

  // HEAL: Ensure sequence is in sync with actual items before processing
  await ensureSequenceSynced(projectId);

  // --- Optimization: Batch Processing ---

  // 1. Identify and create missing Files
  const imageUrls = entriesToProcess.map((e: any) => e.imageUrl).filter(Boolean) as string[];
  
  // Fetch existing files for these URLs
   const existingFiles = await (prisma as any).file.findMany({
     where: {
       projectId,
       storagePath: { in: imageUrls }
     }
   });

   const existingFileMap = new Map(existingFiles.map((f: any) => [f.storagePath, f]));
   const filesToCreate = imageUrls.filter(url => !existingFileMap.has(url));

   // Create missing files in batch
   if (filesToCreate.length > 0) {
     // Deduplicate URLs just in case
     const uniqueFilesToCreate = Array.from(new Set(filesToCreate));
     
     await (prisma as any).file.createMany({
       data: uniqueFilesToCreate.map(url => {
         let fileType = "image/jpeg";
         let originalName = "Project Entry Image";
         
         const ext = url.split('.').pop()?.toLowerCase();
         if (ext === "pdf") {
            fileType = "application/pdf";
            originalName = "Dokument (PDF)";
         } else if (ext === "eml" || ext === "msg") {
            fileType = "message/rfc822";
            originalName = "E-post";
         } else if (ext === "docx" || ext === "doc") {
            fileType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            originalName = "Dokument (Word)";
         } else if (ext === "xlsx" || ext === "xls") {
            fileType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            originalName = "Dokument (Excel)";
         } else if (ext === "txt") {
            fileType = "text/plain";
            originalName = "Tekstdokument";
         }

         return {
           projectId,
           storagePath: url,
           fileType,
           originalName,
         };
       }),
       skipDuplicates: true // Safety against race conditions
     });
   }

   // Re-fetch all needed files to get IDs (including newly created ones)
   const allFiles = await (prisma as any).file.findMany({
     where: {
       projectId,
       storagePath: { in: imageUrls }
     }
   });
   
   const fileMap = new Map(allFiles.map((f: any) => [f.storagePath, f.id]));

   // 2. Reserve Evidence Numbers Range
   // Atomic update to reserve N numbers
   const count = entriesToProcess.length;
   
   const sequence = await (prisma as any).projectSequence.upsert({
     where: { projectId },
     create: { 
       projectId, 
       lastEvidenceNumber: count,
       lastReportVersion: 0 
     },
     update: { 
       lastEvidenceNumber: { increment: count } 
     }
   });

   // Calculate start number (inclusive)
   const endSeq = sequence.lastEvidenceNumber;
   const startSeq = endSeq - count + 1;

   // 3. Prepare Evidence Items
   const evidenceItemsData = entriesToProcess.map((entry: any, index: number) => {
     if (!entry.imageUrl) return null;
     
     const fileId = fileMap.get(entry.imageUrl);
     if (!fileId) {
       console.error(`File ID not found for url: ${entry.imageUrl}`);
       return null;
     }

     return {
       projectId,
       evidenceNumber: startSeq + index,
       title: entry.content || "Prosjektbilde",
       description: entry.content,
       fileId: fileId,
       originalEntryId: entry.id,
       includeInReport: entry.includeInReport,
       createdAt: entry.createdAt,
       updatedAt: new Date(), // Explicitly set updatedAt for createMany
     };
   }).filter(Boolean); // Remove nulls

   // 4. Create Evidence Items in Batch
   if (evidenceItemsData.length > 0) {
     await (prisma as any).evidenceItem.createMany({
       data: evidenceItemsData as any,
       skipDuplicates: true // Safety
     });
   }
}

export async function createEvidenceItemForEntry(entry: any) {
  // Create evidence for IMAGES and DOCUMENTS
  if ((entry.type !== "IMAGE" && entry.type !== "DOCUMENT" && !entry.imageUrl) || !entry.imageUrl) {
    return;
  }

  // HEAL: Ensure sequence is in sync
  await ensureSequenceSynced(entry.projectId);

  // Determine file type
  let fileType = "image/jpeg";
  if (entry.type === "DOCUMENT") {
    const ext = entry.imageUrl.split('.').pop()?.toLowerCase();
    if (ext === "pdf") fileType = "application/pdf";
    else if (ext === "eml") fileType = "message/rfc822";
    else fileType = "application/octet-stream";
  }

  // 1. Ensure File exists
  let file = await (prisma as any).file.findFirst({
    where: { 
      projectId: entry.projectId, 
      storagePath: entry.imageUrl 
    }
  });

  if (!file) {
    file = await (prisma as any).file.create({
      data: {
        projectId: entry.projectId,
        storagePath: entry.imageUrl,
        fileType: fileType,
        originalName: entry.type === "DOCUMENT" ? "Dokument" : "Project Entry Image",
      }
    });
  }

  // 2. Create EvidenceItem
  const evidenceNumber = await getNextEvidenceNumber(entry.projectId);
  
  await (prisma as any).evidenceItem.create({
    data: {
      projectId: entry.projectId,
      evidenceNumber,
      title: entry.content || (entry.type === "DOCUMENT" ? "Dokument" : "Prosjektbilde"),
      description: entry.content,
      fileId: file.id,
      originalEntryId: entry.id,
      includeInReport: entry.includeInReport,
      createdAt: entry.createdAt,
    },
  });
}

export async function createEvidenceItem(data: {
  projectId: string;
  url: string;
  title: string;
  description?: string;
  fileType: string;
  originalName?: string;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // HEAL: Ensure sequence is in sync
  await ensureSequenceSynced(data.projectId);

  // 1. Ensure File exists
  let file = await (prisma as any).file.findFirst({
    where: { 
      projectId: data.projectId, 
      storagePath: data.url 
    }
  });

  if (!file) {
    file = await (prisma as any).file.create({
      data: {
        projectId: data.projectId,
        storagePath: data.url,
        fileType: data.fileType,
        originalName: data.originalName || "Uploaded File",
      }
    });
  }

  // 2. Create EvidenceItem
  const evidenceNumber = await getNextEvidenceNumber(data.projectId);
  
  const item = await (prisma as any).evidenceItem.create({
    data: {
      projectId: data.projectId,
      evidenceNumber,
      title: data.title,
      description: data.description,
      fileId: file.id,
      includeInReport: true, // Default to true
      // No originalEntryId since it's direct upload
    },
  });

  return item;
}

// --- LOCKING & SNAPSHOTS ---

export async function lockEvidenceItem(evidenceId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // TODO: Add role check if needed

  await prisma.evidenceItem.update({
    where: { id: evidenceId },
    data: { locked: true }
  });
}

export async function createReportSnapshot(projectId: string, reportInstanceId: string) {
  // 1. Get all active evidence items included in report
  const evidenceItems = await prisma.evidenceItem.findMany({
    where: { 
      projectId,
      includeInReport: true,
      deletedAt: null
    },
    orderBy: { evidenceNumber: 'asc' }
  });

  if (evidenceItems.length === 0) return 0;

  // 2. Create snapshots
  const snapshots = evidenceItems.map(item => ({
    reportId: reportInstanceId,
    evidenceItemId: item.id,
    evidenceNumber: item.evidenceNumber,
    includedAt: new Date(),
    title: item.title,
    description: item.description,
    fileId: item.fileId,
  }));

  await prisma.reportEvidenceSnapshot.createMany({
    data: snapshots
  });

  // 3. Lock all included evidence items
  await prisma.evidenceItem.updateMany({
    where: { 
      id: { in: evidenceItems.map(e => e.id) } 
    },
    data: { locked: true }
  });

  return evidenceItems.length;
}

export async function getEvidenceItems(projectId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  return await prisma.evidenceItem.findMany({
    where: { 
      projectId,
      deletedAt: null // Only active items
    },
    orderBy: { evidenceNumber: 'asc' },
    include: {
      file: true
    }
  });
}

export async function updateEvidenceItem(id: string, data: { 
  title?: string; 
  description?: string; 
  legalDate?: Date; 
  legalPriority?: number; 
  includeInReport?: boolean;
  category?: string;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  return await prisma.evidenceItem.update({
    where: { id },
    data
  });
}

export async function updateEvidenceOrder(items: { id: string; legalPriority: number }[]) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Transaction to update multiple items
  return await prisma.$transaction(
    items.map(item => 
      (prisma as any).evidenceItem.update({
        where: { id: item.id },
        data: { legalPriority: item.legalPriority }
      })
    )
  );
}

export async function updateEvidenceItems(items: { id: string; legalDate?: Date; legalPriority?: number }[]) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Transaction to update multiple items
  return await prisma.$transaction(
    items.map(item => 
      (prisma as any).evidenceItem.update({
        where: { id: item.id },
        data: { 
          ...(item.legalDate !== undefined && { legalDate: item.legalDate }),
          ...(item.legalPriority !== undefined && { legalPriority: item.legalPriority })
        }
      })
    )
  );
}
