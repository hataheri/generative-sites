# Property Zones — Direct Memory Lookup

Property zones let you pull personalized content directly from Personize memory properties — **no LLM call at serve time**. They are deterministic, instant, and cost-free after the memory is stored.

## Zone ID Syntax

```html
<!-- Plain zone — AI-generated -->
<h1 data-gs-zone="headline">Default headline</h1>

<!-- Property zone — read from Personize memory -->
<h1 data-gs-zone="website_zones:hero_headline">Default headline</h1>
```

The colon separates:
- **Left**: collection system name (e.g. `website_zones`)
- **Right**: property system name (e.g. `hero_headline`)

## Setting Up a Collection for Website Zones

In your Personize account, create a collection dedicated to website personalization:

```
Collection name:        Website Zones
Collection system name: website_zones
Type:                   Contact
```

Add properties for each zone on your site:

| Property name  | System name    | Type | Description                                | Example value                                |
|----------------|----------------|------|--------------------------------------------|----------------------------------------------|
| Hero Headline  | `hero_headline`| Text | Personalized headline for the hero section | "How Acme scaled API ops by 3×"              |
| Sub Headline   | `sub_headline` | Text | Supporting text below the headline         | "The platform built for API-first teams"      |
| CTA Text       | `cta_text`     | Text | Call-to-action button label                | "See Sarah's custom demo"                    |
| Proof Statement| `proof`        | Text | Social proof relevant to their industry    | "Trusted by fintech teams processing $2B/yr" |
| Value Prop     | `value_prop`   | Text | Value proposition for their use case       | "Cut API incident response time by 60%"      |

### Why dedicated descriptions and examples matter

Personize uses the property description and examples to **guide extraction accuracy** when you run enrichment pipelines. A property like this:

```
Property: Hero Headline
Description: A personalized hero section headline (8-12 words) that references
             the contact's specific business challenge or outcome. Should feel
             written for them, not generic.
Example:     "How Acme Corp eliminated API downtime with automated monitoring"
Example:     "Why FinTech Solutions chose us for real-time payment processing"
```

…produces far better results than a bare `hero_headline` field with no guidance.

## Populating Properties

### Option A — CRM sync pipeline

```typescript
// pipelines/sync-website-zones.ts
import { Personize } from '@personize/sdk';

const personize = new Personize({ secretKey: process.env.PERSONIZE_SECRET_KEY });

await personize.memory.memorize({
  email: 'sarah@acme.com',
  content: `
    Hero headline: How Acme Corp scaled API operations without adding headcount
    Sub headline: Purpose-built for platform engineering teams at growth-stage companies
    CTA text: Start Sarah's free trial
    Proof: Used by 40+ fintech teams to reduce API incident response time
  `,
  collection: 'website_zones',
  enhanced: true,    // uses AI to extract into structured properties
  tags: ['website-personalization'],
});
```

### Option B — Batch enrichment from CRM data

```typescript
// Run a batch enrichment pipeline that reads from HubSpot,
// generates zone values per contact, and stores them in Personize.

const contacts = await hubspot.getContacts();
for (const contact of contacts) {
  const zoneContent = await generateZoneContent(contact); // your AI call
  await personize.memory.memorize({
    email: contact.email,
    content: zoneContent,
    collection: 'website_zones',
    enhanced: true,
  });
}
```

### Option C — Manual import via CSV

Upload a CSV with columns matching your property system names. Personize ingests it and populates each contact's collection.

## How It Works at Serve Time

```
Visitor arrives at /for/sarah-chen-acme
         │
         ▼
gs.js discovers zones: ["website_zones:hero_headline", "website_zones:sub_headline", "cta-text"]
         │
         ▼
Split by type:
  Property zones → ["website_zones:hero_headline", "website_zones:sub_headline"]
  Generative zones → ["cta-text"]
         │
         ├─── Property zones: recall() from Personize memory  ──→ instant (<50ms)
         │                    No LLM call. Pure property lookup.
         │
         └─── Generative zones: prompt() via Personize AI     ──→ 2–5s
                               Uses smartDigest + brand guidelines.
         │
         ▼
Stream both results to browser as SSE events.
gs.js replaces textContent for each zone.
```

## Bake Mode (Pre-generation)

When baking for ABM campaigns:

- **Property zones**: resolved at bake time via `recall()`. Zero LLM calls. Stored in KV instantly.
- **Generative zones**: one `prompt()` call per contact covering all generative zones.

This means a contact with 4 property zones and 2 generative zones costs **1 LLM call** total — not 6.

```typescript
const zones = [
  // Property zones — from Personize collection
  { id: 'website_zones:hero_headline' },
  { id: 'website_zones:sub_headline' },

  // Generative zones — AI-written at bake time
  { id: 'proof', prompt: 'Write social proof relevant to their industry.' },
  { id: 'cta-text', prompt: 'Write a CTA with their first name, max 5 words.' },
];

await bakeCampaign(contacts, { zones, ... });
```

## Fallback Behavior

If a contact has no stored value for a property zone, the zone's fallback text (the element's existing `textContent`) is kept unchanged. No error is shown to the visitor.

This is safe by design — you can deploy property zones before all contacts have values populated. They'll resolve as data becomes available.

## Anonymous Visitors

Property zones require a known contact. Anonymous visitors (no email in identity) always fall back to default text — property lookup is skipped entirely without error.
