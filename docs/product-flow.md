# Generative Sites — Product Flow

How end users actually use this. No IDE required. No npm. No code.

---

## Step 1: Create a Site (in Personize UI)

The user goes to their Personize dashboard:

```
Personize Dashboard → Generative Sites → + Create Site

  Site name: [ Marketing Website     ]
  Site URL:  [ https://acme.com      ]

  [Create Site]
```

The UI generates:
- A public key: `pk_live_marketing-website_a3f8x1`
- The script tag ready to copy:

```
┌────────────────────────────────────────────────────────────────────┐
│  Copy this script tag into your website's <head>:                  │
│                                                                    │
│  <script src="https://gs.personize.ai/gs.js"                      │
│    data-key="pk_live_marketing-website_a3f8x1" async></script>     │
│                                                                    │
│                                              [Copy to clipboard]   │
└────────────────────────────────────────────────────────────────────┘
```

The user pastes this into their CMS:
- **WordPress:** Appearance → Theme Editor → header.php, or any "Insert Header Scripts" plugin
- **Webflow:** Site Settings → Custom Code → Head Code
- **Shopify:** Online Store → Themes → Edit Code → theme.liquid
- **Squarespace:** Settings → Code Injection → Header
- **Any CMS:** wherever header scripts go

**Done.** gs.js is now running on their site. No personalization happens yet — they need to add zones.

---

## Step 2: Understand How Visitors Are Identified

The user needs to understand: **how does GS know who's on the page?**

There are **6 identification methods**, from strongest to weakest:

### Method 1: Login / Auth Session (SaaS apps)

**How it works:** The app injects the user's email before gs.js loads.

**Who uses this:** SaaS products with logged-in users.

```
Visitor logs in → app sets window.__GS_USER__ → gs.js reads it → known contact
```

**What the user does:** Their dev team adds one script block in the app layout. Not configurable from a no-code editor — requires a developer.

### Method 2: Unique URL (ABM campaigns)

**How it works:** Each contact gets a personal URL. When they visit, GS knows who they are.

```
https://acme.com/for/sarah-chen          → GS looks up "sarah-chen" → sarah@acme.com
https://acme.com/for/marcus-rivera       → GS looks up "marcus-rivera" → marcus@techcorp.io
```

**Who uses this:** Marketing teams sending outbound emails, sales teams sharing personalized links.

**What the user does:** Runs the bake pipeline or uses a Personize pipeline/Zapier zap to generate URLs. Sends them in emails.

### Method 3: URL Token (Email links)

**How it works:** An encrypted token is appended to any page URL. GS decrypts it server-side to identify the visitor.

```
https://acme.com/pricing?gs=eyJ1c2VyI...   → decrypts → sarah@acme.com
```

**Who uses this:** Email campaigns where the link goes to an existing page (not a unique URL).

**What the user does:** Their email tool inserts the token as a merge variable: `{{contact.gs_token}}`.

### Method 4: Form Submission / GS.identify()

**How it works:** Visitor fills out a form. The form handler calls `GS.identify()` or the form has `data-gs-memorize` attributes. From that point, GS knows who they are.

```
Visitor fills form with email → GS.identify('sarah@acme.com') → known contact
                              → zones refresh with personalized content
```

**Who uses this:** Lead capture pages, demo request forms, newsletter signup.

**What the user does:** Adds `GS.identify()` to their form handler, or uses `data-gs-memorize` on the email field.

### Method 5: Returning Visitor (Cookie)

**How it works:** After any identification event, gs.js stores a `_gs_uid` cookie. On the next visit, the visitor is recognized.

```
Visit 1: anonymous → fills form → identified as sarah@acme.com → cookie set
Visit 2: cookie recognized → sarah@acme.com → personalized from first page load
```

**Who uses this:** Automatic — no setup needed.

### Method 6: Location (Default, always available)

**How it works:** GS reads the visitor's city/region/country from edge headers. Free, instant, no configuration.

```
IP address → edge platform (Cloudflare/Vercel/AWS) → city: Austin, region: TX, country: US
```

**Who uses this:** Everyone. This is the baseline — works for 100% of visitors including anonymous ones.

**What the user does:** Nothing. Location detection is automatic.

---

## Step 3: Add Zones to the Website

A zone is a text element whose content changes based on who's looking at it.

### How zones work

```html
<!-- This text element is a "zone" -->
<h1 data-gs-zone="website_zones:hero_headline">Welcome to our platform</h1>
     ─────────────────────────────────────────
     │
     └── This attribute tells gs.js:
         "Replace this text with the value of the hero_headline property
          from the website_zones collection in Personize"
```

