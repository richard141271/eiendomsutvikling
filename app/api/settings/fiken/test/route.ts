import { NextResponse } from "next/server";
import { FikenClient } from "@/lib/fiken";

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const client = new FikenClient(token);
    const companies = await client.getCompanies();

    if (companies.length === 0) {
      return NextResponse.json({ error: "No companies found for this token" }, { status: 404 });
    }

    return NextResponse.json({ companies });
  } catch (error: any) {
    console.error("Fiken test error:", error);
    return NextResponse.json({ error: error.message || "Failed to connect to Fiken" }, { status: 500 });
  }
}
