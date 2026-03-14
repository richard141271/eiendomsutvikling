"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function generateLegalReport(projectId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const result = await generateLegalReportInternal(projectId);
  
  // Generate PDF immediately after creating the report record
  // MODIFIED: We no longer generate PDF here to avoid Server Action timeouts.
  // The client must call the API route /api/reports/[id]/generate
  // const pdfResult = await generateLegalPdfFromSnapshot(result.reportId);

  return {
    ...result,
    pdfUrl: null // pdfResult.pdfUrl
  };
}

export async function generateDamageReport(projectId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const result = await generateDamageReportInternal(projectId);

  return {
    ...result,
    pdfUrl: null
  };
}

export async function generateLegalReportInternal(projectId: string) {
  // Step 1: Start Transaction
  return await prisma.$transaction(async (tx) => {
    // Step 2: Fetch Project
    const project = await tx.project.findUnique({
      where: { id: projectId }
    });

    if (!project) throw new Error("Project not found");

    // Ensure sequence exists (create if missing, though it should exist from evidence creation)
    // We try to upsert it to be safe
    const sequence = await (tx as any).projectSequence.upsert({
        where: { projectId },
        create: { projectId, lastEvidenceNumber: 0, lastReportVersion: 0 },
        update: {} // No update needed if exists
    });

    // Step 3: Fetch included evidence items
    const evidenceItems = await (tx as any).evidenceItem.findMany({
      where: {
        projectId,
        includeInReport: true,
        deletedAt: null
      },
      include: { 
        file: true,
        linkedEvidence: true // Include linked evidence to get its number
      },
      orderBy: { evidenceNumber: 'asc' }
    });

    if (evidenceItems.length === 0) {
      throw new Error("Ingen bevis er valgt for rapporten. Vennligst velg minst ett bevis.");
    }

    // Step 4: Create ReportInstance
    // Increment report version via ProjectSequence for concurrency safety
    const updatedSequence = await (tx as any).projectSequence.update({
        where: { projectId },
        data: { lastReportVersion: { increment: 1 } }
    });
    const newVersion = updatedSequence.lastReportVersion;
    
    // Fetch draft content for snapshot
    const draft = await (tx as any).legalReportDraft.findUnique({
        where: { projectId }
    });

    const reportInstance = await (tx as any).reportInstance.create({
      data: {
        projectId,
        reportType: "LEGAL", // Juridisk rapport
        versionNumber: newVersion,
        totalEvidenceCount: evidenceItems.length,
        // We store the full draft content as a snapshot JSON
        // Ensure we always store an object, even if draft is null
        contentSnapshot: draft ? JSON.parse(JSON.stringify(draft)) : {}, 
        createdAt: new Date(),
      }
    });

    // Step 5: Create Snapshots (ReportEvidenceSnapshot)
    // We explicitly COPY data (title, description, fileId) to freeze the evidence state
    await (tx as any).reportEvidenceSnapshot.createMany({
        data: evidenceItems.map((item: any) => ({
            reportId: reportInstance.id,
            evidenceItemId: item.id,
            evidenceNumber: item.evidenceNumber,
            title: item.title,
            description: item.description,
            fileId: item.fileId, // Snapshot file reference too
            missingLink: item.missingLink,
            missingLinkNote: item.missingLinkNote,
            missingLinkResolved: item.missingLinkResolved,
            sourceType: item.sourceType,
            reliabilityLevel: item.reliabilityLevel,
            linkedEvidenceId: item.linkedEvidenceId,
            linkedEvidenceNumber: item.linkedEvidence?.evidenceNumber,
            includedAt: new Date()
        }))
    });

    // Step 6: Activate Legal Lock (if first time)
    // We cast to any because the property might not be in the generated type yet if TS is lagging
    if (!(project as any).legalLockActivated) {
        await tx.project.update({
            where: { id: projectId },
            data: {
                legalLockActivated: true,
                legalLockActivatedAt: new Date()
            } as any
        });
    }

    // Step 7: Lock Evidence Items
    // Only lock the items included in this report version
    const evidenceIdsToLock = evidenceItems.map((item: any) => item.id);
    if (evidenceIdsToLock.length > 0) {
        await (tx as any).evidenceItem.updateMany({
            where: { id: { in: evidenceIdsToLock } },
            data: { locked: true }
        });
    }

    return {
        reportId: reportInstance.id,
        versionNumber: newVersion,
        evidenceCount: evidenceItems.length
    };
  });
}

export async function generateDamageReportInternal(projectId: string) {
  return await prisma.$transaction(async (tx) => {
    const project = await tx.project.findUnique({
      where: { id: projectId }
    });

    if (!project) throw new Error("Project not found");

    const sequence = await (tx as any).projectSequence.upsert({
      where: { projectId },
      create: { projectId, lastEvidenceNumber: 0, lastReportVersion: 0 },
      update: {}
    });

    const evidenceItems = await (tx as any).evidenceItem.findMany({
      where: {
        projectId,
        includeInReport: true,
        deletedAt: null
      },
      include: {
        file: true,
        linkedEvidence: true
      },
      orderBy: { evidenceNumber: "asc" }
    });

    if (evidenceItems.length === 0) {
      throw new Error("Ingen dokumentasjon er valgt for rapporten. Vennligst velg minst ett element.");
    }

    const updatedSequence = await (tx as any).projectSequence.update({
      where: { projectId },
      data: { lastReportVersion: { increment: 1 } }
    });
    const newVersion = updatedSequence.lastReportVersion;

    const draft = await (tx as any).damageReportDraft.findUnique({
      where: { projectId }
    });

    const events = await (tx as any).event.findMany({
      where: { projectId },
      orderBy: { date: "asc" },
      include: {
        evidenceItems: {
          include: {
            evidence: true
          }
        }
      }
    });

    const contentSnapshot = {
      draft: draft ? JSON.parse(JSON.stringify(draft)) : {},
      events: events
        ? events.map((e: any) => ({
            id: e.id,
            title: e.title,
            description: e.description,
            date: e.date,
            evidenceNumbers: (e.evidenceItems || [])
              .map((x: any) => x.evidence?.evidenceNumber)
              .filter((n: any) => typeof n === "number"),
          }))
        : []
    };

    const reportInstance = await (tx as any).reportInstance.create({
      data: {
        projectId,
        reportType: "DAMAGE",
        versionNumber: newVersion,
        totalEvidenceCount: evidenceItems.length,
        contentSnapshot,
        createdAt: new Date()
      }
    });

    await (tx as any).reportEvidenceSnapshot.createMany({
      data: evidenceItems.map((item: any) => ({
        reportId: reportInstance.id,
        evidenceItemId: item.id,
        evidenceNumber: item.evidenceNumber,
        title: item.title,
        description: item.description,
        fileId: item.fileId,
        missingLink: item.missingLink,
        missingLinkNote: item.missingLinkNote,
        missingLinkResolved: item.missingLinkResolved,
        sourceType: item.sourceType,
        reliabilityLevel: item.reliabilityLevel,
        linkedEvidenceId: item.linkedEvidenceId,
        linkedEvidenceNumber: item.linkedEvidence?.evidenceNumber,
        includedAt: new Date()
      }))
    });

    const evidenceIdsToLock = evidenceItems.map((item: any) => item.id);
    if (evidenceIdsToLock.length > 0) {
      await (tx as any).evidenceItem.updateMany({
        where: { id: { in: evidenceIdsToLock } },
        data: { locked: true }
      });
    }

    return {
      reportId: reportInstance.id,
      versionNumber: newVersion,
      evidenceCount: evidenceItems.length
    };
  });
}
