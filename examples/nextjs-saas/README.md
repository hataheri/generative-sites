# Next.js SaaS Example — Auth Session (Path 1)

This example shows how to use Generative Sites in a logged-in SaaS application.
The auth system passes the user identity to gs.js via `window.__GS_USER__`.

## How It Works

```tsx
// In your layout.tsx or _app.tsx
export default function Layout({ children }) {
  const user = useCurrentUser(); // your auth hook

  return (
    <html>
      <head>
        {/* Inject user identity before gs.js loads */}
        {user && (
          <script
            dangerouslySetInnerHTML={{
              __html: `window.__GS_USER__ = ${JSON.stringify({
                email: user.email,
                firstName: user.firstName,
                company: user.company,
                plan: user.plan,
                role: user.role,
              })};`,
            }}
          />
        )}
        <script
          src="https://cdn.personize.com/gs.js"
          data-key="pk_live_..."
          data-endpoint="https://your-api.com"
          async
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

## Dashboard Page with Zones

```tsx
// app/dashboard/page.tsx
export default function Dashboard() {
  return (
    <div>
      <h1 data-gs-zone="dashboard-greeting">Welcome back</h1>
      <p data-gs-zone="usage-insight">Here's your usage summary.</p>
      <div data-gs-zone="recommendation">Check out our latest features.</div>
    </div>
  );
}
```

**What the user sees:**

- Anonymous: "Welcome back" / "Here's your usage summary."
- Sarah (Pro plan, 14K API calls): "Sarah, your API usage grew 40% this week" / "3 teammates haven't tried batch endpoints yet — share this guide?"

## Alternative: Client-Side Identify

If you can't inject `window.__GS_USER__` server-side, use `GS.identify()` after auth:

```tsx
// After login or auth check
useEffect(() => {
  if (user && window.GS) {
    GS.identify(user.email, {
      firstName: user.firstName,
      company: user.company,
      plan: user.plan,
      usage: { apiCalls: user.monthlyApiCalls },
    });
  }
}, [user]);
```

## Tracking Product Events

```tsx
// Track feature usage for better personalization
function onFeatureClick(featureName: string) {
  GS.track('feature_used', { feature: featureName });
}

// Track upgrade interest
function onPricingView(plan: string) {
  GS.track('pricing_viewed', { plan });
}
```
