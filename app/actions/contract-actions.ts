"use server"

import { createClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function sendContract(contractId: string) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Unauthorized");
    }

    // Verify ownership
    const contract = await prisma.leaseContract.findUnique({
      where: { id: contractId },
      include: {
        unit: {
          include: {
            property: true
          }
        }
      }
    });

    if (!contract) {
      throw new Error("Contract not found");
    }

    // Check if user is the owner
    const isOwner = contract.unit.property.ownerId === user.id; // Note: user.id might need mapping to dbUser.id if they differ, but syncUser aligns authId. 
    // Actually, ownerId in Property is the DB User ID.
    // We need to find the DB User for the current Auth User.
    
    // @ts-ignore
    const dbUser = await prisma.user.findFirst({
        where: { authId: user.id } as any
    });

    if (!dbUser || contract.unit.property.ownerId !== dbUser.id) {
         // Allow if admin/manager? For now just owner.
         throw new Error("Unauthorized: Not the property owner");
    }

    await prisma.leaseContract.update({
      where: { id: contractId },
      data: { status: "SENT" },
    });

    revalidatePath(`/dashboard/contracts/${contractId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function signContract(contractId: string) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Unauthorized");
    }

    const dbUser = await prisma.user.findFirst({
        where: { authId: user.id } as any
    });

    if (!dbUser) {
        throw new Error("User not found");
    }

    const contract = await prisma.leaseContract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new Error("Contract not found");
    }

    // Check if user is the tenant
    if (contract.tenantId !== dbUser.id) {
         throw new Error("Unauthorized: You are not the tenant for this contract");
    }

    await prisma.leaseContract.update({
      where: { id: contractId },
      data: { status: "SIGNED" },
    });

    revalidatePath(`/dashboard/contracts/${contractId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function markAsSigned(contractId: string) {
    // Same as sendContract, but sets status to SIGNED (manual override by owner)
    return sendContract(contractId).then(async (res) => {
        if (res.success) {
             await prisma.leaseContract.update({
                where: { id: contractId },
                data: { status: "SIGNED" },
              });

              revalidatePath(`/dashboard/contracts/${contractId}`);
              return { success: true };
        }
        return res;
    });
}
