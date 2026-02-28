"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { createEvidenceItemForEntry, ensureEvidenceItems } from "@/app/actions/evidence";

// --- Project CRUD ---

export async function createProject(data: {
  title: string;
  description?: string;
  propertyId?: string;
  unitId?: string;
  customPropertyName?: string;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const project = await prisma.project.create({
    data: {
      title: data.title,
      description: data.description,
      propertyId: data.propertyId,
      unitId: data.unitId,
      customPropertyName: data.customPropertyName,
    },
  });

  revalidatePath("/projects");
  if (data.propertyId) {
    revalidatePath(`/properties/${data.propertyId}`);
  }
  if (data.unitId) revalidatePath(`/units/${data.unitId}`);

  return project;
}

export async function getProjects(filter?: { status?: string; propertyId?: string }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // TODO: Add strict ownership check here if needed, 
  // currently relying on the fact that only owners see their data in UI
  
  const where: any = {};
  if (filter?.status) where.status = filter.status;
  if (filter?.propertyId) where.propertyId = filter.propertyId;

  return await prisma.project.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      property: { select: { name: true } },
      unit: { select: { name: true, unitNumber: true } },
      _count: {
        select: { entries: true, tasks: true },
      },
    },
  });
}

export async function getProject(id: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  return await prisma.project.findUnique({
    where: { id },
    include: {
      property: true,
      unit: true,
      entries: { orderBy: { createdAt: "desc" } },
      tasks: { orderBy: { createdAt: "asc" } },
      reports: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function archiveProject(id: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  await prisma.project.update({
    where: { id },
    data: { status: "ARCHIVED" },
  });
  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
}

// --- Entries ---

export async function addProjectEntry(data: {
  projectId: string;
  type: "NOTE" | "IMAGE" | "MEASUREMENT";
  content?: string;
  imageUrl?: string;
  includeInReport?: boolean;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const entry = await prisma.projectEntry.create({
    data: {
      projectId: data.projectId,
      type: data.type,
      content: data.content,
      imageUrl: data.imageUrl,
      includeInReport: data.includeInReport ?? false,
    },
  });

  // Automatically create evidence item if applicable
  await createEvidenceItemForEntry(entry);

  revalidatePath(`/projects/${data.projectId}`);
  return entry;
}

export async function addProjectEntries(data: {
  projectId: string;
  type: "NOTE" | "IMAGE" | "MEASUREMENT";
  content?: string;
  imageUrls: string[];
  includeInReport?: boolean;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const entriesData = data.imageUrls.map(url => ({
    projectId: data.projectId,
    type: data.type,
    content: data.content,
    imageUrl: url,
    includeInReport: data.includeInReport ?? false,
  }));

  const count = await prisma.projectEntry.createMany({
    data: entriesData,
  });

  // Ensure evidence items are created for all new entries
  await ensureEvidenceItems(data.projectId);

  revalidatePath(`/projects/${data.projectId}`);
  return count;
}

export async function updateProjectEntry(entryId: string, data: { content?: string, rotation?: number }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const entry = await prisma.projectEntry.findUnique({
    where: { id: entryId },
    include: { project: true }
  });

  if (!entry) throw new Error("Entry not found");

  // Find DB User for logging
  const dbUser = await prisma.user.findUnique({ where: { authId: user.id } });
  
  if (dbUser) {
    // Create Audit Log
    const changes = [];
    if (data.content !== undefined && data.content !== entry.content) changes.push("content");
    if (data.rotation !== undefined && data.rotation !== entry.rotation) changes.push("rotation");

    if (changes.length > 0) {
      await prisma.projectAuditLog.create({
        data: {
          projectId: entry.projectId,
          userId: dbUser.id,
          action: "EDIT",
          entityType: entry.type,
          entityId: entry.id,
          details: `Edited ${entry.type.toLowerCase()} (${changes.join(", ")}).`,
        }
      });
    }
  }

  const updateData: any = {};
  if (data.content !== undefined) updateData.content = data.content;
  if (data.rotation !== undefined) updateData.rotation = data.rotation;

  const updatedEntry = await prisma.projectEntry.update({
    where: { id: entryId },
    data: updateData,
  });

  revalidatePath(`/projects/${entry.projectId}`);
  return updatedEntry;
}

export async function deleteProjectEntry(entryId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const entry = await prisma.projectEntry.findUnique({
    where: { id: entryId },
    include: { project: true }
  });

  if (!entry) throw new Error("Entry not found");

  // Find DB User for logging
  const dbUser = await prisma.user.findUnique({ where: { authId: user.id } });
  
  if (dbUser) {
    // Create Audit Log
    await prisma.projectAuditLog.create({
      data: {
        projectId: entry.projectId,
        userId: dbUser.id,
        action: "DELETE",
        entityType: entry.type,
        entityId: entry.id,
        details: `Deleted ${entry.type.toLowerCase()}: ${entry.content?.substring(0, 50) || "Image"}`,
      }
    });
  }

  // Soft-delete associated evidence item to preserve numbering history
  // We use updateMany as there's no unique constraint on originalEntryId, though logic dictates 1:1
  await prisma.evidenceItem.updateMany({
    where: { 
      projectId: entry.projectId, 
      originalEntryId: entryId 
    },
    data: { deletedAt: new Date() }
  });

  await prisma.projectEntry.delete({
    where: { id: entryId },
  });

  console.log("deleteProjectEntry", { entryId, projectId: entry.projectId });

  revalidatePath(`/projects/${entry.projectId}`);
}

export async function getProjectAuditLogs(projectId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const dbUser = await prisma.user.findUnique({ where: { authId: user.id } });
  
  // Only allow OWNER or the property owner to see logs
  // For simplicity, we check if role is OWNER
  if (!dbUser || dbUser.role !== "OWNER") {
    // Alternatively, check if dbUser.id === project.property.ownerId
    // But we need to fetch project first.
    // Let's stick to role check as requested "EIER status"
    return []; 
  }

  return await prisma.projectAuditLog.findMany({
    where: { projectId },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function toggleEntryReportStatus(entryId: string, include: boolean) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const entry = await prisma.projectEntry.update({
    where: { id: entryId },
    data: { includeInReport: include },
  });

  console.log("toggleEntryReportStatus", { entryId, include, projectId: entry.projectId });

  revalidatePath(`/projects/${entry.projectId}`);
}

// --- Tasks ---

export async function addProjectTask(projectId: string, task: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const newTask = await prisma.projectTask.create({
    data: {
      projectId,
      task,
    },
  });

  revalidatePath(`/projects/${projectId}`);
  return newTask;
}

export async function toggleProjectTask(taskId: string, done: boolean) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const task = await prisma.projectTask.update({
    where: { id: taskId },
    data: { done },
  });

  console.log("toggleProjectTask", { taskId, done, projectId: task.projectId });

  revalidatePath(`/projects/${task.projectId}`);
}

export async function deleteProjectTask(taskId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const task = await prisma.projectTask.findUnique({
    where: { id: taskId },
  });

  if (!task) throw new Error("Task not found");

  await prisma.projectTask.delete({
    where: { id: taskId },
  });

  console.log("deleteProjectTask", { taskId, projectId: task.projectId });

  revalidatePath(`/projects/${task.projectId}`);
}
