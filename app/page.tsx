import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 md:p-24 bg-background">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm lg:flex flex-col gap-8">
        <h1 className="text-4xl font-bold text-center">Eiendomssystem</h1>
        <p className="text-center text-muted-foreground max-w-md">
          Enkel eiendomsforvaltning. Integrert med Fiken for sømløs regnskapsføring.
        </p>
        
        <div className="flex gap-4">
          <Link href="/login">
            <Button size="lg">Logg inn</Button>
          </Link>
          <Link href="/register">
            <Button variant="outline" size="lg">Registrer</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
