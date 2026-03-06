"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ClaimStatus, EvidenceRole } from "@prisma/client";
import { z } from "zod";

const claimSchema = z.object({
  projectId: z.string(),
  statement: z.string().min(1, "Påstand må fylles ut"),
  source: z.string().optional(),
  sourceDate: z.date().optional().nullable(),
  status: z.nativeEnum(ClaimStatus).optional(),
});

export async function createClaim(data: z.infer<typeof claimSchema>) {
  try {
    const claim = await prisma.claim.create({
      data: {
        projectId: data.projectId,
        statement: data.statement,
        source: data.source,
        sourceDate: data.sourceDate,
        status: data.status || "UNVERIFIED",
      },
    });
    revalidatePath(`/projects/${data.projectId}/claims`);
    return { success: true, data: claim };
  } catch (error) {
    console.error("Error creating claim:", error);
    return { success: false, error: "Kunne ikke opprette påstand" };
  }
}

export async function updateClaim(id: string, data: Partial<z.infer<typeof claimSchema>>) {
  try {
    const claim = await prisma.claim.update({
      where: { id },
      data: {
        statement: data.statement,
        source: data.source,
        sourceDate: data.sourceDate,
        status: data.status,
      },
    });
    revalidatePath(`/projects/${claim.projectId}/claims`);
    return { success: true, data: claim };
  } catch (error) {
    console.error("Error updating claim:", error);
    return { success: false, error: "Kunne ikke oppdatere påstand" };
  }
}

export async function deleteClaim(id: string, projectId: string) {
  try {
    await prisma.claim.delete({
      where: { id },
    });
    revalidatePath(`/projects/${projectId}/claims`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting claim:", error);
    return { success: false, error: "Kunne ikke slette påstand" };
  }
}

export async function linkEvidenceToClaim(claimId: string, evidenceId: string, role: EvidenceRole, projectId: string) {
  try {
    const existing = await prisma.claimEvidence.findUnique({
      where: {
        claimId_evidenceId: {
          claimId,
          evidenceId,
        },
      },
    });

    if (existing) {
      if (existing.role !== role) {
        await prisma.claimEvidence.update({
          where: { id: existing.id },
          data: { role },
        });
      }
    } else {
      await prisma.claimEvidence.create({
        data: {
          claimId,
          evidenceId,
          role,
        },
      });
    }
    revalidatePath(`/projects/${projectId}/claims`);
    return { success: true };
  } catch (error) {
    console.error("Error linking evidence:", error);
    return { success: false, error: "Kunne ikke koble bevis" };
  }
}

export async function unlinkEvidenceFromClaim(claimId: string, evidenceId: string, projectId: string) {
  try {
    await prisma.claimEvidence.delete({
      where: {
        claimId_evidenceId: {
          claimId,
          evidenceId,
        },
      },
    });
    revalidatePath(`/projects/${projectId}/claims`);
    return { success: true };
  } catch (error) {
    console.error("Error unlinking evidence:", error);
    return { success: false, error: "Kunne ikke fjerne kobling" };
  }
}

export async function getClaims(projectId: string) {
  try {
    const claims = await prisma.claim.findMany({
      where: { projectId },
      include: {
        evidenceLinks: {
          include: {
            evidence: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, data: claims };
  } catch (error) {
    console.error("Error fetching claims:", error);
    return { success: false, error: "Kunne ikke hente påstander" };
  }
}
