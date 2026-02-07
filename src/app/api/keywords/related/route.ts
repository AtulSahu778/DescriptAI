import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || query.length < 2) {
    return NextResponse.json({ relatedSearches: [], peopleAlsoAsk: [] });
  }

  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    // Fallback: return empty if no Serper API key configured
    return NextResponse.json({ relatedSearches: [], peopleAlsoAsk: [] });
  }

  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, num: 5 }),
    });

    if (!res.ok) {
      return NextResponse.json({ relatedSearches: [], peopleAlsoAsk: [] });
    }

    const data = await res.json();

    const relatedSearches: string[] = (data.relatedSearches || [])
      .map((item: { query: string }) => item.query)
      .slice(0, 6);

    const peopleAlsoAsk: string[] = (data.peopleAlsoAsk || [])
      .map((item: { question: string }) => item.question)
      .slice(0, 4);

    return NextResponse.json({ relatedSearches, peopleAlsoAsk });
  } catch {
    return NextResponse.json({ relatedSearches: [], peopleAlsoAsk: [] });
  }
}
