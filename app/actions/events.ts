"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase-server";

// --- EVENT ACTIONS ---

export async function createEvent(projectId: string, title: string, date: Date, description?: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    return await prisma.event.create({
        data: {
            projectId,
            title,
            date,
            description
        }
    });
}

export async function linkEvidenceToEvent(eventId: string, evidenceId: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    return await prisma.eventEvidence.create({
        data: {
            eventId,
            evidenceId
        }
    });
}

export async function updateEvent(eventId: string, data: { title: string; date: Date; description?: string }) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    return await prisma.event.update({
        where: { id: eventId },
        data: {
            title: data.title,
            date: data.date,
            description: data.description || null
        }
    });
}

export async function setEventEvidence(eventId: string, evidenceIds: string[]) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const event = await prisma.event.findUnique({ where: { id: eventId }, select: { projectId: true } });
    if (!event) throw new Error("Event not found");

    const projectEvidence = await (prisma as any).evidenceItem.findMany({
        where: { projectId: event.projectId, id: { in: evidenceIds }, deletedAt: null },
        select: { id: true }
    });
    const allowedEvidenceIds = new Set(projectEvidence.map((e: any) => e.id));
    const filteredIds = evidenceIds.filter((id) => allowedEvidenceIds.has(id));

    await prisma.eventEvidence.deleteMany({ where: { eventId } });
    if (filteredIds.length > 0) {
        await prisma.eventEvidence.createMany({
            data: filteredIds.map((evidenceId) => ({ eventId, evidenceId })),
            skipDuplicates: true
        });
    }

    return { success: true };
}

export async function getProjectEvents(projectId: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    return await prisma.event.findMany({
        where: { projectId },
        include: {
            evidenceItems: {
                include: {
                    evidence: {
                        include: {
                            file: true
                        }
                    }
                }
            },
            witnessObservations: {
                include: {
                    person: true
                }
            }
        },
        orderBy: { date: 'asc' }
    });
}
