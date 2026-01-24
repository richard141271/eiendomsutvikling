"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase-server";
import { ContributionType, ContributionStatus } from "@prisma/client";

const createContributionSchema = z.object({
  unitId: z.string(),
  type: z.nativeEnum(ContributionType),
  description: z.string().min(1, "Beskrivelse er påkrevd"),
  imageUrl: z.string().optional(),
});

export async function createContribution(data: z.infer<typeof createContributionSchema>) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Find the db user to get the ID
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
    });

    if (!dbUser) throw new Error("User not found");

    const contribution = await prisma.tenantContribution.create({
      data: {
        unitId: data.unitId,
        tenantId: dbUser.id,
        type: data.type,
        description: data.description,
        imageUrl: data.imageUrl,
        status: "PENDING",
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/contributions");
    return { success: true, data: contribution };
  } catch (error) {
    console.error("Failed to create contribution:", error);
    return { success: false, error: "Kunne ikke sende inn bidrag" };
  }
}

export async function updateContributionStatus(id: string, status: ContributionStatus, stars?: number) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Verify admin/owner role
    const dbUser = await prisma.user.findUnique({ where: { authId: user.id } });
    if (!dbUser || (dbUser.role !== 'ADMIN' && dbUser.role !== 'OWNER')) {
       throw new Error("Unauthorized");
    }

    // Get existing contribution
    const existingContribution = await prisma.tenantContribution.findUnique({
        where: { id },
        include: { tenant: true }
    });
    if (!existingContribution) throw new Error("Contribution not found");

    const newStars = stars !== undefined ? stars : existingContribution.starsAwarded;
    const starDelta = newStars - existingContribution.starsAwarded;

    const contribution = await prisma.tenantContribution.update({
      where: { id },
      data: { 
        status,
        starsAwarded: newStars 
      },
    });

    // Update certificate if stars changed
    if (starDelta !== 0) {
        const tenantId = existingContribution.tenantId;
        const certificate = await prisma.tenantCertificate.findFirst({
            where: { tenantId },
            orderBy: { createdAt: 'desc' }
        });

        if (certificate) {
            await prisma.tenantCertificate.update({
                where: { id: certificate.id },
                // @ts-ignore - Prisma types not updating correctly in build env
                data: { stars: { increment: starDelta } }
            });
        } else {
            // Create new certificate
            await prisma.tenantCertificate.create({
                data: {
                    tenantId,
                    issuerId: dbUser.id,
                    totalScore: 100,
                    behaviorScore: 100,
                    noiseScore: 100,
                    paymentScore: 100,
                    cleaningScore: 100,
                    // @ts-ignore - Prisma types not updating correctly in build env
                    stars: newStars,
                    comment: "Opprettet automatisk via bidrag",
                }
            });
            // Update user flag
            await prisma.user.update({
                where: { id: tenantId },
                data: { hasTenantCertificate: true }
            });
        }
    }

    revalidatePath("/dashboard/contributions");
    revalidatePath("/dashboard");
    return { success: true, data: contribution };
  } catch (error) {
    console.error("Failed to update contribution status:", error);
    return { success: false, error: "Kunne ikke oppdatere status" };
  }
}
