# Security Model

Every attack surface in Generative Sites, what's protected, what's not, and what to watch for.

---

## Architecture Security Overview

```
BROWSER (untrusted)                    EDGE API (trusted)                PERSONIZE (trusted)
────────────────────                   ──────────────────                ─────────────────────

gs.js                                  Server process                   Cloud API
  │                                      │                                │
  │  pk_live_ (site label,               │  sk_live_ (secret key,         │  Full API access
  │  safe to expose,                     │  full Personize access,        │  Memory, AI,
  │  cannot call Personize)              │  never leaves server)          │  Governance
  │                                      │                                │
  ├─ SSE connection ──────────────────►  ├─ Validates pk_live_ (HMAC)     │
  │  sends: key, zones, url, uid         │  Derives site ID               │
  │                                      │  Rate-limits per key           │
  │  receives: zone text (plain text)    ├─ Resolves identity ──────────► │
  │  NO HTML, NO scripts                 │  Calls smartDigest() ────────► │
  │                                      │  Calls prompt() ─────────────► │
  ├─ POST /event ─────────────────────►  ├─ Memorizes events ───────────► │
  │  sends: events (page views, clicks)  │                                │
  │                                      │                                │
  ├─ POST /identify ──────────────────►  ├─ Memorizes identity ─────────► │
  │  sends: email, traits                │                                │
  │                                      │                                │
  ├─ POST /memorize ──────────────────►  ├─ Writes to collection ───────► │
  │  sends: collection:property, value   │  (requires identified visitor) │
  │                                      │                                │
  textContent only ◄────────────────────┘                                │
  (never innerHTML)
```

---

## Attack Surface Analysis

### 1. Public Key Exposure

**Risk:** The `pk_live_` key is visible in page source to anyone.

**Mitigation:** The public key is **not a Personize API key**. It's a site identifier with an HMAC suffix. It cannot:
- Call the Personize API
- Read memory or contact data
- Write to any collection
- Access other sites' content

The HMAC suffix is derived from the Personize secret key (`HMAC-SHA256(sk_live_, 'gs:live:site-slug')`). The Edge API validates it by re-deriving the HMAC. Forging a key without the secret key is computationally infeasible.

**What an attacker CAN do with a stolen pk_live_:**
- Open SSE connections → get generic location-based text (same as visiting the page)
- Send fake events → noise data, no damage (memorize() is append-only)
- Consume rate limit quota → mitigated by per-key rate limiting

**Severity:** Low. Same risk profile as a Stripe publishable key.

---

### 2. XSS via Zone Content

**Risk:** Could AI-generated text contain malicious scripts?

**Mitigation:** gs.js uses `textContent` — **never** `innerHTML`. This is a fundamental design decision, not an afterthought.

```javascript
// What gs.js does:
zone.el.textContent = text;    // ← plain text, cannot execute scripts

// What gs.js NEVER does:
zone.el.innerHTML = text;      // ← NEVER. Would allow <script> injection.
```

Even if the LLM generates `<script>alert('xss')</script>`, it renders as literal visible text, not executable code. There is no code path in gs.js that sets innerHTML.

**Severity:** None. Architecturally eliminated.

---

### 3. Auth Session Spoofing (Path 1)

**Risk:** `window.__GS_USER__` is set client-side. A user could modify it in devtools to impersonate another contact.

**Attack:**
```javascript
// Attacker opens devtools and types:
window.__GS_USER__ = { email: 'ceo@target.com' };
// Then refreshes → sees CEO's personalized content?
```

**What happens:**
- The Edge API receives the spoofed email
- It calls `smartDigest('ceo@target.com')` → gets their profile from Personize memory
- It generates personalized text based on that profile
- The attacker sees zone text written for the CEO

**What's exposed:** Only the generated **text content** (headlines, CTAs, proof points). NOT:
- Raw CRM data
- Email addresses or PII
- Contact properties
- Memory records
- Conversation history

**What to do about it:**
- For SaaS apps: the auth session should be **server-validated** — inject `__GS_USER__` from a server-side session, not from client-side state
- For marketing sites: this path is typically not used (use unique URLs or tokens instead)
- The text shown is marketing copy, not sensitive data — the risk is "seeing someone else's headline," not data breach

