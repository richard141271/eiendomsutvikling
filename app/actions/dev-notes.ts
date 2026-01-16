"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase-server";

export async function createDevNote(content: string, author: string = "Anonym", imageUrl?: string | null) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const note = await prisma.devNote.create({
      data: {
        content,
        author,
        imageUrl: imageUrl || null,
      },
    });
    revalidatePath("/dashboard/settings");
    return { success: true, data: note };
  } catch (error) {
    console.error("Failed to create dev note:", error);
    return { success: false, error: "Failed to create note" };
  }
}

export async function getDevNotes() {
  try {
    const notes = await prisma.devNote.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
    return { success: true, data: notes };
  } catch (error) {
    console.error("Failed to fetch dev notes:", error);
    return { success: false, error: "Failed to fetch notes" };
  }
}

export async function deleteDevNote(id: string) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    await prisma.devNote.delete({
      where: { id },
    });
    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete dev note:", error);
    return { success: false, error: "Failed to delete note" };
  }
}

export async function getUnresolvedDevNotesCount() {
  try {
    const count = await prisma.devNote.count({
      where: {
        isResolved: false,
      },
    });
    return { success: true, count };
  } catch (error) {
    console.error("Failed to count unresolved dev notes:", error);
    return { success: false, count: 0 };
  }
}

export async function toggleDevNoteResolved(id: string, isResolved: boolean) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const note = await prisma.devNote.update({
      where: { id },
      data: { isResolved },
    });
    revalidatePath("/dashboard/settings");
    return { success: true, data: note };
  } catch (error) {
    console.error("Failed to update dev note:", error);
    return { success: false, error: "Failed to update note" };
  }
}
