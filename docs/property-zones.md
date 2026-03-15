# Property Zones — Direct Memory Lookup

Property zones pull personalized content directly from Personize memory properties — **no LLM call at serve time**. Instant, deterministic, zero generation cost.

---

## Syntax

```html
<!-- Property zone: reads from Personize memory -->
<h1 data-gs-zone="website_zones:hero_headline">Default headline</h1>

<!-- Generative zone: AI-written (for comparison) -->
<h1 data-gs-zone="headline">Default headline</h1>
```

The colon separates:
- **Left**: collection system name (e.g. `website_zones`)
- **Right**: property system name (e.g. `hero_headline`)

---

## Setting Up

### 1. Create a collection in Personize

```
Personize Dashboard → Memory → Collections → + Create Collection

  Collection name:        Website Zones
  Collection system name: website_zones
  Entity type:            Contact
```

### 2. Add properties with descriptions and examples

| Property | System Name | Type | Description | Example |
|---|---|---|---|---|
| Hero Headline | `hero_headline` | Text | Personalized headline (8-12 words) referencing their challenge | "How Acme Corp Scaled API Operations by 3x" |
| Sub Headline | `sub_headline` | Text | Supporting text below headline (15-25 words) | "The platform built for API-first teams" |
| CTA Text | `cta_text` | Text | Call-to-action button label (3-5 words) | "See Sarah's custom demo" |

**Why descriptions matter:** Personize uses them to guide AI extraction accuracy when you store content with `enhanced: true`.

### 3. Populate properties for each contact

Use any method:

```typescript
// Via pipeline, agent, SDK, or Zapier
await personize.memory.memorize({
  email: 'sarah@acme.com',
  content: `
    Hero headline: How Acme Corp Scaled API Operations by 3x
    Sub headline: The platform built for API-first engineering teams
    CTA text: See Sarah's custom demo
  `,
  collection: 'website_zones',
  enhanced: true,    // AI extracts into structured properties
});
```

### 4. Reference in HTML

```html
<h1 data-gs-zone="website_zones:hero_headline"
    data-gs-identify="website_zones:slug">
  Default headline
</h1>
<p data-gs-zone="website_zones:sub_headline">Default subheadline</p>
<span data-gs-zone="website_zones:cta_text">Book a Demo</span>
```

---

## How it works at serve time

```
gs.js discovers zones:
  website_zones:hero_headline
  website_zones:sub_headline
  website_zones:cta_text

gs.js reads data-gs-identify="website_zones:slug"
  → extracts slug from URL: /for/sarah-chen → "sarah-chen"

Edge API:
  → searches website_zones where slug = "sarah-chen"
  → gets ONE record with ALL properties:
      {
        slug: "sarah-chen",
        hero_headline: "How Acme Corp Scaled API Operations by 3x",
        sub_headline: "The platform built for API-first teams",
        cta_text: "See Sarah's custom demo"
      }
  → serves all 3 zones from this one record

One API call. All zones. Instant.
```

---

## Mixing property and generative zones

```html
<!-- Property zones: instant, from memory -->
<h1 data-gs-zone="website_zones:hero_headline"
    data-gs-identify="website_zones:slug">Welcome</h1>
<p data-gs-zone="website_zones:sub_headline">Built for teams</p>

<!-- Generative zones: AI-written with context -->
<span data-gs-zone="cta-text"
      data-gs-prompt="CTA with their first name, max 5 words">
  Get Started
</span>
<p data-gs-zone="proof"
   data-gs-prompt="Social proof relevant to their industry">
  Trusted by 500+ companies
</p>
```

Property zones cost **zero**. Generative zones cost **one prompt() call** total (batched). A page with 4 property zones and 2 generative zones = 1 LLM call.

---

## Fallback behavior

If a contact has no stored value for a property zone, the fallback text (the element's existing content) stays unchanged. No error shown. Safe to deploy zones before all contacts have data.

Anonymous visitors always see fallback text for property zones — property lookup requires a known contact.

---

## For web apps (auth session)

Property zones also work with `window.__GS_USER__`:

```html
<script>window.__GS_USER__ = { email: 'sarah@acme.com' };</script>
<script src="https://gs.personize.ai/gs.js" data-key="pk_live_..." async></script>

<!-- Add data-gs-identify for fast bulk loading -->
<h1 data-gs-zone="dashboard:greeting"
    data-gs-identify="dashboard:email">Welcome back</h1>
<p data-gs-zone="dashboard:insight">Your summary</p>
```

Auth provides the email. `data-gs-identify` tells the Edge API to load the full record in one call.
