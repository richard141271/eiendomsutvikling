import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateCertificatePDF } from '@/lib/pdf-generator';
import { createClient } from '@/lib/supabase-server';
import { getCertificateContent } from '@/lib/certificate-utils';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const issuer = await prisma.user.findUnique({
      where: { authId: authUser.id },
    });

    if (!issuer || (issuer.role !== 'ADMIN' && issuer.role !== 'OWNER')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { tenantId, totalScore, stars, comment, statusTextOverride } = body;

    if (!tenantId) {
      return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 });
    }

    // Fetch Tenant details
    const tenant = await prisma.user.findUnique({ where: { id: tenantId } });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Use centralized logic
    const { tier, certText, statusLabel } = getCertificateContent(stars || 0);

    // Determine Status Text (allow override)
    let statusText = statusLabel;
    if (statusTextOverride) {
      statusText = statusTextOverride;
    }
    
    // Determine Theme Class
    const themeClassMap: Record<string, string> = {
      "Diamant": "diamond",
      "Gull": "gold",
      "Sølv": "silver",
      "Standard": "standard"
    };
    const themeClass = themeClassMap[tier.name] || "standard";

    // Format body text with explicit break if needed (matching React component)
    let formattedBodyText = certText;
    if (certText.includes("fremragende resultater")) {
        formattedBodyText = "Har gjennomført et leieforhold med fremragende resultater og har oppnådd<br/>status som";
    }

    // Create Certificate Record FIRST to get the ID
    const certificate = await prisma.tenantCertificate.create({
      data: {
        tenantId,
        issuerId: issuer.id,
        totalScore: totalScore || 10,
        stars: stars || 0,
        behaviorScore: 5, // Defaulting for now
        noiseScore: 5,
        paymentScore: 5,
        cleaningScore: 5,
        comment,
      },
    });

    // Prepare Data for PDF
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const verificationUrl = `${baseUrl}/verify/${certificate.id}`;
    
    const pdfData = {
      issuer: "Halden Eiendomsutvikling", // Hardcoded as per template/user preference or use issuer.name
      tenantName: tenant.name,
      statusText: statusText,
      certificateId: certificate.id,
      date: new Date().toLocaleDateString('no-NO'),
      verificationUrl: verificationUrl,
      stars: stars || 0,
      score: totalScore || 0,
      themeClass: themeClass,
      bodyText: formattedBodyText,
    };

    // Generate PDF
    const { pdfPath, pdfHash, fileName, pdfBuffer } = await generateCertificatePDF(pdfData);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('reports') // User specified 'reports' bucket in example, assuming shared or same bucket logic
      .upload(`certificates/${fileName}`, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      throw new Error("Kunne ikke laste opp sertifikat til skyen");
    }

    // Get public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('reports')
      .getPublicUrl(`certificates/${fileName}`);

    const updatedCertificate = await prisma.tenantCertificate.update({
      where: { id: certificate.id },
      data: {
        pdfUrl: publicUrl,
        pdfHash: pdfHash,
      },
    });

    return NextResponse.json({
      success: true,
      certificate: updatedCertificate,
      message: 'Certificate generated successfully',
    });

  } catch (error) {
    console.error('Error generating certificate:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
