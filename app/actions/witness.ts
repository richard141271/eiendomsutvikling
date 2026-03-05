"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase-server";

// --- WITNESS / PERSON ACTIONS ---

export async function createPerson(projectId: string, name: string, role: string, notes?: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    return await prisma.person.create({
        data: {
            projectId,
            name,
            role,
            notes
        }
    });
}

export async function getProjectPeople(projectId: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    return await prisma.person.findMany({
        where: { projectId },
        include: { witnessObservations: true },
        orderBy: { name: 'asc' }
    });
}

export async function createObservation(personId: string, eventId: string, observation: string, date?: Date) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    return await prisma.witnessObservation.create({
        data: {
            personId,
            eventId,
            observation,
            date: date || new Date()
        }
    });
}
