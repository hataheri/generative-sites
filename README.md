# Generative Sites

**Personalized content. Your design.**

Drop AI-personalized text into zones on any website. You handle layout, design, and images. We deliver the words — tailored to each visitor based on who they are, where they're from, and what they care about.

Powered by [Personize](https://personize.com).

---

## The Problem

Every visitor to your website sees the exact same words.

Your CRM knows Sarah is a VP of Engineering at a fintech company. Your analytics knows Marcus has visited your pricing page three times. Your sales team knows Lisa's company just raised a Series B.

But your website? It says **"Welcome to our platform"** to all of them.

---

## The Solution

**Zones.** A zone is a text element on your page whose words change based on who's looking at it. The design stays identical. Only the text adapts.

```html
<h1 data-gs-zone="headline">Welcome to our platform</h1>
<p data-gs-zone="subheadline">We help teams build faster.</p>
<span data-gs-zone="cta-text">Book a Demo</span>
```

| Visitor | Headline | CTA |
|---|---|---|
| Anonymous (Austin, TX) | "Trusted by teams across Texas" | "Book a Demo" |
| Marcus (TechCorp, SaaS) | "Built for engineering teams scaling APIs" | "See TechCorp's plan" |
| Sarah (VP Eng, Acme Corp) | "Sarah, cut Acme's API costs by 40%" | "Talk to Alex" |

One page. One design. Every visitor gets copy that feels written for them.

---

## Quick Start

### Step 1: Get your site key

In the Personize dashboard → Generative Sites → Create Site → copy the script tag.

### Step 2: Add the script tag to your website

```html
<script src="https://gs.personize.ai/gs.js" data-key="pk_live_YOUR_KEY" async></script>
```

Works on any CMS — WordPress, Webflow, Shopify, Squarespace, Next.js, plain HTML. See [CMS installation guides](docs/cms-guides.md).

### Step 3: Add zones to your text elements

```html
<h1 data-gs-zone="headline">Welcome to our platform</h1>
<p data-gs-zone="subheadline">We help teams build faster.</p>
<span data-gs-zone="cta-text">Get Started</span>
```

**That's it.** Visitors see location-personalized text immediately. No npm, no build step, no config files.

---

## Two Types of Zones

### Property zones — instant, from Personize memory

```html
<h1 data-gs-zone="website_zones:hero_headline">Default headline</h1>
```

Format: `collectionName:propertyName`. Reads directly from a contact's Personize record. Content populated by your agents, pipelines, Zapier zaps, or MCP tools. **No LLM at serve time. Instant. Deterministic.**

### Generative zones — AI-written at serve time

```html
<h1 data-gs-zone="headline">Default headline</h1>
```

Format: just a name (no colon). AI generates text using the visitor's context — location, company, profile, brand guidelines. Takes 2-5 seconds.

### Mix both on the same page

```html
<!-- From Personize memory — instant -->
<h1 data-gs-zone="website_zones:hero_headline">Welcome</h1>
<p data-gs-zone="website_zones:sub_headline">Built for teams</p>

<!-- AI-generated — uses visitor context -->
<span data-gs-zone="cta-text">Get Started</span>
<p data-gs-zone="proof">Trusted by 500+ companies</p>
```

Property zones cost zero. Generative zones cost one `prompt()` call total (all batched).

---

## How Visitors Get Identified

### For websites (no auth): `data-gs-identify`

The HTML tag itself declares how to find the visitor's record:

```html
<h1 data-gs-zone="website_zones:hero_headline"
    data-gs-identify="website_zones:slug">Welcome</h1>
```

`data-gs-identify="collection:property"` tells the Edge API: search this collection for a record where this property matches the URL value.

| URL | What gs.js sends | Edge API does |
|---|---|---|
| `/for/sarah-chen` | `identify_value=sarah-chen` | Searches `website_zones` where `slug = sarah-chen` |
| `?email=sarah@acme.com` | `identify_value=sarah@acme.com` | Searches `website_zones` where `email = sarah@acme.com` |
| `?customer_id=ACME-2024` | `identify_value=ACME-2024` | Searches collection where `customer_id = ACME-2024` |
| (no URL param) | (no value) | Edge API uses visitor's location from geo headers |

One search → full record → all property zones served from it.

### For web apps (with auth): `window.__GS_USER__`

```tsx
<script dangerouslySetInnerHTML={{
  __html: `window.__GS_USER__ = ${JSON.stringify({
    email: user.email,
    firstName: user.firstName,
    company: user.company,
  })};`
}} />
<script src="https://gs.personize.ai/gs.js" data-key="pk_live_..." async></script>

<h1 data-gs-zone="dashboard:greeting">Welcome back</h1>
<p data-gs-zone="dashboard:insight">Your usage summary</p>
```

The server injects the user identity. No `data-gs-identify` needed — the auth session provides the email.

### For web apps with property zones: auth + identify (fastest)

```html
<h1 data-gs-zone="dashboard:greeting"
    data-gs-identify="dashboard:email">Welcome back</h1>
```

Auth provides the email. `data-gs-identify` tells the Edge API to load the entire record in one call. All `dashboard:*` zones served instantly.

### Location (automatic, always works)

For anonymous visitors with no URL params and no auth. The Edge API reads the visitor's city/region/country from edge headers and either:
- Generates location-aware text (generative zones)
- Looks up location records (with `data-gs-identify="locations:location"`)

No setup required. Works for 100% of visitors.

---

## How Content Gets Into Personize

Generative Sites **reads** content from Personize. Personize agents, pipelines, and integrations **write** it. You likely already have content flowing in:

| Method | Example |
|---|---|
| **Personize Pipeline** (Trigger.dev) | CRM sync pipeline stores contact properties |
| **AI Agent** (MCP, Claude, GPT) | Agent generates meeting summary, stores in memory |
| **Zapier / n8n** | Zap triggers on deal stage change, writes updated messaging |
| **Personize SDK** | `memorize({ email, collection, content, enhanced: true })` |
| **Manual** | Edit contact properties in Personize dashboard |
| **CSV import** | Upload spreadsheet with email + property values |

The website zone just reads whatever's stored:

```
Personize memory:
  sarah@acme.com → website_zones.hero_headline = "How Acme Scaled API Ops by 3x"

Website:
  <h1 data-gs-zone="website_zones:hero_headline">Welcome</h1>
  → Shows: "How Acme Scaled API Ops by 3x"
```

---

## Custom Prompts for Generative Zones

Control what the AI writes with `data-gs-prompt`:

```html
<p data-gs-zone="proof"
   data-gs-prompt="Write social proof mentioning our 99.9% uptime SLA. Max 2 sentences.">
  Trusted by 500+ companies
</p>
```

The prompt is combined with:
- **Brand guidelines** — loaded automatically from your Personize governance rules
- **Visitor context** — loaded automatically via `smartDigest()` (name, company, history)
- **Location** — city/region/country from edge headers
- **UTM parameters** — forwarded from the URL for campaign-aware copy

Without `data-gs-prompt`, the AI uses sensible defaults based on the zone name.

---

## Capture Visitor Input (Memorize)

Write visitor input back to Personize memory. Off by default, opt-in per element:

```html
<!-- Single field -->
<textarea
  data-gs-memorize="feedback:feature_request"
  data-gs-trigger="blur"
  placeholder="What feature would help you most?"
></textarea>

<!-- Form -->
<form data-gs-memorize-form="onboarding">
  <input data-gs-memorize="onboarding:primary_goal" placeholder="Your main goal" />
  <select data-gs-memorize="onboarding:team_size" data-gs-trigger="change">
    <option>1-10</option>
    <option>11-50</option>
  </select>
  <button type="submit">Save</button>
</form>
```

Or via JavaScript:

```javascript
GS.memorize('feedback:feature_request', 'Need better batch processing');
```

Requires an identified visitor. Anonymous writes are silently dropped.

---

## JavaScript API

```javascript
// Identify a visitor (after login or form fill)
GS.identify('sarah@acme.com', { firstName: 'Sarah', company: 'Acme Corp' });

// Track events (improves future AI generation)
GS.track('feature_used', { feature: 'batch-api' });

// Write to Personize memory
GS.memorize('feedback:feature_request', 'Need batch processing');

// Re-render zones
GS.refresh();             // all zones
GS.refresh('headline');   // one zone

// Callbacks
GS.on('zone:render', function(d) { console.log(d.zone, d.text); });
GS.on('meta', function(d) { console.log(d.tier, d.location); });
GS.on('memorize', function(d) { console.log(d.target, d.value); });

// Debug
console.log(GS.debug());
```

---

## Progressive Personalization Tiers

| Tier | Data Available | Example Output |
|---|---|---|
| **Anonymous** | None | "Welcome to our platform" (fallback stays) |
| **Located** | City, region, country | "Trusted by teams across Texas" |
| **Account** | Company, industry | "Built for fintech compliance requirements" |
| **Known** | Name, role, company, history | "Sarah, Acme's API costs — cut by 40%" |

Every visitor gets the best experience possible given what you know. As more data flows into Personize, personalization improves automatically.

---

## CMS Compatibility

gs.js is a client-side script — like HubSpot, Intercom, or Google Analytics. Works behind any cache, any CDN, any CMS.

| CMS | Setup |
|---|---|
| **Any HTML** | Paste script tag, add `data-gs-zone` attributes |
| **WordPress** | Script in theme header, zones via block editor or Elementor |
| **Webflow** | Script in custom code, zones via custom attributes |
| **Shopify** | Script in theme.liquid, zones in section templates |
| **Squarespace** | Script in code injection, zones in code blocks |
| **Next.js / React** | Script in layout, `data-gs-zone` in JSX |

**Can't add attributes in your editor?** Use the CSS selector approach:

```html
<script>
document.addEventListener('DOMContentLoaded', function() {
  document.querySelector('h1').setAttribute('data-gs-zone', 'website_zones:hero_headline');
  document.querySelector('.subtitle').setAttribute('data-gs-zone', 'website_zones:sub_headline');
});
</script>
```

See [docs/cms-guides.md](docs/cms-guides.md) for step-by-step instructions per platform.

---

## Use Cases

### B2B SaaS — ABM landing page

```html
<h1 data-gs-zone="website_zones:hero_headline"
    data-gs-identify="website_zones:slug">See how we can help</h1>
<p data-gs-zone="website_zones:sub_headline">The modern platform for teams</p>
<span data-gs-zone="cta-text" data-gs-prompt="CTA with their name, 5 words max">Book a Demo</span>
```

Send `/for/sarah-chen` in your email. Sarah sees copy written for her.

### SaaS dashboard — logged-in personalization

```html
<h1 data-gs-zone="dashboard:greeting">Welcome back</h1>
<p data-gs-zone="dashboard:insight" data-gs-prompt="Usage insight with specific numbers">Your summary</p>
```

Sarah sees: "Sarah, your API usage grew 40% this week."

### Local services — location-aware

```html
<h1 data-gs-zone="headline">Welcome</h1>
<p data-gs-zone="proof" data-gs-prompt="Social proof mentioning the visitor's city">Trusted by companies worldwide</p>
```

Austin visitor sees: "Trusted by 14 companies in Austin."

### Client portal — show meeting notes

```html
<div data-gs-zone="client_portal:meeting_summary"
     data-gs-identify="client_portal:email">Meeting notes</div>
<p data-gs-zone="client_portal:next_steps">Next steps</p>
```

Content populated by your AI agent after the meeting. Shown instantly.

---

## Governance & Guardrails

| Guardrail | What It Prevents |
|---|---|
| **Brand voice** | Off-tone copy |
| **Approved claims** | Hallucinated stats and fake quotes |
| **Prohibited content** | Competitor mentions, specific ROI promises |
| **Tier-appropriate tone** | Creepy personalization at wrong tier |
| **XSS prevention** | `textContent` only — generated text can't execute code |
| **Fallback safety** | If anything fails, original text stays |

Configure brand rules in the Personize dashboard → Governance. They apply to all zone generation automatically.

---

## Memory Loop

Every visit makes the next one smarter. gs.js automatically memorizes engagement:

| Signal | Stored As |
|---|---|
| Page views | "Visited /pricing and /enterprise on March 14" |
| Zone impressions | "Saw headline: 'Built for fintech teams' (tier: located)" |
| Form submissions | "Submitted demo request form with email sarah@acme.com" |
| Identify events | "Identified as sarah@acme.com: VP Engineering, Pro plan" |
| Custom events | Whatever you send via `GS.track()` |

Sensitive fields (`password`, `ssn`, `credit_card`, `cvv`) are automatically redacted.

---

## How It Works Under the Hood

```
Browser                          gs.personize.ai (Edge API)           Personize
───────                          ─────────────────────────            ─────────

gs.js discovers zones
  reads data-gs-zone
  reads data-gs-identify
  reads data-gs-prompt
  collects UTMs from URL
  │
  │  SSE connection
  ▼
                                 Validates pk_live_ key (HMAC)
                                 Resolves identity:
                                   auth → collection lookup → location
                                 │
                                 ├─ Property zones:
                                 │    record already loaded → instant     ← recall()
                                 │
                                 ├─ Generative zones:
                                 │    smartGuidelines()                   ← brand rules
                                 │    smartDigest()                       ← contact context
                                 │    prompt()                            ← AI generation
                                 │
  ◄── SSE: zone events ─────────┤
  replaces textContent           │
  (never innerHTML)              ├─ memorize() session narrative          ← engagement
                                 │
  GS.track() / GS.memorize()    │
  ──► POST /api/gs/event ───────┤
  ──► POST /api/gs/memorize ────┤
```

The `pk_live_` key is safe in client-side code — it's a site identifier, not an API key. The actual Personize secret key stays server-side. See [docs/security.md](docs/security.md).

---

## Documentation

| Guide | What It Covers |
|---|---|
| [Get Started](docs/get-started.md) | Step-by-step for every use case |
| [Zone Reference](docs/zone-reference.md) | Every attribute, every method, every pattern |
| [CMS Guides](docs/cms-guides.md) | WordPress, Webflow, Shopify, Squarespace, etc. |
| [Product Flow](docs/product-flow.md) | End-user journey (no IDE needed) |
| [Security](docs/security.md) | Attack surface analysis |
| [Property Zones](docs/property-zones.md) | Collection:property setup |

---

## SSE Protocol

```
event: meta
data: {"tier":"located","location":{"city":"Austin","region":"TX","country":"US"},"uid":"gs_abc123"}

event: zone
data: {"zone":"headline","text":"Trusted by teams across Texas","tier":"located","mode":"stream"}

event: zone
data: {"zone":"cta-text","text":"Get started today","tier":"located","mode":"stream"}

event: done
data: {"zones":["headline","cta-text"],"duration_ms":5200}
```

---

## License

MIT

---

**Generative Sites** is built on [Personize](https://personize.com) — the memory and intelligence layer for AI applications.
