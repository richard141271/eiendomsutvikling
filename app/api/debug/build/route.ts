import { NextResponse } from "next/server";

export async function GET() {
  const commit = (process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_APP_COMMIT || "unknown").slice(0, 7);
  return NextResponse.json({
    commit,
    nodeEnv: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
}

