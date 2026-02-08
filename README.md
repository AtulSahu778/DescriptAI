# DescriptAI

AI-powered product description generator. Paste a product name, get three publish-ready descriptions (SEO, emotional, short-form) in seconds. Built for e-commerce teams that need high-quality copy at scale.

## What It Does

- **Single product generation** -- Enter product details (name, category, features, audience, tone) and receive three distinct descriptions: SEO-optimized, emotionally compelling, and short-form.
- **Image-to-description** -- Upload a product photo and let Google Gemini Vision extract product attributes automatically. Fields are pre-filled; hit generate.
- **Bulk CSV processing** -- Upload a CSV with hundreds of products. The system processes them in chunks and lets you download results as CSV when done.
- **Brand Voices** -- Define reusable voice profiles (tone adjectives + writing samples). Select a voice during generation and every description matches your brand's style.
- **Keyword suggestions** -- As you type a product name, the system suggests relevant keywords via the Serper API. Click to add them to your features list.
- **History** -- Every generation is stored. Browse, expand, copy, or delete past descriptions from the History page.
- **Analytics** -- Track generation volume over time, see top categories, and review usage patterns with interactive charts.
- **Credit system** -- Free accounts start with 50 credits. Each generation costs 1 credit. Pro accounts get 500.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Auth | Supabase Auth (email/password) |
| Database | Supabase (PostgreSQL) |
| AI - Text | Groq (LLaMA) |
| AI - Vision | Google Gemini (image analysis) |
| Search | Serper API (keyword suggestions) |
| Rate Limiting | Upstash Redis |
| Animations | Framer Motion |
| Charts | Recharts |
| CSV Parsing | PapaParse |

## Project Structure

```
src/
  app/
    page.tsx                        # Landing page with trial generation
    layout.tsx                      # Root layout
    login/page.tsx                  # Login page
    signup/page.tsx                 # Signup page
    (dashboard)/
      layout.tsx                    # Dashboard shell (sidebar, header, credits)
      generate/page.tsx             # Single product generation form
      bulk/page.tsx                 # Bulk CSV upload and processing
      voices/page.tsx               # Brand voice CRUD
      history/page.tsx              # Past generations browser
      analytics/page.tsx            # Usage charts and stats
    api/
      generate/route.ts             # Main generation endpoint (Groq streaming)
      generate-trial/route.ts       # Unauthenticated trial generation
      analyze-image/route.ts        # Image analysis via Google Gemini
      bulk/
        upload/route.ts             # CSV upload and job creation
        process/route.ts            # Bulk job processor
        process-chunk/route.ts      # Chunk-level processing
        status/[jobId]/route.ts     # Poll job status
      voices/route.ts               # Brand voice CRUD API
      keywords/
        suggest/route.ts            # Keyword suggestions
        related/route.ts            # Related keyword expansion
      user/credits/route.ts         # Fetch user credit balance
      debug/env/route.ts            # Environment variable check (dev only)
  components/
    app-layout.tsx                  # Sidebar + mobile nav + credits display
    gradient-mesh.tsx               # Animated background gradients
    keyword-pills.tsx               # Keyword suggestion chips
    page-transition.tsx             # Page transition wrapper
    toaster.tsx                     # Toast notification system
    ui/                             # Shared UI primitives (button, input, card, etc.)
  lib/
    supabase/
      client.ts                     # Browser Supabase client
      server.ts                     # Server Supabase client
      middleware.ts                 # Auth middleware helper
    credits.ts                      # Credit management (check, decrement, log)
    brand-voice.ts                  # Brand voice prompt builder
    stream-parser.ts                # Parse streamed generation responses
    upstash.ts                      # Redis rate limiter
    utils.ts                        # Tailwind merge utility
    env-check.ts                    # Validate required env vars
  middleware.ts                     # Route protection (redirect unauthenticated users)
public/
  logo.png                          # App logo
  favicon.ico                       # Favicon
supabase-schema.sql                 # Full database schema (tables, RLS policies)
```

## Database Schema

Five tables, all with Row Level Security:

