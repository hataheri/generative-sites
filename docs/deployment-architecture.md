# Deployment Architecture — Who Hosts What

## The Split

Generative Sites has a clean separation between **Personize-managed infrastructure** (the platform) and **user-managed code** (their pipelines, adapters, and config).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   PERSONIZE MANAGES (hosted, managed, zero user ops)                        │
│                                                                             │
│   ┌──────────────┐   ┌───────────────────────┐   ┌──────────────────────┐  │
│   │              │   │                       │   │                      │  │
│   │   gs.js      │   │   GS Edge API         │   │   Personize Core     │  │
│   │   on CDN     │   │   (SSE endpoint)      │   │                      │  │
│   │              │   │                       │   │   Memory (memorize,  │  │
│   │   Browser    │   │   Identity resolution │   │   recall, digest)    │  │
│   │   SDK        │   │   Zone generation     │   │                      │  │
│   │              │   │   Property zone lookup │   │   AI (prompt,        │  │
│   │              │   │   Event ingestion      │   │   smartGuidelines)   │  │
│   │              │   │   Memorization loop    │   │                      │  │
│   │              │   │   Baked content KV     │   │   Governance rules   │  │
│   │              │   │   Deanon orchestration │   │                      │  │
│   │              │   │                       │   │   Billing/usage       │  │
│   └──────────────┘   └───────────────────────┘   └──────────────────────┘  │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   USER MANAGES (runs locally, in CI, or on their infra)                     │
│                                                                             │
│   ┌──────────────┐   ┌───────────────────────┐   ┌──────────────────────┐  │
│   │              │   │                       │   │                      │  │
│   │  Bake        │   │   CRM Adapters        │   │   Website / CMS     │  │
│   │  Pipeline    │   │                       │   │                      │  │
│   │              │   │   HubSpot sync         │   │   Add script tag    │  │
│   │  Run locally │   │   Salesforce sync      │   │   Add data-gs-zone  │  │
│   │  or in CI    │   │   CSV import           │   │   attributes        │  │
│   │              │   │                       │   │                      │  │
│   │  Generates:  │   │   Run locally, cron,   │   │   No code changes   │  │
│   │  - URLs      │   │   or via pipeline      │   │   beyond HTML       │  │
│   │  - Tokens    │   │                       │   │   attributes         │  │
│   │  - Baked text │   │                       │   │                      │  │
│   └──────────────┘   └───────────────────────┘   └──────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Layer by Layer

### Layer 1: gs.js — Personize CDN

**Hosted by:** Personize
**URL:** `https://cdn.personize.com/gs.js`
**User action:** Paste one script tag

```html
<script src="https://cdn.personize.com/gs.js" data-key="pk_live_..." async></script>
```

**Why Personize hosts this:**
- One script tag, zero build step (like HubSpot, Intercom, GA)
- Auto-updates — bug fixes and features ship without user redeployment
- Works on any CMS, any page, anywhere JS runs
- ~5kb gzipped, loaded async, non-blocking

**What gs.js does:**
- Discovers `data-gs-zone` elements in the DOM
- Determines identification path (auth, unique URL, token, location)
- Opens SSE connection to the GS Edge API
- Replaces `textContent` in zones (never innerHTML — zero XSS risk)
- Tracks engagement, batches events, flushes every 5s
- Cookie management for returning visitors

**User has zero maintenance burden.** They paste the script tag and forget about it.

---

### Layer 2: GS Edge API — Personize Infrastructure

**Hosted by:** Personize (on edge network)
**Endpoint:** `https://gs.personize.com/api/gs/stream` (or custom domain)
**User action:** None — gs.js connects to this automatically using `data-key`

**What the Edge API does:**

| Endpoint | Function | Who Calls It |
|---|---|---|
| `GET /api/gs/stream` | SSE — streams personalized zone text | gs.js (browser) |
| `POST /api/gs/event` | Batched event ingestion | gs.js (browser) |
| `POST /api/gs/identify` | Explicit identification | gs.js (browser) |
| `POST /api/gs/bake` | Accepts baked content from pipeline | Bake pipeline (user) |

**What happens inside the Edge API:**

```
Request arrives from gs.js
  │
  ├─ Identity Resolution
  │    ├─ Auth (window.__GS_USER__) → tier: known
  │    ├─ Unique URL (/for/:slug) → slug lookup → tier: known
  │    ├─ URL token (?gs=...) → decrypt → tier: known
  │    ├─ Deanon (Clearbit, RB2B) → tier: account or contact
  │    └─ Location (edge headers) → tier: located
  │
  ├─ Content Resolution
  │    ├─ Check KV for baked content → if hit, serve instantly (<10ms)
  │    ├─ Property zones → recall() from Personize memory (no LLM)
  │    └─ Generative zones → smartGuidelines + smartDigest + prompt()
  │
  ├─ Stream zone text via SSE
  │
  └─ Memorize engagement (async, non-blocking)
```