The fallback text ("Welcome to our platform") is what:
- Google sees (SEO)
- Visitors see before personalization loads
- Visitors see if personalization fails

### Two types of zones

**Type 1: Property Zone (from Personize memory — instant, deterministic)**

```html
<h1 data-gs-zone="website_zones:hero_headline">Welcome to our platform</h1>
```

Format: `collectionSystemName:propertySystemName`

The content comes directly from the contact's Personize record. Pre-populated by agents, pipelines, CRM sync, or manual entry. No AI generation at serve time. Instant.

**Type 2: Generative Zone (AI-written at serve time)**

```html
<h1 data-gs-zone="headline">Welcome to our platform</h1>
```

Format: just a name (no colon)

The content is generated by AI using the visitor's context (location, company, profile). Generated fresh each time. Takes 2-5 seconds.

### How to add zones in each CMS (no IDE)

**Webflow:** Select text element → Settings panel → Custom Attributes → `data-gs-zone` = `website_zones:hero_headline`

**WordPress (Elementor Pro):** Select widget → Advanced → Attributes → `data-gs-zone|website_zones:hero_headline`

**WordPress (Gutenberg):** Select block → ⋮ menu → Edit as HTML → add `data-gs-zone="..."` to the tag

**Shopify:** Edit section Liquid file → add attribute to the HTML tag

**Squarespace:** Add Code Block → write the HTML element with the attribute

**Any CMS:** Use the JavaScript selector approach (no attributes needed):

```html
<!-- Paste this after the gs.js script tag -->
<script>
document.addEventListener('DOMContentLoaded', function() {
  // Map your existing elements to zones
  document.querySelector('h1').setAttribute('data-gs-zone', 'website_zones:hero_headline');
  document.querySelector('.subtitle').setAttribute('data-gs-zone', 'website_zones:sub_headline');
  document.querySelector('.cta-button span').setAttribute('data-gs-zone', 'website_zones:cta_text');
});
</script>
```

This approach works on **any CMS** without touching the HTML editor at all. Just add a second script block alongside gs.js.

---

## Step 4: Set Up the collection:property Mapping

The user needs to tell Personize what content to show for each zone. This is where `collection:property` comes in.

### In Personize Dashboard

```
Personize Dashboard → Memory → Collections → + Create Collection

  Collection name:        Website Zones
  Collection system name: website_zones
  Entity type:            Contact

  Properties:
  ┌──────────────────┬─────────────┬──────────────────────────────────────────────┐
  │ Property Name    │ System Name │ Description (guides AI extraction)           │
  ├──────────────────┼─────────────┼──────────────────────────────────────────────┤
  │ Hero Headline    │ hero_headline│ Personalized headline (8-12 words) that     │
  │                  │             │ references the contact's business challenge  │
  ├──────────────────┼─────────────┼──────────────────────────────────────────────┤
  │ Sub Headline     │ sub_headline│ Supporting text below headline (15-25 words) │
  ├──────────────────┼─────────────┼──────────────────────────────────────────────┤
  │ CTA Text         │ cta_text    │ Call-to-action button label (3-5 words)      │
  ├──────────────────┼─────────────┼──────────────────────────────────────────────┤
  │ Proof Statement  │ proof       │ Social proof relevant to their industry      │
  └──────────────────┴─────────────┴──────────────────────────────────────────────┘
```

### How the zone attribute maps to this

```
HTML:        data-gs-zone="website_zones:hero_headline"
                           ─────────────  ─────────────
                           │              │
                           │              └── property system name
                           └── collection system name

Personize:   collection = website_zones
             property   = hero_headline
             entity     = the visitor (identified by email)
```

When Sarah visits the page:
1. gs.js sends the zone ID to the Edge API
2. Edge API identifies Sarah (via URL, token, auth, or cookie)
3. Edge API calls `recall({ email: 'sarah@acme.com', collection: 'website_zones' })`
4. Returns the `hero_headline` property value for Sarah
5. gs.js replaces the text: "Welcome to our platform" → "How Acme Corp Scaled API Operations by 3x"

### How properties get populated

The user populates these properties before visitors arrive. Methods:

