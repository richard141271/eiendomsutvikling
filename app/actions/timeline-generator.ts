'use server';

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function generateTimelineFromEvidence(projectId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // 1. Fetch all active evidence items for the project
  // We want to process ALL items to ensure they are grouped correctly
  // But maybe we should only process items that are NOT linked to an event yet?
  // Let's start with unlinked items to be safe and avoid duplicates.
  const allEvidenceItems = await (prisma as any).evidenceItem.findMany({
    where: {
      projectId: projectId,
      deletedAt: null,
      events: {
        none: {} // Only items not linked to any event
      }
    }
  });

  if (allEvidenceItems.length === 0) {
    return { success: true, message: "No unlinked evidence items found." };
  }

  // 2. Group items by date (YYYY-MM-DD)
  // We use legalDate as the primary source of truth for the timeline
  const groupedByDate: Record<string, typeof allEvidenceItems> = {};

  for (const item of allEvidenceItems) {
    if (!item.legalDate) continue; // Skip items without a date (should correspond to "Udatert")

    const dateKey = item.legalDate.toISOString().split('T')[0]; // YYYY-MM-DD
    if (!groupedByDate[dateKey]) {
      groupedByDate[dateKey] = [];
    }
    groupedByDate[dateKey].push(item);
  }

  // 3. Process each group
  let eventsCreated = 0;
  let itemsLinked = 0;

  for (const [dateString, items] of Object.entries(groupedByDate)) {
    const date = new Date(dateString);
    
    // Check if an event already exists for this date
    // We try to find a "Generic" event or just ANY event on this date?
    const existingEvents = await (prisma as any).event.findMany({
      where: {
        projectId: projectId,
        date: {
          gte: new Date(dateString + 'T00:00:00.000Z'),
          lt: new Date(dateString + 'T23:59:59.999Z')
        }
      }
    });

    let targetEventId: string;

    if (existingEvents.length > 0) {
      // Use the first existing event
      targetEventId = existingEvents[0].id;
    } else {
      // Create new event
      const newEvent = await (prisma as any).event.create({
        data: {
          projectId: projectId,
          title: `Hendelse ${date.toLocaleDateString('nb-NO')}`,
          date: date,
          description: "Automatisk generert hendelse basert på bevisdato."
        }
      });
      targetEventId = newEvent.id;
      eventsCreated++;
    }

    // Link items to the target event
    // We need to create EventEvidence records
    // Note: Prisma createMany is supported for this
    if (items.length > 0) {
      await (prisma as any).eventEvidence.createMany({
        data: items.map((item: any) => ({
          eventId: targetEventId,
          evidenceId: item.id
        })),
        skipDuplicates: true
      });
      itemsLinked += items.length;
    }
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/evidence`);
  
  return { 
    success: true, 
    eventsCreated, 
    itemsLinked,
    message: `Opprettet ${eventsCreated} nye hendelser og koblet ${itemsLinked} bevis.` 
  };
}
