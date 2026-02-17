import { NextResponse } from "next/server";
import { ReportBuilder } from "@/lib/reporting/report";
import { PdfReportRenderer } from "@/lib/reporting/pdf-renderer";
import { DocumentMetadata } from "@/lib/reporting/report-types";

export const runtime = "nodejs";

export async function GET() {
  try {
    const now = new Date();

    const metadata: DocumentMetadata = {
      documentType: "LEGAL_CASE",
      caseNumber: "DEMO-001",
      createdAt: now,
      updatedAt: now,
      responsible: "Demo Bruker",
      parties: [
        { role: "OWNER", name: "Utleier AS" },
        { role: "TENANT", name: "Leietaker Hansen" },
      ],
      status: "PÅGÅR",
      referenceId: "DEMO-REF-001",
    };

    const builder = new ReportBuilder(metadata);

    builder.addSection({
      id: "summary",
      title: "Sammendrag",
      blocks: [
        {
          kind: "PARAGRAPH",
          text: "Dette er en demo av den nye rapportmotoren. Dokumentet er generert uten HTML.",
        },
      ],
    });

    builder.addSection({
      id: "timeline",
      title: "Tidslinje",
      blocks: [
        {
          kind: "LIST",
          items: [
            "01.01.2026: Skade oppdaget i stue",
            "05.01.2026: Første befaring gjennomført",
            "10.01.2026: Kostnadsoverslag mottatt",
          ],
        },
      ],
    });

    builder.addEvidence({
      id: "ev-1",
      evidenceCode: "B-001",
      title: "Stue sørvegg",
      description: "Synlige fuktskader langs gulvlist.",
      category: "Bilde",
      date: now,
      source: "Befaringsbilder",
    });

    builder.addEconomyLine({
      id: "eco-1",
      description: "Uttørking og sanering",
      amount: 25000,
      party: "Halden Kommune",
    });

    const document = builder.build();

    const renderer = new PdfReportRenderer();
    const pdfBytes = await renderer.render(document);

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="demo-rapport.pdf"',
      },
    });
  } catch (error) {
    console.error("Demo report error", error);
    return NextResponse.json(
      { error: "Kunne ikke generere demo-rapport" },
      { status: 500 }
    );
  }
}

