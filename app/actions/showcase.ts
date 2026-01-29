"use server";

import { prisma } from "@/lib/prisma";
import { RoomType } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function saveRoomData(
  unitId: string,
  roomName: string,
  images: string[],
  description: string
) {
  try {
    // Find or create the room
    // Note: In a real app we might want to be more specific than just name matching
    // but for this wizard flow, name matching per unit is sufficient
    
    // Determine room type based on name
    let type: RoomType = "OTHER";
    const lowerName = roomName.toLowerCase();
    if (lowerName.includes("stue")) type = "LIVING_ROOM";
    else if (lowerName.includes("kjøkken")) type = "KITCHEN";
    else if (lowerName.includes("bad")) type = "BATHROOM";
    else if (lowerName.includes("soverom")) type = "BEDROOM";
    else if (lowerName.includes("gang") || lowerName.includes("entré")) type = "HALLWAY";
    
    // Find existing room by name and unitId to avoid duplicates
    // Since there is no unique constraint on (unitId, name), we can't use upsert directly
    const existingRoom = await prisma.room.findFirst({
      where: {
        unitId,
        name: roomName
      }
    });

    let roomId;

    if (existingRoom) {
      const updated = await prisma.room.update({
        where: { id: existingRoom.id },
        data: {
          description,
          type
        }
      });
      roomId = updated.id;
    } else {
      const created = await prisma.room.create({
        data: {
          unitId,
          name: roomName,
          type,
          description
        }
      });
      roomId = created.id;
    }

    // Handle images
    // First, remove existing images for this room to sync with the wizard state
    await prisma.roomImage.deleteMany({
      where: { roomId }
    });

    if (images.length > 0) {
      await prisma.roomImage.createMany({
        data: images.map(url => ({
          roomId,
          url
        }))
      });
    }

    revalidatePath(`/dashboard/units/${unitId}`);
    return { success: true, roomId };
  } catch (error) {
    console.error("Error saving room data:", error);
    return { success: false, error: "Failed to save room data" };
  }
}

import { generateShowcasePDF } from "@/lib/showcase-pdf-generator";
import { createAdminClient, ensureBucketExists } from "@/lib/supabase-admin";

export async function generateShowcaseReport(
  unitId: string, 
  type: string,
  details: Record<string, string> = {}
) {
  try {
    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
      include: {
        property: true,
        roomDetails: {
          include: {
            images: true
          },
          orderBy: {
             // Order by name or something deterministic if possible
             // For now just insertion order or createdAt
             createdAt: 'asc'
          }
        }
      }
    });

    if (!unit) throw new Error("Unit not found");

    // Map to ShowcaseData
    const data = {
      type,
      address: `${unit.property.address}, ${unit.name}`,
      unitName: unit.name,
      size: unit.sizeSqm,
      details,
      rooms: unit.roomDetails.map(room => ({
        name: room.name,
        description: room.description || undefined,
        images: room.images.map(img => img.url)
      }))
    };

    // Generate PDF
    console.log("Generating PDF for type:", type);
    const { pdfBuffer, fileName } = await generateShowcasePDF(data);
    console.log("PDF generated successfully, size:", pdfBuffer.length);

    // Upload to Supabase using Admin Client
    console.log("Uploading to Supabase (Admin)...");
    
    // Ensure bucket exists
    try {
        await ensureBucketExists('reports');
    } catch (bucketError) {
        console.warn("Could not ensure bucket exists (likely missing Service Role Key), proceeding with upload attempt:", bucketError);
    }

    const supabase = createAdminClient();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('reports') 
      .upload(`showcases/${fileName}`, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
        console.error("Upload error details:", JSON.stringify(uploadError));
        throw new Error(`Upload failed: ${uploadError.message}`);
    }
    console.log("Upload successful:", uploadData);

    const { data: { publicUrl } } = supabase.storage
      .from('reports')
      .getPublicUrl(`showcases/${fileName}`);

    console.log("Public URL:", publicUrl);
    return { success: true, url: publicUrl };

  } catch (error) {
    console.error("Error generating report:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to generate report" 
    };
  }
}
