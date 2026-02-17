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

        const { itemCount } = await request.json();
        if (!itemCount || typeof itemCount !== "number" || itemCount <= 0) {
            return NextResponse.json({ error: "Invalid item count" }, { status: 400 });
        }

        if (itemCount > 5) {
            return NextResponse.json({ error: "Maximum 5 images per upload" }, { status: 400 });
        }

        // Check credits
        const profile = await getOrCreateProfile(supabase, user.id);
        if (profile.credits_remaining < itemCount) {
            return NextResponse.json({
                error: `Insufficient credits. You have ${profile.credits_remaining} credits but need ${itemCount}.`,
            }, { status: 403 });
        }

        // Create bulk job
        const { data: job, error: jobError } = await supabase
            .from("bulk_jobs")
            .insert({
                user_id: user.id,
                status: "processing",
                total_items: itemCount,
                processed_items: 0,
                failed_items: 0,
            })
            .select()
            .single();

        if (jobError || !job) {
            return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
        }

        return NextResponse.json({ jobId: job.id });
    } catch (err) {
        console.error("POST /api/bulk/upload-images error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
