# Integrations Guide

How Generative Sites connects to your existing stack. Every integration follows the same pattern: data flows into Personize memory (the brain), GS reads it at serve time to personalize zones.

---

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                     │
│   YOUR EXISTING STACK                      GENERATIVE SITES                          │
│                                                                                     │
│   ┌──────────────┐    contacts, deals      ┌────────────────────┐                    │
│   │ CRM          │ ──────────────────────► │                    │                    │
│   │ HubSpot      │ ◄────────────────────── │   Personize        │                    │
│   │ Salesforce   │    engagement, scores   │   Memory           │                    │
│   │ Pipedrive    │                         │                    │    ┌──────────┐    │
│   └──────────────┘                         │  smartDigest()     │───►│          │    │
│                                            │  recall()          │    │  GS Edge │    │
│   ┌──────────────┐    company, industry    │  memorize()        │    │  API     │    │
│   │ Deanon       │ ──────────────────────► │                    │◄───│          │    │
│   │ Clearbit     │                         │                    │    │  stream  │    │
│   │ RB2B         │                         ├────────────────────┤    │  event   │    │
│   │ 6sense       │                         │                    │    │  identify│    │
│   └──────────────┘                         │   Personize        │    └────┬─────┘    │
│                                            │   AI + Governance  │         │          │
│   ┌──────────────┐    URLs, tokens         │                    │         │          │
│   │ Email/ABM    │ ◄────────────────────── │  smartGuidelines() │    ┌────▼─────┐    │
│   │ Outreach     │                         │  prompt()          │    │          │    │
│   │ Salesloft    │                         │                    │    │  gs.js   │    │
│   │ Apollo       │                         └────────────────────┘    │  (browser│    │
│   └──────────────┘                                                   │  SDK)    │    │
│                                                                      └──────────┘    │
│   ┌──────────────┐    page views, zones                                              │
│   │ Analytics    │ ◄─────────────────────── (from memorize loop)                     │
│   │ GA4          │                                                                   │
│   │ Segment      │                                                                   │
│   │ Mixpanel     │                                                                   │
│   └──────────────┘                                                                   │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. CRM Adapters

CRM adapters sync contact/company data bi-directionally:
- **Inbound:** CRM → Personize memory (contacts, companies, deals, lifecycle stage)
- **Outbound:** Personize → CRM (engagement scores, pages visited, personalization tier)
- **URLs:** Generate unique URLs + tokens, store as CRM contact properties

Every CRM adapter implements the same interface:

```typescript
interface CRMAdapter {
  // CRM → Personize: sync contacts into memory
  syncContactsToPersonize(options?: { limit?: number; listId?: string }): Promise<{ synced: number }>;

  // Personize → CRM: push engagement data back
  pushEngagementToCRM(email: string, engagement: EngagementData): Promise<void>;

  // Generate unique URLs + tokens and store in CRM
  generateURLsForContacts(options?: { contactIds?: string[]; campaignId?: string }): Promise<{ updated: number }>;

  // Get contacts as CampaignContact list (for bake pipeline)
  getContactsForCampaign(options?: { listId?: string; limit?: number }): Promise<CampaignContact[]>;
}
```

### HubSpot (Built)

```
adapters/crm/hubspot/
```

**Status:** Complete. Bi-directional sync, URL generation, engagement push-back.

**Properties synced IN (HubSpot → Personize):**
- email, firstname, lastname, company, jobtitle
- lifecyclestage, hs_lead_status, industry

**Properties written BACK (Personize → HubSpot):**
- `gs_personalized_url` — unique URL for email templates
- `gs_token` — encrypted token for any-page links
- `gs_campaign` — campaign identifier
- `gs_engagement_score` — computed engagement score
- `gs_last_visit` — last visit timestamp
- `gs_tier` — personalization tier achieved

**Usage in email templates:**
```
<a href="{{contact.gs_personalized_url}}">See your personalized page</a>
<a href="https://yoursite.com/pricing?gs={{contact.gs_token}}">View pricing</a>
```

### Salesforce (To Build)

