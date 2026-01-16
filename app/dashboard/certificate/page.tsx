import { createClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import CertificateClient from "./certificate-client";

export default async function CertificatePage() {
  const supabase = createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  // Fetch user data
  const user = await prisma.user.findUnique({
    where: { authId: authUser.id },
    select: {
      id: true,
      name: true,
      createdAt: true
    }
  });

  if (!user) {
    return <div>Bruker ikke funnet</div>;
  }

  // Fetch certificate (or mock if none exists)
  const certificate = await prisma.tenantCertificate.findFirst({
    where: { tenantId: user.id },
    orderBy: { createdAt: 'desc' }
  });

  // Fetch earliest lease contract for "Member Since"
  const earliestContract = await prisma.leaseContract.findFirst({
    where: { tenantId: user.id },
    orderBy: { startDate: 'asc' },
    select: { startDate: true }
  });

  // Default values
  const score = certificate ? certificate.totalScore : 10;
  const issueDate = certificate ? certificate.createdAt : new Date();
  // Use User ID as fallback, prefixed to look like a cert ID
  const id = certificate ? certificate.id : `CERT-${user.id}`;
  const memberSince = earliestContract?.startDate || user.createdAt;

  return (
    <CertificateClient 
      name={user.name}
      id={id}
      issueDate={issueDate}
      score={score}
      memberSince={memberSince}
    />
  );
}