**Severity:** Low-Medium. The attack yields marketing copy, not sensitive data. Server-side session validation eliminates it entirely.

---

### 4. URL Token Security (Path 3)

**Risk:** Could someone decrypt or forge a `?gs=` token?

**Mitigation:** Tokens use **AES-256-GCM** encryption:
- 256-bit key (from `GS_TOKEN_SECRET`)
- 12-byte random IV per token (no IV reuse)
- 16-byte authentication tag (tamper detection)
- Tokens expire after 90 days (configurable)

```
Token format: base64url( IV[12] + AuthTag[16] + Ciphertext )
Payload:      { email, campaignId?, createdAt }
```

**Attacks and outcomes:**
| Attack | Result |
|---|---|
| Brute-force the key | 2^256 keyspace → infeasible |
| Modify ciphertext | GCM auth tag verification fails → `null` returned |
| Replay an old token | Expiry check (90 days default) → `null` if expired |
| Guess a token | Random IV + encryption → no pattern to exploit |

**Severity:** None with a properly generated secret. Use `generateTokenSecret()` to create one.

---

### 5. Unique URL Guessing (Path 2)

**Risk:** Could someone guess `/for/sarah-chen-acme` and see Sarah's page?

**Yes — by design.** The slug is derived from the contact's name and company. It's not a secret. The content at that URL is a personalized landing page — it's marketing copy intended for that person.

**What's exposed:** Personalized headlines, CTAs, proof points. The same content Sarah sees when she clicks the link.

**What's NOT exposed:** Email address, CRM data, memory records, contact properties.

**If you need slug secrecy:** Append the encrypted token to the unique URL:
```
https://yoursite.com/for/sarah-chen-acme?gs=eyJ1c2Vy...
```
Now the slug alone isn't enough — the token must also be valid.

**Severity:** Low. The content is marketing copy. Use tokens for sensitive portals.

---

### 6. Memorize Endpoint Abuse

**Risk:** Could an attacker use `POST /api/gs/memorize` to write arbitrary data to Personize memory?

**Mitigations built in:**

| Control | How |
|---|---|
| **Identity required** | Server rejects if no email. Anonymous visitors can't write. |
| **Email must be identified** | The email comes from the visitor's identity (auth, token, slug) — not from the POST body alone in production. |
| **Rate limited** | Max 20 writes per request. Per-key rate limiting (600/min). |
| **Collection:property format** | Target must be `collection:property` — can't write to arbitrary memory paths. |
| **Sensitive field redaction** | Properties named password, ssn, credit_card, cvv, secret, token are silently skipped. |
| **Value size** | Practical limits from Personize API (content size limits on memorize). |

**Remaining risk:** An identified visitor (or someone who has their token) could write garbage data to that contact's properties. This is similar to a user submitting garbage in any form — low risk, append-only memory.

**Additional hardening for production:**
- Allowlist which collections can be written to from the client (e.g. only `feedback`, `onboarding` — not `contacts` or `deals`)
- Server-side validation that the email in the memorize request matches the authenticated visitor
- Rate limit per email, not just per key

**Severity:** Low-Medium. Mitigated by identity requirement and rate limiting.

---

### 7. SSE Response Data Exposure

**Risk:** Could someone intercept SSE responses and see other visitors' personalized content?

**No.** Each SSE connection is scoped to one visitor. The Edge API generates content based on the identity resolved from that specific request. There's no way to see another visitor's stream.

**HTTPS:** In production, all connections are over TLS. SSE data cannot be intercepted in transit.

**Severity:** None.

---

### 8. CORS

**Current state:** `app.use(cors())` — allows all origins.

**Risk:** Any website can make requests to the Edge API.

**Why this is intentional:** gs.js runs on the customer's website (any domain). The Edge API must accept requests from any origin — same as HubSpot, Intercom, or Google Analytics endpoints.

**What protects it:** The public key validates which site the request belongs to. Rate limiting prevents abuse. The secret key never leaves the server.

**Severity:** None (by design). CORS is open because it needs to be.

---

### 9. Sensitive Data in Generated Text

**Risk:** Could the LLM output sensitive data (SSN, credit card numbers) that was stored in Personize memory?

**Mitigations:**

