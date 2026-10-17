---
name: Gemini model freshness
description: Model retirement and latency considerations for the Gemini API used by Flatshare.
---

Gemini model IDs are not permanent. When an API key is present but `generateContent` returns 404, verify the model ID against Google's current model and deprecation documentation before treating it as a key problem. For short, latency-sensitive document summaries on a current Flash model, set `thinkingLevel` to `low`; the default reasoning level can exceed typical request timeouts.

**Why:** On 17 October 2026, the old Gemini 1.5 Flash endpoint returned 404, and the replacement Flash model's default reasoning exceeded the app's initial timeout. Google's documented low-thinking setting produced a successful summary and translation.

**How to apply:** Before changing credentials, distinguish key/configuration errors from model availability using the API response status. Confirm the replacement model and generation settings in current official docs, then verify with a small real request without logging credentials.
