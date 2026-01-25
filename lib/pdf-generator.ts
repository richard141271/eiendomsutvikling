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
  score: number;
  themeClass: string;
  bodyText: string;
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
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
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
      .replace(/{{stars}}/g, data.stars.toString())
      .replace(/{{score}}/g, data.score.toString())
      .replace(/{{themeClass}}/g, data.themeClass)
      .replace(/{{bodyText}}/g, data.bodyText);

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

interface ProjectReportData {
  projectId: string;
  title: string;
  propertyName: string;
  unitName?: string;
  date: string;
  startDate: string;
  description?: string;
  entriesHtml: string;
  tasksHtml: string;
}

export async function generateProjectReportPDF(data: ProjectReportData): Promise<GeneratedCertificate> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  
  try {
    const page = await browser.newPage();
    
    // Read HTML template
    const templatePath = path.join(process.cwd(), 'lib', 'templates', 'project-report.html');
    let html = fs.readFileSync(templatePath, 'utf8');

    // Replace placeholders
    // Using a simple replace for now. For production, a template engine like Handlebars is better.
    html = html
      .replace(/{{title}}/g, data.title)
      .replace(/{{propertyName}}/g, data.propertyName)
      .replace(/{{unitName}}/g, data.unitName ? `• ${data.unitName}` : '')
      .replace(/{{date}}/g, data.date)
      .replace(/{{startDate}}/g, data.startDate)
      .replace(/{{description}}/g, data.description || '')
      .replace(/{{entriesHtml}}/g, data.entriesHtml)
      .replace(/{{tasksHtml}}/g, data.tasksHtml);

    // Handle conditional rendering for description (basic implementation)
    // If description is empty, we might have an empty div or {{#if}} block which this simple replace won't handle well.
    // But since we control the HTML, we can just replace the whole block if we used a smarter replace.
    // For now, let's assume simple string replacement.
    // Cleanup any handlebars-like tags if present and not replaced
    html = html.replace(/{{#if description}}[\s\S]*?{{\/if}}/g, data.description ? `<div class="description"><p>${data.description}</p></div>` : '');

    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Ensure storage directory exists
    const storageDir = path.join(process.cwd(), 'storage', 'reports');
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    const fileName = `report-${data.projectId}-${Date.now()}.pdf`;
    const pdfPath = path.join(storageDir, fileName);

    // Generate PDF
    const pdfBuffer = await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        bottom: '20mm',
        left: '20mm',
        right: '20mm',
      }
    });

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
