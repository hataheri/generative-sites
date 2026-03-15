# Deployment Architecture — Who Hosts What

## The Split

| Component | Hosted By | User Action |
|---|---|---|
| **gs.js** | Personize CDN (`gs.personize.ai/gs.js`) | Paste script tag |
| **Edge API** | Personize (`gs.personize.ai`) | None — gs.js connects automatically |
| **Personize Memory/AI** | Personize cloud | Existing account |
| **Content for zones** | Personize memory | Populated by agents, pipelines, Zapier, manual |
| **Website** | User's CMS | Add `data-gs-zone` attributes |
| **Governance rules** | Personize dashboard | Configure brand voice |

Users don't host anything. They paste a script tag and add HTML attributes.

---

## What happens at serve time

```
Visitor hits page
  │
  ├─ gs.js loads from gs.personize.ai (cached by CDN)
  ├─ Discovers data-gs-zone and data-gs-identify attributes
  ├─ Collects UTM parameters from URL
  ├─ Opens SSE to gs.personize.ai/api/gs/stream
  │
  ▼
Edge API (Personize infrastructure):
  ├─ Validates pk_live_ key (HMAC or backend lookup)
  ├─ Resolves identity:
  │    auth (window.__GS_USER__) → highest priority
  │    collection lookup (data-gs-identify) → searches Personize
  │    location (geo headers) → fallback
  ├─ Property zones → reads from loaded record (instant)
  ├─ Generative zones → smartGuidelines + smartDigest + prompt (2-5s)
  ├─ Streams zone text back via SSE
  └─ Memorizes session engagement (async)
  │
  ▼
gs.js replaces textContent in each zone (smooth opacity fade)
```

---

## Two repos

| Repo | Visibility | Contains | Who uses it |
|---|---|---|---|
| **generative-sites** | Public | gs.js source, docs, examples | Users (reference only) |
| **gs-edge** | Private | Edge API server, deanon adapters | Personize team (infrastructure) |

Users never interact with gs-edge. They use gs.js via the script tag and configure zones via HTML attributes or the Personize dashboard.

---

## How content gets into Personize

Generative Sites **reads** from Personize memory. Content is **written** by:

- Personize pipelines (Trigger.dev tasks)
- AI agents (MCP, Claude, GPT)
- Zapier / n8n workflows
- Direct SDK calls (`memorize()`)
- Manual entry in the Personize dashboard
- CSV import
- CRM sync (Personize's built-in integrations)

The website is a reader. Everything else is a writer.
