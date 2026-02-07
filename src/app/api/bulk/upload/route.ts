import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getOrCreateProfile } from "@/lib/credits";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch { }
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { items } = await request.json();
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }

    if (items.length > 100) {
      return NextResponse.json({ error: "Maximum 100 items per upload" }, { status: 400 });
    }

    // Check credits
    const profile = await getOrCreateProfile(supabase, user.id);
    if (profile.credits_remaining < items.length) {
      return NextResponse.json({
        error: `Insufficient credits. You have ${profile.credits_remaining} credits but need ${items.length}.`,
      }, { status: 403 });
    }

    // Create bulk job
    const { data: job, error: jobError } = await supabase
      .from("bulk_jobs")
      .insert({
        user_id: user.id,
        status: "processing",
        total_items: items.length,
        processed_items: 0,
        failed_items: 0,
      })
      .select()
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
    }

    // Client will handle processing via /api/bulk/process-chunk
    return NextResponse.json({ jobId: job.id });
  } catch (err) {
    console.error("POST /api/bulk/upload error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
