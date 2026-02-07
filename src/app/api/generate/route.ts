import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { getOrCreateProfile, decrementCredits, logUsage } from "@/lib/credits";
import { buildBrandVoicePrompt, type BrandVoice } from "@/lib/brand-voice";

// Vercel free tier limit is 10s; streaming keeps connection alive
export const maxDuration = 10;

export async function POST(request: Request) {
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
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check credits
  const profile = await getOrCreateProfile(supabase, user.id);
  if (profile.credits_remaining <= 0) {
    return NextResponse.json(
      { error: "No credits remaining. Please upgrade your plan." },
      { status: 403 }
    );
  }

  const { productName, category, features, audience, tone, voiceId } = await request.json();

  if (!productName) {
    return NextResponse.json({ error: "Product name is required" }, { status: 400 });
  }

  // Fetch brand voice if specified
  let brandVoicePrompt = "";
  if (voiceId) {
    const { data: voice } = await supabase
      .from("brand_voices")
      .select("*")
      .eq("id", voiceId)
      .eq("user_id", user.id)
      .single();

    if (voice) {
      brandVoicePrompt = buildBrandVoicePrompt(voice as BrandVoice);
    }
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const prompt = `Generate 3 product descriptions for the following product. Return ONLY valid JSON with no extra text.

Product: ${productName}
Category: ${category || "General"}
Key Features: ${features || "N/A"}
Target Audience: ${audience || "General consumers"}
Tone: ${tone || "Professional"}
${brandVoicePrompt}

Return this exact JSON format:
{
  "seo": "SEO-optimized description (150-200 words, keyword-rich, informative)",
  "emotional": "Emotionally compelling description (100-150 words, storytelling, persuasive)",
  "short": "Short-form description (30-50 words, punchy, perfect for ads or social media)"
}`;

  try {
    // Use streaming to keep the Vercel connection alive past the 10s timeout
    const stream = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 1024,
      stream: true,
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          let fullContent = "";

          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content || "";
            fullContent += delta;
            // Stream each token to keep connection alive
            controller.enqueue(encoder.encode(delta));
          }

          // Parse the collected JSON
          const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            // Send error marker at the end
            controller.enqueue(encoder.encode("\n__ERROR__:Failed to parse AI response"));
            controller.close();
            return;
          }

          const parsed = JSON.parse(jsonMatch[0]);

          // Save to DB
          const { error: dbError } = await supabase.from("descriptions").insert({
            user_id: user.id,
            product_name: productName,
            category: category || null,
            features: features || null,
            audience: audience || null,
            tone: tone || "professional",
            seo_description: parsed.seo,
            emotional_description: parsed.emotional,
            short_description: parsed.short,
          });

          if (dbError) {
            console.error("DB error:", dbError);
          }

          // Decrement credits and log usage
          const newBalance = await decrementCredits(supabase, user.id, 1);
          await logUsage(supabase, user.id, "single_generation", 1, {
            product_name: productName,
            category,
            tone,
            voice_id: voiceId || null,
          });

          // Send final JSON result as a special marker the client can parse
          const result = JSON.stringify({
            seo: parsed.seo,
            emotional: parsed.emotional,
            short: parsed.short,
            credits_remaining: newBalance,
          });
          controller.enqueue(encoder.encode(`\n__RESULT__:${result}`));
          controller.close();
        } catch (err) {
          console.error("Stream processing error:", err);
          controller.enqueue(encoder.encode("\n__ERROR__:Failed to generate descriptions"));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err: unknown) {
    console.error("Generation error:", err);
    return NextResponse.json({ error: "Failed to generate descriptions" }, { status: 500 });
  }
}
