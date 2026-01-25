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
    let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    // Fallback: Try to read from .env file directly if missing (for dev environment reliability)
    if (!serviceRoleKey) {
        try {
            const fs = require('fs');
            const path = require('path');
            const envPath = path.join(process.cwd(), '.env');
            if (fs.existsSync(envPath)) {
                const envContent = fs.readFileSync(envPath, 'utf-8');
                // Support both quoted and unquoted values
                const match = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
                if (match && match[1]) {
                    serviceRoleKey = match[1].trim().replace(/^["']|["']$/g, '');
                    console.log("DEBUG: Manually loaded SUPABASE_SERVICE_ROLE_KEY from .env");
                }
            }
        } catch (error) {
            console.error("DEBUG: Failed to manually read .env", error);
        }
    }

    console.log("DEBUG: Checking SUPABASE_SERVICE_ROLE_KEY:", serviceRoleKey ? "Present" : "Missing");
    console.log("DEBUG: Key length:", serviceRoleKey ? serviceRoleKey.length : 0);
    
    if (!serviceRoleKey) {
        return { 
          success: false, 
          error: "Passordendring er ikke aktivert på serveren (mangler SUPABASE_SERVICE_ROLE_KEY)." 
        };
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
    let shouldUpdatePassword = false;

    // 1. Verify if the user actually exists in Supabase Auth if we have an ID
    if (authId) {
      const { data, error } = await adminSupabase.auth.admin.getUserById(authId);
      if (data?.user) {
        shouldUpdatePassword = true;
      } else {
        console.log(`User ${userId} has authId ${authId} but not found in Supabase Auth. Will attempt to recreate.`);
        authId = null; // Reset so we enter creation flow
      }
    }

    // 2. If not found or no ID, create or find by email
    if (!authId) {
      if (!targetUser.email) {
        return { success: false, error: "User has no email address" };
      }

      console.log(`Ensuring auth user exists for ${targetUser.email}`);
      
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
        // Password is set during creation, so we don't strictly need to update it, but it's fine.
      } else if (createError?.message?.includes("already registered") || createError?.status === 422) {
        // User exists, try to find them
        console.log("User already registered, searching for existing auth user...");
        
        const { data: listData } = await adminSupabase.auth.admin.listUsers({
          perPage: 1000
        });

        const existingUser = listData.users.find(u => u.email?.toLowerCase() === targetUser.email!.toLowerCase());
        
        if (existingUser) {
          authId = existingUser.id;
          console.log(`Found existing auth user: ${authId}`);
          shouldUpdatePassword = true;
        } else {
           return { success: false, error: "User exists in Auth but could not be found in list (check case sensitivity or pagination)" };
        }
      } else {
        return { success: false, error: `Failed to create auth user: ${createError?.message}` };
      }

      // Link the auth user to the Prisma user
      if (authId && authId !== targetUser.authId) {
        await prisma.user.update({
          where: { id: userId },
          data: { authId: authId }
        });
      }
    }

    if (!authId) {
       return { success: false, error: "Could not resolve Auth ID for user" };
    }

    // 3. Update Password (if needed)
    if (shouldUpdatePassword) {
      const { error } = await adminSupabase.auth.admin.updateUserById(
        authId,
        { password: newPassword }
      );

      if (error) {
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Reset password error:", error);
    return { success: false, error: "Internal server error" };
  }
}
