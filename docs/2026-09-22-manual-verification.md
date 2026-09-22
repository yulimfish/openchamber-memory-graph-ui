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

## Steps 2–6 — Interactive OpenChamber verification (EXTRACTED 2026-09-23)

The interactive checklist previously recorded in this section was extracted to
`docs/2026-09-23-retest-checklist.md` (items R2–R7). Nothing in that checklist
has been executed or observed by the agent; the agent session runs inside the
OpenCode process that hosts the live `opencode-mem` service and cannot drive
the OpenChamber desktop UI.

## Task 1 Step 5 second probe — after normal restart (EXTRACTED 2026-09-23)

Extracted to `docs/2026-09-23-retest-checklist.md` (item R1). Record results
there without exposing credentials.

## Outcome summary

| Plan step | Status |
|---|---|
| 1 Automated gate | PASS (executed) |
| 2 Install from local folder | EXTRACTED → retest checklist R2 |
| 3 Recovery states | EXTRACTED → retest checklist R3 |
| 4 Disposable-data list workflows | EXTRACTED → retest checklist R4 |
| 5 Layout & accessibility | EXTRACTED → retest checklist R5 |
| 6 Graph stability with real data | EXTRACTED → retest checklist R6 |
| 7 Evidence recorded | DONE for executable portion |
| Post-restart contract probe | EXTRACTED → retest checklist R1 |

Definition-of-Done items that depend on interactive verification (Git install
smoke, live CRUD against the installed panel, manual verification complete) are
tracked in `docs/2026-09-23-retest-checklist.md` (R8 and "Closing the loop").
