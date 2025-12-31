import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Building2, Key, ShieldCheck, Home as HomeIcon } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 lg:px-6 h-16 flex items-center border-b bg-white dark:bg-gray-950">
        <Link className="flex items-center justify-center" href="#">
          <Building2 className="h-6 w-6 mr-2" />
          <span className="font-bold text-xl">Halden Eiendomsutvikling</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link className="text-sm font-medium hover:underline underline-offset-4 flex items-center" href="#about">
            Om oss
          </Link>
          <Link className="text-sm font-medium hover:underline underline-offset-4 flex items-center" href="#properties">
            Eiendommer
          </Link>
          <Link className="text-sm font-medium hover:underline underline-offset-4 flex items-center" href="#contact">
            Kontakt
          </Link>
          <Link href="/login">
            <Button variant="default" size="sm">Logg inn</Button>
          </Link>
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-gray-100 dark:bg-gray-900">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                  Kvalitetsboliger i Halden
                </h1>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                  Vi utvikler og forvalter eiendommer med fokus på kvalitet og trivsel. 
                  Registrer deg som interessent for å få varsel om ledige boliger.
                </p>
              </div>
              <div className="space-x-4">
                <Link href="/register">
                  <Button size="lg" className="h-11 px-8">Registrer deg som interessent</Button>
                </Link>
                <Link href="#properties">
                  <Button variant="outline" size="lg" className="h-11 px-8">Se ledige boliger</Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="w-full py-12 md:py-24 lg:py-32 bg-white dark:bg-gray-950">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="p-4 bg-gray-100 rounded-full dark:bg-gray-800">
                  <HomeIcon className="h-10 w-10" />
                </div>
                <h2 className="text-xl font-bold">Sentralt og moderne</h2>
                <p className="text-gray-500 dark:text-gray-400">
                  Våre eiendommer ligger sentralt i Halden med kort vei til alt du trenger.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="p-4 bg-gray-100 rounded-full dark:bg-gray-800">
                  <ShieldCheck className="h-10 w-10" />
                </div>
                <h2 className="text-xl font-bold">Trygt leieforhold</h2>
                <p className="text-gray-500 dark:text-gray-400">
                  Ryddige kontrakter og profesjonell oppfølging gjennom hele leieforholdet.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="p-4 bg-gray-100 rounded-full dark:bg-gray-800">
                  <Key className="h-10 w-10" />
                </div>
                <h2 className="text-xl font-bold">Enkel overtakelse</h2>
                <p className="text-gray-500 dark:text-gray-400">
                  Digital overtakelsesprotokoll og signering med BankID.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="properties" className="w-full py-12 md:py-24 lg:py-32 bg-gray-100 dark:bg-gray-900">
          <div className="container px-4 md:px-6 mx-auto text-center">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">Våre Eiendommer</h2>
              <p className="mx-auto max-w-[600px] text-gray-500 md:text-xl dark:text-gray-400">
                Logg inn for å se en komplett oversikt over ledige boliger og melde interesse.
              </p>
              <Link href="/login">
                <Button className="mt-4">Gå til leietaker-portal</Button>
              </Link>
            </div>
          </div>
        </section>

        <section id="contact" className="w-full py-12 md:py-24 lg:py-32 bg-white dark:bg-gray-950">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center space-y-4 text-center">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">Kontakt Oss</h2>
              <p className="mx-auto max-w-[600px] text-gray-500 md:text-xl dark:text-gray-400">
                Har du spørsmål? Ta gjerne kontakt for en uforpliktende prat.
              </p>
              <div className="flex flex-col gap-2 min-[400px]:flex-row">
                <Button variant="outline">post@haldeneiendomsutvikling.no</Button>
                <Button variant="outline">Tlf: 69 00 00 00</Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          © 2024 Halden Eiendomsutvikling. Alle rettigheter reservert.
        </p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Personvern
          </Link>
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Vilkår
          </Link>
        </nav>
      </footer>
    </div>
  );
}
