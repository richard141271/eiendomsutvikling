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
    wallsPaintType?: string;
    wallsGloss?: string;
    wallsColorCode?: string;
    ceilingPaintType?: string;
    ceilingGloss?: string;
    ceilingColorCode?: string;
    trimPaintType?: string;
    trimGloss?: string;
    trimColorCode?: string;
    doorsPaintType?: string;
    doorsGloss?: string;
    doorsColorCode?: string;
    windowsPaintType?: string;
    windowsGloss?: string;
    windowsColorCode?: string;
    paintNotes?: string;
    scanUrl?: string;
    images?: string[];
  }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const room = await (prisma as any).room.create({
      data: {
        unitId,
        name: data.name,
        type: data.type,
        sizeSqm: data.sizeSqm,
        description: data.description,
        wallsPaintType: data.wallsPaintType,
        wallsGloss: data.wallsGloss,
        wallsColorCode: data.wallsColorCode,
        ceilingPaintType: data.ceilingPaintType,
        ceilingGloss: data.ceilingGloss,
        ceilingColorCode: data.ceilingColorCode,
        trimPaintType: data.trimPaintType,
        trimGloss: data.trimGloss,
        trimColorCode: data.trimColorCode,
        doorsPaintType: data.doorsPaintType,
        doorsGloss: data.doorsGloss,
        doorsColorCode: data.doorsColorCode,
        windowsPaintType: data.windowsPaintType,
        windowsGloss: data.windowsGloss,
        windowsColorCode: data.windowsColorCode,
        paintNotes: data.paintNotes,
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
    wallsPaintType?: string;
    wallsGloss?: string;
    wallsColorCode?: string;
    ceilingPaintType?: string;
    ceilingGloss?: string;
    ceilingColorCode?: string;
    trimPaintType?: string;
    trimGloss?: string;
    trimColorCode?: string;
    doorsPaintType?: string;
    doorsGloss?: string;
    doorsColorCode?: string;
    windowsPaintType?: string;
    windowsGloss?: string;
    windowsColorCode?: string;
    paintNotes?: string;
    scanUrl?: string;
    images?: string[];
  }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const room = await (prisma as any).room.update({
      where: { id: roomId },
      data: {
        name: data.name,
        type: data.type,
        sizeSqm: data.sizeSqm,
        description: data.description,
        wallsPaintType: data.wallsPaintType,
        wallsGloss: data.wallsGloss,
        wallsColorCode: data.wallsColorCode,
        ceilingPaintType: data.ceilingPaintType,
        ceilingGloss: data.ceilingGloss,
        ceilingColorCode: data.ceilingColorCode,
        trimPaintType: data.trimPaintType,
        trimGloss: data.trimGloss,
        trimColorCode: data.trimColorCode,
        doorsPaintType: data.doorsPaintType,
        doorsGloss: data.doorsGloss,
        doorsColorCode: data.doorsColorCode,
        windowsPaintType: data.windowsPaintType,
        windowsGloss: data.windowsGloss,
        windowsColorCode: data.windowsColorCode,
        paintNotes: data.paintNotes,
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
