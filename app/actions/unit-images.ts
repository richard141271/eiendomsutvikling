"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase-server";

export async function createUnitImage(unitId: string, url: string, description?: string) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const image = await prisma.unitImage.create({
      data: {
        unitId,
        url,
        description,
      },
    });
    revalidatePath(`/dashboard/units/${unitId}`);
    return { success: true, data: image };
  } catch (error) {
    console.error("Failed to create unit image:", error);
    return { success: false, error: "Kunne ikke lagre bildet" };
  }
}

export async function deleteUnitImage(id: string, unitId: string) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    await prisma.unitImage.delete({
      where: { id },
    });
    revalidatePath(`/dashboard/units/${unitId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: "Kunne ikke slette bildet" };
  }
}
