import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    
    // Check auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Sanitize filename and create unique path
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;
    const bucketName = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'property-images';

    // Upload to Supabase Storage
    // We assume a public bucket named 'property-images' exists
    const { error: uploadError } = await supabase
      .storage
      .from(bucketName)
      .upload(filePath, file, {
        upsert: false,
        contentType: file.type
      });

    if (uploadError) {
      console.error("Supabase storage error:", uploadError);
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` }, 
        { status: 500 }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return NextResponse.json({ imageUrl: publicUrl });

  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" }, 
      { status: 500 }
    );
  }
}
