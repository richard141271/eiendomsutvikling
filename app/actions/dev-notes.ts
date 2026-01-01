"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createDevNote(content: string, author: string = "Anonym") {
  try {
    const note = await prisma.devNote.create({
      data: {
        content,
        author,
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
