# Zone Reference — Complete Guide

Every HTML attribute, every identification method, every prompt control option.

---

## The Two Attributes

Every zone needs exactly ONE attribute. Some zones optionally add more.

| Attribute | Required | What It Does |
|---|---|---|
| `data-gs-zone` | Yes | What to display — a property value or AI-generated text |
| `data-gs-identify` | Once per page | How to find the record — which collection:property matches the visitor |
| `data-gs-prompt` | Optional | Custom instructions for AI-generated zones |
| `data-gs-memorize` | Optional | Capture input and write it back to Personize |
| `data-gs-trigger` | Optional | When to capture (blur, change, submit, click) |

---

## data-gs-zone — What to Display

### Property zone (from Personize memory, instant, no AI)

```html
<h1 data-gs-zone="website_zones:hero_headline">Fallback text</h1>
```

Format: `collectionSystemName:propertySystemName`

The Edge API reads the `hero_headline` property from the `website_zones` collection for the identified visitor. If the visitor has that property, it replaces the text. If not, fallback stays.

### Generative zone (AI-written at serve time)

```html
<h1 data-gs-zone="headline">Fallback text</h1>
```

Format: just a name (no colon)

The Edge API generates text using Personize `prompt()` with the visitor's context (location, company, profile) + brand guidelines + the zone's prompt instruction.

### Mixing both on the same page

```html
<!-- Property zones — instant, from memory -->
<h1 data-gs-zone="website_zones:hero_headline">Welcome</h1>
<p data-gs-zone="website_zones:sub_headline">We help teams</p>

<!-- Generative zones — AI-written, uses visitor context -->
<span data-gs-zone="cta-text">Get Started</span>
<p data-gs-zone="proof">Trusted by 500+ companies</p>
```

Property zones are served first (instant). Generative zones follow (2-5 seconds).

---

## data-gs-identify — How to Find the Record

This attribute tells the Edge API **how to identify the visitor** by searching a Personize collection. Only needed ONCE on the page — all zones use the same identity.

### Format

```
data-gs-identify="collectionName:propertyName"
```

The Edge API searches `collectionName` for a record where `propertyName` matches a value from the URL or server-side signals.

### Identification by slug (ABM campaigns)

```html
<h1 data-gs-zone="website_zones:hero_headline"
    data-gs-identify="website_zones:slug">
  Welcome
</h1>
```

**URL:** `https://yoursite.com/for/sarah-chen`

**What happens:**
1. gs.js extracts `sarah-chen` from the URL path `/for/sarah-chen`
2. Sends to Edge API: `identify_collection=website_zones&identify_property=slug&identify_value=sarah-chen`
3. Edge API searches: `recall({ collections: ['website_zones'], query: 'slug sarah-chen' })`
4. Finds record where `slug = sarah-chen` → gets ALL properties
5. Serves all `website_zones:*` zones from that one record

**The user must have a record in Personize:**
```
Collection: website_zones
Record for sarah@acme.com:
  slug: "sarah-chen"
  hero_headline: "How Acme Corp Scaled API Ops by 3x"
  sub_headline: "Built for API-first engineering teams"
  cta_text: "See Sarah's demo"
```

### Identification by email (URL parameter)

```html
<h1 data-gs-zone="client_portal:welcome_message"
    data-gs-identify="client_portal:email">
  Welcome back
</h1>
```

**URL:** `https://yoursite.com/portal?email=sarah@acme.com`

gs.js sees property name `email`, checks URL params, finds `?email=sarah@acme.com`, sends it.

### Identification by any URL parameter

```html
<h1 data-gs-zone="proposals:headline"
    data-gs-identify="proposals:customer_id">
  Your proposal
</h1>
```

**URL:** `https://yoursite.com/proposal?customer_id=ACME-2024`

gs.js checks `?customer_id=`, finds `ACME-2024`, Edge API searches `proposals` collection for `customer_id = ACME-2024`.

### Identification by location (server-side, automatic)

```html
<h1 data-gs-zone="location_content:hero_headline"
    data-gs-identify="location_content:location">
  Welcome
</h1>
```

**URL:** `https://yoursite.com` (no special URL needed)

**What happens:**
1. gs.js sees property `location`, can't find it in the URL → sends with no value
2. Edge API detects server-side property name `location`
3. Edge API reads geo headers: city=Austin, region=TX, country=US
4. Generates lookup value: `austin-tx-us`
5. Searches `location_content` collection for `location = austin-tx-us`
6. Gets record → serves `hero_headline` property for Austin visitors

**The user must have location records in Personize:**
```
Collection: location_content
Record for Austin:
  location: "austin-tx-us"
  hero_headline: "Trusted by 14 companies in Austin"
  proof: "Built for Texas-based engineering teams"

Record for London:
  location: "london--gb"
  hero_headline: "Built for UK teams"
  proof: "GDPR-compliant by design"
```

**Server-side property names recognized:**
| Property Name | Resolved From | Example Value |
|---|---|---|
| `location` | Geo headers (composite) | `austin-tx-us` |
| `city` | Geo city header | `austin` |
| `region` or `state` | Geo region header | `tx` |
| `country` | Geo country header | `us` |

