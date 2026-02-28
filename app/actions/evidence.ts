"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase-server";

export async function getNextEvidenceNumber(projectId: string): Promise<number> {
  // Use ProjectSequence for atomic, concurrency-safe ID generation
  const sequence = await prisma.projectSequence.upsert({
    where: { projectId },
    create: { 
      projectId, 
      lastEvidenceNumber: 0,
      lastReportVersion: 0 
    },
    update: { 
      lastEvidenceNumber: { increment: 1 } 
    }
  });

  return sequence.lastEvidenceNumber;
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
  });

  if (!project) throw new Error("Project not found");

  // Map existing evidence by original entry ID
  const existingEvidenceMap = new Set(project.evidenceItems.map(e => e.originalEntryId).filter(Boolean));

  // Filter entries that need evidence items (Images primarily)
  const entriesToProcess = project.entries.filter(
    e => (e.type === "IMAGE" || e.imageUrl) && !existingEvidenceMap.has(e.id)
  );

  if (entriesToProcess.length === 0) return;

  // Sort entries by creation time to ensure chronological numbering
  entriesToProcess.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  let currentNumber = await getNextEvidenceNumber(projectId);

  for (const entry of entriesToProcess) {
    if (!entry.imageUrl) continue;

    // 1. Ensure File exists
    let file = await prisma.file.findFirst({
      where: { 
        projectId, 
        storagePath: entry.imageUrl 
      }
    });

    if (!file) {
      file = await prisma.file.create({
        data: {
          projectId,
          storagePath: entry.imageUrl,
          fileType: "image/jpeg", // Default assumption, can be refined if we have metadata
          originalName: "Project Entry Image",
        }
      });
    }

    // 2. Create EvidenceItem
    await prisma.evidenceItem.create({
      data: {
        projectId,
        evidenceNumber: currentNumber,
        title: entry.content || "Prosjektbilde",
        description: entry.content,
        fileId: file.id,
        originalEntryId: entry.id,
        includeInReport: entry.includeInReport,
        createdAt: entry.createdAt,
      },
    });

    currentNumber++;
  }
}

export async function createEvidenceItemForEntry(entry: any) {
  // Only create evidence for images
  if ((entry.type !== "IMAGE" && !entry.imageUrl) || !entry.imageUrl) {
    return;
  }

  // 1. Ensure File exists
  let file = await prisma.file.findFirst({
    where: { 
      projectId: entry.projectId, 
      storagePath: entry.imageUrl 
    }
  });

  if (!file) {
    file = await prisma.file.create({
      data: {
        projectId: entry.projectId,
        storagePath: entry.imageUrl,
        fileType: "image/jpeg",
        originalName: "Project Entry Image",
      }
    });
  }

  // 2. Create EvidenceItem
  // Get next number from sequence (atomic increment)
  const evidenceNumber = await getNextEvidenceNumber(entry.projectId);
  
  await prisma.evidenceItem.create({
    data: {
      projectId: entry.projectId,
      evidenceNumber,
      title: entry.content || "Prosjektbilde",
      description: entry.content,
      fileId: file.id,
      originalEntryId: entry.id,
      includeInReport: entry.includeInReport,
      createdAt: entry.createdAt,
    },
  });
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
