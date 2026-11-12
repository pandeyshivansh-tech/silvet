---
name: Outfit rule parity
description: Keeping the domain engine and SQL save boundary consistent as outfit rules evolve
---

The pure TypeScript domain remains the authority for outfit rules. Changes to
wearable bases, standalone outerwear, slot compatibility or accessory limits
must also be reflected in the database's atomic-save validator through a new,
reviewed forward migration and parity tests. Never edit an already applied migration.

**Why:** The SQL trust boundary must reject structurally invalid direct RPC calls
without importing TypeScript or trusting the client. Its independent enforcement
must not reject a valid Studio/Ideas outfit when the domain changes.

**How to apply:** Review both boundaries whenever the domain policy changes.
Test legitimate Indian, Western and fusion bases plus removed placeholders in
the pure engine and the disposable local PostgreSQL harness. Keep hosted
migration application separate and explicitly approved.