### Identification by auth session (SaaS apps)

No `data-gs-identify` needed. Set `window.__GS_USER__` instead:

```html
<script>
  window.__GS_USER__ = {
    email: 'sarah@acme.com',
    firstName: 'Sarah',
    company: 'Acme Corp'
  };
</script>
<script src="https://gs.personize.ai/gs.js" data-key="pk_live_..." async></script>

<h1 data-gs-zone="dashboard:greeting">Welcome back</h1>
```

Auth session is highest priority — it overrides `data-gs-identify`.

### Identification by encrypted token (email links)

No `data-gs-identify` needed. Append `?gs=encrypted_token` to any URL:

```
https://yoursite.com/pricing?gs=eyJ1c2VyIjoic2FyYWh...
```

The token decrypts server-side to `{ email, campaignId }`. All zones get personalized.

### Priority order

When multiple identification methods are present:

```
1. Auth session (window.__GS_USER__)     ← highest
2. Collection lookup (data-gs-identify)
3. URL token (?gs=encrypted)
4. Location (geo headers)                ← lowest
```

---

## data-gs-prompt — Control AI Generation

For generative zones (no colon), you can provide custom instructions:

### Basic prompt

```html
<p data-gs-zone="proof"
   data-gs-prompt="Write a social proof statement. Mention our 99.9% uptime SLA. Max 2 sentences.">
  Trusted by 500+ companies
</p>
```

### What the prompt controls

The `data-gs-prompt` text becomes the instruction for this specific zone in the `prompt()` call. It's combined with:

1. **Your prompt** → per-zone instructions ("mention SLA, max 2 sentences")
2. **Brand guidelines** → loaded automatically via `smartGuidelines()` from your governance rules
3. **Visitor context** → loaded automatically via `smartDigest()` — their name, company, history
4. **Tier rules** → automatic: "don't reference personal details for anonymous visitors"
5. **System rules** → always: "output plain text only, never invent facts, never HTML"

### The full prompt sent to Personize

```
CONTEXT:
  ## Brand Guidelines
  [from smartGuidelines() — your governance rules]

  ## Visitor Profile
  [from smartDigest() — what Personize knows about this contact]

  ## Visitor Location
  City: Austin, Region: TX, Country: US

  ## Page
  URL: https://yoursite.com/pricing

  ## Personalization Tier
  Tier: known, Confidence: 1.0

INSTRUCTIONS:
  Generate personalized text for each website zone.

  ZONES:
  - proof: Write a social proof statement. Mention our 99.9% uptime SLA. Max 2 sentences.
  - cta-text: Write a CTA button label, max 5 words. Match the visitor's likely next step.

  RULES:
  - Output ONLY plain text. No HTML, no markdown, no quotes.
  - NEVER invent facts not in the context.
  - Match the brand voice from the guidelines.
  - Full personalization. Use the visitor's name, company, and context.

  FORMAT:
  proof: your text here
  cta-text: your text here
```

### Default prompts (when no data-gs-prompt)

If you don't set `data-gs-prompt`, the system uses defaults based on the zone ID:

| Zone ID | Default Prompt |
|---|---|
| `headline` | "Write a compelling hero headline, max 12 words. Be specific to the visitor if possible." |
| `subheadline` | "Write a supporting subheadline, max 25 words." |
| `cta-text` | "Write a CTA button label, max 5 words." |
| `proof` | "Write a social proof statement, max 2 sentences." |
| `value-prop` | "Write a value proposition, max 2 sentences." |
| `description` | "Write a brief description, max 3 sentences." |
| Any other | "Write personalized text for the '[zoneId]' section, max 2 sentences." |

### Quality control layers

| Layer | What Controls It | Where Configured |
|---|---|---|
| **Zone prompt** | Per-zone instructions | `data-gs-prompt` on HTML element |
| **Brand guidelines** | Org-wide voice, tone, approved claims | Personize dashboard → Governance |
| **Prohibited content** | What the AI must never say | Personize dashboard → Governance |
| **Tier rules** | What level of personalization is appropriate | Automatic in Edge API |
| **System rules** | Plain text only, no invented facts, no HTML | Hardcoded in Edge API |

---

## data-gs-memorize — Capture Input

Write visitor input back to Personize memory. Off by default, opt-in per element.

### Single field

```html
<textarea
  data-gs-memorize="feedback:feature_request"
  data-gs-trigger="blur"
  placeholder="What feature would help you most?"
></textarea>
```

On blur → value sent to Personize → stored as `feature_request` property in `feedback` collection for this contact.

### Form

```html
<form data-gs-memorize-form="onboarding">
  <input data-gs-memorize="onboarding:primary_goal" placeholder="Your main goal" />
  <select data-gs-memorize="onboarding:team_size" data-gs-trigger="change">
    <option value="1-10">1-10</option>
    <option value="11-50">11-50</option>
  </select>
  <button type="submit">Save</button>
</form>
```

On submit → all fields captured in one batch.