**Why Personize hosts this:**
- Latency — edge network, close to visitors globally
- Reliability — retries, circuit breakers, rate limiting handled
- Security — public key scoping, secret key never exposed
- Billing — zone render = API call = existing usage model
- KV storage — baked content stored at edge, managed by Personize
- Deanon orchestration — API keys for Clearbit/RB2B stored server-side
- Zero ops for the user

**User has zero maintenance burden.** The edge API is Personize infrastructure.

---

### Layer 3: Personize Core — Personize Cloud

**Hosted by:** Personize (existing cloud infrastructure)
**User action:** Get a Personize account + API key

This is the existing Personize platform that powers GS:

| Service | Used For |
|---|---|
| `memory.memorize()` | Store visitor events, session narratives, bake events |
| `memory.recall()` | Property zone resolution, slug→contact lookup |
| `memory.smartDigest()` | Assemble contact context for zone generation |
| `memory.memorizeBatch()` | CRM sync (bulk contact import) |
| `ai.smartGuidelines()` | Brand voice, approved claims, compliance rules |
| `ai.prompt()` | Generate personalized zone text |
| Public key management | `pk_live_*` / `pk_test_*` scoped to sites |

**User configures governance** (brand voice, rules) via Personize dashboard or governance API. These rules apply to all zone generation automatically.

---

### Layer 4: Bake Pipeline — User Runs

**Hosted by:** User (local machine, CI/CD, cron job, Trigger.dev)
**User action:** Run the bake script when they want to pre-generate content

```bash
# Run locally
npx tsx bake-and-run.ts

# Or in CI (e.g., GitHub Actions)
# Or on a cron (e.g., nightly refresh)
# Or via Trigger.dev (event-driven: new lead → bake)
```

**What the bake pipeline does:**
1. Takes a list of contacts (from CRM adapter or CSV)
2. For each contact:
   - Generates slug + encrypted token
   - Property zones → fetches from Personize memory (no LLM)
   - Generative zones → one `prompt()` call per contact
3. Uploads baked content to Personize Edge KV (via API)
4. Stores slug→email mapping in Personize memory
5. Exports CSV with URLs + tokens for CRM import

**Why the user runs this:**
- They control their contact lists
- They decide when to bake (campaign launch, nightly, on deal-stage change)
- They configure which zones are property vs generative
- Their CRM credentials stay on their machine

**The bake pipeline calls Personize APIs** — it doesn't run its own server. It's a script, not a service.

---

### Layer 5: CRM Adapters — User Runs

**Hosted by:** User (alongside bake pipeline)
**User action:** Install adapter, configure credentials, run sync

```typescript
import { HubSpotAdapter } from '@generative-sites/crm-hubspot';

const adapter = new HubSpotAdapter({
  hubspotToken: process.env.HUBSPOT_TOKEN,
  personizeSecretKey: process.env.PERSONIZE_SECRET_KEY,
  siteBaseUrl: 'https://yoursite.com',
});

// Sync contacts from HubSpot → Personize memory
await adapter.syncContactsToPersonize();

// Generate URLs + tokens → store back in HubSpot
await adapter.generateURLsForContacts();
```

**Why the user runs this:**
- Their CRM credentials stay local
- They control sync frequency and scope
- They choose which contacts to personalize
- They can run it manually, via cron, or via webhook trigger

---

### Layer 6: Deanon Adapters — Personize Edge (User Configures)

**Hosted by:** Personize Edge API
**User action:** Configure which deanon providers to use + provide API keys

This is a nuance. Deanon adapters (Clearbit, RB2B, 6sense) run **server-side in the Edge API** — they need the visitor's IP address, which is only available server-side.

The user provides their deanon API keys via Personize dashboard or config:

```
Personize Dashboard → Generative Sites → Deanon Providers
  ├─ Clearbit: [API key] ✓ enabled
  ├─ RB2B: [API key] ✓ enabled
  └─ 6sense: [API key] ○ disabled
```

Or via config at bake time:
```typescript
export default defineConfig({
  identify: [
    { provider: 'clearbit', priority: 1 },
    { provider: 'rb2b', priority: 2 },
  ],
});
```

**The adapter code ships with the Edge API** (part of Personize infrastructure). The user just provides API keys and priority order.

---

### Layer 7: Website / CMS — User Manages

**Hosted by:** User (their website, any CMS)
**User action:** Add `data-gs-zone` attributes to HTML elements

```html
<!-- The user adds these attributes to their existing HTML -->
<h1 data-gs-zone="headline">Welcome to our platform</h1>
<p data-gs-zone="website_zones:hero_headline">Built for teams</p>
<span data-gs-zone="cta-text">Get Started</span>
```

