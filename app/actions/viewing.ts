"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase-server";
import { Resend } from "resend";

const createViewingSchema = z.object({
  unitId: z.string(),
  date: z.string().or(z.date()),
  notes: z.string().optional(),
  guestName: z.string().optional(),
  guestEmail: z.string().email().optional(),
});

export async function createViewing(data: z.infer<typeof createViewingSchema>) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

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
          "Ha nøkler klare": false,
          "Helle vann i vannlåser": false,
          "Sette opp varmen til ca 22 grader dagen før visning": false,
        },
      },
    });

    if (data.guestEmail && process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      try {
        const confirmUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/viewings/${viewing.id}/confirm`;
        const dateStr = new Date(data.date).toLocaleString("nb-NO");

        const namePart = data.guestName ? `Hei ${data.guestName},` : "Hei,";

        // HTML Email Template
        const htmlContent = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Invitasjon til visning</h1>
            <p>${namePart}</p>
            <p>Du er invitert til visning av boligen.</p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; font-weight: bold;">Tidspunkt:</p>
              <p style="margin: 5px 0 0 0; font-size: 18px;">${dateStr}</p>
            </div>
            <p>Det er viktig for oss å vite om du kan komme. Vennligst bekreft ved å klikke på knappen under:</p>
            <a href="${confirmUrl}" style="display: inline-block; background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Bekreft visning i appen</a>
            <p style="margin-top: 30px; font-size: 14px; color: #666;">
              Mvh<br/>
              Eiendom AS
            </p>
          </div>
        `;

        await resend.emails.send({
          from: "Eiendom <onboarding@resend.dev>",
          to: data.guestEmail,
          subject: "Invitasjon til visning",
          html: htmlContent,
        });
      } catch (emailError) {
        console.error("Failed to send viewing email:", emailError);
      }
    }

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

export async function confirmViewingAction(id: string) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const viewing = await prisma.viewing.update({
      where: { id },
      data: { confirmed: true },
    });
    
    revalidatePath(`/dashboard/units/${viewing.unitId}`);
    return { success: true, data: viewing };
  } catch (error) {
    console.error("Failed to confirm viewing:", error);
    return { success: false, error: "Failed to confirm viewing" };
  }
}

export async function deleteViewing(id: string, unitId: string) {
    try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Unauthorized");

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
