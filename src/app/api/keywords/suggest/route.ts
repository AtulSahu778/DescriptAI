import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  try {
    // Use Google Autocomplete public endpoint
    const res = await fetch(
      `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`,
      { next: { revalidate: 3600 } }
    );

    if (!res.ok) {
      return NextResponse.json([]);
    }

    const data = await res.json();
    // Google autocomplete returns [query, [suggestions]]
    const suggestions: string[] = (data[1] || []).slice(0, 8);
    return NextResponse.json(suggestions);
  } catch {
    return NextResponse.json([]);
  }
}
