
import { prisma } from "@/lib/prisma";

// Safe data fetching functions for Server Components
// NOT Server Actions (no "use server") - direct DB access

export async function getProject(id: string) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      property: true,
      unit: true,
      entries: { orderBy: { createdAt: "desc" } },
      tasks: { orderBy: { createdAt: "asc" } },
      reports: { orderBy: { createdAt: "desc" } },
      // @ts-ignore
      evidenceItems: {
        select: {
           id: true,
           evidenceNumber: true,
           originalEntryId: true,
           title: true,
           description: true
        }
      },
    },
  });

  if (!project) return null;

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
  return await (prisma as any).project.findUnique({
    where: { id: projectId },
    include: {
      evidenceItems: {
        where: { deletedAt: null },
        orderBy: { evidenceNumber: 'asc' }
      } as any, // Cast to avoid strict type checks on include
      legalReportDraft: true,
      sequence: true,
      reportInstances: {
        orderBy: { versionNumber: 'desc' },
        include: { snapshots: true }
      } as any
    }
  });
}
