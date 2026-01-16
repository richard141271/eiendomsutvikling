import { prisma } from "@/lib/prisma";
import { TenantCertificate } from "@/components/tenant-certificate";
import { notFound } from "next/navigation";
import { Metadata } from "next";

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
