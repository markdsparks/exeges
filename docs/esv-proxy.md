# ESV Proxy Setup

Exeges must not ship the Crossway ESV API token in browser JavaScript. The app reads ESV through a small proxy endpoint instead.

## App Configuration

Set this at build time:

```bash
VITE_ESV_PROXY_URL=https://your-worker.your-subdomain.workers.dev
```

If the variable is empty, selecting ESV in the app shows a setup-needed state instead of loading text.

## Cloudflare Worker

The starter Worker is in `workers/esv-proxy.js`.

Required secret:

```bash
wrangler secret put ESV_API_TOKEN
```

Expected request:

```text
GET /?reference=Genesis%201
```

Expected response:

```json
{
  "translation": "esv",
  "reference": "Genesis 1",
  "verses": [
    { "verse": 1, "text": "..." }
  ],
  "copyright": "..."
}
```

Keep ESV text out of committed files and long-lived browser storage.
