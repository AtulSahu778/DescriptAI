# Phase 2: Advanced Features for DescriptAI

## Requirements

Implement Phase 2 Advanced Features for DescriptAI to enable scalability and professional utility. This includes:
1. **Bulk CSV Upload** - Process 100+ products via background job queue
2. **Brand Voice Modeling** - Few-shot prompting with user writing samples
3. **SEO Keyword Suggestions** - Real-time keyword suggestions from search data
4. **Usage Tracking & Analytics** - Credit system with visual dashboards

All features must be built using free-tier services: Upstash Redis, Supabase, Serper API, and Recharts.

---

## Current Architecture Analysis

### Existing Stack
- **Frontend**: Next.js 14 with React 18, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **AI**: Groq SDK with Llama 3.3 70B
- **Auth**: Supabase Auth

### Existing Tables (Inferred from code)
- `descriptions` - Stores generated descriptions with:
  - `id`, `user_id`, `product_name`, `category`, `features`, `audience`, `tone`
  - `seo_description`, `emotional_description`, `short_description`, `created_at`

### Key Files
- `/src/app/api/generate/route.ts` - Main generation endpoint (authenticated)
- `/src/app/api/generate-trial/route.ts` - Trial generation (unauthenticated)
- `/src/app/(dashboard)/generate/page.tsx` - Single product generation form
- `/src/app/(dashboard)/history/page.tsx` - History display
- `/src/components/app-layout.tsx` - Dashboard layout with sidebar

---

## Implementation Phases

### Phase 2.1: Usage Tracking & Credits System (Foundation)
*Build the credit/usage system first as it's needed by other features*

#### 2.1.1 Database Schema Updates (Supabase)
Create new tables via Supabase SQL Editor:

```sql
-- Add credits and role to users profile
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  credits_remaining INTEGER DEFAULT 10,
  plan_type TEXT DEFAULT 'free' CHECK (plan_type IN ('free', 'pro')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usage logs for analytics
CREATE TABLE IF NOT EXISTS public.usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'single_generation', 'bulk_generation'
  product_count INTEGER DEFAULT 1,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);
  
CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own logs" ON public.usage_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, credits_remaining, plan_type)
  VALUES (NEW.id, 10, 'free');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to decrement credits
CREATE OR REPLACE FUNCTION public.decrement_credits(user_uuid UUID, amount INTEGER DEFAULT 1)
RETURNS INTEGER AS $$
DECLARE
  new_balance INTEGER;
BEGIN
  UPDATE public.user_profiles
  SET credits_remaining = credits_remaining - amount,
      updated_at = NOW()
  WHERE id = user_uuid AND credits_remaining >= amount
  RETURNING credits_remaining INTO new_balance;
  
  RETURN COALESCE(new_balance, -1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 2.1.2 New Files to Create

**`/src/lib/credits.ts`** - Credit management utilities
```typescript
// Functions: getUserCredits, decrementCredits, logUsage, hasEnoughCredits
```

**`/src/app/api/user/credits/route.ts`** - API endpoint for credit balance
```typescript
// GET: Returns current credit balance and plan type
```

#### 2.1.3 Modify Existing Files
- **`/src/app/api/generate/route.ts`** - Add credit check before generation, decrement after success
- **`/src/components/app-layout.tsx`** - Display credit counter in sidebar

---

### Phase 2.2: Analytics Dashboard

#### 2.2.1 Install Dependencies
```bash
npm install recharts
```

#### 2.2.2 New Files to Create

**`/src/app/(dashboard)/analytics/page.tsx`** - Analytics dashboard page
- Line chart: Generations over time (last 30 days)
- Bar chart: Generations by category
- Stats cards: Total generations, credits used, most used tone

**`/src/components/charts/usage-chart.tsx`** - Recharts line graph component
**`/src/components/charts/category-chart.tsx`** - Recharts bar chart component

#### 2.2.3 Modify Existing Files
- **`/src/components/app-layout.tsx`** - Add "Analytics" nav item

---

### Phase 2.3: Brand Voice Modeling

#### 2.3.1 Database Schema (Supabase)
```sql
CREATE TABLE IF NOT EXISTS public.brand_voices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tone_adjectives TEXT[] DEFAULT '{}', -- ['Witty', 'Luxury', 'Casual']
  writing_samples TEXT[] DEFAULT '{}', -- Array of 2-3 sample texts
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.brand_voices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own voices" ON public.brand_voices
  FOR ALL USING (auth.uid() = user_id);
