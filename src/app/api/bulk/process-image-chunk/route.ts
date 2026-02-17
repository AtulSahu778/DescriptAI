import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { decrementCredits } from "@/lib/credits";
import { checkRequiredEnvVars } from "@/lib/env-check";
import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

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

    const formData = await request.formData();
    const file = formData.get("image") as File | null;
    const jobId = formData.get("jobId") as string | null;
    const indexStr = formData.get("index") as string | null;

    if (!file || !jobId || indexStr === null) {
        return NextResponse.json({ error: "Missing image, jobId, or index" }, { status: 400 });
    }

    const index = parseInt(indexStr, 10);

    // Validate file
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
    if (!allowedTypes.includes(file.type)) {
        return NextResponse.json({ error: "Unsupported image format" }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: "Image must be under 10MB" }, { status: 400 });
    }

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

    try {
        // Step 1: Analyze image with Gemini
        const buffer = await file.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");

        const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

        const geminiResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
                {
                    inlineData: {
                        mimeType: file.type,
                        data: base64,
                    },
                },
                {
                    text: `Analyze this product image and extract the following details. Return ONLY valid JSON with no extra text.

{
  "productName": "The product name or a descriptive name if brand is not visible",
  "category": "Product category (e.g. Electronics, Fashion, Home & Garden, Beauty, Sports)",
  "features": "Comma-separated list of key visible features, materials, colors, and notable attributes",
  "audience": "Likely target audience based on the product"
}

Be specific and detailed. If you cannot determine something, provide your best guess based on what you see.`,
                },
            ],
        });

        const geminiText = geminiResponse.text ?? "";
        const geminiJsonMatch = geminiText.match(/\{[\s\S]*\}/);

        if (!geminiJsonMatch) {
            await updateJobProgress(supabase, jobId, index, job.failed_items);
            return NextResponse.json({ success: false, index, error: "Failed to analyze image" });
        }

        const extracted = JSON.parse(geminiJsonMatch[0]);
        const productName = extracted.productName || "Unknown Product";
        const category = extracted.category || "General";
        const features = extracted.features || "N/A";
        const audience = extracted.audience || "General consumers";

        // Step 2: Generate descriptions with Groq
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

        const prompt = `Generate 3 product descriptions for the following product. Return ONLY valid JSON with no extra text.

Product: ${productName}
Category: ${category}
Key Features: ${features}
Target Audience: ${audience}
Tone: Professional

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

        const groqContent = completion.choices[0]?.message?.content || "";
        const groqJsonMatch = groqContent.match(/\{[\s\S]*\}/);

        if (groqJsonMatch) {
            const descriptions = JSON.parse(groqJsonMatch[0]);

            await supabase.from("descriptions").insert({
                user_id: user.id,
                product_name: productName,
                category: category || null,
                features: features || null,
                audience: audience || null,
                tone: "professional",
                seo_description: descriptions.seo,
                emotional_description: descriptions.emotional,
                short_description: descriptions.short,
            });

            await decrementCredits(supabase, user.id, 1);

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
                extracted: { productName, category, features, audience },
                result: descriptions,
            });
        } else {
            await updateJobProgress(supabase, jobId, index, job.failed_items);
            return NextResponse.json({ success: false, index, error: "Failed to generate descriptions" });
        }
    } catch (error) {
        await updateJobProgress(supabase, jobId, index, job.failed_items);
        return NextResponse.json({
            success: false,
            index,
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
}

async function updateJobProgress(
    supabase: ReturnType<typeof createServerClient>,
    jobId: string,
    index: number,
    currentFailed: number
) {
    await supabase
        .from("bulk_jobs")
        .update({
            processed_items: index + 1,
            failed_items: (currentFailed || 0) + 1,
            updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);
}
