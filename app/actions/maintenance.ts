"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getMaintenanceCounts() {
  try {
    const count = await prisma.maintenanceRequest.count({
      where: {
        status: {
          in: ["REPORTED", "IN_PROGRESS"],
        },
      },
    });
    
    return { 
      success: true, 
      count
    };
  } catch (error) {
    console.error("Failed to count maintenance requests:", error);
    return { 
      success: false, 
      count: 0
    };
  }
}

export async function updateMaintenanceStatus(formData: FormData): Promise<void> {
  const id = formData.get("id") as string | null;
  const status = formData.get("status") as string | null;

  if (!id || !status) {
    return;
  }

  const allowedStatuses: Array<"REPORTED" | "IN_PROGRESS" | "COMPLETED"> = [
    "REPORTED",
    "IN_PROGRESS",
    "COMPLETED",
  ];

  if (!allowedStatuses.includes(status as any)) {
    return;
  }

  try {
    await prisma.maintenanceRequest.update({
      where: { id },
      data: { status: status as any },
    });
    revalidatePath("/dashboard/maintenance");
    revalidatePath("/dashboard");
  } catch (error) {
    console.error("Failed to update maintenance status:", error);
  }
}
