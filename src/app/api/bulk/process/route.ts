import { NextResponse } from "next/server";

// Deprecated: Use /api/bulk/process-chunk instead.
// This endpoint used maxDuration=300 which only works on Vercel Pro.
// The new approach uses client-side orchestration with per-item chunk requests.
export async function POST() {
  return NextResponse.json(
    { error: "This endpoint is deprecated. Use /api/bulk/process-chunk instead." },
    { status: 410 }
  );
}
