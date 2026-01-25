"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function createLocationTask(data: {
  title: string;
  description?: string;
  locationName: string;
  latitude: number;
  longitude: number;
  radius?: number;
  relatedProjectId?: string;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const task = await prisma.locationTask.create({
    data: {
      title: data.title,
      description: data.description,
      locationName: data.locationName,
      latitude: data.latitude,
      longitude: data.longitude,
      radius: data.radius || 150,
      relatedProjectId: data.relatedProjectId,
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
    },
  });
}

export async function toggleLocationTask(id: string, done: boolean) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  await prisma.locationTask.update({
    where: { id },
    data: { done },
  });

  revalidatePath("/tasks");
}
