import { NextResponse } from "next/server";

export async function POST(request: Request) {
  return NextResponse.json(
    { error: "Fiken-integrasjon er midlertidig deaktivert" },
    { status: 503 }
  );
}
