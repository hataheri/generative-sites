# CMS Installation Guides

Generative Sites works on **any CMS**. No plugin, no adapter, no build step. Two things to add:

1. **Script tag** — loads gs.js (once per site, in the `<head>`)
2. **Zone attributes** — `data-gs-zone="..."` on text elements you want personalized

The script tag is the same everywhere:

```html
<script src="https://cdn.personize.com/gs.js" data-key="pk_live_YOUR_KEY" async></script>
```

The only thing that varies is **how each CMS lets you add custom HTML attributes**. This guide covers each one.

---

## WordPress

### Script Tag Installation

**Option A: Theme file (best)**

Appearance → Theme File Editor → `header.php` → paste before `</head>`:

```html
<script src="https://cdn.personize.com/gs.js" data-key="pk_live_YOUR_KEY" async></script>
```

**Option B: Plugin (if you can't edit theme files)**

Install "Insert Headers and Footers" (by WPCode) or any header scripts plugin → paste the script tag in the Header section.

**Option C: functions.php**

```php
function gs_enqueue_script() {
  echo '<script src="https://cdn.personize.com/gs.js" data-key="pk_live_YOUR_KEY" async></script>';
}
add_action('wp_head', 'gs_enqueue_script');
```

### Adding Zone Attributes

#### WordPress Block Editor (Gutenberg)

1. Select any text block (Heading, Paragraph, etc.)
2. Click the **three dots menu** (⋮) → **Edit as HTML**
3. Add `data-gs-zone="headline"` to the tag:

```html
<!-- Before -->
<h2 class="wp-block-heading">Welcome to our platform</h2>

<!-- After -->
<h2 class="wp-block-heading" data-gs-zone="headline">Welcome to our platform</h2>
```

4. Click **Edit visually** to go back — the attribute stays

#### WordPress Classic Editor

Switch to the **Text** tab (not Visual) and add the attribute directly to HTML tags.

#### Elementor

Elementor natively supports custom attributes on Pro. On Free, use the HTML widget.

**Elementor Pro:**

1. Select any text widget (Heading, Text Editor, Button)
2. Go to **Advanced** tab → **Attributes** section
3. Add: `data-gs-zone|headline`

Elementor uses pipe (`|`) syntax: `attribute_name|attribute_value`

For multiple zones on the same page:
```
Widget: Heading    → data-gs-zone|headline
Widget: Text       → data-gs-zone|subheadline
Widget: Button     → data-gs-zone|cta-text
```

**Elementor Free (HTML widget workaround):**

1. Drag an **HTML widget** onto the page
2. Write the element with the zone attribute:

```html
<h2 data-gs-zone="headline" style="font-size: 2.5rem; font-weight: 700;">
  Welcome to our platform
</h2>
```

You'll need to style it manually in the HTML since it bypasses Elementor's style controls.

#### Divi Builder

1. Select any text module
2. Go to **Advanced** tab → **Custom CSS/Attributes**
3. Under **Custom Attributes**, add: `data-gs-zone="headline"`

Or use a **Code Module** and write the HTML directly.

#### WPBakery (Visual Composer)

1. Select any element
2. Click the pencil icon to edit
3. Go to the **Extra class name** field — this only supports classes, not data attributes
4. **Workaround:** Use a Raw HTML element:

```html
<h2 data-gs-zone="headline">Welcome to our platform</h2>
```

#### Oxygen Builder

1. Select any element
2. Go to **Advanced** → **Attributes**
3. Click **+ Add Attribute**
4. Name: `data-gs-zone`, Value: `headline`

Oxygen has first-class custom attribute support.

---

## Webflow

### Script Tag Installation

1. Go to **Site Settings** → **Custom Code**
2. In the **Head Code** section, paste:

```html
<script src="https://cdn.personize.com/gs.js" data-key="pk_live_YOUR_KEY" async></script>
```

3. Click **Save**

### Adding Zone Attributes

Webflow has native custom attribute support on every element:

1. Select any text element (Heading, Paragraph, Text Block, Link Text)
2. Open the **Settings panel** (gear icon, right side)
3. Scroll down to **Custom Attributes**
4. Click **+ Add Attribute**
5. Name: `data-gs-zone` — Value: `headline`

Repeat for each zone:

| Element | Attribute Name | Value |
|---|---|---|
| Hero heading | `data-gs-zone` | `headline` |
| Hero paragraph | `data-gs-zone` | `subheadline` |
| CTA button text | `data-gs-zone` | `cta-text` |
| Testimonial text | `data-gs-zone` | `proof` |

**For property zones:** Use the `collection:property` syntax in the value field:
- Name: `data-gs-zone` — Value: `website_zones:hero_headline`

**Webflow CMS Collections:** If you're using Webflow CMS, you can add zone attributes to Collection item templates. Every page generated from that template will have zones.

---

## Shopify

### Script Tag Installation

1. Go to **Online Store** → **Themes** → **Actions** → **Edit Code**
2. Open `theme.liquid` (under Layout)
3. Paste before `</head>`:

```html
<script src="https://cdn.personize.com/gs.js" data-key="pk_live_YOUR_KEY" async></script>
```

4. Click **Save**

### Adding Zone Attributes

#### Shopify Theme Editor (Online Store 2.0)

Shopify's theme editor doesn't expose custom attributes directly. Options:

**Option A: Edit section/snippet Liquid files**

1. Go to **Edit Code**
2. Find the section file (e.g., `sections/hero-banner.liquid`)
3. Add `data-gs-zone` to the element:

```liquid
<!-- Before -->
<h1 class="hero__title">{{ section.settings.heading }}</h1>

<!-- After -->
<h1 class="hero__title" data-gs-zone="headline">{{ section.settings.heading }}</h1>
```

The Liquid `{{ section.settings.heading }}` output becomes the fallback text.

**Option B: Custom Liquid block**

In the Theme Editor, add a **Custom Liquid** section/block:

```liquid
<h2 data-gs-zone="headline">{{ section.settings.heading | default: 'Welcome to our store' }}</h2>
<p data-gs-zone="subheadline">{{ section.settings.subheading | default: 'Shop the latest collection' }}</p>
```

**Option C: Product page zones**

Edit `sections/main-product.liquid`:

```liquid
<p data-gs-zone="product-proof" class="product__proof">
  Loved by thousands of customers
</p>
```

This adds a social proof zone to every product page that personalizes based on the visitor.

---

## Squarespace

### Script Tag Installation

1. Go to **Settings** → **Developer Tools** → **Code Injection**
2. In the **Header** field, paste:

```html
<script src="https://cdn.personize.com/gs.js" data-key="pk_live_YOUR_KEY" async></script>
```

3. Click **Save**

### Adding Zone Attributes

Squarespace doesn't expose custom attributes in its visual editor.

**Option A: Code Block**

1. Add a **Code Block** to your page
2. Write HTML with zone attributes:

```html
<h2 data-gs-zone="headline" style="font-size: 2.5em; font-weight: 800; text-align: center;">
  Welcome to our platform
</h2>
```

**Option B: Page-level Code Injection**

1. Edit any page → **Settings** (gear icon) → **Advanced** → **Page Header Code Injection**
2. Add JavaScript that applies zone attributes to existing elements:

```html
<script>
document.addEventListener('DOMContentLoaded', function() {
  // Target elements by their existing selectors
  var h1 = document.querySelector('.page-section:first-child h1');
  if (h1) h1.setAttribute('data-gs-zone', 'headline');

  var subtitle = document.querySelector('.page-section:first-child .sqs-block-content p');
  if (subtitle) subtitle.setAttribute('data-gs-zone', 'subheadline');
});
</script>
```

This approach keeps the Squarespace visual design intact and applies zones via script.

---

## Wix

### Script Tag Installation

1. Go to **Settings** → **Custom Code** (under Advanced)
2. Click **+ Add Custom Code**
3. Paste the script tag
4. Place it in: **Head**
5. Apply to: **All pages**

### Adding Zone Attributes

**Wix Editor:** Doesn't support custom HTML attributes on elements.

**Wix Velo (code mode):**

1. Enable **Dev Mode** (toggle in the top bar)
2. Select a text element, give it an ID (e.g., `#headlineText`)
3. In the code panel, add:

```javascript
$w.onReady(function() {
  // Wix elements don't support data attributes directly
  // Use the Custom Element approach or embed HTML
});
```

**Recommended Wix approach: Custom Embed**

1. Add an **Embed** → **Custom Element** or **HTML iframe**
2. Write the HTML with zone attributes inside:

```html
<h2 data-gs-zone="headline" style="font-family: inherit; font-size: 2.5rem;">
  Welcome to our platform
</h2>
```

---

## HubSpot CMS

### Script Tag Installation

1. Go to **Settings** → **Website** → **Pages** → **Site header HTML**
2. Paste the script tag
3. Or add it in a **Custom Module** that appears on all pages

### Adding Zone Attributes

**HubSpot Drag-and-Drop Editor:**

1. Add a **Custom HTML** module
2. Write the zone HTML:

```html
<h2 data-gs-zone="headline">Welcome to our platform</h2>
```

**HubSpot Design Manager (templates):**

Edit the `.html` template file directly:

```html
<h1 data-gs-zone="headline">{{ module.heading }}</h1>
<p data-gs-zone="subheadline">{{ module.subheading }}</p>
```

**HubSpot Custom Modules:**

Create a custom module with a Rich Text or Text field. In the module HTML:

```html
<div data-gs-zone="value-prop">{{ module.value_prop_text }}</div>
```

This lets content editors set the fallback text in HubSpot, while GS personalizes it at runtime.

---

## Ghost

### Script Tag Installation

1. Go to **Settings** → **Code Injection**
2. In the **Site Header** field, paste the script tag

### Adding Zone Attributes

Ghost uses Markdown/HTML. In any post or page, switch to the HTML card:

```html
<h2 data-gs-zone="headline">Welcome to our blog</h2>
<p data-gs-zone="subheadline">Stories and insights for your industry</p>
```

Or edit your Ghost theme's `.hbs` template files:

```handlebars
<h1 data-gs-zone="headline">{{title}}</h1>
<p data-gs-zone="post-cta">Subscribe to our newsletter</p>
```

---

## Next.js / React

See the `@generative-sites/core` package. No script tag needed — use the data attributes directly in JSX:

```tsx
export default function Hero() {
  return (
    <section>
      <h1 data-gs-zone="headline">Welcome to our platform</h1>
      <p data-gs-zone="subheadline">We help teams build faster.</p>
      <button>
        <span data-gs-zone="cta-text">Get Started</span>
      </button>
    </section>
  );
}
```

Add the script tag in your `layout.tsx` or `_document.tsx`:

```tsx
<Script
  src="https://cdn.personize.com/gs.js"
  data-key="pk_live_YOUR_KEY"
  strategy="afterInteractive"
/>
```

For SaaS apps with auth, inject `window.__GS_USER__` before gs.js loads. See the [Next.js SaaS example](../examples/nextjs-saas/README.md).

---

## Static HTML

The simplest case — just add both directly:

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.personize.com/gs.js" data-key="pk_live_YOUR_KEY" async></script>
</head>
<body>
  <h1 data-gs-zone="headline">Welcome</h1>
  <p data-gs-zone="subheadline">We help teams build faster.</p>
  <a href="/demo"><span data-gs-zone="cta-text">Book a Demo</span></a>
</body>
</html>
```

---

## Universal Fallback: The JavaScript Approach

For **any CMS** that doesn't support custom attributes in its editor, you can apply zone attributes via JavaScript. Add this after the gs.js script tag:

```html
<script>
document.addEventListener('DOMContentLoaded', function() {
  // Target elements by CSS selectors and apply zone attributes
  var zones = {
    'h1, .hero-title':           'headline',
    '.hero-subtitle, .hero p':   'subheadline',
    '.cta-button span, .btn':    'cta-text',
    '.testimonial-text':         'proof',
  };

  for (var selector in zones) {
    var el = document.querySelector(selector);
    if (el && !el.hasAttribute('data-gs-zone')) {
      el.setAttribute('data-gs-zone', zones[selector]);
    }
  }
});
</script>
```

This works on **any platform** — the selectors target elements by their existing CSS classes or structure. No editor support needed.

---

## Summary

| CMS | Script Tag | Zone Attributes | Difficulty |
|---|---|---|---|
| **WordPress (Gutenberg)** | Theme header or plugin | Edit as HTML on blocks | Easy |
| **WordPress (Elementor Pro)** | Theme header | Advanced → Attributes → pipe syntax | Easy |
| **WordPress (Elementor Free)** | Theme header | HTML widget | Medium |
| **WordPress (Divi)** | Theme header | Advanced → Custom Attributes | Easy |
| **WordPress (Oxygen)** | Theme header | Advanced → Attributes (first-class) | Easy |
| **Webflow** | Custom Code → Head | Settings → Custom Attributes (native) | Easy |
| **Shopify** | theme.liquid | Edit section Liquid files | Medium |
| **Squarespace** | Code Injection | Code blocks or JS selector approach | Medium |
| **Wix** | Custom Code settings | Embed/Custom Element | Medium |
| **HubSpot CMS** | Site header HTML | Custom modules or template editor | Easy |
| **Ghost** | Code Injection | HTML card or theme templates | Easy |
| **Next.js / React** | Script component | JSX data attributes (native) | Easy |
| **Static HTML** | `<head>` script tag | Direct in HTML | Easiest |
| **Any CMS** | Whatever header method exists | JavaScript selector fallback | Works everywhere |
