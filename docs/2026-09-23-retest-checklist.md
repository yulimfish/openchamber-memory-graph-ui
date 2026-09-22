# Retest Checklist — openchamber-memory-graph-ui

Date extracted: 2026-09-23
Sources: remaining interactive items from Task 1 (HTTP contract), Task 9 (manual
verification), and Task 10 (release smoke), extracted from:

- `docs/2026-09-22-opencode-mem-http-contract.md` → Restart Verification
- `docs/2026-09-22-manual-verification.md` → Steps 2–6, post-restart probe
- `docs/superpowers/plans/2026-09-22-openchamber-memory-graph-ui-implementation-plan.md` → Task 9 Steps 2–6, Task 10 Step 6 install smoke

Nothing below has been executed. Every item requires the user's interactive
session; the agent cannot drive the OpenChamber desktop UI or restart the
OpenCode process that hosts this session.

## Environment

| Component | Version |
|---|---|
| OpenChamber desktop | 1.24.2 |
| `@yulimfish/opencode-mem` (live upstream on `127.0.0.1:4747`) | 2.26.0 |
| Bun | 1.3.14 |
| Extension package | 0.1.0 |
| Branch / tag | `main` @ `7f7b326`, tag `v0.1.0` |

## R1 — Post-restart contract probe

*Extracted from: contract "Restart Verification" (Task 1 Step 5). Reason: the
implementation session runs inside the OpenCode process that hosts the live
`opencode-mem` service; restarting it would terminate the session.*

After one normal OpenCode/OpenChamber restart, repeat the five sanitized probes
from `docs/2026-09-22-opencode-mem-http-contract.md` ("Supported Read
Requests"):

- [ ] `GET /api/stats` — without `x-opencode-mem-token` → HTTP `401`
      `{"success":false,"error":"Unauthorized"}`; with the dedicated token →
      HTTP `200` success envelope
- [ ] `GET /api/tags` — same 401/200 behavior; field names/types match
      `tests/fixtures/api/2026-09-22-tags.json`
- [ ] `GET /api/memories?page=1&pageSize=2&includePrompts=true` — same;
      matches `tests/fixtures/api/2026-09-22-memories.json`
- [ ] `GET /api/search?q=test&page=1&pageSize=2` — same;
      matches `tests/fixtures/api/2026-09-22-search.json`
- [ ] `GET /api/user-profile` — same;
      matches `tests/fixtures/api/2026-09-22-user-profile.json`
- [ ] Record pass/fail and date below. NEVER paste the token or any credential.

Expected: identical schema and authentication behavior to the Task 1 probes
recorded in the contract doc.

Results:

| Date | Outcome |
|---|---|
|  |  |

## R2 — Install from the local folder

*Extracted from: plan Task 9 Step 2.*

- [ ] OpenChamber → Settings → Extensions → add
      `/Users/yulimfish/Documents/AIWorkspace/openchamber-memory-graph-ui`
- [ ] Approve only the local-service permission ("Run a local service") →
      Allow and enable
- [ ] Expected: rail icon "Memory Graph" appears; Extension pages menu gains an
      entry

## R3 — Recovery states

*Extracted from: plan Task 9 Step 3.*

- [ ] (a) Deny/defer permission → panel explains Settings > Extensions
      approval and offers exactly one Retry
- [ ] (b) Stop the OpenCode web server → "opencode-mem is unavailable"
      explains `webServerEnabled: true` + one Retry
- [ ] (c) Upstream unauthorized state shows contract-specific recovery text
- [ ] (d) Empty search results show the list empty state
- [ ] (e) Malformed upstream response surfaces the generic failure state
- [ ] No state offers more than one Retry action; no infinite retry loop

## R4 — List workflows against disposable data

*Extracted from: plan Task 9 Step 4.*

- [ ] Create a memory with a uniquely tagged container tag (record id: ______)
- [ ] Search it (submit via Enter/clear — not every keystroke)
- [ ] Edit content/tags; verify row updates after refresh
- [ ] Pin / unpin; verify badge and button flip
- [ ] Open details drawer; check content + metadata
- [ ] Inspect it in graph view (node present, details open)
- [ ] Single-delete it (confirmation shows); confirm the id no longer exists
- [ ] Bulk-delete only newly created items — never touch pre-existing memories
- [ ] Cleanup and deduplicate each prompt a warning confirmation before running

## R5 — Layout and accessibility

*Extracted from: plan Task 9 Step 5.*

- [ ] Narrow rail panel renders compact rows
- [ ] Desktop full page renders wide list / full-height graph
- [ ] ~390px mobile-width viewport wraps cleanly
- [ ] Keyboard tab order sane; visible focus rings
- [ ] Dialog: focus trapped, Escape closes, focus restored to trigger
- [ ] Light/dark themes follow OpenChamber (graph recolors in place)
- [ ] zh-CN and en-US locales (nav, buttons, aria-labels, errors)
- [ ] Long content and long tags wrap without overflow
- [ ] `prefers-reduced-motion` respected

## R6 — Graph stability with real data

*Extracted from: plan Task 9 Step 6.*

- [ ] Open Graph, wait for reveal after stabilization
- [ ] Sample two node positions ≥2 s apart → zero movement after physics
      freezes (20 s safety fallback exists for pathological cases)
- [ ] Filters (all/memory/prompt), text search, zoom, fit, node details, and
      related-node navigation all work
- [ ] Panel mode shows the reduced canvas + "Open the full page" guidance

## R7 — Profile view

*Extracted from: manual-verification Steps 2–6 item 6.*

- [ ] Preferences / patterns / workflows render as section → category → item
      hierarchy (not one flat list)
- [ ] Refresh profile button shows progress (loading state), then success
      toast; failures show contract-specific errors
- [ ] No AI cleanup/apply UI present anywhere in the profile view

## R8 — Git URL install smoke (release)

*Extracted from: plan Task 10 Step 6 (install half; `git ls-remote` was already
verified at release: HEAD = `7f7b3264e83251096faf59e2fc20b6017a144fbf`).*

- [ ] Re-run if desired:
      `git ls-remote https://github.com/yulimfish/openchamber-memory-graph-ui.git HEAD`
      → expect `7f7b3264e83251096faf59e2fc20b6017a144fbf`
- [ ] Install `https://github.com/yulimfish/openchamber-memory-graph-ui.git#v0.1.0`
      in OpenChamber Settings → Extensions; approve local-service permission only
- [ ] Smoke from the Git install: health (panel ready status), list load,
      graph render, profile render

## Closing the loop

When every box above is checked, record the completion date here and update the
Definition of Done live items (Git install smoke, live CRUD against the
installed panel, manual verification complete) as satisfied:

Completed: ______
