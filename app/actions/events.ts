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