No code changes beyond HTML attributes. Works on WordPress, Webflow, Shopify, custom code — anything that renders HTML.

---

## Summary: The Ownership Matrix

| Component | Hosted By | User Action | User Ops Burden |
|---|---|---|---|
| **gs.js** | Personize CDN | Paste script tag | Zero |
| **GS Edge API** | Personize edge | None (auto via `data-key`) | Zero |
| **Personize Memory/AI** | Personize cloud | Get API key | Zero |
| **KV (baked content)** | Personize edge | None (bake pipeline uploads) | Zero |
| **Deanon adapters** | Personize edge | Provide API keys + config | Minimal |
| **Bake pipeline** | User (local/CI) | Run when needed | Low |
| **CRM adapters** | User (local/CI) | Install, configure, run | Low |
| **Website zones** | User (their CMS) | Add HTML attributes | Zero |
| **Governance rules** | Personize dashboard | Configure brand voice | Minimal |

---

## What This Means for the Repo

The open-source repo (`generative-sites/`) contains code that lives in **two places**:

### Code that becomes Personize infrastructure

These files are the **reference implementation**. They get deployed as part of Personize's managed service. Users never touch them directly.

```
server/                          → Becomes the GS Edge API (Personize-hosted)
  src/routes/stream.ts           → GET /api/gs/stream (SSE)
  src/routes/event.ts            → POST /api/gs/event
  src/routes/identify.ts         → POST /api/gs/identify
  src/lib/identity.ts            → Visitor identity resolution
  src/lib/generate.ts            → Zone text generation
  src/lib/property-zone.ts       → Property zone resolution
  src/lib/slug-resolver.ts       → Slug→contact mapping
  src/lib/memorize.ts            → Session narrative memorization

packages/gs-js/gs.js             → Hosted on cdn.personize.com/gs.js

adapters/identify/clearbit/      → Runs inside Edge API (user provides key)
adapters/identify/rb2b/          → Runs inside Edge API (user provides key)
adapters/kv/cloudflare/          → Edge KV backend (Personize infra)
```

### Code that users install and run

These are **npm packages and scripts** users install, configure, and execute in their own environment.

```
packages/core/                   → npm: @generative-sites/core
                                    Users import types, config helpers, token utils

pipelines/bake/                  → npm: @generative-sites/bake
                                    Users run bake pipeline locally or in CI

adapters/crm/hubspot/            → npm: @generative-sites/crm-hubspot
adapters/crm/salesforce/         → npm: @generative-sites/crm-salesforce
adapters/crm/csv/                → npm: @generative-sites/crm-csv
                                    Users install the adapter for their CRM

examples/                        → Reference implementations
                                    Users copy and adapt

docs/                            → Documentation
```

### Self-host option (enterprise)

For enterprise customers who need to run everything on their own infrastructure:

```
server/                          → Self-host as Docker container or Cloudflare Worker
adapters/kv/redis/               → Use their own Redis for baked content
adapters/kv/cloudflare/          → Use their own Cloudflare KV namespace
```

The self-host option uses the exact same code — they just deploy the Edge API themselves instead of using Personize's hosted version.

---

## The User Journey

### Step 1: Try It (2 minutes, zero hosting)

```html
<!-- Add to any page -->
<script src="https://cdn.personize.com/gs.js" data-key="pk_live_..." async></script>
<h1 data-gs-zone="headline">Welcome</h1>
```

Everything is Personize-hosted. User just adds HTML attributes. Location personalization works immediately.

### Step 2: Connect CRM (30 minutes, user runs locally)

```bash
npm install @generative-sites/core @generative-sites/crm-hubspot
```

```typescript
// sync.ts — run locally or as a cron job
const adapter = new HubSpotAdapter({ ... });
await adapter.syncContactsToPersonize();
```

User installs CRM adapter, runs sync script. Now zone generation uses CRM data.

### Step 3: Run ABM Campaign (1 hour, user runs locally)

```bash
npm install @generative-sites/bake
npx tsx bake-campaign.ts
```

User runs bake pipeline locally. Generates URLs + tokens. Imports CSV into email tool. Sends campaign. When prospects visit, they see pre-baked personalized content instantly.

### Step 4: Enable Deanon (5 minutes, Personize dashboard)

```
Personize Dashboard → Generative Sites → Deanon
  Add Clearbit API key: sk_live_...
  Priority: 1
```

User provides their deanon API keys via Personize dashboard. Edge API starts identifying anonymous visitors automatically.

### Step 5: Scale (ongoing, user manages pipelines)

- Nightly CRM sync (cron job or Trigger.dev task)
- Re-bake on deal-stage change (webhook → bake)
- Add more zones to more pages
- Refine governance rules