```

#### 2.3.2 New Files to Create

**`/src/app/(dashboard)/voices/page.tsx`** - Brand voices management page
- List existing voices
- Create/Edit voice form (name, 3 tone adjectives, 2-3 writing samples)
- Set default voice toggle

**`/src/app/api/voices/route.ts`** - CRUD API for brand voices
```typescript
// GET: List user's voices
// POST: Create new voice
// PUT: Update voice
// DELETE: Delete voice
```

**`/src/lib/brand-voice.ts`** - Brand voice prompt injection utility
```typescript
// buildBrandVoicePrompt(voice: BrandVoice): string
// Returns formatted few-shot prompt section
```

#### 2.3.3 Modify Existing Files
- **`/src/app/(dashboard)/generate/page.tsx`** - Add voice selector dropdown
- **`/src/app/api/generate/route.ts`** - Inject brand voice into system prompt
- **`/src/components/app-layout.tsx`** - Add "Brand Voices" nav item

---

### Phase 2.4: SEO Keyword Suggestions

#### 2.4.1 Environment Variables
Add to `.env.local`:
```
SERPER_API_KEY=your_serper_api_key_here
```

#### 2.4.2 New Files to Create

**`/src/app/api/keywords/suggest/route.ts`** - Keyword suggestion endpoint
```typescript
// Uses Google Autocomplete API (free public endpoint)
// Returns array of keyword suggestions
```

**`/src/app/api/keywords/related/route.ts`** - Related searches endpoint
```typescript
// Uses Serper.dev API for "People Also Ask" and related searches
// Returns structured keyword data
```

**`/src/components/keyword-pills.tsx`** - Clickable keyword pill component
```typescript
// Displays suggested keywords as clickable pills
// onClick adds keyword to form input
```

#### 2.4.3 Modify Existing Files
- **`/src/app/(dashboard)/generate/page.tsx`** - Add keyword suggestions section
  - Debounced API call when product name changes
  - Display KeywordPills component below product name input

---

### Phase 2.5: Bulk CSV Upload

#### 2.5.1 Install Dependencies
```bash
npm install papaparse @upstash/redis bullmq
npm install -D @types/papaparse
```

#### 2.5.2 Environment Variables
Add to `.env.local`:
```
UPSTASH_REDIS_REST_URL=your_upstash_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_token
```

#### 2.5.3 Database Schema (Supabase)
```sql
CREATE TABLE IF NOT EXISTS public.bulk_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  total_items INTEGER DEFAULT 0,
  processed_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.bulk_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own jobs" ON public.bulk_jobs
  FOR ALL USING (auth.uid() = user_id);

