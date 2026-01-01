"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createViewingSchema = z.object({
  unitId: z.string(),
  date: z.string().or(z.date()),
  notes: z.string().optional(),
});

export async function createViewing(data: z.infer<typeof createViewingSchema>) {
  try {
    const viewing = await prisma.viewing.create({
      data: {
        unitId: data.unitId,
        date: new Date(data.date),
        notes: data.notes,
        checklist: {
            "Vask alle vinduer": false,
            "Sjekk at alle lyspærer virker": false,
            "Rydd inngangsparti": false,
            "Sjekk brannvarsler": false,
            "Luft ut boligen": false,
            "Ha nøkler klare": false
        }
      },
    });
    revalidatePath(`/dashboard/units/${data.unitId}`);
    return { success: true, data: viewing };
  } catch (error) {
    console.error("Failed to create viewing:", error);
    return { success: false, error: "Failed to create viewing" };
  }
}

export async function updateViewingChecklist(id: string, checklist: Record<string, boolean>) {
  try {
    const viewing = await prisma.viewing.update({
      where: { id },
      data: { checklist },
    });
    // We don't strictly need to revalidate path if we use client state, but good for sync
    revalidatePath(`/dashboard/units/${viewing.unitId}`); 
    return { success: true, data: viewing };
  } catch (error) {
    console.error("Failed to update checklist:", error);
    return { success: false, error: "Failed to update checklist" };
  }
}

export async function deleteViewing(id: string, unitId: string) {
    try {
        await prisma.viewing.delete({
            where: { id }
        });
        revalidatePath(`/dashboard/units/${unitId}`);
        return { success: true };
    } catch (error) {
        console.error("Failed to delete viewing:", error);
        return { success: false, error: "Failed to delete viewing" };
    }
}
