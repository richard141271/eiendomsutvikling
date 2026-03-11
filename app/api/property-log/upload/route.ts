import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { authId: authUser.id },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const propertyId = formData.get("propertyId") as string | null;
    const entryId = formData.get("entryId") as string | null;

    if (!file || !propertyId || !entryId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const entry = await (prisma as any).propertyLogEntry.findUnique({
      where: { id: entryId },
      select: { id: true, propertyId: true },
    });

    if (!entry || entry.propertyId !== propertyId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (dbUser.role !== "ADMIN" && dbUser.role !== "OWNER") {
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        select: { ownerId: true },
      });

      if (!property || property.ownerId !== dbUser.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const bucketName =
      process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "property-images";

    const safeName = file.name.replace(/[^\w.\-() ]+/g, "_");
    const filePath = `property-log/${propertyId}/${entryId}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, { upsert: false, contentType: file.type });

    if (uploadError) {
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    const attachment = await (prisma as any).propertyLogAttachment.create({
      data: {
        entryId,
        url: publicUrl,
        fileName: file.name,
        fileType: file.type || null,
        fileSize: file.size || null,
      },
    });

    return NextResponse.json({ attachment });
  } catch (error: any) {
    console.error("Property log upload error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
