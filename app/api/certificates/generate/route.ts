import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateCertificatePDF } from '@/lib/pdf-generator';
import { createClient } from '@/lib/supabase-server';
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

    // Determine Status Text
    let statusText = "VERIFISERT LEIETAKER";
    if (statusTextOverride) {
      statusText = statusTextOverride;
    } else {
        // Fallback logic if not provided
        if (stars >= 10) statusText = "DIAMANT LEIETAKER";
        else if (stars >= 6) statusText = "GULL LEIETAKER";
        else if (stars >= 1) statusText = "SØLV LEIETAKER";
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
    };

    // Generate PDF
    const { pdfPath, pdfHash, fileName } = await generateCertificatePDF(pdfData);

    // Update Certificate with PDF info
    // Storing relative path or API URL? 
    // User said "pdfUrl path" and "Lagring: /storage/...". 
    // We will store the relative path for internal use, and maybe a public URL helper later.
    const relativePath = `storage/certificates/${fileName}`;

    const updatedCertificate = await prisma.tenantCertificate.update({
      where: { id: certificate.id },
      data: {
        pdfUrl: relativePath,
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
