# Integrations

Generative Sites reads content from Personize. Your existing tools write content to Personize. No custom adapters needed — anything that can call the Personize API can power zone content.

---

## How it connects

```
YOUR EXISTING TOOLS                    PERSONIZE                WEBSITE
──────────────────                    ─────────                ───────

Pipelines (Trigger.dev)  ──►
AI Agents (MCP, Claude)  ──►
Zapier / n8n             ──►         Memory                   gs.js reads zones
CRM sync (built-in)      ──►   memorize() → recall()   ──►   via SSE from
SDK calls                ──►                                   gs.personize.ai
Manual / CSV             ──►         AI + Governance
                                 smartGuidelines()
                                 smartDigest()
                                 prompt()               ──►   Generative zones
```

---

## Content sources (how properties get populated)

### Personize Pipelines (Trigger.dev)

Automated tasks that generate content per contact:

```typescript
// Pipeline: generate website zone content for new contacts
await personize.memory.memorize({
  email: 'sarah@acme.com',
  content: `
    Hero headline: How Acme Corp Scaled API Operations by 3x
    Sub headline: The platform built for API-first engineering teams
    CTA text: See Sarah's custom demo
  `,
  collection: 'website_zones',
  enhanced: true,
});
```

### AI Agents (MCP)

An AI agent generates content and stores it:

```
Agent: "After analyzing Sarah's account, I'll create her personalized page content."
→ memorize({ email: sarah@acme.com, collection: website_zones, content: ... })
```

### Zapier / n8n

No-code workflows:

```
Trigger: HubSpot deal stage changes to "Proposal Sent"
Action:  Personize → Memorize
         Email: {{contact.email}}
         Collection: website_zones
         Content: "Proposal headline: {{deal.name}} — your custom solution"
```

### CRM Sync

Personize's built-in CRM integrations sync contacts automatically. The contact data (name, company, industry, deal stage) becomes context for AI zone generation.

### Manual

Edit a contact's properties directly in the Personize dashboard → Memory → find contact → edit properties.

---

## Campaign tools (how URLs get to contacts)

Generative Sites works with any email tool. The Personize dashboard generates unique URLs — store them in your CRM, use as merge variables:

| Tool | How to use |
|---|---|
| **HubSpot** | Custom property `gs_url` → email template: `{{contact.gs_url}}` |
| **Outreach** | Custom variable → sequence step link |
| **Salesloft** | Custom field → cadence variable |
| **Mailchimp** | Merge tag `*|GS_URL|*` |
| **Any email tool** | CSV export with `email, unique_url` columns → import as custom field |

---

## Analytics (how engagement flows out)

gs.js automatically tracks page views, zone impressions, and custom events. These are memorized to Personize as session narratives.

To also send to your analytics stack, use `GS.on()` callbacks:

```javascript
GS.on('zone:render', function(data) {
  // Google Analytics 4
  if (window.gtag) {
    gtag('event', 'gs_zone_render', { zone_id: data.zone, tier: data.tier });
  }

  // Segment
  if (window.analytics) {
    analytics.track('Zone Rendered', { zone: data.zone, text: data.text });
  }
});
```

No adapter needed — just wire the callbacks in your page's JavaScript.

---

## CMS platforms

gs.js works on any CMS. See [cms-guides.md](cms-guides.md) for platform-specific instructions.
