
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient, ensureBucketExists } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";
import { generateProjectReportPDF } from "@/lib/pdf-generator";

export const runtime = "nodejs";

async function getSignedImageUrl(
  adminSupabase: ReturnType<typeof createAdminClient>,
  originalUrl: string
): Promise<string> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return originalUrl;

    const publicPrefix = `${supabaseUrl}/storage/v1/object/public/`;
    const genericPrefix = `${supabaseUrl}/storage/v1/object/`;

    let rest: string | null = null;

    if (originalUrl.startsWith(publicPrefix)) {
      rest = originalUrl.substring(publicPrefix.length);
    } else if (originalUrl.startsWith(genericPrefix)) {
      rest = originalUrl.substring(genericPrefix.length);
    } else {
      return originalUrl;
    }

    const pathPart = rest.split("?")[0];
    const [bucketName, ...objectParts] = pathPart.split("/");
    const objectPath = objectParts.join("/");

    if (!bucketName || !objectPath) {
      return originalUrl;
    }

    const { data, error } = await adminSupabase.storage
      .from(bucketName)
      .createSignedUrl(objectPath, 60 * 60);

    if (error || !data?.signedUrl) {
      console.error("Failed to create signed URL for image", { error, bucketName, objectPath });
      return originalUrl;
    }

    return data.signedUrl;
  } catch (error) {
    console.error("Error while creating signed URL for image", error);
    return originalUrl;
  }
}

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

    // Use admin client for storage operations to bypass RLS
    const adminSupabase = createAdminClient();

    // Ensure bucket exists
    await ensureBucketExists('reports');

    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        property: true,
        unit: true,
        entries: {
          where: { includeInReport: true },
          orderBy: { createdAt: "asc" },
        },
        tasks: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Prosjekt ikke funnet" }, { status: 404 });
    }

    const entriesWithSignedUrls = await Promise.all(
      project.entries.map(async (entry: any) => {
        if (!entry.imageUrl) return entry;
        const signedUrl = await getSignedImageUrl(adminSupabase, entry.imageUrl);
        return { ...entry, imageUrl: signedUrl };
      })
    );

    const imageEntriesCount = entriesWithSignedUrls.filter((entry: any) => !!entry.imageUrl).length;
    console.log("Project report image entries:", imageEntriesCount);

    const entriesHtml = entriesWithSignedUrls.map((entry: any) => `
      <div class="entry">
        <div class="entry-header">
          <span class="entry-date">${entry.createdAt.toLocaleDateString("no-NO")} ${entry.createdAt.toLocaleTimeString("no-NO", {hour: '2-digit', minute:'2-digit'})}</span>
          <span class="entry-type">${entry.type === 'NOTE' ? 'Notat' : 'Bilde'}</span>
        </div>
        ${entry.content ? `<div class="entry-content">${entry.content}</div>` : ''}
        ${entry.imageUrl ? `<img src="${entry.imageUrl}" class="entry-image" />` : ''}
      </div>
    `).join("");

    // Generate Tasks HTML
    const tasksHtml = project.tasks.map((task: any) => `
      <div class="task-item">
        <div class="checkbox ${task.done ? 'checked' : ''}"></div>
        <span class="task-text ${task.done ? 'done' : ''}">${task.task}</span>
      </div>
    `).join("");

    // Generate PDF
    console.log("Generating report for project:", project.id);
    const { fileName, pdfHash, pdfBuffer } = await generateProjectReportPDF({
      projectId: project.id,
      title: project.title,
      propertyName: project.property?.name || project.customPropertyName || "Tilfeldig prosjekt",
      unitName: project.unit?.unitNumber || project.unit?.name,
      date: new Date().toLocaleDateString("no-NO"),
      startDate: project.createdAt.toLocaleDateString("no-NO"),
      description: project.description || undefined,
      entriesHtml,
      tasksHtml,
    });
    console.log(`PDF generated: ${fileName}, Size: ${(pdfBuffer.length / 1024 / 1024).toFixed(2)} MB`);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await adminSupabase.storage
      .from('reports')
      .upload(`reports/${fileName}`, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      throw new Error(`Kunne ikke laste opp rapport til skyen: ${uploadError.message} (Code: ${uploadError.name})`);
    }

    // Get public URL
    const { data: { publicUrl } } = adminSupabase
      .storage
      .from('reports')
      .getPublicUrl(`reports/${fileName}`);

    // Save to DB
    console.log("Saving report to DB:", publicUrl);
    const report = await prisma.projectReport.create({
      data: {
        projectId: project.id,
        pdfUrl: publicUrl,
        pdfHash: pdfHash,
      },
    });

    return new NextResponse(new Blob([new Uint8Array(pdfBuffer)]), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });

  } catch (error) {
    console.error("Error generating report:", error);
    // Log details
    if (error instanceof Error) {
        console.error(error.stack);
    }
    return NextResponse.json(
      { error: "Intern serverfeil", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
