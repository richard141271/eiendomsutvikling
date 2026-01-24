import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase-server";
import { AdminContributionList } from "./_components/admin-contribution-list";
import { redirect } from "next/navigation";

export default async function ContributionsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { authId: user.id },
  });

  if (!dbUser || (dbUser.role !== "OWNER" && dbUser.role !== "ADMIN" && dbUser.role !== "MANAGER")) {
    redirect("/dashboard");
  }

  const contributions = await prisma.tenantContribution.findMany({
    include: {
      tenant: true,
      unit: {
        include: {
          property: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bidrag fra leietakere</h1>
        <p className="text-muted-foreground">
          Oversikt over forslag og bidrag fra leietakere.
        </p>
      </div>
      
      <AdminContributionList initialContributions={contributions} />
    </div>
  );
}
