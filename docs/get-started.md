# Get Started with Generative Sites

One script tag. HTML attributes. No npm. No build step.

---

## Prerequisites

- A [Personize](https://personize.com) account
- A site key (`pk_live_...`) — generated in the Personize dashboard → Generative Sites → Create Site

---

## Path 1: Location Personalization (2 minutes)

The simplest setup. Works for 100% of visitors — even anonymous ones.

### Step 1: Add the script tag

Paste in your website's `<head>`:

```html
<script src="https://gs.personize.ai/gs.js" data-key="pk_live_YOUR_KEY" async></script>
```

### Step 2: Add zones

Use **structured zones** (`output.field`) to generate a coherent hero section:

```html
<!-- Structured zones — hero group generated as one coherent output -->
<h1 data-gs-zone="hero.headline">Welcome to our platform</h1>
<p data-gs-zone="hero.subtitle">We help teams build faster.</p>
<span data-gs-zone="hero.cta">Get Started</span>

<!-- Flat zone — independent text -->
<p data-gs-zone="proof">Trusted by 500+ companies worldwide.</p>
```

The `hero.headline`, `hero.subtitle`, and `hero.cta` zones are grouped — the AI generates them together so they complement each other. `proof` is independent.

You can also use flat zones (no dot) for fully independent text:

```html
<h1 data-gs-zone="headline">Welcome to our platform</h1>
<p data-gs-zone="subheadline">We help teams build faster.</p>
```

### What happens

A visitor from Austin, TX sees:

```
hero.headline: "Trusted by teams across Texas"
hero.subtitle: "The platform Austin's fastest-growing companies rely on"
hero.cta:      "See It in Action"
proof:         "14 companies in Austin use our platform daily"
```

The AI uses the visitor's location (from edge headers — free, automatic) to write relevant copy. No contact data needed. Structured zones stream progressively — the hero section appears as soon as the AI finishes generating it, without waiting for `proof`.

---

## Path 2: Known Contact — Property Zones (5 minutes)

Display content from Personize memory. Instant, deterministic, no AI at serve time.

### Step 1: Store content in Personize

Use any method — a pipeline, AI agent, Zapier, or manual entry:

```typescript
// Via Personize SDK, MCP agent, or pipeline
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

### Step 2: Add zones with `data-gs-identify`

```html
<script src="https://gs.personize.ai/gs.js" data-key="pk_live_..." async></script>

<h1 data-gs-zone="website_zones:hero_headline"
    data-gs-identify="website_zones:slug">
  See how we can help your team
</h1>
<p data-gs-zone="website_zones:sub_headline">The modern platform for growing teams</p>
<span data-gs-zone="website_zones:cta_text">Book a Demo</span>
```

### Step 3: Send the personalized URL

```
https://yoursite.com/for/sarah-chen
```

When Sarah visits, gs.js extracts `sarah-chen` from the URL, the Edge API searches `website_zones` for a record where `slug = sarah-chen`, gets all properties, and serves them.

### How the URL maps to a contact

The Edge API searches the collection:property specified in `data-gs-identify`:

| URL | Property matched | Contact found |
|---|---|---|
| `/for/sarah-chen` | `slug = sarah-chen` | sarah@acme.com |
| `?email=sarah@acme.com` | `email = sarah@acme.com` | sarah@acme.com |
| `?customer_id=ACME-2024` | `customer_id = ACME-2024` | sarah@acme.com |

Make sure the contact's record in Personize has the matching property (e.g., `slug: sarah-chen`).

---

## Path 3: Location-Based Property Zones (5 minutes)

Pre-define content for specific cities or regions. Deterministic, no AI.

### Step 1: Store location content in Personize

```typescript
// Austin content
await personize.memory.memorize({
  website_url: 'austin-tx-us',
  content: `
    headline: Trusted by 14 companies in Austin
    proof: Built for Texas-based engineering teams
  `,
  collection: 'location_content',
  enhanced: true,
});

// London content
await personize.memory.memorize({
  website_url: 'london--gb',
  content: `
    headline: Built for UK teams
    proof: GDPR-compliant by design
  `,
  collection: 'location_content',
  enhanced: true,
});
```

### Step 2: Add zones with location identify

```html
<h1 data-gs-zone="location_content:headline"
    data-gs-identify="location_content:location">
  Welcome
</h1>
<p data-gs-zone="location_content:proof">Trusted worldwide</p>
```

No special URL needed. The Edge API reads the visitor's location from geo headers, converts it to a slug (`austin-tx-us`), and searches the collection.

---

## Path 4: SaaS Dashboard — Auth Session (10 minutes)

For logged-in web apps. The server injects the user identity.

### Step 1: Inject user identity before gs.js loads

```tsx
// Next.js layout.tsx (or any framework)
export default function Layout({ children }) {
  const user = useCurrentUser();

  return (
    <html>
      <head>
        {user && (
          <script
            dangerouslySetInnerHTML={{
              __html: `window.__GS_USER__ = ${JSON.stringify({
                email: user.email,
                firstName: user.firstName,
                company: user.company,
                plan: user.plan,
              })};`,
            }}
          />
        )}
        <script src="https://gs.personize.ai/gs.js" data-key="pk_live_..." async />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

### Step 2: Add zones

```tsx
<h1 data-gs-zone="dashboard:greeting">Welcome back</h1>
<p data-gs-zone="dashboard:insight"
   data-gs-prompt="Usage insight with specific numbers from their profile">
  Here's your usage summary.
</p>
<div data-gs-zone="dashboard:recommendation"
     data-gs-prompt="Feature suggestion based on their usage patterns. Helpful, not pushy.">
  Check out our latest features.
</div>
```

### What Sarah sees (Pro plan, 14K API calls/month)

```
greeting:       "Sarah, your API usage grew 40% this week"
insight:        "3 teammates haven't tried batch endpoints yet — share this guide?"
recommendation: "Teams your size typically upgrade to Enterprise for SSO and audit logs"
```

### Faster: auth + data-gs-identify combo

If you have many property zones, add `data-gs-identify` to load the full record in one call:

```html
<h1 data-gs-zone="dashboard:greeting"
    data-gs-identify="dashboard:email">Welcome back</h1>
<p data-gs-zone="dashboard:insight">Summary</p>
<div data-gs-zone="dashboard:recommendation">Features</div>
```

Auth provides the email → `data-gs-identify` tells the Edge API to load the entire `dashboard` collection record at once → all `dashboard:*` zones served from that one result.

---

## Path 5: Capture Visitor Input (5 minutes)

Write visitor input back to Personize memory.

### Single field

```html
<textarea
  data-gs-memorize="feedback:feature_request"
  data-gs-trigger="blur"
  placeholder="What feature would help you most?"
></textarea>
```

When the visitor types and tabs away, the value is sent to Personize and stored.

### Form

```html
<form data-gs-memorize-form="onboarding">
  <input data-gs-memorize="onboarding:primary_goal" placeholder="Your main goal" />
  <select data-gs-memorize="onboarding:team_size" data-gs-trigger="change">
    <option>1-10</option>
    <option>11-50</option>
  </select>
  <button type="submit">Save</button>
</form>
```

### JavaScript

```javascript
GS.memorize('feedback:feature_request', 'Need better batch processing');
```

Requires an identified visitor (auth, token, slug, or `GS.identify()`). Anonymous writes are silently dropped.

### Round-trip: write on one page, read on another

```
Page A (form):
  <textarea data-gs-memorize="feedback:feature_request">
  → "Need better batch processing" → stored in Personize

Page B (dashboard):
  <p data-gs-zone="feedback:feature_request">Tell us what you need</p>
  → Shows: "Need better batch processing"
```

---

## Path 6: Track Events for Better AI (2 minutes)

```javascript
// Track feature usage → AI references it in future zone generation
GS.track('feature_used', { feature: 'batch-api' });

// Track pricing page views → AI adjusts CTA text
GS.track('pricing_viewed', { plan: 'enterprise' });

// Identify after form fill → zones refresh with personalized content
GS.identify('sarah@acme.com', { firstName: 'Sarah', company: 'Acme Corp' });
```

Events are batched (5-second intervals) and memorized to Personize as session narratives. The next time zones generate, the AI has richer context.

---

## Full Example Page

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://gs.personize.ai/gs.js" data-key="pk_live_YOUR_KEY" async></script>
</head>
<body>

  <!-- Property zones (from Personize memory, instant) -->
  <h1 data-gs-zone="website_zones:hero_headline"
      data-gs-identify="website_zones:slug">
    See how we can help your team
  </h1>
  <p data-gs-zone="website_zones:sub_headline">
    The modern platform for growing teams
  </p>

  <!-- Structured generative zones (coherent group, streamed progressively) -->
  <div class="benefits">
    <h2 data-gs-zone="benefits.title">Why teams choose us</h2>
    <p data-gs-zone="benefits.description">We deliver results.</p>
    <span data-gs-zone="benefits.cta">Learn More</span>
  </div>

  <!-- Flat generative zones (independent AI text, with custom prompts) -->
  <span data-gs-zone="cta-text"
        data-gs-prompt="CTA with their first name. Max 5 words.">
    Book a Demo
  </span>
  <p data-gs-zone="proof"
     data-gs-prompt="Social proof mentioning their industry. Max 2 sentences.">
    Trusted by 500+ companies
  </p>

  <!-- Capture feedback (opt-in, requires identified visitor) -->
  <textarea
    data-gs-memorize="feedback:challenge"
    data-gs-trigger="blur"
    placeholder="What's your biggest challenge?"
  ></textarea>

</body>
</html>
```

---

## Path 7: Preview Mode — QA Before Sending (1 minute)

Test what any contact would see by adding `?gs_preview=email` to your URL:

```
https://yoursite.com/pricing?gs_preview=sarah@acme.com
```

All zones render as if Sarah is visiting. Only works with `pk_test_` keys (security).

---

## Path 8: Consent Management (2 minutes)

gs.js auto-detects OneTrust, CookieBot, and Osano. Features are gated by consent level:

- **Essential** (always on): location personalization, cookies
- **Analytics** (requires consent): event tracking, memorize
- **Marketing** (requires consent): deanonymization, GS.identify()

Manual override:

```javascript
GS.consent({ analytics: true, marketing: false });
```

If no consent manager is detected, all features are allowed by default. When consent is denied, features are silently skipped — no errors, no broken UX.

---

## What's Next

| Goal | Guide |
|---|---|
| Every attribute, method, and capability | [Zone Reference](zone-reference.md) |
| Install on WordPress, Webflow, Shopify | [CMS Guides](cms-guides.md) |
| How the product flow works (no IDE) | [Product Flow](product-flow.md) |
| Security model | [Security](security.md) |
| Property zone setup in detail | [Property Zones](property-zones.md) |
