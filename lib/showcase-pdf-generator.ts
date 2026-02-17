import fs from 'fs';
import templateHtml from "@/lib/templates/showcase.html";

interface ShowcaseData {
  type: string;
  address: string;
  unitName: string;
  size: number;
  details: Record<string, string>;
  rooms: {
    name: string;
    description?: string;
    images: string[];
  }[];
}

interface GeneratedShowcase {
  pdfBuffer: Buffer;
  fileName: string;
}

export async function generateShowcasePDF(data: ShowcaseData): Promise<GeneratedShowcase> {
  let chromium: any;
  let puppeteer: any;
  let executablePath: string | undefined;
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    chromium = (await import('@sparticuz/chromium')).default;
    puppeteer = (await import('puppeteer-core')).default;
    executablePath = await chromium.executablePath();
  } else {
    puppeteer = (await import('puppeteer-core')).default;
    try {
      // @ts-ignore
      const puppeteerLocal = await import('puppeteer');
      executablePath = puppeteerLocal.executablePath();
    } catch (error) {
       console.log("Local puppeteer not found");
    }

    if (!executablePath) {
        // Fallback paths
      const paths = [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/usr/bin/google-chrome-stable",
        "/usr/bin/chromium-browser",
      ];
      executablePath = paths.find(p => fs.existsSync(p));
    }
  }

  const browser = await puppeteer.launch({
    args: isProduction ? chromium.args : ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1200, height: 800 },
    executablePath,
    headless: isProduction ? true : "new",
  });
    
  try {
    const page = await browser.newPage();
    
    let html = templateHtml as string;

    // Replace placeholders
    html = html.replace('{{title}}', `${data.type} - ${data.address}`);
    html = html.replace('{{type}}', data.type);
    html = html.replace('{{address}}', data.address);
    html = html.replace('{{unitName}}', data.unitName);
    html = html.replace('{{size}}', data.size.toString());
    html = html.replace('{{date}}', new Date().toLocaleDateString('no-NO'));

    // Custom details
    let detailsHtml = '';
    if (data.details.price) detailsHtml += `<div class="detail-item"><strong>Prisantydning</strong><span>${data.details.price},-</span></div>`;
    if (data.details.rent) detailsHtml += `<div class="detail-item"><strong>Månedsleie</strong><span>${data.details.rent},-</span></div>`;
    if (data.details.deposit) detailsHtml += `<div class="detail-item"><strong>Depositum</strong><span>${data.details.deposit},-</span></div>`;
    if (data.details.commonCost) detailsHtml += `<div class="detail-item"><strong>Felleskostnader</strong><span>${data.details.commonCost},-</span></div>`;
    
    if (data.details.generalNotes) {
        // Full width for notes
        detailsHtml += `</div><div style="margin-top: 20px; padding: 20px; background: #f8fafc; border-radius: 8px;"><strong>Generelt</strong><p style="margin-top: 5px;">${data.details.generalNotes}</p>`; 
        // Note: Closing div trickery because details-grid is grid-cols-2. 
        // A bit hacky but works for simple templates. 
        // Actually, let's just append it.
    }

    html = html.replace('{{customDetails}}', detailsHtml);

    // Rooms
    const totalImages = data.rooms.reduce(
      (sum, room) => sum + (room.images?.length || 0),
      0
    );
    console.log("Showcase PDF images count (generator):", totalImages);

    let roomsHtml = '';
    for (const room of data.rooms) {
        let imagesHtml = '';
        if (room.images && room.images.length > 0) {
            imagesHtml = `<div class="image-grid">`;
            for (const img of room.images) {
                imagesHtml += `<div class="image-container"><img src="${img}" /></div>`;
            }
            imagesHtml += `</div>`;
        }

        roomsHtml += `
            <div class="room">
                <h2>${room.name}</h2>
                ${room.description ? `<p>${room.description}</p>` : ''}
                ${imagesHtml}
            </div>
        `;
    }

    html = html.replace('{{roomsHtml}}', roomsHtml);

    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
    });

    await browser.close();

    return {
      pdfBuffer: Buffer.from(pdfBuffer),
      fileName: `showcase-${Date.now()}.pdf`
    };

  } catch (error) {
    console.error("PDF Generation failed:", error);
    await browser.close();
    throw error;
  }
}
