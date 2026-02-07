import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { decrementCredits } from "@/lib/credits";
import { checkRequiredEnvVars } from "@/lib/env-check";
import Groq from "groq-sdk";

export const maxDuration = 10;

type BulkItem = {
  productName: string;
  category?: string;
  features?: string;
  audience?: string;
  tone?: string;
};

export async function POST(request: Request) {
  const envCheck = checkRequiredEnvVars();
  if (!envCheck.valid) {
    return NextResponse.json(
      { error: `Missing required env vars: ${envCheck.missing.join(", ")}` },
      { status: 500 }
    );
  }

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

  const { jobId, item, index } = await request.json() as {
    jobId: string;
    item: BulkItem;
    index: number;
  };

  // Verify job belongs to user
  const { data: job } = await supabase
    .from("bulk_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  try {
    const prompt = `Generate 3 product descriptions for the following product. Return ONLY valid JSON with no extra text.

Product: ${item.productName}
Category: ${item.category || "General"}
Key Features: ${item.features || "N/A"}
Target Audience: ${item.audience || "General consumers"}
Tone: ${item.tone || "Professional"}

Return this exact JSON format:
{
  "seo": "SEO-optimized description (150-200 words, keyword-rich, informative)",
  "emotional": "Emotionally compelling description (100-150 words, storytelling, persuasive)",
  "short": "Short-form description (30-50 words, punchy, perfect for ads or social media)"
}`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 1024,
    });

    const content = completion.choices[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      await supabase.from("descriptions").insert({
        user_id: user.id,
        product_name: item.productName,
        category: item.category || null,
        features: item.features || null,
        audience: item.audience || null,
        tone: item.tone || "professional",
        seo_description: parsed.seo,
        emotional_description: parsed.emotional,
        short_description: parsed.short,
      });

      await decrementCredits(supabase, user.id, 1);

      // Update job progress
      await supabase
        .from("bulk_jobs")
        .update({
          processed_items: index + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      return NextResponse.json({
        success: true,
        index,
        result: parsed,
      });
    } else {
      await supabase
        .from("bulk_jobs")
        .update({
          processed_items: index + 1,
          failed_items: (job.failed_items || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      return NextResponse.json({
        success: false,
        index,
        error: "Failed to parse AI response",
      });
    }
  } catch (error) {
    await supabase
      .from("bulk_jobs")
      .update({
        processed_items: index + 1,
        failed_items: (job.failed_items || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    return NextResponse.json({
      success: false,
      index,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
