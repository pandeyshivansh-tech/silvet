---
name: Browser network cancellation
description: Distinguishing intended request cancellation from test infrastructure failures
---

Cancellation and navigation tests must distinguish expected browser network cancellation from application errors.

**Why:** Chromium can invalidate an intercepted request before a delayed synthetic response is fulfilled. A successful cancellation can therefore produce a protocol error even when application behavior is correct.

**How to apply:** Keep this distinction narrow in browser fixture infrastructure. Only a recognized stale-interception response to fulfillment is expected; other protocol errors, assertions and application console errors must still fail verification.
