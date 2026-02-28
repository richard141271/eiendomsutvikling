"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase-server";

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
      reports: {
        orderBy: { versionNumber: 'desc' }
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
