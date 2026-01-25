
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
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
              }
          }
      } catch (error) {
          console.error("DEBUG: Failed to manually read .env for admin key", error);
      }
  }

  if (!serviceRoleKey) {
    console.warn("SUPABASE_SERVICE_ROLE_KEY is missing. Admin operations will fail.");
    // Fallback to anon key (will fail for admin tasks but might work for basic ones if RLS allows)
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}
