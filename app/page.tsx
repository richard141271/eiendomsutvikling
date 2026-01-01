import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Building2, Key, ShieldCheck, Home as HomeIcon, ArrowRight, Phone, Mail, MapPin } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const properties = await prisma.property.findMany({
    where: {
      status: 'ACTIVE'
    },
    include: {
      units: true
    },
    take: 6
  });

  return (
    <div className="flex flex-col min-h-screen font-sans">
      <header className="px-6 lg:px-10 h-20 flex items-center border-b bg-white dark:bg-slate-950 sticky top-0 z-50 shadow-sm">
        <Link className="flex items-center justify-center gap-2" href="#">
          <img 
            src="/logo.png" 
            alt="Halden Eiendomsutvikling Logo" 
            className="h-10 w-auto rounded-lg"
          />
          <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">
            Halden Eiendomsutvikling
          </span>
        </Link>
        <nav className="ml-auto hidden md:flex gap-8">
          <Link className="text-sm font-medium hover:text-slate-900 text-slate-600 transition-colors" href="#about">
            Om oss
          </Link>
          <Link className="text-sm font-medium hover:text-slate-900 text-slate-600 transition-colors" href="#properties">
            Eiendommer
          </Link>
          <Link className="text-sm font-medium hover:text-slate-900 text-slate-600 transition-colors" href="#contact">
            Kontakt
          </Link>
        </nav>
        <div className="ml-auto md:ml-8 flex items-center gap-4">
          <Link href="/login">
            <Button variant="outline" className="flex border-slate-200">
              Logg inn
            </Button>
          </Link>
          <Link href="/register">
            <Button className="bg-slate-900 hover:bg-slate-800 text-white shadow-md">
              <span className="hidden sm:inline">Registrer interesse</span>
              <span className="sm:hidden">Registrer</span>
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-20 md:py-32 lg:py-40 bg-slate-900 text-white overflow-hidden relative">
          <div className="absolute inset-0">
            <img 
              src="/images/Gemini_Generated_Image_4k34by4k34by4k34.png" 
              alt="Halden Eiendomsutvikling Hero" 
              className="w-full h-full object-cover opacity-30"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/50 via-slate-900/20 to-slate-900/90"></div>
          <div className="container px-4 md:px-6 mx-auto relative z-10">
            <div className="flex flex-col items-center space-y-8 text-center max-w-4xl mx-auto">
              <div className="space-y-4">
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl leading-tight">
                  Kvalitetsboliger i <span className="text-blue-400">Halden</span>
                </h1>
                <p className="mx-auto max-w-[800px] text-slate-300 md:text-xl font-light leading-relaxed">
                  Eiendomsinvest arbeider med kjøp, utleie og flipping av boliger med fokus på kvalitet og verdiskapning. Vi prioriterer ryddige prosesser, solide løsninger og profesjonelle avtaler fra start til slutt.
                </p>
                <p className="mx-auto max-w-[700px] text-slate-400 md:text-lg font-light italic">
                  "Vårt mål er å skape gode eiendomsinvesteringer som gir trygghet og verdi både for kjøpere og leietakere."
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 w-full justify-center pt-4">
                <Link href="#properties">
                  <Button size="lg" className="h-12 px-8 bg-blue-600 hover:bg-blue-500 text-white w-full sm:w-auto text-lg font-semibold shadow-lg">
                    Se ledige boliger <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="outline" size="lg" className="h-12 px-8 bg-transparent border-white text-white hover:bg-white hover:text-slate-900 w-full sm:w-auto text-lg">
                    For leietakere
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features / About Section */}
        <section id="about" className="w-full py-20 bg-white dark:bg-slate-950">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl mb-4">Hvorfor velge oss?</h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">Vi legger stolthet i å tilby mer enn bare tak over hodet.</p>
            </div>
            <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col rounded-2xl bg-slate-50 border border-slate-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
                <div className="h-48 overflow-hidden">
                  <img 
                    src="/images/Gemini_Generated_Image_cd8f0gcd8f0gcd8f.png" 
                    alt="Kjøp og Salg" 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-6 flex flex-col items-center text-center flex-1">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-full mb-4 -mt-12 relative z-10 border-4 border-slate-50">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-slate-900">Kjøp og Salg</h3>
                  <p className="text-slate-600 leading-relaxed">
                    Vi er aktive i markedet og søker alltid etter nye investeringsmuligheter. Vi sørger for ryddige prosesser og oppgjør.
                  </p>
                </div>
              </div>

              <div className="flex flex-col rounded-2xl bg-slate-50 border border-slate-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
                <div className="h-48 overflow-hidden">
                  <img 
                    src="/images/Gemini_Generated_Image_gblhghgblhghgblh (1).png" 
                    alt="Utvikling" 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-6 flex flex-col items-center text-center flex-1">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-full mb-4 -mt-12 relative z-10 border-4 border-slate-50">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-slate-900">Utvikling og Flipping</h3>
                  <p className="text-slate-600 leading-relaxed">
                    Vi oppgraderer boliger til moderne standard med fokus på kvalitet, varige løsninger og estetikk.
                  </p>
                </div>
              </div>

              <div className="flex flex-col rounded-2xl bg-slate-50 border border-slate-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
                <div className="h-48 overflow-hidden">
                  <img 
                    src="/images/Gemini_Generated_Image_i8znbi8znbi8znbi.png" 
                    alt="Utleie" 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-6 flex flex-col items-center text-center flex-1">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-full mb-4 -mt-12 relative z-10 border-4 border-slate-50">
                    <Key className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-slate-900">Profesjonell Utleie</h3>
                  <p className="text-slate-600 leading-relaxed">
                    Som leietaker hos oss får du ryddige forhold, digitale løsninger og en profesjonell motpart.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Properties Teaser */}
        <section id="properties" className="w-full py-20 bg-slate-50 dark:bg-slate-900">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
              <div className="text-center md:text-left">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl mb-4">Våre Eiendommer</h2>
                <p className="text-lg text-slate-600 max-w-xl">
                  Se et utvalg av våre eiendommer. Klikk på en eiendom for å se ledige enheter.
                </p>
              </div>
              <Link href="/login">
                <Button size="lg" variant="outline" className="border-slate-300 hover:bg-white">
                  Gå til boligoversikt <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {properties.length > 0 ? (
                properties.map((property) => (
                  <Link href={`/properties/${property.id}`} key={property.id} className="group cursor-pointer">
                    <div className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 h-full flex flex-col">
                      <div className="h-48 bg-slate-200 relative overflow-hidden">
                        {property.imageUrl ? (
                          <Image
                            src={property.imageUrl}
                            alt={property.name}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-slate-300 flex items-center justify-center text-slate-500">
                            <Building2 className="h-12 w-12 opacity-50" />
                          </div>
                        )}
                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold shadow-sm">
                          {property.units.length} enheter
                        </div>
                      </div>
                      <div className="p-6 flex flex-col flex-1">
                        <h3 className="font-bold text-xl mb-2 text-slate-900 group-hover:text-blue-600 transition-colors">{property.name}</h3>
                        <div className="flex items-center text-slate-500 mb-4 text-sm">
                          <MapPin className="h-4 w-4 mr-1" />
                          {property.address}
                        </div>
                        <div className="mt-auto pt-4 border-t border-slate-100 flex justify-between items-center">
                          <span className="text-sm font-medium text-slate-600">
                            {property.gnr && property.bnr ? `Gnr ${property.gnr} / Bnr ${property.bnr}` : 'Eiendomsutvikling'}
                          </span>
                          <span className="inline-flex items-center justify-center rounded-full w-8 h-8 bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <ArrowRight className="h-4 w-4" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="col-span-full text-center py-12 bg-slate-100 rounded-xl">
                  <p className="text-slate-600 mb-4">Ingen eiendommer er lagt ut enda.</p>
                  <p className="text-sm text-slate-500">Ta kontakt med oss for å høre om kommende prosjekter.</p>
                </div>
              )}
            </div>
          </div>
        </section>
        
        {/* Contact / CTA Section */}
        <section id="contact" className="w-full py-20 bg-slate-900 text-white">
          <div className="container px-4 md:px-6 mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">Interessert i å leie?</h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-10">
              Registrer deg i dag for å få varsel når drømmeboligen blir ledig, eller ta kontakt med oss for en uforpliktende prat.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link href="/register">
                <Button size="lg" className="h-14 px-8 bg-blue-600 hover:bg-blue-500 text-white text-lg font-bold">
                  Registrer deg nå
                </Button>
              </Link>
              <Link href="mailto:post@kias.no">
                <Button size="lg" variant="outline" className="h-14 px-8 bg-transparent border-slate-600 text-white hover:bg-slate-800 text-lg">
                  Kontakt oss
                </Button>
              </Link>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 text-center border-t border-slate-800 pt-12 max-w-4xl mx-auto">
              <div className="flex flex-col items-center">
                <Phone className="h-6 w-6 text-blue-400 mb-4" />
                <h4 className="font-semibold mb-2">Telefon</h4>
                <p className="text-slate-400">908 01 716</p>
              </div>
              <div className="flex flex-col items-center">
                <Mail className="h-6 w-6 text-blue-400 mb-4" />
                <h4 className="font-semibold mb-2">E-post</h4>
                <p className="text-slate-400">post@kias.no</p>
              </div>
              <div className="flex flex-col items-center">
                <MapPin className="h-6 w-6 text-blue-400 mb-4" />
                <h4 className="font-semibold mb-2">Besøksadresse</h4>
                <p className="text-slate-400">Fredriksfrydveien 2, 1792 Tistedal</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <footer className="w-full py-8 bg-slate-950 text-slate-500 border-t border-slate-900 text-center">
        <div className="container px-4 md:px-6 mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm">© 2024 Halden Eiendomsutvikling. Alle rettigheter reservert.</p>
          <div className="flex gap-6 text-sm">
             <Link href="/login" className="hover:text-white transition-colors">
               Admin Login
             </Link>
             <Link href="#" className="hover:text-white transition-colors">
               Personvern
             </Link>
             <Link href="#" className="hover:text-white transition-colors">
               Vilkår
             </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

