
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import ProjectForm from "./project-form";
import LegalProjectWizard from "./_components/legal-project-wizard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { ChevronLeft, FileText, Home, ArrowRight, Gavel } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function NewProjectPage({
  searchParams
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const type = searchParams.type;

  // Fetch properties owned by user (needed for Standard Project)
  const properties = await prisma.property.findMany({
    where: { owner: { authId: user.id } },
    select: {
      id: true,
      name: true,
      units: {
        select: { id: true, name: true, unitNumber: true }
      }
    }
  });

  // 1. Legal Project Wizard
  if (type === "legal") {
    return (
      <div className="container max-w-5xl mx-auto p-4">
        <div className="mb-6">
          <Link href="/projects/new" className="text-slate-500 hover:text-slate-900 flex items-center mb-4">
            <ChevronLeft className="h-4 w-4 mr-1" /> Tilbake til valg
          </Link>
          <h1 className="text-2xl font-bold">Ny Dokumentasjonsrapport</h1>
        </div>
        <LegalProjectWizard />
      </div>
    );
  }

  // 2. Standard Project Form
  if (type === "standard") {
    return (
      <div className="container max-w-lg mx-auto p-4">
        <div className="mb-6">
          <Link href="/projects/new" className="text-slate-500 hover:text-slate-900 flex items-center mb-4">
            <ChevronLeft className="h-4 w-4 mr-1" /> Tilbake til valg
          </Link>
          <h1 className="text-2xl font-bold">Nytt Standard Prosjekt</h1>
        </div>

        <Card>
          <CardContent className="pt-6">
            <ProjectForm properties={properties} />
          </CardContent>
        </Card>
      </div>
    );
  }

  // 3. Selection Screen (Default)
  return (
    <div className="container max-w-4xl mx-auto p-4 py-12">
      <div className="mb-8 text-center">
        <Link href="/projects" className="text-slate-500 hover:text-slate-900 inline-flex items-center mb-6">
          <ChevronLeft className="h-4 w-4 mr-1" /> Tilbake til oversikt
        </Link>
        <h1 className="text-3xl font-bold mb-2">Hva vil du opprette?</h1>
        <p className="text-slate-500">Velg prosjekttype for å komme i gang.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Standard Prosjekt */}
        <Link href="/projects/new?type=standard" className="group">
          <Card className="h-full hover:border-slate-400 transition-colors cursor-pointer relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                <Home className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle className="text-xl">Standard Prosjekt</CardTitle>
              <CardDescription>
                For vanlig forvaltning, utleie og vedlikehold.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-slate-600 mb-6">
                <li className="flex items-center"><ArrowRight className="h-3 w-3 mr-2 text-blue-500" /> Knyttet til eiendom/enhet</li>
                <li className="flex items-center"><ArrowRight className="h-3 w-3 mr-2 text-blue-500" /> Enkel bildeopplasting</li>
                <li className="flex items-center"><ArrowRight className="h-3 w-3 mr-2 text-blue-500" /> Standard rapportering</li>
              </ul>
              <Button className="w-full bg-slate-50 hover:bg-slate-100 text-slate-900 border border-slate-200">
                Velg Standard
              </Button>
            </CardContent>
          </Card>
        </Link>

        {/* Dokumentasjonsrapport (Juridisk) */}
        <Link href="/projects/new?type=legal" className="group">
          <Card className="h-full hover:border-emerald-400 transition-colors cursor-pointer relative overflow-hidden ring-1 ring-emerald-100">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
            <div className="absolute top-4 right-4 bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-1 rounded-full">
              ANBEFALT FOR SKADE
            </div>
            <CardHeader>
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-emerald-200 transition-colors">
                <Gavel className="h-6 w-6 text-emerald-600" />
              </div>
              <CardTitle className="text-xl">Dokumentasjonsrapport</CardTitle>
              <CardDescription>
                For forsikringssaker, tvister og bevissikring.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-slate-600 mb-6">
                <li className="flex items-center"><ArrowRight className="h-3 w-3 mr-2 text-emerald-500" /> Juridisk tidslinje</li>
                <li className="flex items-center"><ArrowRight className="h-3 w-3 mr-2 text-emerald-500" /> Bevisbank med ID-styring</li>
                <li className="flex items-center"><ArrowRight className="h-3 w-3 mr-2 text-emerald-500" /> Dato-overstyring</li>
                <li className="flex items-center"><ArrowRight className="h-3 w-3 mr-2 text-emerald-500" /> PDF-generering med vedlegg</li>
              </ul>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
                Velg Dokumentasjonsrapport
              </Button>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