```
adapters/crm/salesforce/
```

**Adapter pattern:** Same interface as HubSpot, different API.

**Data flow:**
- Inbound: Contact, Account, Opportunity → Personize memory
- Outbound: Custom fields on Contact → `GS_Personalized_URL__c`, `GS_Token__c`, `GS_Engagement_Score__c`
- Deal context: Opportunity stage, amount, close date → enriches zone generation

**Key differences from HubSpot:**
- Uses `jsforce` or `@salesforce/sf-rest-api` instead of `@hubspot/api-client`
- Account ↔ Company mapping (Salesforce separates Contact and Account)
- Opportunity data feeds deal-aware personalization ("Sarah, your POC is scheduled for next Tuesday")
- Supports Salesforce Flow triggers (deal stage change → rebake zones)

**Why it matters:** Salesforce is the CRM for enterprise. ABM teams running Generative Sites will expect this.

### Pipedrive (To Build)

```
adapters/crm/pipedrive/
```

**Data flow:**
- Inbound: Person, Organization, Deal → Personize memory
- Outbound: Custom fields on Person → personalized URL, token, engagement
- Deal pipeline stages → trigger rebake

**Why it matters:** Popular with SMB sales teams. Lower barrier to entry than Salesforce.

### Attio (To Build)

```
adapters/crm/attio/
```

**Why it matters:** Modern CRM with API-first design. Growing fast among startups and GTM engineers — the exact audience for Generative Sites.

### Generic CSV / API (To Build)

```
adapters/crm/csv/
```

For teams without a supported CRM. Import a CSV of contacts → generate URLs + tokens → export CSV with URLs for manual import.

```typescript
// csv-import.ts
import { importCSV, exportCampaignCSV } from '@generative-sites/crm-csv';

const contacts = await importCSV('./contacts.csv', {
  emailColumn: 'Email',
  firstNameColumn: 'First Name',
  companyColumn: 'Company',
});

const result = await bakeCampaign(contacts, { ... });
const csv = exportCampaignCSV(result);
// → email, unique_url, token, slug
```

---

## 2. Deanonymization Adapters

Deanon adapters identify anonymous visitors by IP/fingerprint. They run server-side in the GS Edge API after location resolution but before zone generation.

Every deanon adapter implements:

```typescript
interface IdentifyAdapter {
  name: string;
  type: 'account' | 'contact';       // company-level or person-level
  market: 'b2b' | 'b2c' | 'both';
  consentCategory: 'analytics' | 'marketing';

  identify(request: IdentifyRequest): Promise<IdentitySignal | null>;
}

interface IdentifyRequest {
  ip: string;
  headers: Record<string, string | undefined>;
  url: string;
  referrer?: string;
  uid?: string;
}

interface IdentitySignal {
  tier: 'account' | 'contact';
  confidence: number;    // 0.0 - 1.0
  contact?: { email, firstName, lastName, company, title };
  company?: { name, domain, industry, size };
}
```

### Clearbit Reveal (To Build)

```
adapters/identify/clearbit/
```

**Type:** B2B account-level (company, not person)
**What it returns:** Company name, domain, industry, employee count, tech stack
**Consent:** Marketing consent required
**Cost:** Per-lookup pricing

**How it fits in GS:**
```
Anonymous visitor from IP 12.34.56.78
  → Clearbit: "This is Dell Technologies, hardware, 150K employees, Austin TX"
  → Tier upgrades from "located" to "account"
  → Zones: "Built for enterprise hardware teams" instead of "Built for teams in Austin"
```

### RB2B (To Build)

```
adapters/identify/rb2b/
```

**Type:** B2B contact-level (actual person)
**What it returns:** Email, name, title, company, LinkedIn URL
**Consent:** Marketing consent required
**Cost:** Per-identified-visitor pricing

**How it fits in GS:**
```
Anonymous visitor
  → RB2B: "This is Sarah Chen, VP Engineering at Dell, sarah@dell.com"
  → Tier upgrades from "located" to "known"
  → Zones get full personalization with name + company + role
  → Contact is memorized to Personize → baked for next visit
```

