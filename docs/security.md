# Security Model

Every attack surface in Generative Sites — what's protected, what's not, and what to watch for.

---

## Architecture

```
BROWSER (untrusted)                    EDGE API (trusted)                PERSONIZE (trusted)
────────────────────                   ──────────────────                ─────────────────────

gs.js                                  gs.personize.ai                  Cloud API
  │                                      │                                │
  │  pk_live_ (site label,               │  sk_live_ (secret key,         │  Full API access
  │  safe to expose,                     │  never leaves server,          │  Memory, AI,
  │  cannot call Personize)              │  resolved per-tenant)          │  Governance
  │                                      │                                │
  ├─ SSE ────────────────────────────►  ├─ Validates pk_live_             │
  │  sends: key, zones, url, utms       │  Resolves identity             │
  │                                      │  Calls smartDigest() ────────► │
  │  receives: plain text only           │  Calls prompt() ─────────────► │
  │  (never HTML, never scripts)         │                                │
  │                                      │                                │
  ├─ POST /event ─────────────────────►  ├─ Memorizes events ───────────► │
  ├─ POST /identify ──────────────────►  ├─ Memorizes identity ─────────► │
  ├─ POST /memorize ──────────────────►  ├─ Writes to collection ───────► │
```

---

## Attack Surface Analysis

### 1. Public key in page source

**Risk:** `pk_live_` is visible to anyone who views source.

**Not a risk.** The public key is a site identifier, not an API key. It cannot:
- Call the Personize API
- Read contact data
- Write to any collection

It's derived from the secret key via HMAC — forging one without the secret key is infeasible.

**What an attacker can do with it:** Open SSE connections → get generic location text (same as visiting the page). Consume rate limit quota (mitigated by per-key rate limiting).

### 2. XSS via zone content

**Eliminated.** gs.js uses `textContent` — never `innerHTML`. Even if the AI generates `<script>alert('xss')</script>`, it renders as literal visible text. No code path sets innerHTML.

### 3. Auth session spoofing

**Risk:** Someone modifies `window.__GS_USER__` in devtools to see another contact's content.

**What's exposed:** Marketing copy (headlines, CTAs). NOT raw CRM data, emails, or contact properties.

**Mitigation:** For SaaS apps, inject `__GS_USER__` server-side from a validated session, not from client state.

### 4. Collection:property names visible in HTML

**Not a risk.** `data-gs-zone="website_zones:hero_headline"` is visible in source. Knowing the collection name doesn't grant access to any data. It's like seeing a CSS class name.

### 5. Memorize endpoint abuse

**Mitigated:**
- Requires an identified visitor (email must be present)
- Rate limited (max 20 writes per request, per-key rate limits)
- Sensitive fields auto-redacted (`password`, `ssn`, `credit_card`, `cvv`, `secret`, `token`)
- Target must be `collection:property` format

### 6. SSE response interception

**Not a risk.** Each SSE connection is scoped to one visitor. HTTPS in production. No way to see another visitor's stream.

### 7. CORS open to all origins

**By design.** gs.js runs on customers' websites (any domain). Same model as HubSpot, Intercom, Google Analytics.

### 8. Preview mode abuse

**Risk:** Someone uses `?gs_preview=email` to see another contact's content.

**Mitigated:** Preview mode **only works with `pk_test_` keys**. Production (`pk_live_`) keys reject preview requests with `403 PREVIEW_REQUIRES_TEST_KEY`. Test keys shouldn't be used on production sites.

### 9. Consent bypass

**Risk:** Someone calls `GS.identify()` or `GS.track()` despite denied consent.

**Mitigated:** gs.js checks consent state before every identify/track/memorize call. If the required consent level (analytics or marketing) is denied, the call is silently dropped. The consent bridge auto-detects OneTrust, CookieBot, and Osano.

### 10. Secret key leak

**Critical.** If `sk_live_` is exposed, it grants full Personize API access. The entire security model depends on this key staying server-side.

- Never in client code, never in gs.js, never in the browser
- Edge API validates but never echoes it
- `.gitignore` excludes `.env` files
- If compromised: rotate in Personize dashboard immediately

---

## Summary

| Surface | Severity | Status |
|---|---|---|
| Public key in source | None | Site label, not API key |
| XSS via zones | None | `textContent` only — eliminated |
| Auth spoofing | Low | Yields marketing copy, not data |
| Collection names visible | None | Metadata, not data access |
| Memorize abuse | Low | Identity required + rate limited |
| SSE interception | None | Per-visitor + HTTPS |
| Preview mode abuse | None | Restricted to pk_test_ keys |
| Consent bypass | None | gs.js checks consent before every call |
| **Secret key leak** | **Critical** | Must stay server-side |

---

## Checklist

- [ ] `pk_live_` key generated via Personize dashboard (HMAC-derived)
- [ ] `sk_live_` secret key never in client-side code
- [ ] HTTPS on all production endpoints
- [ ] Governance rules include "never output PII"
- [ ] Auth session injected server-side (for SaaS apps)
- [ ] Sensitive data in separate collections from website zone collections