| Method | Who Does It | How |
|---|---|---|
| **Personize Pipeline** (Trigger.dev) | Automated — runs on trigger | Pipeline generates content per contact, calls `memorize()` |
| **Personize MCP** (Claude, GPT) | AI agent | Agent analyzes contact data, writes zone content |
| **Zapier / n8n zap** | Automated — no code | Trigger: CRM event → Action: Personize memorize |
| **CRM sync adapter** | Script (one-time or cron) | Syncs contacts + generates zone content |
| **Bake pipeline** | Script (local or CI) | Batch-generates for campaign lists |
| **Manual** | Human in Personize dashboard | Edit contact → set property value |
| **CSV import** | Human | Upload spreadsheet with email + property values |

**The key insight:** Generative Sites doesn't generate the content. **Personize agents and pipelines generate the content. GS just displays it.**

---

## Step 5: Location-Based Personalization

Location doesn't map to a contact email — anonymous visitors have no email. Two approaches:

### Approach A: AI Generation (simplest, recommended)

Use a generative zone (no colon). The AI gets the visitor's location as context and generates appropriate text.

```html
<p data-gs-zone="proof">Trusted by 500+ companies worldwide.</p>
```

The AI sees `location: Austin, TX` and generates: "Trusted by 14 companies in Austin."

No collection setup. No property mapping. Just works for every city automatically.

### Approach B: Location Properties (deterministic, pre-defined)

For high-traffic locations where you want exact copy control, create a location-based collection:

```
Collection: location_content
Entity type: Company (using city as the entity)

Properties:
  hero_headline: "Location-specific headline"
  proof: "Location-specific proof statement"
  cta_text: "Location-specific CTA"
```

Then memorize content for each target location:

```
memorize({ website_url: 'austin-tx', collection: 'location_content', content: '...' })
memorize({ website_url: 'new-york-ny', collection: 'location_content', content: '...' })
memorize({ website_url: 'london-uk', collection: 'location_content', content: '...' })
```

The Edge API would need to match visitor location → location entity → read properties.

**Recommendation:** Use Approach A (AI generation) for location. It handles every city automatically with no manual content creation. Use property zones for contact-specific content where you need exact control.

---

## Step 6: The Personize UI for Zone Setup

What the Personize web UI should provide to make this zero-code:

### Zone Builder

```
Personize Dashboard → Generative Sites → Zones

Site: Marketing Website (pk_live_marketing-website_a3f8x1)

┌─────────────────────────────────────────────────────────────────┐
│  Your Zones                                                      │
│                                                                  │
│  ┌─── Zone 1 ──────────────────────────────────────────────────┐│
│  │ Name: Hero Headline                                          ││
│  │ Source: Property zone                                        ││
│  │ Collection: website_zones                                    ││
│  │ Property: hero_headline                                      ││
│  │                                                              ││
│  │ HTML to add:                                                 ││
│  │ ┌──────────────────────────────────────────────────────────┐ ││
│  │ │ data-gs-zone="website_zones:hero_headline"               │ ││
│  │ └──────────────────────────────────────────────────────[📋]┘ ││
│  │                                                              ││
│  │ Webflow: Custom attribute → name: data-gs-zone              ││
│  │          value: website_zones:hero_headline                  ││
│  │                                                              ││
│  │ Elementor: Advanced → Attributes →                           ││
│  │            data-gs-zone|website_zones:hero_headline          ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─── Zone 2 ──────────────────────────────────────────────────┐│
│  │ Name: Social Proof                                           ││
│  │ Source: AI Generated (location-aware)                        ││
│  │                                                              ││
│  │ HTML to add:                                                 ││
│  │ ┌──────────────────────────────────────────────────────────┐ ││
│  │ │ data-gs-zone="proof"                                     │ ││
│  │ └──────────────────────────────────────────────────────────┘ ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                  │
│  [+ Add Zone]                                                    │
└─────────────────────────────────────────────────────────────────┘
```

### Zone Tester / Preview

```
Personize Dashboard → Generative Sites → Preview

Site: Marketing Website

  Test as: [ sarah@acme.com          ▼]     [Preview]

  ┌───────────────────────────────────────────────────────────────┐
  │  Zone: website_zones:hero_headline                            │
  │  Value: "How Acme Corp Scaled API Operations by 3x"          │
  │  Source: Property (from contact memory)                       │
  │                                                               │
  │  Zone: website_zones:sub_headline                             │
  │  Value: "The platform built for API-first engineering teams"  │
  │  Source: Property (from contact memory)                       │
  │                                                               │
  │  Zone: proof                                                  │
  │  Value: "Trusted by 40+ fintech companies in Austin"          │
  │  Source: AI Generated (tier: known, location: Austin TX)      │
  └───────────────────────────────────────────────────────────────┘

  Test as: [ anonymous - Austin, TX  ▼]     [Preview]

  ┌───────────────────────────────────────────────────────────────┐
  │  Zone: website_zones:hero_headline                            │
  │  Value: (fallback — no contact identified)                    │
  │  Showing: "Welcome to our platform"                           │
  │                                                               │
  │  Zone: proof                                                  │
  │  Value: "Trusted by 14 companies in Austin"                   │
  │  Source: AI Generated (tier: located)                          │
  └───────────────────────────────────────────────────────────────┘
```

