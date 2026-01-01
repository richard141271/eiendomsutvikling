"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { RoomType } from "@prisma/client";

export async function createRoom(
  unitId: string, 
  data: {
    name: string;
    type: RoomType;
    sizeSqm?: number;
    description?: string;
    scanUrl?: string;
    images?: string[];
  }
) {
  try {
    const room = await prisma.room.create({
      data: {
        unitId,
        name: data.name,
        type: data.type,
        sizeSqm: data.sizeSqm,
        description: data.description,
        scanUrl: data.scanUrl,
        scanFormat: data.scanUrl ? "GLB" : undefined,
        scanStatus: data.scanUrl ? "COMPLETED" : "PENDING",
        images: {
            create: data.images?.map(url => ({ url }))
        }
      },
      include: {
        images: true
      }
    });
    
    revalidatePath(`/dashboard/units/${unitId}/rooms`);
    return { success: true, data: room };
  } catch (error) {
    console.error("Failed to create room:", error);
    return { success: false, error: "Kunne ikke lagre rommet" };
  }
}

export async function deleteRoom(id: string, unitId: string) {
  try {
    await prisma.room.delete({
      where: { id },
    });
    revalidatePath(`/dashboard/units/${unitId}/rooms`);
    return { success: true };
  } catch (error) {
    return { success: false, error: "Kunne ikke slette rommet" };
  }
}
