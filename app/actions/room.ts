"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { RoomType } from "@prisma/client";
import { createClient } from "@/lib/supabase-server";

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
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

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
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    await prisma.room.delete({
      where: { id },
    });
    revalidatePath(`/dashboard/units/${unitId}/rooms`);
    return { success: true };
  } catch (error) {
    return { success: false, error: "Kunne ikke slette rommet" };
  }
}

export async function updateRoom(
  roomId: string,
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
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const room = await prisma.room.update({
      where: { id: roomId },
      data: {
        name: data.name,
        type: data.type,
        sizeSqm: data.sizeSqm,
        description: data.description,
        ...(data.scanUrl && {
          scanUrl: data.scanUrl,
          scanFormat: "GLB",
          scanStatus: "COMPLETED",
        }),
        ...(data.images && data.images.length > 0 && {
            images: {
                create: data.images.map(url => ({ url }))
            }
        })
      },
      include: {
        images: true
      }
    });
    
    revalidatePath(`/dashboard/units/${unitId}/rooms`);
    return { success: true, data: room };
  } catch (error) {
    console.error("Failed to update room:", error);
    return { success: false, error: "Kunne ikke oppdatere rommet" };
  }
}
