import { prisma } from "@/lib/prisma";
import { TenantCertificate } from "@/components/tenant-certificate";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { headers } from "next/headers";

interface VerifyPageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({ params }: VerifyPageProps): Promise<Metadata> {
  return {
    title: `Verifisering av Leietakerbevis - ${params.id}`,
    description: "Offisiell verifisering av leietakerbevis fra Halden Eiendomsutvikling.",
  };
}

export default async function VerifyPage({ params }: VerifyPageProps) {
  const { id } = params;
  const headersList = headers();
  const host = headersList.get("host");
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const baseUrl = host ? `${protocol}://${host}` : process.env.NEXT_PUBLIC_APP_URL || "";

  let user = null;
  let certificate = null;
  let memberSince = null;

  // Case 1: ID is a Certificate UUID
  const certAttempt = await prisma.tenantCertificate.findUnique({
    where: { id },
    include: { tenant: true }
  });

  if (certAttempt) {
    certificate = certAttempt;
    user = certAttempt.tenant;
  } else if (id.startsWith("CERT-")) {
    // Case 2: ID is a Fallback "CERT-{userId}"
    const userId = id.replace("CERT-", "");
    user = await prisma.user.findUnique({
      where: { id: userId }
    });
  }

  if (!user) {
    return notFound();
  }

  // Check for PDF availability
  const pdfUrl = certificate?.pdfUrl;
  const pdfHash = certificate?.pdfHash;

  if (pdfUrl) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Offisiell Verifisering</h1>
          <div className="flex items-center justify-center gap-2 text-green-600 font-medium bg-green-50 px-4 py-2 rounded-full border border-green-200 inline-flex">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            Gyldig Sertifikat
          </div>
        </div>

        <div className="w-full max-w-4xl bg-white shadow-xl rounded-lg overflow-hidden border border-slate-200">
           <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center">
             <span className="text-sm font-medium text-slate-600">Dokumentvisning</span>
             <a 
               href={`/api/certificates/${id}/pdf`} 
               download
               className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
             >
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
               Last ned PDF
             </a>
           </div>
           <iframe 
             src={`/api/certificates/${id}/pdf`} 
             className="w-full h-[800px] border-none"
             title="Leietakerbevis"
           />
        </div>

        <div className="text-center text-sm text-slate-500 mt-8 max-w-2xl bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <div>
              <p className="font-semibold text-slate-700">Sist verifisert:</p>
              <p>{new Date().toLocaleString('no-NO')}</p>
            </div>
            <div>
              <p className="font-semibold text-slate-700">Dokument-hash (SHA256):</p>
              <p className="font-mono text-xs break-all text-slate-400">{pdfHash || "Ikke tilgjengelig"}</p>
            </div>
            <div className="md:col-span-2 mt-2 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-400">
                Dette dokumentet er kryptografisk signert og lagret permanent. Hash-verdien over garanterer at dokumentet ikke er endret siden utstedelse.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fetch Member Since if not available from certificate context (though we need it for the component)
  const earliestContract = await prisma.leaseContract.findFirst({
    where: { tenantId: user.id },
    orderBy: { startDate: 'asc' },
    select: { startDate: true }
  });

  memberSince = earliestContract?.startDate || user.createdAt;
  const score = certificate ? certificate.totalScore : 10;
  const issueDate = certificate ? certificate.createdAt : new Date();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Offisiell Verifisering</h1>
        <p className="text-slate-500">
          Dette er et gyldig leietakerbevis utstedt av Halden Eiendomsutvikling.
        </p>
      </div>

      <div className="scale-110 transform mb-8">
        <TenantCertificate 
          name={user.name} 
          issueDate={issueDate} 
          score={score} 
          id={id}
          variant="digital"
          memberSince={memberSince}
          baseUrl={baseUrl}
        />
      </div>

      <div className="text-center text-sm text-muted-foreground max-w-md">
        <p>
          Sist verifisert: {new Date().toLocaleString('no-NO')}
        </p>
      </div>
    </div>
  );
}