### 6sense (To Build)

```
adapters/identify/6sense/
```

**Type:** B2B account-level + intent data
**What it returns:** Company, industry, buying stage, intent topics
**Unique value:** Knows what the company is researching ("actively evaluating API platforms")

**How it fits in GS:**
```
Anonymous visitor
  → 6sense: "Acme Corp, evaluating API platforms, high buying intent"
  → Zones: "See why Acme's peers chose us for API management"
  → Intent topics feed into prompt context → hyper-relevant copy
```

### Warmly (To Build)

```
adapters/identify/warmly/
```

**Type:** B2B account + contact (combines Clearbit-style reveal with person-level)
**Unique value:** Also reveals LinkedIn profile + job changes

### Retention.com / Customers.ai (To Build)

```
adapters/identify/retention/
```

**Type:** B2C contact-level
**What it returns:** Email, name (for returning consumers)
**Consent:** Marketing consent required

**How it fits in GS:**
```
Anonymous e-commerce visitor
  → Retention.com: "This is Lisa Park, lisa@gmail.com, returning customer"
  → Zones: "Welcome back, Lisa — 20% off items in your wishlist"
```

### Deanon Waterfall (To Build)

Most teams use multiple deanon providers. GS should support running them in priority order and stopping at the first match:

```typescript
// gs.config.ts
export default defineConfig({
  identify: [
    // Try each in order, stop at first match
    { adapter: 'rb2b', priority: 1 },       // contact-level first
    { adapter: 'clearbit', priority: 2 },    // account-level fallback
    { adapter: 'geo', priority: 3 },         // always available, free
  ],
});
```

---

## 3. Email & Campaign Tools

These aren't adapters with code — they're **integrations via data**. The bake pipeline generates URLs and tokens, which get stored in the CRM, which feeds them into email templates.

### How any email tool connects

```
┌────────────┐     bake pipeline      ┌──────────┐     CRM custom      ┌────────────┐
│ Contact    │ ───────────────────►   │ CRM      │     fields          │ Email Tool │
│ List       │     generates:         │ HubSpot  │ ──────────────────► │ Outreach   │
│            │     - unique URL       │ Salesforce│   gs_personalized  │ Salesloft  │
│            │     - encrypted token  │          │   _url, gs_token   │ Apollo     │
└────────────┘                        └──────────┘                     └────────────┘
```

**The key insight:** GS doesn't need an adapter for each email tool. It stores URLs/tokens in the CRM. The email tool reads CRM properties as merge variables. This works with:

| Tool | How It Uses GS URLs |
|---|---|
| **HubSpot Sequences** | `{{contact.gs_personalized_url}}` in email body |
| **Outreach** | `{{gs_personalized_url}}` custom variable in sequence steps |
| **Salesloft** | `{{gs_personalized_url}}` cadence variable |
| **Apollo** | Custom field mapping in sequence templates |
| **Mailchimp** | `*|GS_URL|*` merge tag from synced audience |
| **Customer.io** | `{{customer.gs_personalized_url}}` in campaigns |
| **Braze** | Connected Content or custom attribute |
| **Any tool** | If it can read CRM custom fields, it works |

### Direct integration (no CRM)

For teams not using a CRM, the bake pipeline exports CSV:

```
email,unique_url,token,slug
sarah@acme.com,https://yoursite.com/for/sarah-chen-acme,eyJ1c2...,sarah-chen-acme
```

Import this CSV into any email tool as a contact list with custom fields.

---

## 4. Edge / KV Store Adapters

Where pre-baked zone content is stored and served from. The KV abstraction is built — only the in-memory implementation exists.

```typescript
interface KVStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
}
```

### Memory (Built)

Dev/testing only. Content lost on server restart.

### Cloudflare KV (To Build)

```
adapters/kv/cloudflare/
```

**Why:** Global edge network, sub-millisecond reads, native Workers integration.
**SDK:** `@cloudflare/workers-types` — KV binding in Workers environment.

### Vercel KV (To Build)

