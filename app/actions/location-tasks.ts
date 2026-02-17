"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function createLocationTask(data: {
  title: string;
  description?: string;
  locationName: string;
  address?: string;
  latitude: number;
  longitude: number;
  radius?: number;
  relatedProjectId?: string;
  type?: "SIMPLE" | "CHECKLIST";
  items?: string[];
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const task = await prisma.locationTask.create({
    data: {
      title: data.title,
      description: data.description,
      locationName: data.locationName,
      address: data.address,
      latitude: data.latitude,
      longitude: data.longitude,
      radius: data.radius || 150,
      relatedProjectId: data.relatedProjectId,
      type: data.type || "SIMPLE",
      items: data.items ? {
        create: data.items.map(content => ({ content }))
      } : undefined
    },
  });

  revalidatePath("/tasks");
  return task;
}

export async function getLocationTasks(filter?: { done?: boolean }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const where: any = {};
  if (filter?.done !== undefined) where.done = filter.done;

  return await prisma.locationTask.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      project: { select: { title: true } },
      items: true,
    },
  });
}

export async function toggleLocationTask(id: string, done: boolean) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const task = await prisma.locationTask.update({
    where: { id },
    data: { done },
  });

  console.log("toggleLocationTask", { id, done, relatedProjectId: task.relatedProjectId });

  revalidatePath("/tasks");
}

export async function toggleLocationTaskItem(itemId: string, done: boolean) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const item = await prisma.locationTaskItem.update({
    where: { id: itemId },
    data: { done },
  });
  
  console.log("toggleLocationTaskItem", { itemId, done, locationTaskId: item.locationTaskId });

  revalidatePath("/tasks");
}

export async function createRestList(originalTaskId: string, uncheckedItems: string[]) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const originalTask = await prisma.locationTask.findUnique({
    where: { id: originalTaskId }
  });

  if (!originalTask) throw new Error("Task not found");

  // Create new task for remaining items
  const restTask = await prisma.locationTask.create({
    data: {
      title: `Restliste: ${originalTask.title}`,
      description: originalTask.description,
      locationName: originalTask.locationName,
      address: originalTask.address,
      latitude: originalTask.latitude,
      longitude: originalTask.longitude,
      radius: originalTask.radius,
      relatedProjectId: originalTask.relatedProjectId,
      type: "CHECKLIST",
      items: {
        create: uncheckedItems.map(content => ({ content }))
      }
    }
  });

  // Mark original task as done
  await prisma.locationTask.update({
    where: { id: originalTaskId },
    data: { done: true }
  });

  console.log("createRestList", { originalTaskId, restTaskId: restTask.id, uncheckedCount: uncheckedItems.length });

  revalidatePath("/tasks");
  return restTask;
}