### JavaScript Snippet Generator (for any CMS)

For users who can't add custom attributes in their CMS editor, the UI generates a JS snippet:

```
Personize Dashboard → Generative Sites → Install → Advanced

  Map existing elements to zones (no HTML editing):

  ┌──────────────────────────────────────────────────────────────────┐
  │  CSS Selector              │  Zone                               │
  │  [ h1, .hero-title       ]│  [ website_zones:hero_headline    ] │
  │  [ .hero-subtitle        ]│  [ website_zones:sub_headline     ] │
  │  [ .cta-button span      ]│  [ website_zones:cta_text         ] │
  │  [ .testimonial-text     ]│  [ proof                          ] │
  │  [+ Add mapping]          │                                      │
  └──────────────────────────────────────────────────────────────────┘

  Generated snippet:

  ┌──────────────────────────────────────────────────────────────────┐
  │  <script>                                                        │
  │  document.addEventListener('DOMContentLoaded', function() {      │
  │    var m = {                                                     │
  │      'h1, .hero-title': 'website_zones:hero_headline',           │
  │      '.hero-subtitle': 'website_zones:sub_headline',             │
  │      '.cta-button span': 'website_zones:cta_text',               │
  │      '.testimonial-text': 'proof'                                │
  │    };                                                            │
  │    for (var s in m) {                                             │
  │      var el = document.querySelector(s);                         │
  │      if (el) el.setAttribute('data-gs-zone', m[s]);              │
  │    }                                                             │
  │  });                                                             │
  │  </script>                                                       │
  │                                                        [📋 Copy] │
  └──────────────────────────────────────────────────────────────────┘

  Paste this AFTER the gs.js script tag in your CMS header.
```

This means the user never opens an IDE. They:
1. Open Personize dashboard
2. Map CSS selectors to zones in a visual form
3. Copy the generated snippet
4. Paste it in their CMS header scripts

---

## The Complete User Journey (No IDE)

```
1. SIGN UP
   Personize account → Generative Sites → Create Site
   → Copy script tag → paste in CMS header

2. DEFINE ZONES
   Dashboard → Zone Builder
   → Pick collection:property for each zone
   → Copy attribute values or JS snippet
   → Paste in CMS (Webflow custom attributes, WP header, etc.)

3. POPULATE CONTENT
   Already using Personize? Content flows from:
   → Pipelines (Trigger.dev tasks)
   → AI agents (MCP, Claude, GPT)
   → Zapier/n8n zaps
   → CRM sync
   → Manual entry in dashboard

4. IDENTIFY VISITORS
   Choose method(s):
   → Unique URLs (generate in dashboard, send in emails)
   → URL tokens (generate, store in CRM, use as merge variables)
   → Form capture (add GS.identify() or data-gs-memorize to forms)
   → Auth session (dev team adds window.__GS_USER__)
   → Location (automatic, no setup)
   → Cookie (automatic after first identification)

5. GO LIVE
   Visitors arrive → gs.js identifies them → reads properties → replaces text
   Anonymous visitors → AI-generated location-aware content
   Known contacts → exact property values from Personize memory

6. ITERATE
   Dashboard → Preview → test as different contacts
   Dashboard → Analytics → see which zones render, engagement
   Pipelines → update content as context changes
```

---

## Summary: What Makes It Zero-Code

| Step | What the user does | Where |
|---|---|---|
| Install | Copy/paste script tag | CMS header scripts |
| Map zones | Copy/paste attribute values or JS snippet | CMS custom attributes or header scripts |
| Populate content | Already happens via existing Personize usage | Pipelines, agents, Zapier, manual |
| Identify visitors | Generate URLs in dashboard, send in emails | Personize dashboard + email tool |
| Test | Preview zones for any contact | Personize dashboard |
| Monitor | View zone renders and engagement | Personize dashboard |

No IDE. No npm. No git. No deployment. The user lives in their CMS editor and the Personize dashboard.
