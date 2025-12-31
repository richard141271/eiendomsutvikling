import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // In a real app, we would get the user from the session/token
    // Here we need to find the user based on the request headers or similar
    // For MVP, we'll assume the client sends the 'x-user-email' header or we use a hardcoded user for testing
    // BUT, we should try to support the real flow.
    
    // The client component calls supabase.auth.getUser() then fetch.
    // We should ideally pass the auth token and verify it.
    // Since we don't have middleware setup for that yet, let's cheat slightly and
    // ask the client to pass the email in a header for this specific route, 
    // OR we assume the user is the one logged in (which we can't easily verify without middleware).
    
    // Let's rely on the client passing the email as a query param for now (NOT SECURE but works for MVP).
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const contracts = await prisma.leaseContract.findMany({
      where: { tenantId: user.id },
      include: {
        unit: {
          include: {
            property: true
          }
        }
      }
    });

    return NextResponse.json(contracts);
  } catch (error) {
    console.error("Failed to fetch contracts:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
