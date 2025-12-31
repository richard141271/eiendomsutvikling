import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Building2, Key, ShieldCheck, Home as HomeIcon, ArrowRight, Phone, Mail, MapPin } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen font-sans">
      <header className="px-6 lg:px-10 h-20 flex items-center border-b bg-white dark:bg-slate-950 sticky top-0 z-50 shadow-sm">
        <Link className="flex items-center justify-center gap-2" href="#">
          <div className="bg-slate-900 text-white p-2 rounded-lg">
            <Building2 className="h-6 w-6" />
          </div>
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
            <Button variant="outline" className="hidden sm:flex border-slate-200">
              Logg inn
            </Button>
          </Link>
          <Link href="/register">
            <Button className="bg-slate-900 hover:bg-slate-800 text-white shadow-md">
              Registrer interesse
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-20 md:py-32 lg:py-40 bg-slate-900 text-white overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 opacity-90"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/40 via-transparent to-transparent"></div>
          <div className="container px-4 md:px-6 mx-auto relative z-10">
            <div className="flex flex-col items-center space-y-8 text-center max-w-4xl mx-auto">
              <div className="space-y-4">
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl leading-tight">
                  Kvalitetsboliger i <span className="text-blue-400">Halden</span>
                </h1>
                <p className="mx-auto max-w-[700px] text-slate-300 md:text-xl font-light leading-relaxed">
                  Vi utvikler, forvalter og leier ut moderne hjem med fokus på trivsel, trygghet og sentral beliggenhet. 
                  Din nye bolig venter på deg.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
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
              <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="p-4 bg-blue-100 text-blue-600 rounded-full mb-6">
                  <MapPin className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-slate-900">Sentral beliggenhet</h3>
                <p className="text-slate-600 leading-relaxed">
                  Våre eiendommer ligger i hjertet av Halden, med kort vei til skoler, butikker og kollektivtransport.
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="p-4 bg-blue-100 text-blue-600 rounded-full mb-6">
                  <ShieldCheck className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-slate-900">Trygghet i fokus</h3>
                <p className="text-slate-600 leading-relaxed">
                  Profesjonell forvaltning, ryddige kontrakter og rask oppfølging av vedlikehold gir deg en bekymringsfri hverdag.
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="p-4 bg-blue-100 text-blue-600 rounded-full mb-6">
                  <Key className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-slate-900">Enkel digital hverdag</h3>
                <p className="text-slate-600 leading-relaxed">
                  Alt fra kontraktsignering til husleiebetaling og feilmelding skjer digitalt via vår leietakerportal.
                </p>
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
                  Se et utvalg av våre boliger. Logg inn for full oversikt og visningspåmelding.
                </p>
              </div>
              <Link href="/login">
                <Button size="lg" variant="outline" className="border-slate-300 hover:bg-white">
                  Gå til boligoversikt <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Placeholder Property Cards */}
              {[1, 2, 3].map((i) => (
                <div key={i} className="group bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300">
                  <div className="h-48 bg-slate-200 relative overflow-hidden">
                     {/* Placeholder for image */}
                     <div className="absolute inset-0 bg-slate-300 flex items-center justify-center text-slate-500">
                       <HomeIcon className="h-12 w-12 opacity-50" />
                     </div>
                  </div>
                  <div className="p-6">
                    <h3 className="font-bold text-xl mb-2 text-slate-900">Storgata {10 + i}, Halden</h3>
                    <p className="text-slate-500 mb-4 text-sm">Sentrumsnær leilighet med høy standard.</p>
                    <div className="flex justify-between items-center border-t pt-4 mt-4">
                      <span className="font-semibold text-blue-600">Fra 12 000 kr/mnd</span>
                      <span className="text-xs font-medium bg-green-100 text-green-700 px-2 py-1 rounded-full">Ledig nå</span>
                    </div>
                  </div>
                </div>
              ))}
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
              <Link href="mailto:post@halden-eiendom.no">
                <Button size="lg" variant="outline" className="h-14 px-8 bg-transparent border-slate-600 text-white hover:bg-slate-800 text-lg">
                  Kontakt oss
                </Button>
              </Link>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 text-center border-t border-slate-800 pt-12 max-w-4xl mx-auto">
              <div className="flex flex-col items-center">
                <Phone className="h-6 w-6 text-blue-400 mb-4" />
                <h4 className="font-semibold mb-2">Telefon</h4>
                <p className="text-slate-400">+47 12 34 56 78</p>
              </div>
              <div className="flex flex-col items-center">
                <Mail className="h-6 w-6 text-blue-400 mb-4" />
                <h4 className="font-semibold mb-2">E-post</h4>
                <p className="text-slate-400">post@halden-eiendom.no</p>
              </div>
              <div className="flex flex-col items-center">
                <MapPin className="h-6 w-6 text-blue-400 mb-4" />
                <h4 className="font-semibold mb-2">Besøksadresse</h4>
                <p className="text-slate-400">Storgata 1, 1771 Halden</p>
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

