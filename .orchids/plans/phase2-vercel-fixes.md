# Phase 2 Vercel/Supabase Environment Fixes

## Requirements

Fix the critical issues preventing Phase 2 features from working in production (Vercel) environment:

1. **Vercel Environment Variables** - Ensure all required env vars are properly configured
2. **API Timeouts** - Fix the 10-second timeout issue on Vercel's free tier
3. **Bulk Worker Architecture** - Replace fire-and-forget approach with Vercel-compatible solution

---

## Current Issues Analysis

### Issue 1: Environment Variables
**Problem**: Local `.env` and `.env.local` files don't upload to Vercel. The following keys are needed:
- `GROQ_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (currently only in `.env.local`)
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `SERPER_API_KEY`

**Impact**: API routes fail silently when keys are missing.

### Issue 2: API Timeouts (CRITICAL)
**Problem**: Vercel's free/hobby tier has a **10-second function timeout**. The current bulk processing:
- Uses `maxDuration = 300` (5 minutes) - **only works on Pro plan**
- Each AI generation can take 3-8 seconds
- Multiple generations in a loop will definitely timeout

**Current Code Issue** (`/api/bulk/process/route.ts`):
```typescript
export const maxDuration = 300; // Only works on Vercel Pro ($20/month)

for (const item of items) {
  // Each iteration: ~3-8 seconds AI call + 2 second delay = 5-10 seconds
  // 10 items = 50-100 seconds = TIMEOUT
}
```

### Issue 3: Background Worker Architecture (CRITICAL)
**Problem**: The current "fire and forget" pattern doesn't work on Vercel:

```typescript
// Current approach in /api/bulk/upload/route.ts
fetch(`${baseUrl}/api/bulk/process`, {
  method: "POST",
  // ...
}).catch(() => {
  // Fire and forget - THIS DOESN'T WORK ON VERCEL
});
```

**Why it fails**: Vercel serverless functions terminate after the response is sent. The background `fetch` is killed immediately.

---

## Solution Architecture

### Strategy: "Chunked Sequential Processing"

Instead of background workers, we'll use a **client-side orchestration** pattern:

1. **Upload Phase**: Client sends CSV data → Server creates job record → Returns job ID
2. **Process Phase**: Client calls `/api/bulk/process-chunk` repeatedly in a loop
3. **Each Chunk**: Processes 1-3 items per request (stays under 10 seconds)
4. **Progress**: Real-time updates via Supabase Realtime (already working)

This pattern is **Vercel-compatible** because:
- Each request is stateless and completes quickly
- Client controls the loop, not the server
- Works on free tier (10-second timeout is fine for 1-3 items)

---

## Implementation Phases

### Phase 1: Environment Variables Verification

#### 1.1 Create Environment Verification Utility
**New File**: `/src/lib/env-check.ts`

```typescript
// Validates required environment variables at runtime
// Provides helpful error messages for debugging
export function checkRequiredEnvVars(): { valid: boolean; missing: string[] } {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'GROQ_API_KEY',
  ];
  
  const optional = [
    'SUPABASE_SERVICE_ROLE_KEY',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'SERPER_API_KEY',
  ];
  
  const missing = required.filter(key => !process.env[key]);
  return { valid: missing.length === 0, missing };
}
```

#### 1.2 Add Debug Endpoint (Development Only)
**New File**: `/src/app/api/debug/env/route.ts`

```typescript
// GET: Returns which env vars are present (not values, just existence)
// Only works in development mode
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }
  
  return NextResponse.json({
    GROQ_API_KEY: !!process.env.GROQ_API_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    UPSTASH_REDIS_REST_URL: !!process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: !!process.env.UPSTASH_REDIS_REST_TOKEN,
    SERPER_API_KEY: !!process.env.SERPER_API_KEY,
  });
}
```

---

### Phase 2: Fix API Timeouts with Chunked Processing

#### 2.1 Create New Chunk Processing Endpoint
**New File**: `/src/app/api/bulk/process-chunk/route.ts`

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { decrementCredits } from "@/lib/credits";
import Groq from "groq-sdk";

// Keep well under 10-second limit
export const maxDuration = 10;

type BulkItem = {
  productName: string;
  category?: string;
  features?: string;
  audience?: string;
  tone?: string;
};

export async function POST(request: Request) {
  const cookieStore = cookies();
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
        result: parsed 
      });
    } else {
      // Update failed count
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
        error: "Failed to parse AI response" 
      });
    }
  } catch (error) {
    // Update failed count
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
      error: error instanceof Error ? error.message : "Unknown error" 
    });
  }
}
```

#### 2.2 Modify Upload Route (Simplified)
**Modify**: `/src/app/api/bulk/upload/route.ts`

```typescript
// Remove the fire-and-forget fetch call
// Just create the job and return - client will handle processing
```

