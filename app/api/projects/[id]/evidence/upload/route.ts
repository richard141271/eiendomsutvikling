
import { createClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getNextEvidenceNumber } from "@/app/actions/evidence";
import crypto from "crypto";
import { createAdminClient, ensureBucketExists } from "@/lib/supabase-admin";
import OpenAI, { toFile } from "openai";
import { File as NodeFile } from "node:buffer";

export const runtime = "nodejs";
export const maxDuration = 300;
if (typeof (globalThis as any).File === "undefined") {
  (globalThis as any).File = NodeFile;
}

async function downloadFromStorage(bucketName: string, storagePath: string, supabase: any): Promise<Blob> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.storage.from(bucketName).download(storagePath);
    if (error || !data) throw new Error(error?.message || "Download failed");
    return data as unknown as Blob;
  } catch {
    const { data, error } = await supabase.storage.from(bucketName).download(storagePath);
    if (error || !data) throw new Error(error?.message || "Download failed");
    return data as unknown as Blob;
  }
}

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

    const dbUser = await prisma.user.findUnique({ where: { authId: user.id } });
    if (!dbUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { property: { select: { ownerId: true } } },
    });

    if (!project) {
      return NextResponse.json({ error: "Prosjekt ikke funnet" }, { status: 404 });
    }

    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await request.json();
      const action = body?.action;
      const bucketName =
        process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ||
        process.env.NEXT_PUBLIC_SUPABASE_BUCKET ||
        "project-assets";

      if (action === "transcribe") {
        const evidenceId = typeof body?.evidenceId === "string" ? body.evidenceId : "";
        if (!evidenceId) {
          return NextResponse.json({ error: "Missing evidenceId" }, { status: 400 });
        }

        const evidence = await (prisma as any).evidenceItem.findFirst({
          where: { id: evidenceId, projectId, deletedAt: null },
          include: { file: true },
        });

        if (!evidence?.file?.storagePath || !evidence?.file?.fileType) {
          return NextResponse.json({ error: "Bevis eller fil ikke funnet" }, { status: 404 });
        }

        const fileType = String(evidence.file.fileType || "");
        if (!fileType.startsWith("audio/") && !fileType.startsWith("video/")) {
          return NextResponse.json({ error: "Beviset er ikke lyd eller video" }, { status: 400 });
        }

        if (!process.env.OPENAI_API_KEY) {
          return NextResponse.json({ error: "Transkripsjon er ikke konfigurert" }, { status: 500 });
        }

        const storagePath = String(evidence.file.storagePath);
        const originalName = String(evidence.file.originalName || evidence.title || "opptak");
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        let transcriptionText = "";
        try {
          const blob = await downloadFromStorage(bucketName, storagePath, supabase);
            const uploadFile = await toFile(blob as any, originalName, { type: fileType });
          const transcription = await openai.audio.transcriptions.create({
            file: uploadFile,
            model: "whisper-1",
            language: "no",
          });
          transcriptionText = transcription.text;
        } catch (aiError: any) {
          const msg = aiError?.message ? String(aiError.message) : "Ukjent feil";
          return NextResponse.json({ error: `Transkripsjon feilet: ${msg}` }, { status: 500 });
        }

        const existingMetadata =
          evidence?.file?.metadata && typeof evidence.file.metadata === "object" ? evidence.file.metadata : {};

        await (prisma as any).file.update({
          where: { id: evidence.fileId },
          data: {
            extractedText: transcriptionText.substring(0, 100000),
            metadata: {
              ...existingMetadata,
              transcription: {
                model: "whisper-1",
                language: "no",
                updatedAt: new Date().toISOString(),
              },
            },
          },
        });

        return NextResponse.json({
          success: true,
          evidenceId: evidence.id,
          transcriptionEditorUrl: `/projects/${projectId}/evidence/transcription/${evidence.id}`,
        });
      }

      if (action === "signed-upload-url") {
        const originalName = String(body?.filename || body?.originalName || "upload.bin");
        const providedType = typeof body?.fileType === "string" ? body.fileType : "";

        const safeName = originalName
          .split("/")
          .pop()
          ?.replace(/[^\w.\-() ]/g, "_")
          ?.replace(/\s+/g, " ")
          ?.trim()
          .slice(-120) || "upload.bin";

        const extFromName = safeName.includes(".") ? safeName.split(".").pop()?.toLowerCase() : undefined;
        const extFromType = (() => {
          if (providedType === "application/pdf") return "pdf";
          if (providedType === "image/jpeg") return "jpg";
          if (providedType === "image/png") return "png";
          if (providedType === "image/webp") return "webp";
          if (providedType === "image/gif") return "gif";
          if (providedType === "video/mp4") return "mp4";
          if (providedType === "audio/mpeg") return "mp3";
          return undefined;
        })();

        const fileExt = extFromName || extFromType || "bin";
        const baseName = safeName.includes(".") ? safeName.slice(0, -(fileExt.length + 1)) : safeName;
        const finalName = `${baseName || "upload"}.${fileExt}`;

        const storagePath = `${projectId}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${finalName}`;

        try {
          await ensureBucketExists(bucketName, { public: true, allowedMimeTypes: null });
        } catch {}

        const tryCreateSignedUploadUrl = async () => {
          try {
            const admin = createAdminClient();
            const { data, error } = await admin.storage.from(bucketName).createSignedUploadUrl(storagePath);
            if (error || !data?.token || !data?.signedUrl) {
              throw new Error(error?.message || "Kunne ikke lage signert opplastingslenke");
            }
            return { token: data.token, signedUrl: data.signedUrl };
          } catch {
            const { data, error } = await supabase.storage.from(bucketName).createSignedUploadUrl(storagePath);
            if (error || !data?.token || !data?.signedUrl) {
              throw new Error(error?.message || "Kunne ikke lage signert opplastingslenke");
            }
            return { token: data.token, signedUrl: data.signedUrl };
          }
        };

        let signed: { token: string; signedUrl: string };
        try {
          signed = await tryCreateSignedUploadUrl();
        } catch (e) {
          const msg = e instanceof Error ? e.message : "";
          if (msg.toLowerCase().includes("bucket not found")) {
            try {
              await ensureBucketExists(bucketName, { public: true, allowedMimeTypes: null });
            } catch {}
            signed = await tryCreateSignedUploadUrl();
          } else {
            return NextResponse.json({ error: msg || "Kunne ikke lage signert opplastingslenke" }, { status: 500 });
          }
        }

        return NextResponse.json({
          success: true,
          action: "signed-upload-url",
          bucket: bucketName,
          path: storagePath,
          token: signed.token,
          signedUrl: signed.signedUrl,
        });
      }

      if (action === "finalize") {
        const storagePath = typeof body?.storagePath === "string" ? body.storagePath : "";
        const originalName = typeof body?.originalName === "string" ? body.originalName : "Uploaded File";
        const fileType = typeof body?.fileType === "string" && body.fileType ? body.fileType : "application/octet-stream";
        const fileSize = typeof body?.fileSize === "number" ? body.fileSize : null;
        const checksum = typeof body?.checksum === "string" ? body.checksum : null;
        const title = typeof body?.title === "string" && body.title ? body.title : originalName;
        const lastModifiedMs = typeof body?.lastModified === "number" ? body.lastModified : null;
        const createTranscription = body?.createTranscription === true;

        if (!storagePath) {
          return NextResponse.json({ error: "Missing storagePath" }, { status: 400 });
        }

        const originalDate = lastModifiedMs ? new Date(lastModifiedMs) : new Date();

        let fileRecord = checksum
          ? await (prisma as any).file.findUnique({
              where: {
                projectId_checksum: {
                  projectId,
                  checksum,
                },
              },
            })
          : await (prisma as any).file.findFirst({
              where: {
                projectId,
                storagePath,
              },
            });

        if (!fileRecord) {
          fileRecord = await (prisma as any).file.create({
            data: {
              projectId,
              storagePath,
              fileType,
              fileSize: fileSize ?? undefined,
              originalName,
              checksum: checksum ?? undefined,
              metadata: {
                originalName,
                hash: checksum ?? undefined,
              },
              receivedAt: null,
              sender: null,
              receiver: null,
              subject: null,
              extractedText: null,
              notes: null,
              createdAtMetadata: null,
              modifiedAtMetadata: null,
            },
          });
        }

        let transcriptionEditorUrl: string | null = null;
        if (createTranscription && (fileType.startsWith("audio/") || fileType.startsWith("video/"))) {
          let transcriptionText = "";
          if (process.env.OPENAI_API_KEY) {
            try {
              const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
              const blob = await downloadFromStorage(bucketName, storagePath, supabase);
              const uploadFile = await toFile(blob as any, originalName || "upload", { type: fileType });
              const transcription = await openai.audio.transcriptions.create({
                file: uploadFile,
                model: "whisper-1",
                language: "no",
              });
              transcriptionText = transcription.text;
            } catch (aiError: any) {
              transcriptionText = `(Transkripsjon feilet: ${aiError?.message || "Ukjent feil"})`;
            }
          } else {
            transcriptionText = "(Transkripsjon ikke tilgjengelig - mangler API-nøkkel)";
          }

          const existingMetadata = (fileRecord as any)?.metadata && typeof (fileRecord as any).metadata === "object" ? (fileRecord as any).metadata : {};
          await (prisma as any).file.update({
            where: { id: fileRecord.id },
            data: {
              extractedText: transcriptionText.substring(0, 100000),
              metadata: {
                ...existingMetadata,
                transcription: {
                  model: "whisper-1",
                  language: "no",
                  updatedAt: new Date().toISOString(),
                },
              },
            },
          });
          transcriptionEditorUrl = `/projects/${projectId}/evidence/transcription/__EVIDENCE_ID__`;
        }

        let urlForClient: string | undefined;
        try {
          const admin = createAdminClient();
          const { data } = await admin.storage.from(bucketName).createSignedUrl(storagePath, 3600);
          urlForClient = data?.signedUrl;
        } catch {
          const { data } = await supabase.storage.from(bucketName).createSignedUrl(storagePath, 3600);
          urlForClient = data?.signedUrl;
        }

        if (!urlForClient) {
          const { data: publicData } = supabase.storage.from(bucketName).getPublicUrl(storagePath);
          urlForClient = publicData.publicUrl;
        }

        let linkedEvidenceId: string | null = null;
        let missingLink = false;
        let missingLinkNote: string | null = null;

        const searchStr = `${title} ${originalName}`.toLowerCase();
        const refMatch = searchStr.match(/#(\d+)|bevis\s+(\d+)|evidence\s+(\d+)/i);

        if (refMatch) {
          const refNum = parseInt(refMatch[1] || refMatch[2] || refMatch[3]);
          if (!isNaN(refNum)) {
            const existingEvidence = await (prisma as any).evidenceItem.findUnique({
              where: {
                projectId_evidenceNumber: {
                  projectId,
                  evidenceNumber: refNum,
                },
              },
              select: { id: true },
            });

            if (existingEvidence) {
              linkedEvidenceId = existingEvidence.id;
            } else {
              missingLink = true;
              missingLinkNote = `Automatisk oppdaget referanse til #${refNum} i filnavn/innhold, men beviset ble ikke funnet.`;
            }
          }
        }

        const evidenceNumber = await getNextEvidenceNumber(projectId);
        const evidenceItem = await (prisma as any).evidenceItem.create({
          data: {
            projectId,
            evidenceNumber,
            title,
            description: "",
            fileId: fileRecord.id,
            includeInReport: true,
            originalDate,
            legalDate: originalDate,
            linkedEvidenceId,
            missingLink,
            missingLinkNote,
          },
        });

        if (transcriptionEditorUrl) {
          transcriptionEditorUrl = transcriptionEditorUrl.replace("__EVIDENCE_ID__", evidenceItem.id);
        }

        return NextResponse.json({
          success: true,
          evidenceId: evidenceItem.id,
          evidenceNumber: evidenceItem.evidenceNumber,
          url: urlForClient,
          originalName,
          fileType,
          title,
          transcriptionEditorUrl,
        });
      }

      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const lastModifiedStr = formData.get("lastModified") as string;
    const createTranscription = String(formData.get("createTranscription") || "") === "1";
    
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

    if (createTranscription && (fileType.startsWith("audio/") || fileType.startsWith("video/"))) {
      if (process.env.OPENAI_API_KEY) {
        try {
          const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
          const uploadFile = await toFile(file as any, file.name || "upload", { type: fileType || file.type });
          const transcription = await openai.audio.transcriptions.create({
            file: uploadFile,
            model: "whisper-1",
            language: "no",
          });
          extractedText = transcription.text;
          metadata.transcription = {
            model: "whisper-1",
            language: "no",
            updatedAt: new Date().toISOString(),
          };
        } catch (aiError: any) {
          extractedText = `(Transkripsjon feilet: ${aiError?.message || "Ukjent feil"})`;
          metadata.transcription = {
            model: "whisper-1",
            language: "no",
            updatedAt: new Date().toISOString(),
          };
        }
      } else {
        extractedText = "(Transkripsjon ikke tilgjengelig - mangler API-nøkkel)";
        metadata.transcription = {
          model: "whisper-1",
          language: "no",
          updatedAt: new Date().toISOString(),
        };
      }
    }

    // --- PIPELINE: METADATA EXTRACTION ---

    // 1. Image Metadata (EXIF)
    if (fileType.startsWith('image/')) {
      try {
        const exifr = require('exifr');
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
        const PDFParse = require("pdf-parse");
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
            const { simpleParser } = require("mailparser");
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
                receiver = toArray.map((addr: any) => addr.text).join(', ');
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
            const cheerio = require("cheerio");
            const htmlString = originalBuffer.toString('utf-8');
            const $ = cheerio.load(htmlString);
            extractedText = $('body').text().trim();
            
            // Try to find metadata in meta tags or common patterns
            const titleTag = $('title').text();
            if (titleTag) title = titleTag;

            // Regex for common email-in-html patterns (Outlook saves etc)
            const textContent = extractedText || "";
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

        // Convert to PDF for preview
        let browser = null;
        try {
            console.log("Converting HTML to PDF...");
            // Upload original HTML first
            const htmlFileName = `${projectId}/${Date.now()}-original-${Math.random().toString(36).substring(2, 9)}.html`;
            const bucketName =
              process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ||
              process.env.NEXT_PUBLIC_SUPABASE_BUCKET ||
              "project-assets"; 
            
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

            // Dynamic import for Puppeteer to avoid production crashes
            const chromium = require('@sparticuz/chromium');
            const puppeteer = require('puppeteer-core');

            browser = await puppeteer.launch({
                args: chromium.args,
                defaultViewport: chromium.defaultViewport,
                executablePath: await chromium.executablePath(),
                headless: chromium.headless,
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
            const pdfBuffer = Buffer.from(pdfUint8Array);
            
            // Update variables for the main file record
            fileType = "application/pdf";
            fileSize = pdfBuffer.length;
            metadata.convertedFrom = "html";
            
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
    const bucketName =
      process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ||
      process.env.NEXT_PUBLIC_SUPABASE_BUCKET ||
      "project-assets"; 

    let uploadError: any | null = null;
    const tryUpload = async () => {
      try {
        const admin = createAdminClient();
        const { error } = await admin.storage.from(bucketName).upload(fileName, uploadBuffer, {
          contentType: fileType,
          upsert: false,
        });
        return error || null;
      } catch {
        const { error } = await supabase.storage.from(bucketName).upload(fileName, uploadBuffer, {
          contentType: fileType,
          upsert: false,
        });
        return error || null;
      }
    };

    uploadError = await tryUpload();
    if (uploadError?.message && String(uploadError.message).toLowerCase().includes("bucket not found")) {
      try {
        await ensureBucketExists(bucketName, { public: true, allowedMimeTypes: null });
      } catch {}
      uploadError = await tryUpload();
    }

    if (uploadError) {
        console.error("Upload failed:", uploadError);
        return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
    }

    let urlForClient: string | undefined;
    try {
      const admin = createAdminClient();
      const { data } = await admin.storage.from(bucketName).createSignedUrl(fileName, 3600);
      urlForClient = data?.signedUrl;
    } catch {
      const { data } = await supabase.storage.from(bucketName).createSignedUrl(fileName, 3600);
      urlForClient = data?.signedUrl;
    }

    if (!urlForClient) {
      const { data: publicData } = supabase.storage.from(bucketName).getPublicUrl(fileName);
      urlForClient = publicData.publicUrl;
    }

    // --- DB RECORDS ---
    
    // 1. Create or Find File (EvidenceFile)
    // Check if file already exists (deduplication)
    let fileRecord = await (prisma as any).file.findUnique({
      where: {
        projectId_checksum: {
          projectId,
          checksum: fileHash
        }
      }
    });

    if (!fileRecord) {
      fileRecord = await (prisma as any).file.create({
        data: {
          projectId,
          storagePath: fileName,
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
    }

    // 2. Smart Linking Logic
    let linkedEvidenceId: string | null = null;
    let missingLink = false;
    let missingLinkNote: string | null = null;

    const searchStr = `${title} ${subject || ""} ${file.name}`.toLowerCase();
    const refMatch = searchStr.match(/#(\d+)|bevis\s+(\d+)|evidence\s+(\d+)/i);
    
    if (refMatch) {
      const refNum = parseInt(refMatch[1] || refMatch[2] || refMatch[3]);
      if (!isNaN(refNum)) {
        // Try to find the referenced evidence
        const existingEvidence = await (prisma as any).evidenceItem.findUnique({
          where: {
            projectId_evidenceNumber: {
              projectId,
              evidenceNumber: refNum
            }
          },
          select: { id: true }
        });

        if (existingEvidence) {
          linkedEvidenceId = existingEvidence.id;
        } else {
          // Reference found but evidence not found -> Missing Link!
          missingLink = true;
          missingLinkNote = `Automatisk oppdaget referanse til #${refNum} i filnavn/innhold, men beviset ble ikke funnet.`;
        }
      }
    }

    // 3. Create Evidence Item
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
        
        // Smart Linking
        linkedEvidenceId,
        missingLink,
        missingLinkNote,
      }
    });

    return NextResponse.json({ 
      success: true, 
      evidenceId: evidenceItem.id,
      evidenceNumber: evidenceItem.evidenceNumber,
      url: urlForClient,
      originalName: file.name,
      fileType: fileType,
      title: title || file.name,
      transcriptionEditorUrl: createTranscription && (fileType.startsWith("audio/") || fileType.startsWith("video/"))
        ? `/projects/${projectId}/evidence/transcription/${evidenceItem.id}`
        : null
    });

  } catch (error: any) {
    console.error("Evidence upload error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
