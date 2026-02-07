# DescriptAI Sales Layer Phase 1: Copy Optimization

## Requirements

Apply a "sales psychology overlay" to the existing DescriptAI application focused on **copy changes only** (Phase 1). The goal is to optimize conversion through:
- Benefit-focused headlines and CTAs
- Outcome-driven button labels
- Trust-building micro-copy
- Refined system messages and empty states

**Constraints:** No visual/layout changes, no new components, no pricing page (skip for now), skip social proof elements.

---

## Current State Analysis

### Files to Modify
1. **`src/app/page.tsx`** - Homepage/hero section
2. **`src/app/(dashboard)/generate/page.tsx`** - Single generation page
3. **`src/app/(dashboard)/bulk/page.tsx`** - Bulk upload page
4. **`src/app/(dashboard)/history/page.tsx`** - History/library page
5. **`src/app/(dashboard)/voices/page.tsx`** - Brand voices page
6. **`src/app/(dashboard)/analytics/page.tsx`** - Analytics page
7. **`src/components/app-layout.tsx`** - Navigation sidebar
8. **`src/app/login/page.tsx`** - Login page
9. **`src/app/signup/page.tsx`** - Signup page

---

## Implementation Phases

### 1. Homepage Hero Copy Refinement (`src/app/page.tsx`)

**Headline Change:**
```
Current: "Intelligence, Accelerated."
New: "Stop Writing. Start Selling."
```

**Subheadline Change:**
```
Current: "Generate compelling, conversion-optimized product descriptions powered by advanced AI. In seconds."
New: "Generate SEO-optimized, brand-aligned product descriptions at scale—so you can stop writing and start converting."
```

**CTA Button Text:**
```
Current: "Generate" / "Sign up for more"
New: "Generate Sales Copy" / "Unlock More Generations"
```

**Typewriter Texts:**
```
Current: 
- "Describe your product in detail..."
- "Generate compelling copy instantly..."
- "Transform ideas into conversions..."

New:
- "e.g., Organic Cotton T-Shirt..."
- "Generating your SEO-optimized copy..."
- "Watch 10 hours of work become 10 seconds..."
```

**Trust Indicators:**
```
Current:
- "No credit card required"
- "1 free generation, no signup"

New:
- "No credit card required"
- "500 free credits on signup"
- "Cancel anytime"
```

**Post-Generation CTA:**
```
Current: "Sign up for free to get 10 more generations with advanced features."
New: "Sign up free—get 500 credits to generate SEO-optimized descriptions at scale."
```

---

### 2. Generate Page Copy (`src/app/(dashboard)/generate/page.tsx`)

**Page Header:**
```
Current Title: "Generate descriptions"
Current Subtitle: "Enter your product details and let AI create compelling copy."

New Title: "Generate Sales Copy"
New Subtitle: "Enter your product details and watch AI create revenue-ready descriptions in seconds."
```

**Form Labels & Placeholders:**
```
Product Name placeholder:
Current: "e.g. Wireless Noise-Cancelling Headphones"
New: "e.g., Organic Cotton T-Shirt"

Features placeholder:
Current: "e.g. 40-hour battery life, active noise cancellation, premium comfort"
New: "Tell us what makes it special (we'll make it sell)"

Target Audience placeholder:
Current: "e.g. Remote workers, music lovers"
New: "Who's buying? (e.g., eco-conscious millennials)"
```

**Button Labels:**
```
Current: "Generate descriptions"
New: "Generate Sales Copy"

Current (loading): "Generating..."
New (loading): "Crafting your SEO-optimized copy..."
```

**Results Header:**
```
Current: "Generated descriptions"
New: "Your Revenue-Ready Copy"
```

**Copy Button:**
```
Current: "Copy"
New: "Copy to Clipboard"
```

---

### 3. Bulk Upload Page Copy (`src/app/(dashboard)/bulk/page.tsx`)

**Page Header:**
```
Current Title: "Bulk Upload"
Current Subtitle: "Upload a CSV file to generate descriptions for multiple products at once."

New Title: "Bulk Catalog Scan"
New Subtitle: "Upload your product catalog and generate SEO-optimized descriptions for your entire inventory."
```

**Upload Zone:**
```
Current: "Drag and drop your CSV file here"
New: "Drop your product catalog here"

Current: "or click to browse"
New: "CSV or Excel — up to 100 products"
```

**Template Download:**
```
Current: "Download CSV template"
New: "Download starter template"
```

**Upload Button:**
```
Current: "Generate all (X credits)"
New: "Start Bulk Scan (X credits)"
```

**Progress States:**
```
Current: "Processing..."
New: "Generating your sales copy..."

Current: "Paused"
New: "Paused — Resume anytime"

Current: "Complete"
New: "Catalog Complete!"
```

**Success Message:**
```
Current: "Bulk generation complete! X succeeded."
New: "Done! X products now have SEO-optimized descriptions."
```

---

