import { Separator } from "@/components/ui/separator";
import { DevNotesSection } from "@/components/dev-notes-section";
import { SettingsClient } from "./settings-client";
import { createClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";

export default async function SettingsPage() {
  const supabase = createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  let isAdmin = false;
  if (authUser) {
    const dbUser = await prisma.user.findUnique({
      where: { authId: authUser.id },
      select: { role: true }
    });
    if (dbUser) {
      isAdmin = dbUser.role === "OWNER" || dbUser.role === "ADMIN";
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Innstillinger</h1>
        <p className="text-muted-foreground">
          Administrer din konto, standardverdier og integrasjoner.
        </p>
      </div>

      <Separator />

      <SettingsClient isAdmin={isAdmin} />

      {isAdmin && <DevNotesSection />}
    </div>
  );
}
