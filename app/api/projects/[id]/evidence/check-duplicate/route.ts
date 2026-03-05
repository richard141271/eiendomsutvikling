
import { createClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
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

    const body = await req.json();
    const { hash } = body;
    
    if (!hash) {
      return NextResponse.json({ error: "Missing hash" }, { status: 400 });
    }

    // Check if a file with this checksum exists in the project
    // Using (prisma as any) to bypass potential type issues with model name casing
    const existingFile = await (prisma as any).file.findUnique({
      where: {
        projectId_checksum: {
          projectId,
          checksum: hash
        }
      },
      select: {
        id: true,
        originalName: true,
        evidenceItems: {
          select: {
            id: true,
            evidenceNumber: true,
            title: true,
            legalDate: true,
            createdAt: true
          }
        }
      }
    });

    return NextResponse.json({ 
      exists: !!existingFile,
      fileName: existingFile?.originalName || null,
      fileId: existingFile?.id || null,
      evidenceItems: existingFile?.evidenceItems || []
    });
  } catch (error) {
    console.error("[CHECK_DUPLICATE_ERROR]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
