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

export async function getDevNotesCounts() {
  try {
    const [systemNotesCount, userNotesCount] = await Promise.all([
      prisma.devNote.count({
        where: {
          isResolved: false,
          author: "Systemvarsel",
        },
      }),
      prisma.devNote.count({
        where: {
          isResolved: false,
          author: {
            not: "Systemvarsel",
          },
        },
      }),
    ]);
    
    return { 
      success: true, 
      counts: {
        forAdmin: systemNotesCount, // "KLAR FOR TEST" notes
        forDev: userNotesCount      // User requests
      }
    };
  } catch (error) {
    console.error("Failed to count dev notes:", error);
    return { 
      success: false, 
      counts: {
        forAdmin: 0,
        forDev: 0
      }
    };
  }
}

export async function getUnresolvedDevNotesCount() {
  // Deprecated, keeping for backward compatibility but redirecting to total
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

    // Fetch user name for the "notification"
    const dbUser = await prisma.user.findUnique({
        where: { authId: user.id },
        select: { name: true }
    });
    const userName = dbUser?.name || "Ukjent bruker";

    const note = await prisma.devNote.update({
      where: { id },
      data: { isResolved },
    });

    // If resolved, create a notification note for Pål-Martin
    // BUT only if the resolved note is NOT itself a Systemvarsel (to avoid loops)
    if (isResolved && note.author !== "Systemvarsel") {
        await prisma.devNote.create({
            data: {
                content: `🚀 KLAR FOR TEST: "${note.content.substring(0, 50)}${note.content.length > 50 ? '...' : ''}" (Utført av ${userName})`,
                author: "Systemvarsel",
                isResolved: false // So it appears in the list
            }
        });
    }

    revalidatePath("/dashboard/settings");
    return { success: true, data: note };
  } catch (error) {
    console.error("Failed to update dev note:", error);
    return { success: false, error: "Failed to update note" };
  }
}
