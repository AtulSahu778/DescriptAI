# DescriptAI

AI-powered product description generator. Feed it a product name, category, and a few keywords — get back three publish-ready descriptions (SEO, emotional, short-form) in seconds.

Built for e-commerce teams, marketers, and solo founders who need high-volume product copy without the agency price tag.

---

## What It Does

- **Single generation** — Enter a product name, pick a tone, and get three description variants (SEO-optimized, emotionally compelling, short-form for ads).
- **Bulk generation** — Upload a CSV with up to 100 products. Each row gets processed individually and saved to your history.
- **Image analysis** — Upload a product photo. The system extracts product name, category, and features automatically using Google Gemini, then pre-fills the generation form.
- **Brand voices** — Define reusable voice profiles with tone adjectives and writing samples. Apply them during generation so every description sounds like your brand.
- **History** — Every generation is stored. Browse, copy, or delete past descriptions from the dashboard.
- **Analytics** — Track daily output volume, top categories, and favorite tones over time.
- **Credits system** — Free tier starts with 50 credits. Each generation (single or bulk item) costs 1 credit.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI Components | Radix UI, Lucide Icons |
| Animation | Framer Motion |
| Auth + Database | Supabase (Auth, Postgres, RLS) |
| AI — Text | Groq (Llama 3.3 70B) |
| AI — Vision | Google Gemini 2.5 Flash |
| Rate Limiting / Cache | Upstash Redis |
| CSV Parsing | PapaParse |
| Charts | Recharts |

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                          # Landing page with trial generation
│   ├── login/page.tsx                    # Login
│   ├── signup/page.tsx                   # Signup
│   ├── layout.tsx                        # Root layout
│   ├── (dashboard)/
│   │   ├── layout.tsx                    # Sidebar layout wrapper
│   │   ├── generate/page.tsx             # Single product generation
│   │   ├── bulk/page.tsx                 # CSV bulk upload + processing
│   │   ├── history/page.tsx              # Past generations list
│   │   ├── voices/page.tsx               # Brand voice management
│   │   └── analytics/page.tsx            # Usage charts and stats
│   └── api/
│       ├── generate/route.ts             # Authenticated generation (streamed)
│       ├── generate-trial/route.ts       # Unauthenticated trial generation (streamed)
│       ├── analyze-image/route.ts        # Product image analysis via Gemini
│       ├── voices/route.ts               # CRUD for brand voices
│       ├── user/credits/route.ts         # Credit balance check
│       ├── keywords/suggest/route.ts     # SEO keyword suggestions
│       ├── keywords/related/route.ts     # Related keyword expansion
│       ├── bulk/upload/route.ts          # Create bulk job + validate credits
│       ├── bulk/process-chunk/route.ts   # Process one bulk item
│       ├── bulk/status/[jobId]/route.ts  # Poll bulk job progress
│       └── bulk/process/route.ts         # Deprecated (returns 410)
├── components/
│   ├── app-layout.tsx                    # Dashboard sidebar + header
│   ├── keyword-pills.tsx                 # Keyword tag input
│   ├── gradient-mesh.tsx                 # Background decoration
│   ├── page-transition.tsx               # Route