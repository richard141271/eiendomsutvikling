"use server";

import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { createClient as createServerClient } from "@/lib/supabase-server";

export async function resetUserPassword(userId: string, newPassword: string) {
  try {
    // 1. Verify current user permissions
    const supabase = createServerClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return { success: false, error: "Unauthorized" };
    }

    const currentUser = await prisma.user.findUnique({
      where: { authId: authUser.id }
    });

    if (!currentUser || (currentUser.role !== "OWNER" && currentUser.role !== "ADMIN")) {
      return { success: false, error: "Forbidden: Only admins can reset passwords" };
    }

    // 2. Get target user's authId
    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!targetUser || !targetUser.authId) {
      return { success: false, error: "User not found or has no linked account" };
    }

    // 3. Create Admin Client
    // NOTE: This requires SUPABASE_SERVICE_ROLE_KEY to be set in .env
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
        return { success: false, error: "Server configuration error: Missing service role key" };
    }

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // 4. Update Password
    const { error } = await adminSupabase.auth.admin.updateUserById(
      targetUser.authId,
      { password: newPassword }
    );

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Reset password error:", error);
    return { success: false, error: "Internal server error" };
  }
}
