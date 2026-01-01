"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createRoomScan(unitId: string, name: string, fileUrl: string) {
  try {
    const scan = await prisma.roomScan.create({
      data: {
        unitId,
        name,
        fileUrl,
        format: "GLB", // Default for now
        status: "COMPLETED",
      },
    });
    
    revalidatePath(`/dashboard/units/${unitId}/room-scan`);
    return { success: true, data: scan };
  } catch (error) {
    console.error("Failed to create room scan:", error);
    return { success: false, error: "Kunne ikke lagre skanningen" };
  }
}

export async function deleteRoomScan(id: string, unitId: string) {
  try {
    await prisma.roomScan.delete({
      where: { id },
    });
    revalidatePath(`/dashboard/units/${unitId}/room-scan`);
    return { success: true };
  } catch (error) {
    return { success: false, error: "Kunne ikke slette skanningen" };
  }
}
