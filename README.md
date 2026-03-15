# Generative Sites

**Personalized content. Your design.**

Drop AI-personalized text into zones on any website. You handle layout, design, and images. We deliver the words — tailored to each visitor based on who they are, where they're from, and what they care about.

Powered by [Personize](https://personize.com).

---

## The Problem

Every visitor to your website sees the exact same words.

Your CRM knows Sarah is a VP of Engineering at a fintech company evaluating your API product. Your analytics knows Marcus from TechCorp has visited your pricing page three times. Your sales team knows Lisa's company just raised a Series B.

But your website? It says **"Welcome to our platform"** to all of them.

Current "personalization" options are either too shallow or too heavy:

| Approach | Limitation |
|---|---|
| Merge tags (`Hi {{first_name}}`) | Surface-level. Changes one word. |
| Audience segments (3-5 buckets) | Too broad. Not personal. |
| A/B testing | Optimizes for averages, not individuals. |
| Manual landing page variants | Doesn't scale past 10 pages. |
| Full-page dynamic rendering | Over-engineered. Breaks design. Kills caching. |

---

## The Solution

Generative Sites introduces a simple concept: **zones**.

A zone is a text element on your page whose words change based on who's looking at it. The design stays identical. Only the text adapts.

```html
<!-- Your designer styles the h1. GS replaces the text inside it. -->
<h1 data-gs-zone="headline">Welcome to our platform</h1>

<!-- Your designer styles the paragraph. GS replaces the text inside it. -->
<p data-gs-zone="subheadline">We help teams build faster.</p>

<!-- Your designer styles the button. GS replaces the label. -->
<a href="/demo" class="btn-primary">
  <span data-gs-zone="cta-text">Book a Demo</span>
</a>
```

**What visitors see:**

| Visitor | Headline | CTA |
|---|---|---|
| Anonymous (Austin, TX) | "Trusted by teams across Texas" | "Book a Demo" |
| Marcus (TechCorp, SaaS) | "Built for engineering teams scaling APIs" | "See TechCorp's plan" |
| Sarah (VP Eng, Acme Corp) | "Sarah, cut Acme's API costs by 40%" | "Talk to Alex" |

One page. One design. Every visitor gets copy that feels written for them.

---

## How It Works

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           GENERATIVE SITES                               │
│               "Personalized content. Your design."                       │
├──────────────┬──────────────────┬──────────────────┬─────────────────────┤
│   IDENTIFY   │    REMEMBER      │     GENERATE     │       DELIVER       │
│              │                  │                  │                     │
│ Auth session │ Personize        │ Brand guidelines │ TEXT CONTENT into   │
│ Unique URL   │ memorize()       │ (smartGuidelines)│ zones on YOUR page  │
│ URL token    │                  │       +          │                     │
│ Location     │ Every visit      │ Contact memory   │ CMS/code handles:   │
│ Deanon       │ enriches the     │ (smartDigest)    │  - Layout           │
│              │ profile          │       +          │  - Design           │
│              │                  │ prompt()         │  - Images           │
│              │ CRM data flows   │ → PLAIN TEXT     │  - Responsive       │
│              │ in and out       │   (not HTML)     │  - Styling          │
├──────────────┴──────────────────┴──────────────────┴─────────────────────┤
│                              ADAPTERS                                    │
│  CRM: HubSpot · Salesforce · Pipedrive · CSV                            │
│  CMS: Works on ANY — WordPress, Webflow, Shopify, any HTML              │
│  Deanon: Clearbit · RB2B · Retention.com · 6sense                       │
│  Edge: Cloudflare Workers · Vercel Edge · Node.js                       │
└──────────────────────────────────────────────────────────────────────────┘
```

### Request Flow

```
Visitor hits page
  │
  ├─ gs.js loads (~5kb, async, non-blocking)
  │
  ├─ Discovers all data-gs-zone elements in the DOM
  │
  ├─ Determines who the visitor is:
  │    ├─ URL path /for/sarah-chen-acme → known contact, pre-baked content
  │    ├─ URL has ?gs=encrypted_token  → known contact via email link
  │    ├─ window.__GS_USER__ set       → logged-in SaaS user
  │    └─ None of above               → location-based personalization
  │
  ├─ Opens SSE connection to edge API
  │    ├─ Pre-baked content? → served instantly (<10ms)
  │    └─ No cache?         → generates in real-time, streams zone-by-zone
  │
  ├─ Replaces textContent in each zone (no innerHTML — zero XSS risk)
  │
  └─ Tracks engagement → feeds back into Personize memory for next visit
```

---

## Quick Start

### 2-Minute Setup (Any Website)

**Step 1.** Add the script tag to your page:

```html
<script
  src="https://cdn.personize.com/gs.js"
  data-key="pk_live_YOUR_KEY"
  async
></script>
```

**Step 2.** Add `data-gs-zone` to any text element:

```html
<h1 data-gs-zone="headline">Welcome to our platform</h1>
<p data-gs-zone="subheadline">We help teams build faster.</p>
<span data-gs-zone="cta-text">Get Started</span>
```

**That's it.** Visitors will see location-personalized text immediately. No npm, no build step, no config files. Works on WordPress, Webflow, Shopify, Squarespace, plain HTML — anything.

### Full Stack Setup (30 Minutes)

```bash
npm install @generative-sites/core

# Optional adapters
npm install @generative-sites/crm-hubspot     # CRM sync
npm install @generative-sites/identify-clearbit # B2B deanon
```

Configure your zones, connect your CRM, set up bake pipelines, generate campaign URLs. See [Architecture](#architecture) below.

---

## Three Identification Paths

Generative Sites identifies visitors through three deterministic paths — each gives **100% confidence** identification with zero vendor cost.

### Path 1: Unique URL

Generate a personal URL for each contact and send it via email, LinkedIn, or sales outreach.

```
https://yoursite.com/for/sarah-chen-acme
```

The page design is identical for everyone. Only the zone text changes. Sarah sees copy written specifically for her. Marcus gets his own version at `/for/marcus-rivera-techcorp`.

**Best for:** ABM campaigns, outbound sales, personalized proposals.

### Path 2: URL Token

Append an encrypted token to any existing page URL. Works with every email tool and CRM.

```
https://yoursite.com/pricing?gs=eyJ1c2VyIjoic2FyYWh...
```

The token decrypts to `{ email, campaignId, createdAt }` using AES-256-GCM. No database lookup, no third-party call — pure edge-side decryption.

**Best for:** Email campaigns, nurture sequences, retargeting links.

### Path 3: Auth Session

For logged-in SaaS applications — inject the user identity before gs.js loads.

```tsx
// In your layout or _app
<script dangerouslySetInnerHTML={{
  __html: `window.__GS_USER__ = ${JSON.stringify({
    email: user.email,
    firstName: user.firstName,
    company: user.company,
    plan: user.plan,
  })};`
}} />
```

**Best for:** In-app personalization, SaaS dashboards, logged-in experiences.

### Fallback: Location

When no identity path matches, gs.js falls back to location-based personalization using free edge headers (Cloudflare, Vercel). Every visitor still gets relevant copy — just at a broader level.

```
Austin, TX visitor     → "Trusted by 14 companies in Austin"
London, UK visitor     → "Free shipping across the UK"
EU visitor             → "GDPR-compliant by design"
```

---

## Two Delivery Modes

### Bake (Pre-Generated, Instant)

For known contacts — ABM targets, CRM contacts, campaign recipients.

A pipeline generates personalized text for each contact ahead of time and stores it in edge KV. When they visit, content loads in **under 10ms**. No LLM call at serve time.

```typescript
const result = await bakeCampaign(contacts, {
  campaignId: 'q2-abm-enterprise',
  siteId: 'marketing-site',
  baseUrl: 'https://yoursite.com',
  zones: [
    { id: 'headline' },
    { id: 'subheadline' },
    { id: 'proof', prompt: 'Write social proof relevant to their industry.' },
    { id: 'cta-text', prompt: 'Write a CTA with their first name. Max 5 words.' },
  ],
});
```

### Stream (Real-Time, On-Demand)

For unknown visitors and real-time adaptation. gs.js opens an SSE connection, the server assembles context (brand guidelines + visitor memory + location), generates text, and streams it zone-by-zone.

Typical latency: 2-5 seconds for first render, then cached for subsequent visits.

---

## Property Zones — Deterministic, Zero-LLM Content

For baked/pre-generated personalization, Generative Sites supports a special zone syntax that pulls content directly from Personize memory properties — **no LLM call at any point**.

### The Syntax

```html
<!-- Property zone: reads from a Personize collection property -->
<h1 data-gs-zone="website_zones:hero_headline">Default headline</h1>

<!-- Generative zone: AI-written at serve/bake time -->
<p data-gs-zone="proof">Default proof statement</p>
```

The colon separates the **collection system name** from the **property system name**. The value is looked up directly in the contact's Personize record.

### Why This Matters

| | Generative Zone | Property Zone |
|---|---|---|
| Content source | LLM generates at serve/bake time | Pre-stored in Personize memory |
| Latency | 2-5s (stream) or pre-baked | Instant (memory lookup) |
| LLM cost | ~1 prompt() call per page | Zero |
| Determinism | AI-generated, varies | Exact stored value, deterministic |
| Best for | Dynamic copy, location-aware text | High-confidence, curated content |

### Setting Up Property Zones

1. **Create a collection** in Personize called `website_zones` (or any name)
2. **Add properties** with detailed descriptions and examples:

| Property | System Name | Type | Example Value |
|---|---|---|---|
| Hero Headline | `hero_headline` | Text | "How Acme scaled API ops by 3x" |
| Sub Headline | `sub_headline` | Text | "The platform built for API-first teams" |
| CTA Text | `cta_text` | Text | "See Sarah's custom demo" |

3. **Populate via pipeline** — CRM sync, enrichment pipeline, or batch import
4. **Reference in HTML** — `data-gs-zone="website_zones:hero_headline"`

The richer your property descriptions and examples, the better Personize's AI extraction populates them. See [docs/property-zones.md](docs/property-zones.md) for the full setup guide.

### Mixing Both Types

You can mix property zones and generative zones on the same page. They resolve in parallel:

```html
<!-- Property zone: instant, from memory -->
<h1 data-gs-zone="website_zones:hero_headline">Default headline</h1>

<!-- Property zone: instant, from memory -->
<p data-gs-zone="website_zones:sub_headline">Default subheadline</p>

<!-- Generative zone: AI-written, uses contact context -->
<span data-gs-zone="cta-text">Book a Demo</span>

<!-- Generative zone: AI-written, uses industry context -->
<p data-gs-zone="proof">Trusted by 500+ companies</p>
```

**Cost model:** A page with 4 property zones and 2 generative zones costs **1 LLM call** total — not 6. Property zones are free.

---

## Progressive Personalization Tiers

Personalization quality scales with data. Every visitor gets the best experience possible given what you know about them.

### Tier: Anonymous

**Data:** None.
**Personalization:** Show original fallback text.

```
headline: "Welcome to our platform"
```

### Tier: Located

**Data:** City, region, country (from free edge headers).
**Personalization:** Location-aware copy.

```
headline: "Trusted by teams across Texas"
proof:    "14 companies in Austin use our platform"
```

### Tier: Account

**Data:** Company, industry, size (from deanon or CRM match).
**Personalization:** Industry and company-level messaging.

```
headline: "Built for fintech compliance requirements"
cta-text: "See enterprise pricing"
```

### Tier: Known

**Data:** Full contact profile — name, role, company, deal stage, engagement history.
**Personalization:** Individually tailored copy.

```
headline: "Sarah, Acme Corp's API costs — cut by 40%"
cta-text: "Sarah, talk to Alex →"
proof:    "Dell's Austin team went live in 3 weeks"
```

### Tiers Upgrade Mid-Session

```
Visit starts → Located (Austin, TX)
  ↓
B2B deanon resolves → Account (Dell, hardware)
  Zones update with industry context
  ↓
Visitor fills form → Known (sarah@dell.com, CRM match)
  All zones update with full personalization
  ↓
Next visit → Known from first page load (baked content ready)
```

---

## CMS Compatibility

Because GS delivers **text only** (not HTML layouts), CMS compatibility is a non-issue. The `data-gs-zone` attribute works on any HTML element, on any CMS, behind any CDN, with any caching layer.

**Why caching doesn't matter:** gs.js runs client-side after the cached page loads — just like HubSpot, Intercom, or Google Analytics. The CMS caches the page with fallback text in zones. gs.js replaces text after load.

| CMS | Setup Time | How |
|---|---|---|
| **Any HTML** | 30 seconds | Paste script tag, add attributes |
| **WordPress** | 2 minutes | Script in theme head, zones in content |
| **Webflow** | 2 minutes | Script in custom code, zones via custom attributes |
| **Shopify** | 2 minutes | Script in theme.liquid, zones in sections |
| **Squarespace** | 2 minutes | Script in code injection, zones in blocks |
| **Wix** | 2 minutes | Script in custom code, zones in elements |
| **Next.js** | npm install | `@generative-sites/next` package with `<Zone>` component |
| **React / Vue** | npm install | Framework-native components |

### WordPress Example

No plugin required. Add the script in Appearance → Theme Editor → header.php:

```html
<script src="https://cdn.personize.com/gs.js" data-key="pk_live_..." async></script>
```

Then in any page or post, switch to the HTML editor:

```html
<h1 data-gs-zone="headline">Welcome to our law firm</h1>
<p data-gs-zone="service-area">Serving clients nationwide</p>
```

### Webflow Example

Site Settings → Custom Code → Footer Code:

```html
<script src="https://cdn.personize.com/gs.js" data-key="pk_live_..." async></script>
```

On any text element, add a custom attribute:
- Name: `data-gs-zone`
- Value: `headline`

---

## Campaign URL Generation

Generate unique URLs and encrypted tokens for your entire ABM list, then import them into any CRM or email tool.

```typescript
import { bakeCampaign, campaignToCSV } from '@generative-sites/bake';

const result = await bakeCampaign(contacts, {
  campaignId: 'q2-abm-enterprise',
  siteId: 'marketing-site',
  baseUrl: 'https://yoursite.com',
  zones: [
    { id: 'website_zones:hero_headline' },  // property zone — no LLM
    { id: 'website_zones:sub_headline' },   // property zone — no LLM
    { id: 'proof', prompt: 'Industry-specific social proof.' },
    { id: 'cta-text', prompt: 'CTA with their first name.' },
  ],
});

// Export CSV for CRM import
console.log(campaignToCSV(result));
// email,unique_url,token,slug
// sarah@acme.com,https://yoursite.com/for/sarah-chen-acme,eyJ1c2...,sarah-chen-acme
```

### CRM Integration

Store unique URLs and tokens as CRM contact properties, then use them in email templates:

**HubSpot:**
```
Custom property: gs_personalized_url
Email template:  <a href="{{contact.gs_personalized_url}}">See your personalized page</a>

Custom property: gs_token
Any link:        <a href="https://yoursite.com/pricing?gs={{contact.gs_token}}">View pricing</a>
```

**Salesforce / Outreach / Salesloft:** Same pattern — custom fields and merge variables.

### Bi-Directional Sync

```
CRM → Personize:   Contacts, companies, deal data (nightly + webhook)
Personize → CRM:   Engagement scores, pages visited, zones shown
```

---

## Memory Loop

Every visit makes the next one smarter. Generative Sites feeds engagement data back into Personize memory as human-readable narratives — not raw JSON.

```
Visit 1: Location + pages viewed
Visit 2: + returning visitor patterns + content interests
Visit 3: + form data + download signals + intent scoring
Visit 4: + CRM match + full profile + deal context
Visit 5: + zone engagement feedback (what messaging resonated)
Visit N: AI has a rich, multi-session narrative → smartDigest() returns the full picture
```

### What Gets Memorized

| Signal | Stored As |
|---|---|
| Page views | Narrative: "Visited /pricing and /enterprise on March 14" |
| Zone impressions | "Saw headline: 'Built for fintech teams' (tier: located)" |
| Zone engagement | "Spent 12s reading the proof zone, scrolled to CTA" |
| Form submissions | "Submitted demo request form with email sarah@acme.com" |
| Downloads | "Downloaded 'API Security Whitepaper'" |
| Identify events | "Identified as sarah@acme.com with traits: VP Engineering, Pro plan" |

Sensitive fields (`password`, `ssn`, `credit_card`, `cvv`, `secret`, `token`) are automatically redacted.

---

## Governance & Guardrails

Every piece of generated text is governed by your brand rules via Personize's `smartGuidelines()`. Set them once, they apply everywhere.

| Guardrail | What It Prevents |
|---|---|
| **Brand voice** | Off-tone copy that doesn't sound like you |
| **Approved claims** | Hallucinated stats, fake case studies, invented quotes |
| **Prohibited content** | Competitor mentions, specific ROI promises, legal claims |
| **Compliance rules** | Missing GDPR notices for EU visitors, HIPAA disclaimers |
| **Tier-appropriate tone** | Creepy personalization for visitors you shouldn't know about |
| **Fallback safety** | Broken pages — if anything fails, original text stays |

### XSS Prevention

gs.js uses `textContent` — never `innerHTML`. Generated content **cannot** execute scripts or inject markup. This is a fundamental design decision, not an afterthought.

### SEO

Fallback text IS the SEO content. Google indexes the default. Personalized text is for human visitors. This is the correct behavior — no cloaking, no duplicate content issues.

---

## Use Cases by Vertical

### B2B SaaS

| Use Case | Zones | ID Path |
|---|---|---|
| ABM landing pages | headline, proof, cta | Unique URL |
| Pricing page | headline, proof, cta | URL token or deanon |
| In-app dashboard | insight, recommendation, tip | Auth session |
| Blog sidebar | related-content, cta | Deanon + behavioral |

**Example:** Sarah is a Pro plan user with 14K API calls/month (up from 8K). When she logs into the dashboard:

```
zone: "dashboard-greeting"  → "Sarah, your API usage grew 40% this week"
zone: "usage-insight"       → "3 teammates haven't tried batch endpoints yet — share this guide?"
zone: "recommendation"      → "Teams your size typically upgrade to Enterprise for SSO and audit logs"
```

### E-Commerce (B2C)

| Use Case | Zones | ID Path |
|---|---|---|
| Homepage hero | headline, subheadline | Location + Retention.com |
| Product page | testimonial, proof | Location |
| Cart urgency | cta, shipping-note | Cookie (returning) |
| Win-back landing | headline, offer, cta | Unique URL |

**Example:** A visitor from Miami sees:

```
zone: "headline"     → "Same-day delivery in Miami"
zone: "proof"        → "4,200+ orders delivered in South Florida this month"
zone: "shipping"     → "Order by 2pm for delivery today"
```

### Local Services

| Use Case | Zones | ID Path |
|---|---|---|
| Service area text | headline, service-area | Location (free) |
| Testimonials | testimonial | Location |
| Campaign pages | headline, proof, cta | Unique URL |

**Example:** A Houston visitor to a law firm's website:

```
zone: "headline"     → "Serving greater Houston since 2005"
zone: "service-area" → "Offices in downtown Houston and The Woodlands"
zone: "testimonial"  → "Best employment lawyer in Harris County — saved our company"
```

### Agencies & Consultants

Offer **"We'll make your website generative"** as a service. One page template per client. Unique URLs for their ABM targets. No ongoing landing page creation.

---

## Architecture

### Repository Structure

```
generative-sites/
├── packages/
│   └── core/                    # Shared types, config, token, slug
│       └── src/
│           ├── types.ts         # VisitorIdentity, ZoneConfig, PropertyZoneRef
│           ├── config.ts        # defineConfig()
│           ├── token.ts         # AES-256-GCM token encryption
│           └── slug.ts          # URL-safe slug generation
│
├── server/                      # Edge API server
│   └── src/
│       ├── routes/
│       │   ├── stream.ts        # GET /api/gs/stream — SSE endpoint
│       │   ├── event.ts         # POST /api/gs/event — event ingestion
│       │   └── identify.ts      # POST /api/gs/identify — explicit ID
│       └── lib/
│           ├── identity.ts      # Visitor identification (3 paths)
│           ├── generate.ts      # Zone text generation via Personize
│           ├── property-zone.ts # Property zone resolution (no LLM)
│           └── memorize.ts      # Narrative memorization
│
├── pipelines/
│   └── bake/                    # Pre-generation pipeline
│       └── src/
│           ├── bake-contact.ts  # Single contact bake (property + generative)
│           ├── bake-campaign.ts # Batch bake + URL generation + CSV export
│           └── kv.ts            # KV store abstraction
│
├── adapters/
│   └── crm/
│       └── hubspot/             # HubSpot bi-directional sync
│
├── examples/
│   ├── abm-campaign/           # ABM with unique URLs + property zones
│   └── nextjs-saas/            # SaaS with auth session
│
├── docs/
│   └── property-zones.md       # Property zone setup guide
│
└── spec/
    └── api-contract.md          # SSE protocol specification
```

### gs.js Client API

```javascript
// Identification (for SaaS apps)
GS.identify('sarah@acme.com', {
  firstName: 'Sarah',
  company: 'Acme Corp',
  plan: 'pro',
});

// Event tracking (for better personalization)
GS.track('feature_used', { feature: 'batch-api' });
GS.track('pricing_viewed', { plan: 'enterprise' });

// Consent integration
GS.consent({
  essential: ['geo'],
  requireConsent: {
    analytics: ['tracking', 'zone-impressions'],
    marketing: ['deanon', 'crm-sync'],
  },
  autoDetect: true,  // OneTrust, CookieBot, Osano
});

// Zone control
GS.refresh('headline');     // Re-render a specific zone
GS.pause();                 // Pause all personalization
GS.resume();                // Resume

// Callbacks
GS.on('zone:render', ({ zone, text, tier }) => { ... });
GS.on('tier:upgrade', ({ newTier, reason }) => { ... });

// Debug
GS.debug();  // Returns current VisitorIdentity
```

### SSE Protocol

gs.js communicates with the edge API over Server-Sent Events. The protocol is defined in [spec/api-contract.md](spec/api-contract.md).

```
event: meta
data: {"tier":"located","location":{"city":"Austin","region":"TX","country":"US"},"uid":"abc123"}

event: zone
data: {"zone":"headline","text":"Trusted by teams across Texas","tier":"located","mode":"stream"}

event: zone
data: {"zone":"cta-text","text":"Get started today","tier":"located","mode":"stream"}

event: done
data: {"zones":["headline","cta-text"],"duration_ms":1240}
```

---

## Privacy & Consent

**No built-in consent manager.** GS integrates with your existing consent solution and degrades gracefully.

| Consent Level | What Happens |
|---|---|
| **No consent** | Show original fallback text. No cookies, no tracking. |
| **Essential** | Location personalization. First-party cookie. |
| **Analytics** | + Behavioral tracking + returning visitor detection |
| **Marketing** | + Deanonymization + CRM sync + full personalization |

Deterministic paths (unique URL, URL token, auth session) represent intentional visits from known contacts — typically covered under legitimate interest or existing CRM consent.

---

## Why Content Only?

This is the core design decision that makes everything else work.

GS delivers **plain text strings** — not HTML, not layouts, not components. The LLM writes copy (what it's good at). The designer designs (what they're good at).

| Benefit | Why It Matters |
|---|---|
| No CSS conflicts | Text inherits the host site's styling automatically |
| No responsive issues | The zone container handles responsive — GS just fills in words |
| No XSS risk | `textContent` only — generated text can't execute code |
| No CMS conflicts | Client-side text replacement works behind any cache layer |
| No design QA | Zones look identical to fallback — you're only reviewing copy |
| 10-50x cheaper | Text tokens vs HTML layout tokens |
| Works everywhere | Any HTML element, any CMS, any framework |

---

## Examples

### ABM Campaign with Property Zones

See [examples/abm-campaign/](examples/abm-campaign/) — a complete ABM campaign using both property zones (from Personize memory) and generative zones (AI-written).

```html
<!-- Property zones — instant, from memory -->
<h1 data-gs-zone="website_zones:hero_headline">See how we can help</h1>
<p data-gs-zone="website_zones:sub_headline">Built for teams who ship fast</p>

<!-- Generative zones — AI-written -->
<span data-gs-zone="cta-text">Book a Demo</span>
<p data-gs-zone="proof">Trusted by 500+ companies</p>
```

### SaaS Dashboard

See [examples/nextjs-saas/](examples/nextjs-saas/) — a Next.js SaaS app with auth session identification.

```tsx
<h1 data-gs-zone="dashboard-greeting">Welcome back</h1>
<p data-gs-zone="usage-insight">Here's your usage summary.</p>
<div data-gs-zone="recommendation">Check out our latest features.</div>
```

---

## Configuration

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PERSONIZE_SECRET_KEY` | Yes | Personize secret key (server-side only) |
| `GS_TOKEN_SECRET` | For URL tokens | 256-bit key for AES-256-GCM token encryption |

### Zone Attributes

| Attribute | Required | Description |
|---|---|---|
| `data-gs-zone` | Yes | Zone ID (e.g. `headline`) or property reference (`collection:property`) |
| `data-gs-prompt` | No | Custom generation prompt for this zone |
| `data-gs-mode` | No | `auto` (default), `bake`, or `stream` |

### Config File (Power Users)

```typescript
// gs.config.ts
import { defineConfig } from '@generative-sites/core';

export default defineConfig({
  personize: { secretKey: process.env.PERSONIZE_SECRET_KEY },
  zones: {
    headline: {
      prompt: 'Hero headline, max 10 words. Industry-specific if known.',
      mode: 'auto',
      maxTokens: 50,
      refreshOn: ['identify'],
    },
  },
  bake: {
    kvAdapter: 'cloudflare',
    ttlSeconds: 30 * 24 * 60 * 60,  // 30 days
  },
  token: {
    secret: process.env.GS_TOKEN_SECRET,
    maxAgeDays: 90,
  },
});
```

---

## API Reference

See [spec/api-contract.md](spec/api-contract.md) for the full SSE protocol specification.

| Endpoint | Method | Description |
|---|---|---|
| `/api/gs/stream` | GET | SSE stream — zone content delivery |
| `/api/gs/event` | POST | Batched event ingestion |
| `/api/gs/identify` | POST | Explicit visitor identification |

---

## Roadmap

- [ ] Deanonymization adapters (Clearbit, RB2B, Retention.com)
- [ ] Mid-session tier upgrades with zone re-rendering
- [ ] Consent bridge (OneTrust, CookieBot auto-detection)
- [ ] React / Next.js / Vue packages with native components
- [ ] Preview mode (`?gs_preview=email@company.com`)
- [ ] A/B testing (personalized vs fallback conversion tracking)
- [ ] Self-host (Docker + Cloudflare Worker)
- [ ] Analytics dashboard (zone render rates, latency, engagement)

---

## License

MIT

---

**Generative Sites** is built on [Personize](https://personize.com) — the memory and intelligence layer for AI applications.