```
adapters/kv/vercel/
```

**Why:** Native for Next.js deployments on Vercel. Redis-backed.
**SDK:** `@vercel/kv`

### Redis (To Build)

```
adapters/kv/redis/
```

**Why:** Self-host option. Works with any cloud provider.
**SDK:** `ioredis` or `redis`

### Upstash (To Build)

```
adapters/kv/upstash/
```

**Why:** Serverless Redis. Works at edge (HTTP-based, no TCP connection needed). Compatible with Cloudflare Workers, Vercel Edge, Deno Deploy.
**SDK:** `@upstash/redis`

---

## 5. Consent Manager Integrations

gs.js needs to detect existing consent managers and degrade gracefully. These are client-side integrations in gs.js, not server-side adapters.

### How consent flows

```
Visitor arrives
  │
  ├─ gs.js checks: does a consent manager exist?
  │    ├─ OneTrust detected → read consent categories
  │    ├─ CookieBot detected → read consent state
  │    ├─ Osano detected → read consent choices
  │    └─ None → check GS.consent() config or assume essential-only
  │
  ├─ Map consent to GS features:
  │    ├─ Essential:  location personalization, first-party cookie
  │    ├─ Analytics:  event tracking, behavioral data, zone impressions
  │    └─ Marketing:  deanon adapters, CRM sync, full personalization
  │
  └─ Degrade gracefully: blocked features → show fallback text for those zones
```

### Supported (To Build in gs.js)

| Manager | Detection | API |
|---|---|---|
| **OneTrust** | `window.OneTrust` or `window.OptanonActiveGroups` | Category-based consent |
| **CookieBot** | `window.Cookiebot` | `Cookiebot.consent.marketing` |
| **Osano** | `window.Osano` | `Osano.cm.getConsent()` |
| **TrustArc** | `window.truste` | `truste.eu.bindMap` |
| **Custom** | `GS.consent({ ... })` | Manual config |

---

## 6. Analytics Integrations

GS tracks zone renders, engagement, and tier upgrades internally via Personize memorize(). For teams that want this data in their analytics stack, gs.js should fire events to external systems.

### How analytics connects

```typescript
// In gs.js, after a zone renders:
GS.on('zone:render', function(data) {
  // Google Analytics 4
  if (window.gtag) {
    gtag('event', 'gs_zone_render', {
      zone_id: data.zone,
      tier: data.tier,
      mode: data.mode,
    });
  }

  // Segment
  if (window.analytics) {
    analytics.track('Zone Rendered', {
      zone: data.zone,
      text: data.text,
      tier: data.tier,
    });
  }

  // Mixpanel
  if (window.mixpanel) {
    mixpanel.track('GS Zone Render', {
      zone: data.zone,
      tier: data.tier,
    });
  }
});
```

**These don't need adapters** — they're callback patterns. The user wires them in their own code via `GS.on()`. We should document the patterns.

---

## 7. CMS Platform Guides

Not adapters — documentation for how to install on each platform.

| Platform | Script Installation | Zone Setup | Guide Status |
|---|---|---|---|
| **WordPress** | Theme header or plugin | HTML editor → add attributes | In README |
| **Webflow** | Site Settings → Custom Code | Custom attributes on elements | In README |
| **Shopify** | `theme.liquid` | Section schema + zone attributes | To Document |
| **Squarespace** | Code Injection | Custom code blocks | To Document |
| **Wix** | Custom Code (Velo) | Velo editor | To Document |
| **HubSpot CMS** | Design Manager or module | HubL template + attributes | To Document |
| **Ghost** | Code Injection | Post HTML | To Document |
| **Next.js** | `@generative-sites/next` package | `<Zone>` component | Planned (Phase 4) |
| **React** | `@generative-sites/react` package | `<Zone>` component | Planned (Phase 4) |
| **Vue** | `@generative-sites/vue` package | `<GsZone>` component | Planned (Phase 4) |

---

## Integration Priority Matrix

Ranked by customer demand and implementation effort:

