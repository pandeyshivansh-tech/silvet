---
name: Demo wardrobe scope
description: Why the wardrobe demo allows temporary edits but does not store selected photos.
---

Demo wardrobe clothing changes are intentionally session-only. A selected photo is a local preview, not a saved upload.

**Why:** The user requested fully functional clothing CRUD through the existing demo repository without integrating Supabase at this stage. Session-only changes follow the existing demo outfit lifecycle.

**How to apply:** Keep demo persistence and photo limitations explicit in the interface. Do not present the demo as permanent account storage; adding durable storage is a separate scope decision.