### 4. History Page Copy (`src/app/(dashboard)/history/page.tsx`)

**Page Header:**
```
Current Title: "History"
Current Subtitle: "Your previously generated descriptions."

New Title: "Content Library"
New Subtitle: "Your saved descriptions — ready to copy, edit, or export."
```

**Empty State:**
```
Current: 
Title: "No descriptions yet"
Subtitle: "Generate your first product description to see it here."

New:
Title: "Your library is empty"
Subtitle: "Generate your first description to start building your content library."
```

**Delete Button:**
```
Current: "Delete"
New: "Remove"
```

---

### 5. Voices Page Copy (`src/app/(dashboard)/voices/page.tsx`)

**Page Header:**
```
Current Title: "Brand Voices"
Current Subtitle: "Create and manage your brand voice profiles."

New Title: "Brand Voices"
New Subtitle: "Train the AI to write like your brand — consistent tone, every time."
```

**Empty State:**
```
Current:
Title: "No brand voices yet"
Subtitle: "Create a brand voice to customize generated descriptions."

New:
Title: "No brand voices yet"
Subtitle: "Create your first voice profile to ensure every description sounds like you."
```

**Form Button:**
```
Current: "+ New Voice"
New: "+ Create Voice Profile"
```

---

### 6. Analytics Page Copy (`src/app/(dashboard)/analytics/page.tsx`)

**Page Header:**
```
Current Title: "Analytics"
Current Subtitle: "Track your generation usage and trends."

New Title: "Usage Analytics"
New Subtitle: "Track your productivity gains and content output."
```

**Stat Card Labels:**
```
Current: "Total Generations"
New: "Total Descriptions Created"

Current: "This Month"
New: "Created This Month"

Current: "Most Used Tone"
New: "Favorite Tone"
```

**Chart Titles:**
```
Current: "Generations (Last 30 Days)"
New: "Your Productivity (Last 30 Days)"

Current: "Generations by Category"
New: "Output by Category"
```

**Empty State:**
```
Current: "No data yet"
New: "Start generating to see your stats"
```

---

### 7. Navigation Labels (`src/components/app-layout.tsx`)

**Sidebar Navigation:**
```
Current: "History"
New: "Content Library"

Current: "Analytics"
New: "Usage Stats"
```

---

### 8. Login Page Copy (`src/app/login/page.tsx`)

**Page Header:**
```
Current Title: "Welcome back"
Current Subtitle: "Log in to your DescriptAI account."

New Title: "Welcome back"
New Subtitle: "Log in to continue creating sales-ready copy."
```

**Button:**
```
Current: "Log in"
New: "Access My Account"

Current (loading): "Logging in..."
New (loading): "Signing you in..."
```

---

### 9. Signup Page Copy (`src/app/signup/page.tsx`)

**Page Header:**
```
Current Title: "Create your account"
Current Subtitle: "Start generating product descriptions for free."

New Title: "Start Your Free Account"
New Subtitle: "Get 500 free credits. No credit card required."
```

**Button:**
```
Current: "Sign up"
New: "Create Free Account"

Current (loading): "Creating account..."
New (loading): "Setting up your account..."
```

**Micro-copy (add below button):**
```
"✓ 500 free credits  ✓ No credit card  ✓ Cancel anytime"
```

---

## Technical Notes

### Copy Constants (Optional Refactor)
Consider creating a `src/lib/copy.ts` file to centralize all copy strings for easier A/B testing:

```typescript
export const COPY = {
  hero: {
    headline: "Stop Writing. Start Selling.",
    subheadline: "Generate SEO-optimized, brand-aligned product descriptions at scale.",
  },
  generate: {
    title: "Generate Sales Copy",
    button: "Generate Sales Copy",
    loadingText: "Crafting your SEO-optimized copy...",
  },
  // ... etc
};
```

### Testing Checklist
After implementation, verify:
- [ ] All button labels updated correctly
- [ ] Loading states show new copy
- [ ] Empty states reflect new messaging
- [ ] Toast messages use sales-focused language
- [ ] Navigation labels match new nomenclature
- [ ] No broken text overflow issues

---

## Files Changed Summary

| File | Changes |
|------|---------|
| `src/app/page.tsx` | Hero headline, subheadline, CTA buttons, typewriter texts, trust indicators |
| `src/app/(dashboard)/generate/page.tsx` | Page title, form labels, button text, results header |
| `src/app/(dashboard)/bulk/page.tsx` | Page title, upload zone text, progress messages |
| `src/app/(dashboard)/history/page.tsx` | Page title, empty state, delete button |
| `src/app/(dashboard)/voices/page.tsx` | Page subtitle, empty state, form button |
| `src/app/(dashboard)/analytics/page.tsx` | Page title, stat labels, chart titles |
| `src/components/app-layout.tsx` | Navigation labels (History → Content Library) |
| `src/app/login/page.tsx` | Subtitle, button text |
| `src/app/signup/page.tsx` | Title, subtitle, button text, add micro-copy |