-- Enable Supabase Realtime for progress updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.bulk_jobs;
```

#### 2.5.4 New Files to Create

**`/src/lib/upstash.ts`** - Upstash Redis client
```typescript
import { Redis } from '@upstash/redis';
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
```

**`/src/app/(dashboard)/bulk/page.tsx`** - Bulk upload page
- CSV file upload dropzone
- CSV template download link
- Progress indicator with real-time updates
- Results table showing generated descriptions
- Export to CSV button

**`/src/app/api/bulk/upload/route.ts`** - Bulk upload initiation
```typescript
// POST: Accepts parsed CSV data
// 1. Validates user has enough credits
// 2. Creates bulk_job record
// 3. Pushes items to Redis queue
// 4. Returns job ID for tracking
```

**`/src/app/api/bulk/process/route.ts`** - Background processor (called via cron/webhook)
```typescript
// Pulls items from Redis queue
// Processes with rate limiting (e.g., 5 per second)
// Updates Supabase bulk_jobs table with progress
// Inserts generated descriptions to descriptions table
```

**`/src/app/api/bulk/status/[jobId]/route.ts`** - Job status endpoint
```typescript
// GET: Returns current job status and progress
```

**`/src/components/csv-dropzone.tsx`** - CSV upload component with papaparse
**`/src/components/bulk-progress.tsx`** - Real-time progress indicator using Supabase Realtime

#### 2.5.5 Modify Existing Files
- **`/src/components/app-layout.tsx`** - Add "Bulk Upload" nav item (Pro only badge)
- **`/src/lib/supabase/client.ts`** - Ensure Realtime is enabled

---

## File Structure After Implementation

```
src/
├── app/
│   ├── api/
│   │   ├── generate/route.ts          # Modified: credit check + brand voice
│   │   ├── generate-trial/route.ts    # Unchanged
│   │   ├── user/
│   │   │   └── credits/route.ts       # NEW: Get credit balance
│   │   ├── voices/
│   │   │   └── route.ts               # NEW: CRUD for brand voices
│   │   ├── keywords/
│   │   │   ├── suggest/route.ts       # NEW: Google Autocomplete
│   │   │   └── related/route.ts       # NEW: Serper API
│   │   └── bulk/
│   │       ├── upload/route.ts        # NEW: Initiate bulk job
│   │       ├── process/route.ts       # NEW: Process queue
│   │       └── status/[jobId]/route.ts # NEW: Job status
│   └── (dashboard)/
│       ├── generate/page.tsx          # Modified: voice selector + keywords
│       ├── history/page.tsx           # Unchanged
│       ├── analytics/page.tsx         # NEW: Usage dashboard
│       ├── voices/page.tsx            # NEW: Brand voice management
│       └── bulk/page.tsx              # NEW: Bulk upload interface
├── components/
│   ├── app-layout.tsx                 # Modified: new nav items + credits
│   ├── keyword-pills.tsx              # NEW: Keyword suggestions UI
│   ├── csv-dropzone.tsx               # NEW: CSV upload component
│   ├── bulk-progress.tsx              # NEW: Real-time progress
│   └── charts/
│       ├── usage-chart.tsx            # NEW: Line chart
│       └── category-chart.tsx         # NEW: Bar chart
└── lib/
    ├── credits.ts                     # NEW: Credit management
    ├── brand-voice.ts                 # NEW: Prompt building
    └── upstash.ts                     # NEW: Redis client
```

---

## Dependencies to Add

```json
{
  "dependencies": {
    "recharts": "^2.12.0",
    "papaparse": "^5.4.1",
    "@upstash/redis": "^1.28.0"
  },
  "devDependencies": {
    "@types/papaparse": "^5.3.14"
  }
}
```

---

## External Services Setup Required

### 1. Upstash Redis (Free Tier)
- Sign up at https://upstash.com
- Create a new Redis database
- Copy REST URL and Token to `.env.local`
- Free tier: 10,000 requests/day

### 2. Serper API (Free Tier)
- Sign up at https://serper.dev
- Get API key
- Add to `.env.local`
- Free tier: 2,500 queries

### 3. Supabase Realtime
- Already enabled by default
- Enable for `bulk_jobs` table via SQL above

---

## Implementation Order (Recommended)

1. **Phase 2.1** - Credits & Usage (2-3 hours)
   - Foundation for all other features
   - Enables monetization path

2. **Phase 2.2** - Analytics Dashboard (2-3 hours)
   - Builds on usage logs from 2.1
   - Quick visual win

3. **Phase 2.3** - Brand Voices (3-4 hours)
   - Self-contained feature
   - High user value

4. **Phase 2.4** - SEO Keywords (2-3 hours)
   - Enhances generation quality
   - Good UX improvement

5. **Phase 2.5** - Bulk Upload (4-5 hours)
   - Most complex feature
   - Requires all infrastructure in place

**Total estimated time: 13-18 hours**

---

## Potential Challenges & Mitigations

| Challenge | Mitigation |
|-----------|------------|
| Groq rate limits during bulk processing | Implement exponential backoff + 2-3 second delay between calls |
| Redis queue items expiring | Set TTL to 24 hours, implement job timeout handling |
| Supabase Realtime connection drops | Implement reconnection logic in bulk-progress component |
| Large CSV files (1000+ rows) | Chunk uploads, process in batches of 50 |
| Credit race conditions | Use database transaction with row locking |

---

## Success Criteria

- [ ] Users see credit balance in dashboard
- [ ] Credits decrement after each generation
- [ ] Analytics page shows usage graphs
- [ ] Users can create/manage multiple brand voices
- [ ] Brand voice affects generated content style
- [ ] Keyword suggestions appear when typing product name
- [ ] Users can upload CSV with 100+ products
- [ ] Real-time progress updates during bulk processing
- [ ] Bulk results exportable to CSV
