"use server"

import { createClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";

export async function syncUser() {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Ikke logget inn" };
    }

    const email = user.email;
    if (!email) {
      return { success: false, error: "E-post mangler på brukerprofil" };
    }

    const normalizedEmail = email.toLowerCase();

    // Check if user exists in Prisma
    let dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
    });

    if (!dbUser) {
        // Try finding by email
        dbUser = await prisma.user.findUnique({
            where: { email: normalizedEmail }
        });

        if (dbUser) {
            // Link existing user
            await prisma.user.update({
                where: { id: dbUser.id },
                data: { authId: user.id }
            });
        } else {
            // Create new user
            await prisma.user.create({
                data: {
                    authId: user.id,
                    email: normalizedEmail,
                    name: user.user_metadata?.name || normalizedEmail.split('@')[0],
                    role: "OWNER" // Default role
                }
            });
        }
    }

    return { success: true };
  } catch (error: any) {
    console.error("Sync user error:", error);
    return { success: false, error: error.message };
  }
}
