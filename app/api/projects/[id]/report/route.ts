
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { generateProjectReportPDF } from "@/lib/pdf-generator";

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

    // Generate Entries HTML
    const entriesHtml = project.entries.map(entry => `
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
    const tasksHtml = project.tasks.map(task => `
      <div class="task-item">
        <div class="checkbox ${task.done ? 'checked' : ''}"></div>
        <span class="task-text ${task.done ? 'done' : ''}">${task.task}</span>
      </div>
    `).join("");

    // Generate PDF
    const { fileName, pdfHash } = await generateProjectReportPDF({
      projectId: project.id,
      title: project.title,
      propertyName: project.property.name,
      unitName: project.unit?.unitNumber || project.unit?.name,
      date: new Date().toLocaleDateString("no-NO"),
      startDate: project.createdAt.toLocaleDateString("no-NO"),
      description: project.description || undefined,
      entriesHtml,
      tasksHtml,
    });

    const relativePath = `storage/reports/${fileName}`;

    // Save to DB
    const report = await prisma.projectReport.create({
      data: {
        projectId: project.id,
        pdfUrl: relativePath,
        pdfHash: pdfHash,
      },
    });

    return NextResponse.json({
      success: true,
      pdfUrl: `/api/projects/reports/${report.id}`, // Helper route to serve file
      reportId: report.id
    });

  } catch (error) {
    console.error("Error generating report:", error);
    return NextResponse.json(
      { error: "Intern serverfeil", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