| Priority | Integration | Category | Effort | Impact |
|---|---|---|---|---|
| **P0** | Salesforce CRM | CRM | Medium | High — enterprise customers |
| **P0** | Clearbit Reveal | Deanon | Small | High — unlocks account-tier for all B2B |
| **P0** | Cloudflare KV | Edge/KV | Small | High — production deployment |
| **P1** | RB2B | Deanon | Small | High — unlocks contact-tier without auth |
| **P1** | Redis / Upstash | Edge/KV | Small | High — self-host production |
| **P1** | OneTrust consent | Consent | Small | Medium — enterprise compliance |
| **P1** | CSV import/export | CRM | Small | Medium — no-CRM teams |
| **P2** | 6sense | Deanon | Medium | Medium — intent data is powerful |
| **P2** | Pipedrive | CRM | Medium | Medium — SMB market |
| **P2** | Attio | CRM | Medium | Medium — modern CRM market |
| **P2** | Vercel KV | Edge/KV | Small | Medium — Next.js deployments |
| **P3** | Warmly | Deanon | Small | Low — niche B2B |
| **P3** | Retention.com | Deanon | Small | Medium — B2C market |
| **P3** | Shopify guide | CMS | Docs only | Medium — e-commerce use case |
| **P3** | HubSpot CMS guide | CMS | Docs only | Medium — HubSpot ecosystem |

---

## Writing a New Adapter

### CRM Adapter Template

```typescript
// adapters/crm/YOUR_CRM/src/index.ts
import { Personize } from '@personize/sdk';
import { generateSlug } from '@generative-sites/core';
import { generateContactToken } from '@generative-sites/core';
import type { CampaignContact } from '@generative-sites/core';

interface AdapterConfig {
  crmApiKey: string;
  personizeSecretKey: string;
  tokenSecret?: string;
  siteBaseUrl: string;
}

export class YourCRMAdapter {
  constructor(config: AdapterConfig) { ... }

  // 1. Sync contacts from CRM → Personize memory
  async syncContactsToPersonize(): Promise<{ synced: number }> {
    // Fetch contacts from CRM API
    // Map to { email, data: { firstName, lastName, company, ... } }
    // Call personize.memory.memorizeBatch({ records, collectionName })
  }

  // 2. Generate URLs + tokens → store back in CRM
  async generateURLsForContacts(): Promise<{ updated: number }> {
    // For each contact:
    //   slug = generateSlug(contact)
    //   token = generateContactToken(email, tokenSecret)
    //   Update CRM: gs_personalized_url, gs_token
  }

  // 3. Push engagement back to CRM
  async pushEngagementToCRM(email: string, engagement: EngagementData): Promise<void> {
    // Find contact by email in CRM
    // Update: gs_engagement_score, gs_last_visit, gs_tier
  }

  // 4. Get contacts for bake pipeline
  async getContactsForCampaign(): Promise<CampaignContact[]> {
    // Fetch from CRM, map to CampaignContact[]
  }
}
```

### Deanon Adapter Template

```typescript
// adapters/identify/YOUR_PROVIDER/src/index.ts
import type { IdentifyAdapter, IdentifyRequest, IdentitySignal } from '@generative-sites/core';

export const yourProvider: IdentifyAdapter = {
  name: 'your-provider',
  type: 'account',              // or 'contact'
  market: 'b2b',                // or 'b2c' or 'both'
  consentCategory: 'marketing',

  async identify(request: IdentifyRequest): Promise<IdentitySignal | null> {
    // Call your provider's API with request.ip
    // Return { tier, confidence, company?, contact? }
    // Return null if no match
  },
};
```

### KV Adapter Template

```typescript
// adapters/kv/YOUR_STORE/src/index.ts
import type { KVStore } from '@generative-sites/bake';

export class YourKVStore implements KVStore {
  async get(key: string): Promise<string | null> { ... }
  async put(key: string, value: string, ttlSeconds?: number): Promise<void> { ... }
  async delete(key: string): Promise<void> { ... }
  async list(prefix: string): Promise<string[]> { ... }
}
```