#### 2.3 Update Bulk Page with Client-Side Orchestration
**Modify**: `/src/app/(dashboard)/bulk/page.tsx`

Key changes:
- After upload creates job, client loops through items
- Calls `/api/bulk/process-chunk` for each item sequentially
- Shows real-time progress
- Handles errors gracefully with retry logic
- Adds pause/resume functionality

---

### Phase 3: Remove Broken Background Processing

#### 3.1 Deprecate Old Process Route
**Modify**: `/src/app/api/bulk/process/route.ts`

```typescript
// Keep for backwards compatibility but return error
export async function POST() {
  return NextResponse.json(
    { error: "This endpoint is deprecated. Use /api/bulk/process-chunk instead." },
    { status: 410 } // Gone
  );
}
```

Or simply delete the file after verifying the new approach works.

---

### Phase 4: Optional - Upstash QStash for True Background Jobs

If you upgrade to Vercel Pro or want a more robust solution later:

**Alternative**: Use Upstash QStash (free tier: 500 messages/day)

```typescript
// QStash allows scheduling HTTP requests that run independently
import { Client } from "@upstash/qstash";

const qstash = new Client({ token: process.env.QSTASH_TOKEN! });

// Instead of fire-and-forget fetch, use QStash
await qstash.publishJSON({
  url: `${process.env.VERCEL_URL}/api/bulk/process-chunk`,
  body: { jobId, item, index },
  delay: index * 3, // Stagger requests by 3 seconds each
});
```

This is optional and can be implemented later as an enhancement.

---

## Implementation Order

1. **Phase 1**: Environment verification (30 minutes)
   - Create env-check utility
   - Add debug endpoint
   - Document required Vercel env vars

2. **Phase 2**: Chunked processing (2-3 hours)
   - Create `/api/bulk/process-chunk` endpoint
   - Update bulk page with client-side loop
   - Add error handling and retry logic

3. **Phase 3**: Cleanup (30 minutes)
   - Deprecate old process route
   - Update documentation

4. **Phase 4**: QStash integration (optional, 1-2 hours)
   - Only if true background processing is needed

---

## Files to Create

| File | Purpose |
|------|---------|
| `/src/lib/env-check.ts` | Environment variable validation |
| `/src/app/api/debug/env/route.ts` | Debug endpoint for env vars |
| `/src/app/api/bulk/process-chunk/route.ts` | Single-item processing endpoint |

## Files to Modify

| File | Changes |
|------|---------|
| `/src/app/api/bulk/upload/route.ts` | Remove fire-and-forget fetch |
| `/src/app/(dashboard)/bulk/page.tsx` | Add client-side processing loop |
| `/src/app/api/bulk/process/route.ts` | Deprecate or delete |

---

## Vercel Dashboard Configuration

### Required Environment Variables (Add to Vercel Dashboard)

Go to: `Vercel Dashboard → Your Project → Settings → Environment Variables`

| Variable | Value | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ldicjfmqrkmtngnkdtwg.supabase.co` | Public, safe to expose |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGc...` | Public, safe to expose |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGc...` (from .env.local) | **Secret**, server-only |
| `GROQ_API_KEY` | `gsk_TJ...` | **Secret**, server-only |
| `UPSTASH_REDIS_REST_URL` | `https://light-buffalo-48458.upstash.io` | Server-only |
| `UPSTASH_REDIS_REST_TOKEN` | `Ab1KAAInc...` | **Secret**, server-only |
| `SERPER_API_KEY` | `73af940...` | **Secret**, server-only |

### Important Notes
- Variables starting with `NEXT_PUBLIC_` are exposed to the browser
- All other variables are server-side only
- After adding variables, **redeploy** the project

---

## Testing Checklist

- [ ] Debug endpoint shows all env vars present (in dev)
- [ ] Single generation still works
- [ ] Bulk upload creates job record
- [ ] Client-side loop processes items one by one
- [ ] Progress updates in real-time
- [ ] Errors don't crash the entire batch
- [ ] Job completes with correct counts
- [ ] Credits are properly decremented
- [ ] Works on Vercel production

---

## Potential Edge Cases

| Scenario | Handling |
|----------|----------|
| User closes browser mid-processing | Job stays in "processing" state; add timeout cleanup |
| Network error during chunk | Retry up to 3 times with exponential backoff |
| AI rate limit hit | Pause for 5 seconds, then retry |
| All items fail | Job marked as "failed" with error count |
| Browser tab backgrounded | Use `visibilitychange` event to pause/resume |

---

## Success Criteria

- [ ] Bulk processing works on Vercel free tier
- [ ] No timeout errors (each request < 10 seconds)
- [ ] Real-time progress updates work
- [ ] Failed items don't stop the batch
- [ ] All environment variables documented and configured
