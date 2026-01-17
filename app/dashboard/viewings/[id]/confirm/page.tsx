import { confirmViewingAction } from "@/app/actions/viewing";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";

export default async function ConfirmViewingPage({ params }: { params: { id: string } }) {
  const viewing = await prisma.viewing.findUnique({
    where: { id: params.id },
    include: { unit: { include: { property: true } } }
  });

  if (!viewing) {
    return <div>Visning ikke funnet.</div>;
  }

  // Check if user is logged in
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    // Redirect to login with callback URL
    redirect(`/login?callbackUrl=/dashboard/viewings/${params.id}/confirm`);
  }

  // If already confirmed
  if (viewing.confirmed) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-green-600">Visning er allerede bekreftet</CardTitle>
            <CardDescription>
              Du har allerede bekreftet at du kommer på visning.
            </CardDescription>
          </CardHeader>
          <CardContent>
             <Button asChild className="w-full">
                <Link href="/dashboard">Gå til Dashboard</Link>
             </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Bekreft Visning</CardTitle>
          <CardDescription>
            Vennligst bekreft at du kommer på visning.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-md space-y-2">
            <p><strong>Eiendom:</strong> {viewing.unit.property.name} - {viewing.unit.name}</p>
            <p><strong>Tidspunkt:</strong> {viewing.date.toLocaleString("no-NO")}</p>
          </div>
          
          <form action={async () => {
            "use server";
            await confirmViewingAction(params.id);
            redirect("/dashboard");
          }}>
            <Button type="submit" className="w-full">
              Bekreft at jeg kommer
            </Button>
          </form>
          
          <Button variant="outline" asChild className="w-full">
            <Link href="/dashboard">Avbryt</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
