"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { InspectionType } from "@prisma/client";

export async function createInspectionProtocol(contractId: string, type: InspectionType) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // Verify ownership or tenancy (usually owner initiates)
  const contract = await prisma.leaseContract.findUnique({
    where: { id: contractId },
    include: {
      unit: {
        include: {
          property: true,
          roomDetails: true
        }
      }
    }
  });

  if (!contract) {
    throw new Error("Contract not found");
  }

  // Check permissions (Owner only for creation usually)
  const isOwner = contract.unit.property.ownerId === (await prisma.user.findUnique({ where: { authId: user.id } }))?.id;
  
  if (!isOwner) {
    throw new Error("Only owner can create inspection protocols");
  }

  // Create protocol
  const protocol = await prisma.inspectionProtocol.create({
    data: {
      contractId,
      type,
      // Create default checkpoints based on rooms
      checkpoints: {
        create: contract.unit.roomDetails.flatMap(room => [
            { roomName: room.name, element: "Gulv", status: "OK" },
            { roomName: room.name, element: "Vegger", status: "OK" },
            { roomName: room.name, element: "Tak", status: "OK" },
            { roomName: room.name, element: "Vindu/Dør", status: "OK" },
            { roomName: room.name, element: "Inventar", status: "OK" },
        ])
      }
    }
  });

  revalidatePath(`/dashboard/contracts/${contractId}`);
  redirect(`/dashboard/contracts/${contractId}/inspection/${protocol.id}`);
}

export async function updateCheckpoint(checkpointId: string, data: { status: string, notes?: string }) {
    await prisma.inspectionCheckpoint.update({
        where: { id: checkpointId },
        data
    });
    revalidatePath('/dashboard/contracts');
}

export async function addCheckpointImage(checkpointId: string, url: string) {
    try {
        await prisma.checkpointImage.create({
            data: {
                checkpointId,
                url
            }
        });
        revalidatePath('/dashboard/contracts');
        return { success: true };
    } catch (error) {
        console.error("Failed to add image:", error);
        return { success: false, error: "Failed to add image" };
    }
}

export async function deleteCheckpointImage(imageId: string) {
    try {
        await prisma.checkpointImage.delete({
            where: { id: imageId }
        });
        revalidatePath('/dashboard/contracts');
        return { success: true };
    } catch (error) {
        console.error("Failed to delete image:", error);
        return { success: false, error: "Failed to delete image" };
    }
}

export async function updateProtocolDetails(protocolId: string, data: { 
    electricityMeterReading?: string, 
    keysHandedOver?: number,
    notes?: string 
}) {
    await prisma.inspectionProtocol.update({
        where: { id: protocolId },
        data
    });
    revalidatePath('/dashboard/contracts');
}

export async function signProtocol(protocolId: string, role: 'OWNER' | 'TENANT') {
    const data = role === 'OWNER' 
        ? { signedByOwner: true } 
        : { signedByTenant: true };
    
    // Check if both signed, then maybe set signedAt
    // For now simple boolean update
    await prisma.inspectionProtocol.update({
        where: { id: protocolId },
        data
    });
    revalidatePath('/dashboard/contracts');
}
