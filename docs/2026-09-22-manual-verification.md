# Manual Verification Record — openchamber-memory-graph-ui

Date: 2026-09-22 (automated portion) / pending interactive portion
Plan: `docs/superpowers/plans/2026-09-22-openchamber-memory-graph-ui-implementation-plan.md` (Task 9)

## Environment

| Component | Version |
|---|---|
| OpenChamber desktop | 1.24.2 |
| `@yulimfish/opencode-mem` (live upstream on `127.0.0.1:4747`) | 2.26.0 |
| Bun | 1.3.14 |
| Extension package | 0.1.0 |
| Branch / last commit at record time | `main` @ `eb5ee60` |

## Step 1 — Automated gate (EXECUTED, PASS)

Command: `bun run check` (= `bun test && bun run typecheck && bun run build`)

Result on 2026-09-22:

- `bun test`: 33 pass / 0 fail (7 files, 113 expectations)
- `tsc --noEmit`: pass, no errors
- `bun run build:panel`: pass — `panel/main.js` classic IIFE, no CDN/remote script references (only string matches are the SVG namespace `http://www.w3.org/2000/svg` required by `createElementNS`)
- `bun run build:service`: pass — `service/main.js` Node ESM, contains no credential

Additional static gates recorded per task: independent `goal-verify` audits for Tasks 3–8
(Task 3 PASS, Task 4 CONDITIONAL PASS with one MINOR, Tasks 5–8 PASS after fix rounds).

## Upstream contract probes (EXECUTED in Task 1, current process)

The five sanitized probes (`GET /api/stats`, `/api/tags`, `/api/memories?page=1&pageSize=2`,
`/api/search?q=test&page=1&pageSize=2`, `/api/user-profile`) succeeded with the dedicated
`x-opencode-mem-token` header and returned HTTP 401 without it, against the process that
was running on 2026-09-22. See `docs/2026-09-22-opencode-mem-http-contract.md`.

## Steps 2–6 — Interactive OpenChamber verification (NOT EXECUTED — user action required)

These steps drive the OpenChamber desktop UI (Settings → Extensions, rail panel,
Extension pages menu) and cannot be completed from inside the hosting agent session.
The agent session runs inside the OpenCode process that hosts the live `opencode-mem`
service; restarting that process to perform the deferred Task 1 Step 5 re-probe would
terminate the session, so both the install walkthrough and the post-restart probe are
deferred to the user. Nothing below has been executed or observed by the agent.

Checklist for the user (expected results in parentheses):

1. **Install** — Settings → Extensions → paste
   `/Users/yulimfish/Documents/AIWorkspace/openchamber-memory-graph-ui` → Add →
   approve only the local-service permission (“Run a local service”) → Allow and enable.
   (Rail icon “Memory Graph” appears; Extension pages menu gains an entry.)
2. **Recovery states** — (a) deny/defer permission → panel explains Settings > Extensions
   approval and offers Retry; (b) stop OpenCode web server → “opencode-mem is unavailable”
   explains `webServerEnabled`; (c) upstream unauthorized state shows contract recovery
   text; (d) empty search results show the list empty state; each state offers exactly
   one Retry without an infinite loop.
3. **List workflows against disposable data** — create a memory with a unique container
   tag, search it (submit, not keystroke), edit it, pin/unpin, open details, verify it in
   graph view, single-delete it, confirm the temporary id no longer exists. Bulk-delete
   only newly created items; never touch pre-existing memories. Cleanup/deduplicate
   prompts must warn before running.
4. **Layout & accessibility** — narrow rail panel, desktop full page, ~390px mobile
   width; keyboard tab order and visible focus; dialog focus trap + Escape + focus
   restoration; light/dark themes follow OpenChamber; zh-CN and en-US locale; long
   content/tags wrap; reduced-motion respected.
5. **Graph stability** — open Graph, wait for reveal, sample two node positions ≥2 s
   apart: zero movement after physics freezes (20 s fallback exists for pathological
   cases).
6. **Profile** — grouped sections render; Refresh profile shows progress, success toast,
   and contract-specific errors; no AI cleanup/apply UI present.

## Task 1 Step 5 second probe — after normal restart (NOT EXECUTED — user action required)

After the user restarts OpenCode/OpenChamber once, repeat the five sanitized probes from
`docs/2026-09-22-opencode-mem-http-contract.md` and confirm identical schema and
authentication behavior (401 without header, 200 with dedicated header). Record results
in this file without exposing credentials.

## Outcome summary

| Plan step | Status |
|---|---|
| 1 Automated gate | PASS (executed) |
| 2 Install from local folder | PENDING user |
| 3 Recovery states | PENDING user |
| 4 Disposable-data list workflows | PENDING user |
| 5 Layout & accessibility | PENDING user |
| 6 Graph stability with real data | PENDING user |
| 7 Evidence recorded | DONE for executable portion; user fills Steps 2–6 here |
| Post-restart contract probe | PENDING user |

Definition-of-Done items that depend on Steps 2–6 (Git install smoke checks, live CRUD
against the installed panel, manual verification complete) remain open until the user
runs this checklist.
