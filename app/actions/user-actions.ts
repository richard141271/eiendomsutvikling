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

    if (!targetUser) {
      return { success: false, error: "User not found" };
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

    let authId = targetUser.authId;

    // If no linked account, try to find or create one
    if (!authId) {
      if (!targetUser.email) {
        return { success: false, error: "User has no email address" };
      }

      console.log(`User ${userId} has no authId. Attempting to create/find auth user for ${targetUser.email}`);

      // Try to create the user first
      const { data: createData, error: createError } = await adminSupabase.auth.admin.createUser({
        email: targetUser.email,
        password: newPassword,
        email_confirm: true,
        user_metadata: { name: targetUser.name }
      });

      if (createData.user) {
        authId = createData.user.id;
        console.log(`Created new auth user: ${authId}`);
      } else if (createError?.message?.includes("already registered") || createError?.status === 422) {
        // User exists, try to find them
        console.log("User already registered, searching for existing auth user...");
        
        // Note: listUsers is not efficient for large user bases, but fine for this scale
        // Ideally we would use getUserByEmail if available in admin API
        const { data: listData } = await adminSupabase.auth.admin.listUsers({
          perPage: 1000
        });

        const existingUser = listData.users.find(u => u.email?.toLowerCase() === targetUser.email!.toLowerCase());
        
        if (existingUser) {
          authId = existingUser.id;
          console.log(`Found existing auth user: ${authId}`);
        } else {
           return { success: false, error: "User exists in Auth but could not be found in list (check case sensitivity or pagination)" };
        }
      } else {
        return { success: false, error: `Failed to create auth user: ${createError?.message}` };
      }

      // Link the auth user to the Prisma user
      if (authId) {
        await prisma.user.update({
          where: { id: userId },
          data: { authId: authId }
        });
      }
    }

    if (!authId) {
       return { success: false, error: "Could not resolve Auth ID for user" };
    }

    // 4. Update Password (if we didn't just create them with the new password)
    // If we just created them, the password is already set. But updating again is harmless.
    const { error } = await adminSupabase.auth.admin.updateUserById(
      authId,
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
