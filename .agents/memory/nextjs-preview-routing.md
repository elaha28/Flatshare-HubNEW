---
name: Next.js routing behind the preview proxy
description: Replit artifact path matching for a Next.js app alongside the shared API service, including development HMR.
---

When a Next.js app is mounted at `/` beside the shared API server, the API server's broader `/api` path takes precedence over the Next app's `/api/*` route handlers. Keep the shared API service mounted only at its health endpoint (`/api/healthz`) if it has no other routes, so app API requests fall through to Next. Next dev HMR also needs `/_next/hmr` explicitly listed in the web service paths, plus the preview origin allowed in `next.config.mjs`.

**Why:** Otherwise, document requests can reach the unrelated Express API service, and the Next dev socket can fail with a proxy 502 even while the page renders.

**How to apply:** Use this when a root-mounted Next artifact shares the proxy with the workspace API artifact. Validate any artifact manifest path changes with the artifact manifest validator, preserve the health route, and verify both API routing and HMR through the proxy.
