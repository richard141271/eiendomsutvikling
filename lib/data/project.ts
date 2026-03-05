
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase-server";

// Safe data fetching functions for Server Components
// NOT Server Actions (no "use server") - direct DB access

async function enrichEvidenceWithUrls(evidenceItems: any[]) {
  const supabase = createClient();
  
  return await Promise.all(evidenceItems.map(async (item) => {
    if (item.file?.storagePath) {
      try {
        const { data } = await supabase.storage
          .from('evidence')
          .createSignedUrl(item.file.storagePath, 3600); // 1 hour expiry
          
        if (data?.signedUrl) {
          // Add url to the file object (runtime addition)
          item.file.url = data.signedUrl;
        }
      } catch (error) {
        console.error("Error creating signed URL:", error);
      }
    }
    return item;
  }));
}

export async function getProject(id: string) {
  const project = await (prisma as any).project.findUnique({
    where: { id },
    include: {
      property: true,
      unit: true,
      entries: { orderBy: { createdAt: "desc" } },
      tasks: { orderBy: { createdAt: "asc" } },
      reports: { orderBy: { createdAt: "desc" } },
      evidenceItems: {
        where: { deletedAt: null },
        select: {
           id: true,
           evidenceNumber: true,
           originalEntryId: true,
           title: true,
           description: true,
           legalDate: true,
           originalDate: true,
           createdAt: true,
           sourceType: true,
           reliabilityLevel: true,
           file: {
               select: {
                 storagePath: true,
                 url: true, // In case we have it in DB later
                 fileType: true
               }
             }
        }
      },
    },
  });

  if (!project) return null;

  // Enrich with signed URLs
  if (project.evidenceItems && project.evidenceItems.length > 0) {
    project.evidenceItems = await enrichEvidenceWithUrls(project.evidenceItems);
  }

  // Fetch report instances manually to avoid type issues or if they are not included in the main query correctly
  // (Though they are included above as 'reports', sometimes 'reportInstances' is the relation name depending on schema)
  // Checking schema.prisma would be good, but assuming the action logic was correct:
  // The action had 'reports' in include, but then fetched 'reportInstances' separately.
  // Likely 'reports' is the relation to ProjectReport (legacy) and 'reportInstances' is the new one.
  
  const reportInstances = await (prisma as any).reportInstance.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
  });

  return { ...project, reportInstances };
}

export async function getProjectWithEvidence(projectId: string) {
  const project = await (prisma as any).project.findUnique({
    where: { id: projectId },
    include: {
      evidenceItems: {
        where: { deletedAt: null },
        orderBy: [
            { legalPriority: 'asc' }, 
            { evidenceNumber: 'asc' }
        ],
        include: {
            file: true
        }
      } as any, // Cast to avoid strict type checks on include
      legalReportDraft: true,
      sequence: true,
      reportInstances: {
        orderBy: { versionNumber: 'desc' },
        include: { snapshots: true }
      } as any
    }
  });

  if (!project) return null;

  // Enrich with signed URLs
  if (project.evidenceItems && project.evidenceItems.length > 0) {
    project.evidenceItems = await enrichEvidenceWithUrls(project.evidenceItems);
  }

  return project;
}
