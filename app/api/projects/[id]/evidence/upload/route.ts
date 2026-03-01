
import { createClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getNextEvidenceNumber } from "@/app/actions/evidence";
import { PDFDocument } from "pdf-lib";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projectId = params.id;
    if (!projectId) {
      return NextResponse.json({ error: "Project ID missing" }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const lastModifiedStr = formData.get("lastModified") as string;
    
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Convert file to ArrayBuffer for upload and processing
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Parse original date from lastModified timestamp
    let originalDate = new Date();
    let title = file.name;
    
    // Special handling for EML files to extract Date and Subject
    if (file.name.toLowerCase().endsWith('.eml')) {
      try {
        // Read first 4KB to find headers
        const chunk = await file.slice(0, 4096).text();
        
        // Extract Date
        const dateMatch = chunk.match(/^Date:\s*(.+)$/m);
        if (dateMatch && dateMatch[1]) {
          const parsedDate = new Date(dateMatch[1]);
          if (!isNaN(parsedDate.getTime())) {
            originalDate = parsedDate;
          }
        }
        
        // Extract Subject
        const subjectMatch = chunk.match(/^Subject:\s*(.+)$/m);
        if (subjectMatch && subjectMatch[1]) {
          title = subjectMatch[1].trim();
        }
      } catch (e) {
        console.warn("Failed to parse EML headers:", e);
      }
    } else if (file.name.toLowerCase().endsWith('.pdf')) {
      try {
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const creationDate = pdfDoc.getCreationDate();
        const modificationDate = pdfDoc.getModificationDate();
        
        if (creationDate) {
          originalDate = creationDate;
        } else if (modificationDate) {
          originalDate = modificationDate;
        }
      } catch (e) {
        console.warn("Failed to parse PDF metadata:", e);
      }
    } else if (lastModifiedStr) {
      const ts = parseInt(lastModifiedStr);
      if (!isNaN(ts)) {
        originalDate = new Date(ts);
      }
    }

    // 1. Upload to Supabase Storage
    const fileExt = file.name.split('.').pop()?.toLowerCase() || "";
    const fileName = `${projectId}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const bucketName = "project-assets"; 

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
        // Fallback to property-images if project-assets fails (e.g. bucket doesn't exist)
        console.warn(`Failed to upload to ${bucketName}, trying property-images`, uploadError);
        const fallbackBucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'property-images';
        
        const { error: fallbackError } = await supabase.storage
            .from(fallbackBucket)
            .upload(fileName, buffer, {
                contentType: file.type,
                upsert: false
            });

        if (fallbackError) {
            console.error("Upload failed to fallback bucket:", fallbackError);
            return NextResponse.json({ error: `Upload failed: ${fallbackError.message}` }, { status: 500 });
        }
    }

    // Get public URL (assuming public bucket)
    // If bucket is private, we need signed URL, but File model stores 'storagePath' usually as URL or path?
    // Looking at EvidenceItem -> File, usually we store full URL or relative path.
    // api/upload returns publicUrl.
    
    // We'll store the full Public URL if possible, or the path if we use signed urls later.
    // For now, let's get the public URL.
    const finalBucket = uploadError ? (process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'property-images') : bucketName;
    const { data: { publicUrl } } = supabase.storage
      .from(finalBucket)
      .getPublicUrl(fileName);

    // 2. Create File Record
    const fileRecord = await (prisma as any).file.create({
      data: {
        projectId,
        storagePath: publicUrl, // Store full URL
        fileType: file.type,
        fileSize: file.size,
        originalName: file.name,
      }
    });

    // 3. Create Evidence Item
    const evidenceNumber = await getNextEvidenceNumber(projectId);

    const evidenceItem = await (prisma as any).evidenceItem.create({
      data: {
        projectId,
        evidenceNumber,
        title: title, // Use extracted title or filename
        description: "",
        fileId: fileRecord.id,
        includeInReport: true,
        originalDate: originalDate, // Store metadata date
      }
    });

    return NextResponse.json({ 
      success: true, 
      evidenceId: evidenceItem.id,
      evidenceNumber: evidenceItem.evidenceNumber,
      url: publicUrl 
    });

  } catch (error: any) {
    console.error("Evidence upload error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