- **user_profiles** -- `id` (FK to auth.users), `credits_remaining`, `plan_type` (free/pro)
- **brand_voices** -- `id`, `user_id`, `name`, `tone_adjectives[]`, `writing_samples[]`, `is_default`
- **descriptions** -- `id`, `user_id`, `product_name`, `category`, `tone`, `seo_description`, `emotional_description`, `short_description`
- **bulk_jobs** -- `id`, `user_id`, `status`, `total_items`, `processed_items`, `failed_items`
- **usage_logs** -- `id`, `user_id`, `action_type`, `product_count`, `metadata`

The full schema with all RLS policies is in `supabase-schema.sql`.

## Environment Variables

Create a `.env.local` file in the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# AI - Text generation
GROQ_API_KEY=your_groq_api_key

# AI - Image analysis
GOOGLE_API_KEY=your_google_gemini_api_key

# Keyword suggestions
SERPER_API_KEY=your_serper_api_key

# Rate limiting
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token
```

Where to get each key:

| Variable | Source |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | [Supabase Dashboard](https://supabase.com/dashboard) > Project Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same location as above |
| `SUPABASE_SERVICE_ROLE_KEY` | Same location (keep this secret -- never expose client-side) |
| `GROQ_API_KEY` | [Groq Console](https://console.groq.com) > API Keys |
| `GOOGLE_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) |
| `SERPER_API_KEY` | [Serper.dev](https://serper.dev) > Dashboard > API Key |
| `UPSTASH_REDIS_REST_URL` | [Upstash Console](https://console.upstash.com) > Redis > REST API |
| `UPSTASH_REDIS_REST_TOKEN` | Same location as above |

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project with the schema applied
- API keys for Groq, Google Gemini, Serper, and Upstash (see table above)

### Setup

1. Clone the repository:

```bash
git clone https://github.com/your-org/descriptai.git
cd descriptai
```

2. Install dependencies:

```bash
npm install
# or
bun install
```

3. Set up the database -- run the contents of `supabase-schema.sql` against your Supabase project via the SQL Editor in the Supabase Dashboard.

4. Copy `.env.local.example` to `.env.local` and fill in all values (see Environment Variables above).

5. Start the development server:

```bash
npm run dev
# or
bun dev
```

6. Open [http://localhost:3000](http://localhost:3000).

## API Routes

All API routes are under `/api/`. Auth-protected routes require a valid Supabase session cookie.

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/generate` | Yes | Generate 3 descriptions for a single product |
| POST | `/api/generate-trial` | No | One-time trial generation (no account needed) |
| POST | `/api/analyze-image` | Yes | Upload product image, get auto-extracted attributes |
| POST | `/api/bulk/upload` | Yes | Upload CSV, create bulk job |
| POST | `/api/bulk/process` | Yes | Trigger processing for a bulk job |
| POST | `/api/bulk/process-chunk` | Yes | Process a chunk of items within a job |
| GET | `/api/bulk/status/[jobId]` | Yes | Poll bulk job progress |
| GET/POST/PUT/DELETE | `/api/voices` | Yes | CRUD operations for brand voices |
| GET | `/api/keywords/suggest` | Yes | Get keyword suggestions for a query |
| GET | `/api/keywords/related` | Yes | Get related keywords |
| GET | `/api/user/credits` | Yes | Get current credit balance |

## How Generation Works

1. User submits product details (name, category, features, audience, tone, optional brand voice).
2. Server validates auth, checks credits, builds a prompt.
3. If a brand voice is selected, the voice's tone adjectives and writing samples are injected into the prompt.
4. The prompt is sent to Groq (LLaMA model) as a streaming request.
5. Response is streamed back to the client and parsed into three sections: SEO, emotional, and short-form.
6. One credit is deducted. The generation is saved to the `descriptions` table. Usage is logged.

For image-based generation:
1. User uploads a product image.
2. Image is sent to Google Gemini Vision, which returns structured product attributes (name, category, features, audience).
3. Those attributes auto-fill the form. User can edit and then generate.

## Deployment

This is a standard Next.js application. Deploy to any platform that supports Next.js:

- **Vercel** -- Zero-config deployment. Push to GitHub and connect to Vercel.
- **Netlify** -- Use the Next.js runtime adapter.
- **Self-hosted** -- `npm run build && npm start`

Make sure all environment variables are set in your deployment platform's settings.

## License

Proprietary. All rights reserved.