### JavaScript API

```javascript
GS.memorize('feedback:feature_request', 'Need better batch processing');
```

### Triggers

| Trigger | When | Default For |
|---|---|---|
| `blur` | User tabs/clicks away | `<input>`, `<textarea>` |
| `change` | Value changes | `<select>` |
| `submit` | Parent form submits | Elements in `data-gs-memorize-form` |
| `click` | Element clicked | Buttons |

### Requirement: visitor must be identified

Memorize writes are silently dropped for anonymous visitors. The visitor must be identified via auth, token, slug, or `GS.identify()` first.

---

## Complete Examples

### ABM landing page (slug-based)

```html
<script src="https://gs.personize.ai/gs.js" data-key="pk_live_..." async></script>

<!-- Property zones from memory + identify by slug -->
<h1 data-gs-zone="website_zones:hero_headline"
    data-gs-identify="website_zones:slug">
  See how we can help your team
</h1>
<p data-gs-zone="website_zones:sub_headline">The modern platform for growing teams</p>

<!-- Generative zones with custom prompts -->
<span data-gs-zone="cta-text"
      data-gs-prompt="CTA with their first name, max 5 words">
  Book a Demo
</span>
<p data-gs-zone="proof"
   data-gs-prompt="Social proof mentioning their industry. Reference our uptime SLA.">
  Trusted by 500+ companies
</p>
```

**URL:** `https://yoursite.com/for/sarah-chen`

### Location-personalized page (no contact needed)

```html
<script src="https://gs.personize.ai/gs.js" data-key="pk_live_..." async></script>

<!-- Property zones from location collection -->
<h1 data-gs-zone="location_content:hero_headline"
    data-gs-identify="location_content:location">
  Welcome
</h1>
<p data-gs-zone="location_content:proof">We serve customers worldwide</p>

<!-- Generative zone (AI-written with location context, no collection needed) -->
<p data-gs-zone="local-cta"
   data-gs-prompt="Write a CTA relevant to the visitor's city. Be specific, not generic.">
  Get started today
</p>
```

### SaaS dashboard (auth session)

```html
<script>
  window.__GS_USER__ = { email: currentUser.email, firstName: currentUser.name, plan: currentUser.plan };
</script>
<script src="https://gs.personize.ai/gs.js" data-key="pk_live_..." async></script>

<h1 data-gs-zone="dashboard:greeting">Welcome back</h1>
<p data-gs-zone="usage-insight"
   data-gs-prompt="Write a usage insight based on their plan and API call volume. Be specific with numbers.">
  Here's your usage summary
</p>
<div data-gs-zone="recommendation"
     data-gs-prompt="Suggest a feature or upgrade based on their usage patterns. Be helpful, not pushy.">
  Check out our latest features
</div>
```

### Client portal with feedback capture

```html
<script src="https://gs.personize.ai/gs.js" data-key="pk_live_..." async></script>

<!-- Read: show personalized content -->
<h1 data-gs-zone="client_portal:welcome_message"
    data-gs-identify="client_portal:email">
  Welcome back
</h1>
<div data-gs-zone="client_portal:meeting_summary">Your meeting notes</div>
<p data-gs-zone="client_portal:next_steps">Next steps from your conversation</p>

<!-- Write: capture feedback -->
<textarea
  data-gs-memorize="client_portal:feedback"
  data-gs-trigger="blur"
  placeholder="How was your experience?"
></textarea>
```

**URL:** `https://yoursite.com/portal?email=sarah@acme.com`

### Pure generative (no collections, just AI)

```html
<script src="https://gs.personize.ai/gs.js" data-key="pk_live_..." async></script>

<h1 data-gs-zone="headline">Welcome to our platform</h1>
<p data-gs-zone="subheadline"
   data-gs-prompt="Supporting text that complements the headline. Reference the visitor's location if known.">
  We help teams build faster.
</p>
<span data-gs-zone="cta-text">Get Started</span>
<p data-gs-zone="proof"
   data-gs-prompt="Social proof with a specific number. Reference their city if located.">
  Trusted by 500+ companies
</p>
```

No collections, no identify, no contact lookup. AI generates everything based on visitor location. Works for 100% of visitors including anonymous.

---

## JavaScript API Reference

```javascript
// Identify the visitor
GS.identify('sarah@acme.com', { firstName: 'Sarah', company: 'Acme Corp' });

// Track events (improves future AI generation)
GS.track('feature_used', { feature: 'batch-api' });

// Write to a specific collection:property
GS.memorize('feedback:feature_request', 'Need batch processing');

// Force re-render all zones
GS.refresh();

// Force re-render one zone
GS.refresh('headline');

// Listen for events
GS.on('zone:render', function(d) { console.log(d.zone, d.text); });
GS.on('meta', function(d) { console.log(d.tier, d.location); });
GS.on('memorize', function(d) { console.log(d.target, d.value); });
GS.on('done', function(d) { console.log('Done in', d.duration_ms, 'ms'); });
GS.on('error', function(d) { console.log(d.code, d.message); });

// Debug
console.log(GS.debug());
```
