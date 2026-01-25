import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import crypto from 'crypto';

interface CertificateData {
  issuer: string;
  tenantName: string;
  statusText: string;
  certificateId: string;
  date: string;
  verificationUrl: string;
  stars: number;
}

interface GeneratedCertificate {
  pdfBuffer: Buffer;
  pdfPath: string;
  pdfHash: string;
  fileName: string;
}

export async function generateCertificatePDF(data: CertificateData): Promise<GeneratedCertificate> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  try {
    const page = await browser.newPage();
    
    // Read HTML template
    const templatePath = path.join(process.cwd(), 'lib', 'templates', 'certificate.html');
    let html = fs.readFileSync(templatePath, 'utf8');

    // Generate QR Code
    const qrCodeBase64 = await QRCode.toDataURL(data.verificationUrl, {
      width: 500,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });

    // Replace placeholders
    html = html
      .replace(/{{issuer}}/g, data.issuer)
      .replace(/{{tenantName}}/g, data.tenantName)
      .replace(/{{statusText}}/g, data.statusText)
      .replace(/{{qrCodeBase64}}/g, qrCodeBase64)
      .replace(/{{certificateId}}/g, data.certificateId)
      .replace(/{{date}}/g, data.date)
      .replace(/{{stars}}/g, data.stars.toString());

    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Ensure storage directory exists
    const storageDir = path.join(process.cwd(), 'storage', 'certificates');
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    const fileName = `${data.certificateId}.pdf`;
    const pdfPath = path.join(storageDir, fileName);

    // Generate PDF
    const pdfBuffer = await page.pdf({
      path: pdfPath, // Saves directly to disk
      format: 'A4',
      printBackground: true,
    });

    // Calculate Hash
    const pdfHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

    return {
      pdfBuffer: Buffer.from(pdfBuffer),
      pdfPath,
      pdfHash,
      fileName,
    };

  } finally {
    await browser.close();
  }
}
