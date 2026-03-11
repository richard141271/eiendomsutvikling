"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { PropertyLogCategory, PropertyLogStatus } from "@prisma/client";

type PropertyLogUpsertInput = {
  propertyId: string;
  unitId?: string | null;
  roomId?: string | null;
  title: string;
  description?: string | null;
  category?: PropertyLogCategory | null;
  status?: PropertyLogStatus | null;
  performedAt?: Date | null;
  costAmount?: number | null;
  costCurrency?: string | null;
  vendorName?: string | null;
  vendorOrgNumber?: string | null;
  invoiceNumber?: string | null;
  performedByName?: string | null;
  performedByCompany?: string | null;
  performedByPhone?: string | null;
  performedByEmail?: string | null;
  tags?: string[] | null;
  performedByUserId?: string | null;
};

async function requireDbUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const dbUser = await prisma.user.findUnique({ where: { authId: user.id } });
  if (!dbUser) throw new Error("Unauthorized");

  return dbUser;
}

async function requirePropertyAccess(propertyId: string) {
  const dbUser = await requireDbUser();
  if (dbUser.role === "ADMIN") return dbUser;

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { ownerId: true },
  });

  if (!property) throw new Error("Not found");
  if (property.ownerId !== dbUser.id) throw new Error("Forbidden");

  return dbUser;
}

function normalizeTags(tags: PropertyLogUpsertInput["tags"]) {
  if (!tags) return [];
  return tags.map((t) => t.trim()).filter(Boolean);
}

export async function createPropertyLogEntry(input: PropertyLogUpsertInput) {
  const dbUser = await requirePropertyAccess(input.propertyId);

  const performedAt =
    input.performedAt ??
    (input.status === "COMPLETED" || !input.status ? new Date() : null);

  const entry = await prisma.propertyLogEntry.create({
    data: {
      propertyId: input.propertyId,
      unitId: input.unitId ?? null,
      roomId: input.roomId ?? null,
      title: input.title,
      description: input.description ?? null,
      category: input.category ?? undefined,
      status: input.status ?? undefined,
      performedAt,
      costAmount: input.costAmount ?? null,
      costCurrency: input.costCurrency ?? "NOK",
      vendorName: input.vendorName ?? null,
      vendorOrgNumber: input.vendorOrgNumber ?? null,
      invoiceNumber: input.invoiceNumber ?? null,
      performedByName: input.performedByName ?? null,
      performedByCompany: input.performedByCompany ?? null,
      performedByPhone: input.performedByPhone ?? null,
      performedByEmail: input.performedByEmail ?? null,
      tags: normalizeTags(input.tags),
      performedByUserId: input.performedByUserId ?? null,
      createdByUserId: dbUser.id,
    },
    include: {
      attachments: true,
      unit: { select: { id: true, name: true } },
      room: { select: { id: true, name: true } },
      createdByUser: { select: { id: true, name: true } },
      performedByUser: { select: { id: true, name: true } },
    },
  });

  revalidatePath(`/dashboard/properties/${input.propertyId}/log`);
  if (input.unitId) revalidatePath(`/dashboard/units/${input.unitId}/log`);

  return { success: true as const, data: entry };
}

export async function updatePropertyLogEntry(entryId: string, input: Omit<PropertyLogUpsertInput, "propertyId">) {
  const existing = await prisma.propertyLogEntry.findUnique({
    where: { id: entryId },
    select: { id: true, propertyId: true, unitId: true },
  });
  if (!existing) return { success: false as const, error: "Not found" };

  await requirePropertyAccess(existing.propertyId);

  const performedAt =
    input.performedAt ??
    (input.status === "COMPLETED" ? new Date() : undefined);

  const entry = await prisma.propertyLogEntry.update({
    where: { id: entryId },
    data: {
      unitId: input.unitId ?? null,
      roomId: input.roomId ?? null,
      title: input.title,
      description: input.description ?? null,
      category: input.category ?? undefined,
      status: input.status ?? undefined,
      performedAt,
      costAmount: input.costAmount ?? null,
      costCurrency: input.costCurrency ?? "NOK",
      vendorName: input.vendorName ?? null,
      vendorOrgNumber: input.vendorOrgNumber ?? null,
      invoiceNumber: input.invoiceNumber ?? null,
      performedByName: input.performedByName ?? null,
      performedByCompany: input.performedByCompany ?? null,
      performedByPhone: input.performedByPhone ?? null,
      performedByEmail: input.performedByEmail ?? null,
      tags: normalizeTags(input.tags),
      performedByUserId: input.performedByUserId ?? null,
    },
    include: {
      attachments: true,
      unit: { select: { id: true, name: true } },
      room: { select: { id: true, name: true } },
      createdByUser: { select: { id: true, name: true } },
      performedByUser: { select: { id: true, name: true } },
    },
  });

  revalidatePath(`/dashboard/properties/${existing.propertyId}/log`);
  if (existing.unitId) revalidatePath(`/dashboard/units/${existing.unitId}/log`);
  if (input.unitId) revalidatePath(`/dashboard/units/${input.unitId}/log`);

  return { success: true as const, data: entry };
}

export async function deletePropertyLogEntry(entryId: string) {
  const existing = await prisma.propertyLogEntry.findUnique({
    where: { id: entryId },
    select: { id: true, propertyId: true, unitId: true },
  });
  if (!existing) return { success: false as const, error: "Not found" };

  await requirePropertyAccess(existing.propertyId);

  await prisma.propertyLogEntry.delete({ where: { id: entryId } });

  revalidatePath(`/dashboard/properties/${existing.propertyId}/log`);
  if (existing.unitId) revalidatePath(`/dashboard/units/${existing.unitId}/log`);

  return { success: true as const };
}
