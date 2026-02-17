import Link from "next/link";

export default function CasesPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">Saker</h1>
        <p className="text-muted-foreground">
          Her vil du senere kunne bygge juridiske saker og rapporter med den nye motoren.
        </p>
      </div>
      <p className="text-sm text-slate-500">
        Foreløpig er dette kun en plassholder slik at du enkelt finner tilbake mens vi bygger videre.
      </p>
      <div>
        <Link href="/projects" className="text-blue-600 hover:underline text-sm">
          Gå til prosjekter
        </Link>
      </div>
    </div>
  );
}

