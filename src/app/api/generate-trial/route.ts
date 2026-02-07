import { NextResponse } from "next/server";
import Groq from "groq-sdk";

// Allow up to 60s on Pro plan; streaming keeps free tier alive past 10s
export const maxDuration = 60;

export async function POST(request: Request) {
  const { productName, category, features, audience, tone } = await request.json();

  if (!productName) {
    return NextResponse.json({ error: "Product name is required" }, { status: 400 });
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const prompt = `Generate 3 product descriptions for the following product. Return ONLY valid JSON with no extra text.

Product: ${productName}
Category: ${category || "General"}
Key Features: ${features || "N/A"}
Target Audience: ${audience || "General consumers"}
Tone: ${tone || "Professional"}

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
            controller.enqueue(encoder.encode(delta));
          }

          const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            controller.enqueue(encoder.encode("\n__ERROR__:Failed to parse AI response"));
            controller.close();
            return;
          }

          const parsed = JSON.parse(jsonMatch[0]);

          const result = JSON.stringify({
            seo: parsed.seo,
            emotional: parsed.emotional,
            short: parsed.short,
          });
          controller.enqueue(encoder.encode(`\n__RESULT__:${result}`));
          controller.close();
        } catch (err) {
          console.error("Trial stream error:", err);
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
    console.error("Trial generation error:", err);
    return NextResponse.json({ error: "Failed to generate descriptions" }, { status: 500 });
  }
}
