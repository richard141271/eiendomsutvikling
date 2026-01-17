"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getMaintenanceCounts() {
  try {
    const count = await prisma.maintenanceRequest.count({
      where: {
        status: "REPORTED",
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