| Layer | Control |
|---|---|
| **Governance** | `smartGuidelines()` loads brand rules that include "never output PII, financial data, or health information" |
| **Prompt rules** | Generation prompts include: "NEVER invent facts not in the context" and "Output ONLY plain text" |
| **Memory redaction** | Events memorized from the website redact fields: password, ssn, credit_card, cvv, secret, token |
| **Tier rules** | Anonymous/located tiers: "Use location-based personalization only. Do NOT reference personal details." |

**Remaining risk:** If a user stores sensitive data in Personize memory (e.g. SSN as a contact property) and the LLM includes it in generated zone text, it would be visible in the browser. This is a data governance issue, not a GS vulnerability.

**Recommendation:** Don't store sensitive PII in collections used for website personalization. Use separate collections for sensitive data and don't reference them in zone prompts.

**Severity:** Low. Governed by brand rules and prompt engineering.

---

### 10. Cookie Security

**Cookie:** `_gs_uid` — visitor UID for returning visitor identification.

| Attribute | Value | Why |
|---|---|---|
| `SameSite` | `Lax` | Prevents CSRF — cookie not sent on cross-site POST |
| `Secure` | `true` (HTTPS only) | Prevents interception over HTTP |
| `HttpOnly` | `false` | gs.js needs to read it (JavaScript cookie) |
| `Max-Age` | 365 days | Returning visitor window |
| `Path` | `/` | Available site-wide |

**Risk:** The UID is an opaque identifier. If stolen, an attacker could impersonate a returning visitor — but this only affects personalization tier (returning visitor patterns), not data access.

**Severity:** Low. The UID gives no data access.

---

### 11. Secret Key Exposure

**The most critical risk.** If `PERSONIZE_SECRET_KEY` is leaked:

| Impact | Severity |
|---|---|
| Full Personize API access | Critical |
| Can read any contact's memory | Critical |
| Can write to any collection | Critical |
| Can generate content as anyone | Critical |
| Can derive valid pk_live_ keys | High |

**Mitigations:**
- Secret key is server-side only (Edge API `.env`)
- Never in client-side code, never in gs.js, never in browser
- `.gitignore` excludes `.env` files
- Edge API validates but never echoes the key

**If compromised:** Rotate the key in Personize dashboard immediately. All derived pk_live_ keys become invalid (HMAC changes). Generate new site keys.

**Severity:** Critical if leaked. The entire security model depends on this key staying secret.

---

## Security Checklist

### Before going live:

- [ ] `PERSONIZE_SECRET_KEY` is in `.env`, not committed to git
- [ ] `.gitignore` includes `.env`, `.env.local`, `.env.production`
- [ ] `GS_TOKEN_SECRET` is generated via `generateTokenSecret()` (64 hex chars)
- [ ] Public keys are generated via `generateSiteKey()` (HMAC-derived)
- [ ] HTTPS enabled on all production endpoints
- [ ] Governance rules include "never output PII" guidelines
- [ ] Sensitive data is in separate collections from website zone collections
- [ ] Auth session (`__GS_USER__`) is injected server-side, not from client state
- [ ] Rate limiting is configured appropriately for expected traffic
- [ ] Memorize endpoint has collection allowlists (if used)

### Ongoing:

- [ ] Monitor rate limit hits for abuse patterns
- [ ] Rotate `GS_TOKEN_SECRET` periodically (tokens expire, so rotation is safe)
- [ ] Review governance rules when adding new zones
- [ ] Audit which collections are referenced in `data-gs-zone` attributes

---

## Summary

| Attack Surface | Severity | Status |
|---|---|---|
| Public key exposure | Low | By design (site label, not API key) |
| XSS via zones | None | Eliminated (`textContent` only) |
| Auth session spoofing | Low-Medium | Mitigate with server-side session |
| Token forging | None | AES-256-GCM |
| URL guessing | Low | Marketing copy, not sensitive data |
| Memorize abuse | Low-Medium | Identity required, rate limited, redacted |
| SSE interception | None | Per-visitor scoping + HTTPS |
| CORS | None | Open by design (like analytics scripts) |
| Sensitive data in output | Low | Governed by brand rules |
| Cookie theft | Low | Opaque UID, no data access |
| **Secret key leak** | **Critical** | **Must stay server-side. Rotate if compromised.** |
