import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;

  try {
    const certificate = await prisma.tenantCertificate.findUnique({
      where: { id },
    });

    if (!certificate || !certificate.pdfUrl) {
      return NextResponse.json({ error: 'Certificate PDF not found' }, { status: 404 });
    }

    // Construct absolute path
    const filePath = path.join(process.cwd(), certificate.pdfUrl);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found on server' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${id}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Error serving PDF:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
