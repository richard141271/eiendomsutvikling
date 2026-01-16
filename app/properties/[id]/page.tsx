import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Building2, Home as HomeIcon } from "lucide-react";

export default async function PropertyPage({ params }: { params: { id: string } }) {
  const property = await prisma.property.findUnique({
    where: {
      id: params.id
    },
    include: {
      units: true
    }
  });

  if (!property) {
    notFound();
  }

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 bg-slate-50 dark:bg-slate-900">
        {/* Header / Hero */}
        <div className="relative h-[40vh] min-h-[300px] w-full bg-slate-900">
          {property.imageUrl ? (
            <Image
              src={property.imageUrl}
              alt={property.name}
              fill
              className="object-cover opacity-60"
              priority
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
              <Building2 className="h-24 w-24 text-slate-600" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent" />
          
          <div className="absolute bottom-0 left-0 right-0 container mx-auto px-4 py-8">
            <Link href="/" className="inline-flex items-center text-slate-300 hover:text-white mb-4 transition-colors">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Tilbake til oversikt
            </Link>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">{property.name}</h1>
            <div className="flex items-center text-slate-300 text-lg">
              <MapPin className="mr-2 h-5 w-5" />
              {property.address}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-12">
          <div className="grid gap-12 lg:grid-cols-3">
            {/* Main Info */}
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white dark:bg-slate-950 rounded-xl p-8 shadow-sm border border-slate-200 dark:border-slate-800">
                <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">Om eiendommen</h2>
                <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-400">
                  <p>{property.notes || "Ingen beskrivelse tilgjengelig."}</p>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-sm text-slate-500 block mb-1">Gårdsnummer</span>
                    <span className="font-medium text-slate-900 dark:text-white">{property.gnr || "-"}</span>
                  </div>
                  <div>
                    <span className="text-sm text-slate-500 block mb-1">Bruksnummer</span>
                    <span className="font-medium text-slate-900 dark:text-white">{property.bnr || "-"}</span>
                  </div>
                  {property.snr && (
                    <div>
                      <span className="text-sm text-slate-500 block mb-1">Seksjonsnummer</span>
                      <span className="font-medium text-slate-900 dark:text-white">{property.snr}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Units List */}
              <div>
                <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">Enheter ({property.units.length})</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {property.units.length > 0 ? (
                    property.units.map((unit) => (
                      <div key={unit.id} className="group bg-white dark:bg-slate-950 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
                        <div className="h-48 bg-slate-200 relative overflow-hidden">
                          {unit.imageUrl ? (
                            <Image
                              src={unit.imageUrl}
                              alt={unit.name}
                              fill
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="absolute inset-0 bg-slate-300 flex items-center justify-center text-slate-500">
                              <HomeIcon className="h-10 w-10 opacity-50" />
                            </div>
                          )}
                          <div className="absolute top-4 right-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold shadow-sm">
                            {unit.sizeSqm} m²
                          </div>
                        </div>
                        <div className="p-5">
                          <h3 className="font-bold text-lg mb-1 text-slate-900 dark:text-white">{unit.name}</h3>
                          <p className="text-slate-500 text-sm mb-4">
                            {unit.roomCount} rom • {unit.unitNumber ? `Bolignr. ${unit.unitNumber}` : ''}
                          </p>
                          
                          <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
                            <span className="font-semibold text-blue-600">
                              {unit.rentAmount.toLocaleString('no-NO')} kr/mnd
                            </span>
                            <div className={`px-2 py-0.5 rounded text-xs font-medium ${
                              unit.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {unit.status === 'AVAILABLE' ? 'Ledig' : 'Opptatt'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-8 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-dashed border-slate-300">
                      <p className="text-slate-500">Ingen enheter registrert på denne eiendommen.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar / Contact */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-950 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 sticky top-24">
                <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">Interessert?</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm">
                  Har du spørsmål om denne eiendommen eller ønsker visning? Ta kontakt med oss.
                </p>
                <Link href="/#contact" className="w-full block mb-3">
                  <Button className="w-full">Kontakt oss</Button>
                </Link>
                <Link href={`mailto:post@kias.no?subject=Forespørsel: ${property.address}`} className="w-full block">
                  <Button variant="outline" className="w-full">Send e-post</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
