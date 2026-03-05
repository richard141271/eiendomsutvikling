
import { createClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getNextEvidenceNumber } from "@/app/actions/evidence";
import puppeteer from "puppeteer";
import exifr from "exifr";
import PDFParse from "pdf-parse";
import * as cheerio from "cheerio";
import { simpleParser } from "mailparser";
import crypto from "crypto";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projectId = params.id;
    if (!projectId) {
      return NextResponse.json({ error: "Project ID missing" }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const lastModifiedStr = formData.get("lastModified") as string;
    
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Convert file to Buffer for processing
    const arrayBuffer = await file.arrayBuffer();
    const originalBuffer = Buffer.from(arrayBuffer);
    let uploadBuffer = originalBuffer;
    
    // Calculate SHA256 Hash
    const hashSum = crypto.createHash('sha256');
    hashSum.update(originalBuffer);
    const fileHash = hashSum.digest('hex');

    // Initial metadata
    let fileType = file.type;
    let fileSize = file.size;
    let title = file.name;
    let originalDate: Date | null = null;
    let createdAtMetadata: Date | null = null;
    let modifiedAtMetadata: Date | null = null;
    let receivedAt: Date | null = null;
    let sender: string | null = null;
    let receiver: string | null = null;
    let subject: string | null = null;
    let extractedText: string | null = null;
    let notes: string | null = null;
    
    // Metadata JSON to store extra fields
    let metadata: any = {
      originalName: file.name,
      hash: fileHash
    };

    // --- PIPELINE: METADATA EXTRACTION ---

    // 1. Image Metadata (EXIF)
    if (fileType.startsWith('image/')) {
      try {
        const exifData = await exifr.parse(originalBuffer);
        if (exifData) {
          if (exifData.DateTimeOriginal) createdAtMetadata = exifData.DateTimeOriginal;
          else if (exifData.CreateDate) createdAtMetadata = exifData.CreateDate;
          
          if (exifData.ModifyDate) modifiedAtMetadata = exifData.ModifyDate;
          
          // GPS
          if (exifData.latitude && exifData.longitude) {
            metadata.gps = { lat: exifData.latitude, lon: exifData.longitude };
          }
          // Camera model
          if (exifData.Make || exifData.Model) {
            metadata.camera = `${exifData.Make || ''} ${exifData.Model || ''}`.trim();
          }
        }
      } catch (e) {
        console.warn("EXIF extraction failed:", e);
      }
    }

    // 2. PDF Metadata
    else if (fileType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      try {
        const data = await PDFParse(originalBuffer);
        extractedText = data.text;
        
        if (data.info) {
          const info = data.info as any;
          if (info.CreationDate) {
            // PDF dates are often in format D:20230621143000Z
            const dateStr = info.CreationDate.replace(/^D:/, '').substring(0, 14);
            if (dateStr.length === 14) {
              const y = dateStr.substring(0, 4);
              const m = dateStr.substring(4, 6);
              const d = dateStr.substring(6, 8);
              const h = dateStr.substring(8, 10);
              const min = dateStr.substring(10, 12);
              const s = dateStr.substring(12, 14);
              createdAtMetadata = new Date(`${y}-${m}-${d}T${h}:${min}:${s}`);
            }
          }
          if (info.Title) title = info.Title;
          if (info.Author) sender = info.Author;
          
          metadata.pdf = {
            pages: data.numpages,
            version: data.version,
            info: info
          };
        }
      } catch (e) {
        console.warn("PDF extraction failed:", e);
      }
    }

    // 3. EML / Email Parsing
    else if (file.name.toLowerCase().endsWith('.eml') || fileType === 'message/rfc822') {
        try {
            const parsed = await simpleParser(originalBuffer);
            if (parsed.date) receivedAt = parsed.date;
            if (parsed.subject) {
                subject = parsed.subject;
                title = parsed.subject;
            }
            if (parsed.from?.text) sender = parsed.from.text;
            if (parsed.to) {
                // to is AddressObject or array
                const toArray = Array.isArray(parsed.to) ? parsed.to : [parsed.to];
                receiver = toArray.map(addr => addr.text).join(', ');
            }
            if (parsed.text) extractedText = parsed.text;
            
            // Prefer email date as original date
            originalDate = parsed.date || null;
        } catch (e) {
            console.warn("EML extraction failed:", e);
        }
    }

    // 4. HTML Parsing & Conversion
    else if (file.name.toLowerCase().endsWith('.html') || file.name.toLowerCase().endsWith('.htm')) {
        // Parse with Cheerio first
        try {
            const htmlString = originalBuffer.toString('utf-8');
            const $ = cheerio.load(htmlString);
            extractedText = $('body').text().trim();
            
            // Try to find metadata in meta tags or common patterns
            const titleTag = $('title').text();
            if (titleTag) title = titleTag;

            // Regex for common email-in-html patterns (Outlook saves etc)
            const textContent = extractedText;
            const subjectMatch = textContent.match(/(?:Subject|Emne):\s*(.+)/i);
            if (subjectMatch) subject = subjectMatch[1].trim();
            
            const fromMatch = textContent.match(/(?:From|Fra):\s*(.+)/i);
            if (fromMatch) sender = fromMatch[1].trim();
            
            const toMatch = textContent.match(/(?:To|Til):\s*(.+)/i);
            if (toMatch) receiver = toMatch[1].trim();
            
            const dateMatch = textContent.match(/(?:Date|Dato|Sendt):\s*(.+)/i);
            if (dateMatch) {
                const dateStr = dateMatch[1].trim();
                const parsed = new Date(dateStr);
                if (!isNaN(parsed.getTime())) receivedAt = parsed;
            }
            
            if (subject) title = subject;
        } catch (e) {
            console.warn("HTML Cheerio parsing failed:", e);
        }

        // Convert to PDF for preview (keep existing logic)
        let browser = null;
        try {
            console.log("Converting HTML to PDF...");
            // Upload original HTML first
            const htmlFileName = `${projectId}/${Date.now()}-original-${Math.random().toString(36).substring(2, 9)}.html`;
            const bucketName = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "project-assets"; 
            
            const { error: htmlUploadError } = await supabase.storage
                .from(bucketName)
                .upload(htmlFileName, originalBuffer, {
                    contentType: "text/html",
                    upsert: false
                });

            if (!htmlUploadError) {
                const { data: { publicUrl: htmlUrl } } = supabase.storage
                    .from(bucketName)
                    .getPublicUrl(htmlFileName);
                metadata.originalUrl = htmlUrl;
            }

            // Puppeteer Conversion
            browser = await puppeteer.launch({
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
                headless: true
            });
            const page = await browser.newPage();
            const htmlContent = originalBuffer.toString('utf-8');
            await page.setContent(htmlContent, { waitUntil: 'domcontentloaded', timeout: 30000 });
            
            const pdfUint8Array = await page.pdf({ 
                format: 'A4', 
                printBackground: true,
                margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' }
            });
            
            // Replace buffer with PDF for main file record
            // We use the PDF as the "File" record's main content for easy viewing
            // But we keep the original HTML in metadata.originalUrl
            const pdfBuffer = Buffer.from(pdfUint8Array);
            
            // Update variables for the main file record
            fileType = "application/pdf";
            fileSize = pdfBuffer.length;
            metadata.convertedFrom = "html";
            
            // Use pdfBuffer for upload
            // We need to re-assign 'buffer' variable if we were using one, but here we use originalBuffer vs pdfBuffer
            // Let's use a 'uploadBuffer' variable
            uploadBuffer = pdfBuffer;

        } catch (e) {
            console.error("HTML to PDF conversion failed:", e);
            // Fallback: Use original buffer
            uploadBuffer = originalBuffer;
        } finally {
            if (browser) await browser.close();
        }
    }

    // Determine Final Dates
    // Priority: receivedAt -> createdAtMetadata -> modifiedAtMetadata -> lastModified (upload param) -> now
    if (!originalDate) {
        if (receivedAt) originalDate = receivedAt;
        else if (createdAtMetadata) originalDate = createdAtMetadata;
        else if (modifiedAtMetadata) originalDate = modifiedAtMetadata;
        else if (lastModifiedStr) {
             const ts = parseInt(lastModifiedStr);
             if (!isNaN(ts)) originalDate = new Date(ts);
        }
    }
    if (!originalDate) originalDate = new Date();

    // --- UPLOAD TO STORAGE ---
    const fileExt = fileType === "application/pdf" ? "pdf" : (file.name.split('.').pop()?.toLowerCase() || "bin");
    const fileName = `${projectId}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const bucketName = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "project-assets"; 

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, uploadBuffer, {
        contentType: fileType,
        upsert: false
      });

    if (uploadError) {
        console.error("Upload failed:", uploadError);
        return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    // --- DB RECORDS ---
    
    // 1. Create File (EvidenceFile)
    const fileRecord = await (prisma as any).file.create({
      data: {
        projectId,
        storagePath: publicUrl,
        fileType: fileType,
        fileSize: fileSize,
        originalName: file.name,
        checksum: fileHash, // Using checksum as hash
        metadata: metadata,
        
        // New Fields
        createdAtMetadata,
        modifiedAtMetadata,
        receivedAt,
        sender,
        receiver,
        subject,
        extractedText: extractedText ? extractedText.substring(0, 100000) : null, // Limit text size if needed
        notes,
      }
    });

    // 2. Create Evidence Item
    const evidenceNumber = await getNextEvidenceNumber(projectId);

    const evidenceItem = await (prisma as any).evidenceItem.create({
      data: {
        projectId,
        evidenceNumber,
        title: title || file.name,
        description: "",
        fileId: fileRecord.id,
        includeInReport: true,
        originalDate: originalDate,
        legalDate: originalDate, // Auto-set legal date to best guess
      }
    });

    return NextResponse.json({ 
      success: true, 
      evidenceId: evidenceItem.id,
      evidenceNumber: evidenceItem.evidenceNumber,
      url: publicUrl 
    });

  } catch (error: any) {
    console.error("Evidence upload error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
