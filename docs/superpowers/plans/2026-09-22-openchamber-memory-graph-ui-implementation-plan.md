# OpenChamber Memory Graph UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an installable OpenChamber extension that brings the local `opencode-mem` management UI into OpenChamber as a rail panel and full-screen page, including memory browsing, search, editing, deletion, graph exploration, and user-profile viewing.

**Architecture:** A sandboxed TypeScript panel uses `@openchamber/sdk` and `@openchamber/sdk/ui`. It talks only through `host.serviceRequest()` to a bundled Node local service; that service authenticates OpenChamber requests, validates every upstream method/path against an allowlist, and proxies approved calls to `http://127.0.0.1:4747`. Pure model/state modules stay independent from DOM and network code so they can be tested with `bun test`.

**Tech Stack:** TypeScript, Bun, `@openchamber/sdk@1.24.2`, `vis-network@10.1.2`, OpenChamber local service API v1, Bun test runner.

## Global Constraints

- OpenChamber manifest uses `apiVersion: 1` and `engines.openchamber: ">=1.24.0"`.
- Package version starts at `0.1.0`; built `panel/main.js` and `service/main.js` must be committed because OpenChamber does not build extensions when installing from Git.
- The service binds only to `127.0.0.1:${OPENCHAMBER_SERVICE_PORT}` and requires `Authorization: Bearer ${OPENCHAMBER_SERVICE_TOKEN}` on every route, including `/health`.
- The upstream memory origin is fixed to `http://127.0.0.1:4747` for v0.1.0. Do not add arbitrary-origin configuration or an open proxy.
- Never read SQLite directly. The extension must use the public `opencode-mem` HTTP API so storage migrations remain owned by `opencode-mem`.
- Never log, return, persist, or render an upstream credential. If Task 1 proves authentication is required, credential discovery stays entirely in the service process.
- Use the OpenChamber UI kit first. Custom DOM/CSS is allowed for the graph canvas, data rows, dialogs, responsive shell, and details drawer.
- Follow host theme and locale snapshots without remounting the application or discarding search/form state.
- Destructive operations require an explicit confirmation and refresh data only after a successful API response.
- UI supports both `ctx.surface === "panel"` and `ctx.surface === "page"`; panel is compact and page is the primary graph workspace.
- Initial language coverage is Simplified Chinese and English, selected from `ctx.locale` with Chinese fallback for `zh-*` and English fallback otherwise.
- No CDN scripts, remote fonts, telemetry, account integration, chat attachment, prompt capability, session capability, model capability, or filesystem capability in v0.1.0.

## Proposed UI Contract

This is the layout to implement after the plan is approved. It satisfies the UI-preview-first gate for the subsequent implementation session.

```text
BEFORE: separate browser tab at http://127.0.0.1:4747

+--------------------------------------------------------------+
| MEMORY     [List] [Graph] [Profile]             theme / lang |
| Hero                                                         |
| filters + search + maintenance actions                       |
| table / graph / profile                                      |
+--------------------------------------------------------------+

AFTER: OpenChamber rail panel                 AFTER: full page

+----------------------------+   +-------------------------------------------+
| Memory            ● ready  |   | Memory  ● ready      Refresh              |
| [List][Graph][Profile]      |   | [List] [Graph] [Profile]                 |
| Search memories...          |   +-------------------------------------------+
| [Project filter]            |   | filters / search / summary metrics        |
|----------------------------|   |-------------------------------------------|
| memory row                  |   |                                           |
| type · tags · date     [...]|   |          interactive memory graph         |
|----------------------------|   |                                           |
| memory row                  |   |                                           |
| type · tags · date     [...]|   |-------------------------------------------|
|                            |   | selected-node details / related memories  |
| Previous   1 / 12    Next  |   +-------------------------------------------+
+----------------------------+

Shared overlays:
- Add/edit memory dialog
- Delete confirmation dialog
- Memory detail drawer
- Offline / unauthorized / service-failed recovery state
```

## File Map

| Path | Responsibility |
|---|---|
| `package.json` | OpenChamber manifest, dependency pins, build/test/typecheck scripts |
| `tsconfig.json` | Strict shared TypeScript configuration |
| `.gitignore` | Ignore dependencies and local artifacts, not shipped bundles |
| `LICENSE` | MIT license |
| `panel/index.html` | Sandboxed panel/page entry |
| `panel/styles.css` | Responsive host-token-based styling |
| `panel/main.ts` | Host lifecycle, application composition, refresh coordination |
| `panel/api.ts` | Typed `serviceRequest` client and response decoding |
| `panel/types.ts` | Memory, profile, stats, tags, paging, and API envelope types |
| `panel/state.ts` | Pure application state transitions and stale-request protection |
| `panel/i18n.ts` | Chinese/English strings and locale selection |
| `panel/memory-view.ts` | Search, filter, pagination, details, add/edit/delete UI |
| `panel/graph-model.ts` | Pure node/edge construction and shared-tag pruning |
| `panel/graph-view.ts` | `vis-network` lifecycle, filtering, search, and stable reveal |
| `panel/profile-view.ts` | Grouped preferences, patterns, workflows, and refresh UI |
| `panel/dialog.ts` | Accessible dialog/drawer primitives used by memory and graph views |
| `panel/main.js` | Committed browser IIFE generated from `panel/main.ts` |
| `service/main.ts` | Authenticated loopback HTTP server and lifecycle |
| `service/proxy.ts` | Upstream allowlist, URL construction, timeout, auth strategy, response forwarding |
| `service/main.js` | Committed Node ESM bundle generated from `service/main.ts` |
| `tests/service/proxy.test.ts` | Proxy allowlist, timeout, and upstream-response tests |
| `tests/panel/api.test.ts` | Service client decoding and error mapping tests |
| `tests/panel/state.test.ts` | View, paging, selection, and request-generation tests |
| `tests/panel/graph-model.test.ts` | Deterministic graph construction/pruning tests |
| `tests/panel/i18n.test.ts` | Locale fallback tests |
| `README.md` | Installation, permissions, prerequisites, development, troubleshooting |

---

### Task 1: Resolve the Live `opencode-mem` HTTP Contract

**Files:**
- Create: `docs/2026-09-22-opencode-mem-http-contract.md`
- Create: `tests/fixtures/api/`

**Interfaces:**
- Consumes: local service at `http://127.0.0.1:4747` and installed `opencode-mem@2.19.4` route definitions.
- Produces: exact request/response fixtures and a documented authentication rule for `service/proxy.ts`.

- [ ] **Step 1: Record the known discrepancy without secrets**

Document that the checked-in runtime code exposes `/api/stats`, `/api/tags`, `/api/memories`, `/api/search`, and `/api/user-profile`, while a live unauthenticated request currently returns HTTP `401` with `{"success":false,"error":"Unauthorized"}`. Do not paste environment variables or config values.

- [ ] **Step 2: Identify the authentication boundary**

Inspect the running package/version and request headers, then determine whether `401` comes from `opencode-mem`, OpenCode server authentication, or stale loaded code. Test only loopback URLs and never print credential values. The output must name the accepted header/cookie mechanism or prove that restarting the owning OpenCode process restores unauthenticated loopback access.

- [ ] **Step 3: Capture sanitized success fixtures**

Save representative JSON fixtures for:

```text
GET /api/stats
GET /api/tags
GET /api/memories?page=1&pageSize=2&includePrompts=true
GET /api/search?q=test&page=1&pageSize=2
GET /api/user-profile
```

Remove personal content, email addresses, absolute project paths, API keys, and tokens. Preserve field names and value types.

- [ ] **Step 4: Define the credential strategy**

Choose exactly one strategy based on evidence:

```text
A. No upstream auth: direct loopback proxy.
B. Dedicated opencode-mem web token: service reads only its documented token field and sends the documented header.
C. OpenCode server auth: service obtains credentials from an explicit, documented local source available to the child process without exposing them to the panel.
```

If none is possible without exposing or duplicating a secret, stop implementation and open an upstream integration issue; do not bypass authentication or read unrelated credentials.

- [ ] **Step 5: Verify the contract twice**

Run the sanitized probe once against the current process and once after a normal OpenCode/OpenChamber restart. Expected: the same successful schema and authentication behavior both times.

- [ ] **Step 6: Commit the contract note and fixtures**

```bash
git add docs/2026-09-22-opencode-mem-http-contract.md tests/fixtures/api
git commit -m "docs: define opencode-mem HTTP contract"
```

### Task 2: Scaffold the Extension Manifest and Build Pipeline

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `LICENSE`
- Create: `panel/index.html`
- Create: `panel/main.ts`
- Create: `service/main.ts`

**Interfaces:**
- Consumes: OpenChamber extension API v1 and the Task 1 authentication decision.
- Produces: installable manifest id `openchamber-memory-graph-ui`, `panel/main.js`, and `service/main.js`.

- [ ] **Step 1: Write the manifest test**

Create a Bun test that imports `package.json` and asserts:

```ts
expect(pkg.version).toBe("0.1.0");
expect(pkg.openchamber.apiVersion).toBe(1);
expect(pkg.openchamber.engines.openchamber).toBe(">=1.24.0");
expect(pkg.openchamber.contributes.panel.id).toBe("openchamber-memory-graph-ui");
expect(pkg.openchamber.contributes.page).toBe(true);
expect(pkg.openchamber.contributes.service.runtime).toBe("host");
expect(pkg.openchamber.contributes.capabilities ?? []).toEqual([]);
```

- [ ] **Step 2: Run the test and verify RED**

Run: `bun test tests/manifest.test.ts`

Expected: FAIL because `package.json` does not exist.

- [ ] **Step 3: Add the minimal package and scripts**

Use these dependency versions and scripts:

```json
{
  "dependencies": {
    "@openchamber/sdk": "1.24.2",
    "vis-network": "10.1.2"
  },
  "devDependencies": {
    "@types/node": "26.6.2",
    "typescript": "7.0.2"
  },
  "scripts": {
    "test": "bun test",
    "typecheck": "tsc --noEmit",
    "build:panel": "bunx openchamber-guest-bundle panel/main.ts panel/main.js",
    "build:service": "bunx openchamber-guest-bundle --node service/main.ts service/main.js",
    "build": "bun run build:panel && bun run build:service",
    "check": "bun test && bun run typecheck && bun run build"
  }
}
```

Declare `panel.entry: "panel/index.html"`, `page: true`, `service.entry: "service/main.js"`, and no unrelated capabilities.

- [ ] **Step 4: Add minimal compilable entries**

`panel/main.ts` calls `connectHost()` and applies every `onReady` snapshot. `service/main.ts` validates `OPENCHAMBER_SERVICE_PORT` and `OPENCHAMBER_SERVICE_TOKEN`, binds loopback, authenticates requests, and answers `/health`.

- [ ] **Step 5: Install, test, typecheck, and build**

Run: `bun install && bun test tests/manifest.test.ts && bun run typecheck && bun run build`

Expected: tests PASS; `panel/main.js` is a classic browser IIFE; `service/main.js` is Node ESM and contains no embedded credential.

- [ ] **Step 6: Commit the scaffold**

```bash
git add package.json bun.lock tsconfig.json .gitignore LICENSE panel service tests/manifest.test.ts
git commit -m "chore: scaffold OpenChamber extension"
```

### Task 3: Build the Authenticated, Allowlisted Local Proxy

**Files:**
- Create: `service/proxy.ts`
- Modify: `service/main.ts`
- Create: `tests/service/proxy.test.ts`

**Interfaces:**
- Produces: `class MemoryProxy`, `isAllowedUpstreamRequest(method, pathname)`, and `proxyMemoryRequest(input)`.
- HTTP routes: `/health` and `/memory-api/*` only.

- [ ] **Step 1: Write failing allowlist tests**

Cover approved combinations for stats, tags, memory list/create/update/delete/bulk-delete/merge/pin/unpin, search, cleanup, deduplicate, and user-profile read/refresh/item update. Reject absolute URLs, `..`, encoded traversal, unknown paths, migration routes, and method mismatches.

```ts
expect(isAllowedUpstreamRequest("GET", "/api/memories")).toBe(true);
expect(isAllowedUpstreamRequest("DELETE", "/api/memories/abc")).toBe(true);
expect(isAllowedUpstreamRequest("POST", "/api/migration/run")).toBe(false);
expect(isAllowedUpstreamRequest("GET", "/../api/stats")).toBe(false);
```

- [ ] **Step 2: Run and verify RED**

Run: `bun test tests/service/proxy.test.ts`

Expected: FAIL because `service/proxy.ts` does not exist.

- [ ] **Step 3: Implement the minimal allowlist and URL builder**

Build URLs only from the constant origin plus a validated pathname and `URLSearchParams`. Never accept a scheme, host, fragment, or raw upstream URL from the panel.

- [ ] **Step 4: Add forwarding behavior tests**

Inject `fetch`, use an `AbortSignal.timeout(20_000)`, preserve status and text body, forward only `Content-Type: application/json`, and apply the Task 1 credential strategy internally. Test `401`, `404`, `500`, timeout, malformed body, and unavailable upstream.

- [ ] **Step 5: Implement service HTTP routing**

Authenticate the OpenChamber bearer before routing. Strip the `/memory-api` prefix, reject bodies larger than 2 MiB, call `MemoryProxy`, and return stable JSON errors:

```json
{ "code": "UPSTREAM_UNAVAILABLE", "message": "opencode-mem is not reachable on 127.0.0.1:4747" }
```

- [ ] **Step 6: Run proxy and full tests**

Run: `bun test tests/service/proxy.test.ts && bun test`

Expected: PASS with no live network dependency.

- [ ] **Step 7: Commit the service**

```bash
git add service/main.ts service/proxy.ts tests/service/proxy.test.ts
git commit -m "feat: add safe memory API proxy"
```

### Task 4: Add Typed API Models and Request State

**Files:**
- Create: `panel/types.ts`
- Create: `panel/api.ts`
- Create: `panel/state.ts`
- Create: `tests/panel/api.test.ts`
- Create: `tests/panel/state.test.ts`

**Interfaces:**
- Produces: `MemoryApi`, `createMemoryApi(host)`, `AppState`, `initialState`, `reduce(state, action)`, and request generation helpers.

- [ ] **Step 1: Write failing API decoding tests**

Test valid success envelopes, upstream non-2xx responses, `{ success: false, error }`, invalid JSON, `NO_SERVICE`, `SERVICE_FAILED`, and stale response cancellation.

- [ ] **Step 2: Run and verify RED**

Run: `bun test tests/panel/api.test.ts tests/panel/state.test.ts`

Expected: FAIL because API and state modules do not exist.

- [ ] **Step 3: Define exact data types from Task 1 fixtures**

Include `MemoryItem`, `PromptItem`, `MemoryPage`, `MemoryTag`, `MemoryStats`, `UserProfile`, `ProfilePreference`, `ProfilePattern`, and `ProfileWorkflow`. Keep unknown metadata as `Record<string, unknown>`.

- [ ] **Step 4: Implement `MemoryApi`**

Expose only explicit methods such as `getMemories`, `searchMemories`, `getTags`, `getStats`, `createMemory`, `updateMemory`, `deleteMemory`, `bulkDelete`, `pinMemory`, `unpinMemory`, `cleanup`, `deduplicate`, `getUserProfile`, and `refreshUserProfile`.

- [ ] **Step 5: Implement deterministic state transitions**

State tracks active view, host surface, loading/error, locale, page/pageSize/total, query, selected tag, selected ids, memory details, and a monotonically increasing request generation. Only the newest generation may commit a response.

- [ ] **Step 6: Run tests and typecheck**

Run: `bun test tests/panel/api.test.ts tests/panel/state.test.ts && bun run typecheck`

Expected: PASS.

- [ ] **Step 7: Commit the typed core**

```bash
git add panel/types.ts panel/api.ts panel/state.ts tests/panel
git commit -m "feat: add typed memory client state"
```

### Task 5: Build the Host-Aware Application Shell

**Files:**
- Modify: `panel/index.html`
- Modify: `panel/main.ts`
- Create: `panel/styles.css`
- Create: `panel/i18n.ts`
- Create: `panel/dialog.ts`
- Create: `tests/panel/i18n.test.ts`

**Interfaces:**
- Consumes: `MemoryApi` and state reducer.
- Produces: stable roots for list, graph, profile, status, toolbar, overlays, and host lifecycle cleanup.

- [ ] **Step 1: Write locale tests and verify RED**

```ts
expect(resolveLocale("zh-CN")).toBe("zh");
expect(resolveLocale("en-US")).toBe("en");
expect(resolveLocale("fr-FR")).toBe("en");
```

Run: `bun test tests/panel/i18n.test.ts`

- [ ] **Step 2: Implement i18n and shell state**

Add strings for navigation, loading, empty, offline, unauthorized, service failure, validation, confirmations, and CRUD feedback. Do not hard-code user-visible text in view modules.

- [ ] **Step 3: Mount once and update repeatedly**

On every `host.onReady(ctx)`, call `applyHostReady(ctx, document.documentElement)`. Mount controls only once; then update `locale`, `surface`, and CSS data attributes. Call `host.dispose()` and all UI-handle `dispose()` functions on unload.

- [ ] **Step 4: Add recovery states**

Differentiate:

```text
service not approved -> explain Settings > Extensions permission
opencode-mem unavailable -> explain OpenCode must be running with webServerEnabled
upstream unauthorized -> show contract-specific recovery from Task 1
empty data -> normal empty state
```

- [ ] **Step 5: Add accessible dialog/drawer primitives**

Implement focus trapping, Escape close, labelled title, focus restoration, and destructive-action confirmation. Avoid nested dialogs.

- [ ] **Step 6: Verify shell in panel and page surfaces**

Run: `bun test && bun run typecheck && bun run build:panel`

Expected: PASS and successful IIFE build.

- [ ] **Step 7: Commit the shell**

```bash
git add panel tests/panel/i18n.test.ts
git commit -m "feat: add host-aware extension shell"
```

### Task 6: Implement Memory List, Search, and Management

**Files:**
- Create: `panel/memory-view.ts`
- Modify: `panel/main.ts`
- Modify: `panel/styles.css`
- Extend: `tests/panel/state.test.ts`
- Extend: `tests/panel/api.test.ts`

**Interfaces:**
- Consumes: `MemoryApi`, current `AppState`, dialog primitives, and i18n strings.
- Produces: `mountMemoryView(root, deps)` with `update(state)` and `dispose()`.

- [ ] **Step 1: Add failing behavior tests**

Cover query submit/reset, tag change resetting page to 1, page-size changes, selection surviving refresh only for existing ids, and stale search responses not replacing newer results.

- [ ] **Step 2: Run and verify RED**

Run: `bun test tests/panel/state.test.ts tests/panel/api.test.ts`

- [ ] **Step 3: Implement compact and page layouts**

Panel renders stacked rows; page renders a wider table-like list. Both show content excerpt, type, tags, creation time, staged/pinned/source indicators, and actions. Prompt rows are read-only unless the API contract explicitly supports their delete route.

- [ ] **Step 4: Implement search, filter, paging, and refresh**

Use UI-kit search/select/buttons. Search executes on submit, not every keystroke. Keep draft query while background refresh runs. Poll every 30 seconds only while the document is visible and the current view is list.

- [ ] **Step 5: Implement add/edit/pin/delete flows**

Validate required `containerTag` and content before create. Edit only fields supported by the Task 1 contract. Confirm single and bulk deletion with exact counts. Disable duplicate submissions while a request is in flight.

- [ ] **Step 6: Implement maintenance actions**

Expose cleanup and deduplication behind warning confirmations. Do not expose migration endpoints in v0.1.0.

- [ ] **Step 7: Verify behavior**

Run: `bun test && bun run typecheck && bun run build:panel`

Expected: PASS; generated bundle has no CDN references.

- [ ] **Step 8: Commit memory management**

```bash
git add panel tests/panel
git commit -m "feat: add memory management view"
```

### Task 7: Implement the Stable Interactive Memory Graph

**Files:**
- Create: `panel/graph-model.ts`
- Create: `panel/graph-view.ts`
- Modify: `panel/main.ts`
- Modify: `panel/styles.css`
- Create: `tests/panel/graph-model.test.ts`

**Interfaces:**
- Produces: `buildGraphModel(items, theme)`, `filterGraph(model, filter)`, and `mountGraphView(root, deps)`.

- [ ] **Step 1: Write failing graph-model tests**

Assert deterministic node ids, direct prompt-memory links, deduplicated edges, safe empty content, type counts, and shared-tag edges only when a tag has `2..8` members.

```ts
expect(model.edges.filter((edge) => edge.kind === "shared-tag")).toHaveLength(1);
expect(buildGraphModel(nineItemsWithSameTag, theme).edges).toHaveLength(0);
```

- [ ] **Step 2: Run and verify RED**

Run: `bun test tests/panel/graph-model.test.ts`

- [ ] **Step 3: Implement the pure graph model**

Use stable ordering and a fixed random seed. Keep display labels short but preserve full item data separately for details.

- [ ] **Step 4: Implement the network lifecycle**

Fetch up to 2,000 items with prompts included. Keep canvas hidden during stabilization, use bounded physics, freeze physics after `stabilizationIterationsDone`, reveal only the settled graph, and add a 20-second safety fallback. Destroy the old network on refresh/dispose.

- [ ] **Step 5: Add graph interactions**

Implement all/memory/prompt/search filters, text search, zoom in/out, fit, node details, related-node navigation, and theme updates. Do not rebuild solely for host theme changes; update node/edge colors in place.

- [ ] **Step 6: Handle panel constraints**

In rail-panel mode, render a reduced canvas and an action that asks the user to open the extension full-screen through normal OpenChamber navigation guidance. In page mode, use the full available viewport.

- [ ] **Step 7: Verify graph correctness and build**

Run: `bun test tests/panel/graph-model.test.ts && bun run typecheck && bun run build:panel`

Expected: PASS; no node motion remains after readiness.

- [ ] **Step 8: Commit the graph**

```bash
git add panel/graph-model.ts panel/graph-view.ts panel/main.ts panel/styles.css tests/panel/graph-model.test.ts
git commit -m "feat: add stable memory graph"
```

### Task 8: Implement the Grouped User Profile View

**Files:**
- Create: `panel/profile-view.ts`
- Modify: `panel/main.ts`
- Modify: `panel/styles.css`
- Extend: `tests/panel/state.test.ts`

**Interfaces:**
- Produces: `groupProfileItems(items, fallbackLabel)` and `mountProfileView(root, deps)`.

- [ ] **Step 1: Write failing grouping tests**

Test grouping by category, descending group size, uncategorized fallback, confidence/alpha formatting, and ordered workflow steps.

- [ ] **Step 2: Run and verify RED**

Run: `bun test tests/panel/state.test.ts`

- [ ] **Step 3: Implement profile rendering**

Render summary metadata, then preferences, patterns, and workflows as section -> category -> item hierarchy. Preserve the existing requirement that profile data is not shown as one flat list.

- [ ] **Step 4: Implement manual refresh**

Refresh only on explicit click because it may invoke model-backed analysis. Show progress, success, and contract-specific errors. Do not add AI cleanup/apply UI in v0.1.0.

- [ ] **Step 5: Verify and commit**

Run: `bun test && bun run typecheck && bun run build:panel`

```bash
git add panel/profile-view.ts panel/main.ts panel/styles.css tests/panel/state.test.ts
git commit -m "feat: add grouped profile view"
```

### Task 9: Complete Responsive, Accessibility, and Runtime Verification

**Files:**
- Modify: `panel/styles.css`
- Modify: relevant panel modules found during testing
- Create: `docs/2026-09-22-manual-verification.md`

**Interfaces:**
- Consumes: complete extension bundle.
- Produces: verified panel/page behavior and an evidence checklist.

- [ ] **Step 1: Run the automated gate**

Run: `bun run check`

Expected: all tests pass, TypeScript emits no errors, and both bundles rebuild successfully.

- [ ] **Step 2: Install from the local folder**

In OpenChamber Settings -> Extensions, add:

```text
/Users/yulimfish/Documents/AIWorkspace/openchamber-memory-graph-ui
```

Approve only the local-service permission. Confirm the rail icon and Extension pages entry both appear.

- [ ] **Step 3: Test recovery states**

Verify service not approved, opencode-mem stopped, upstream unauthorized, empty results, and malformed upstream response. Each state must explain the cause and provide one retry action without an infinite retry loop.

- [ ] **Step 4: Test list workflows against disposable data**

Create a uniquely tagged test memory, search it, edit it, pin/unpin it, inspect it in graph view, and delete it. Do not modify pre-existing memories. Record the temporary id and confirm it no longer exists.

- [ ] **Step 5: Test layout and accessibility**

Verify narrow rail, desktop full page, and a mobile-width browser viewport. Check keyboard navigation, visible focus, dialog focus restoration, Escape behavior, light/dark themes, Chinese/English locale, long content, long tags, and reduced motion.

- [ ] **Step 6: Verify graph stability with real data**

Sample node positions after graph readiness, wait at least two seconds, and sample again. Expected: zero position changes after physics is frozen.

- [ ] **Step 7: Record evidence and commit fixes**

Document commands, OpenChamber version, opencode-mem version, tested surfaces, and pass/fail outcomes. Attach screenshots only if they help explain a layout issue.

```bash
git add panel service tests docs/2026-09-22-manual-verification.md panel/main.js service/main.js
git commit -m "test: verify OpenChamber memory UI"
```

### Task 10: Document Installation and Publish v0.1.0

**Files:**
- Create: `README.md`
- Modify: `package.json`
- Verify: `LICENSE`, `panel/main.js`, `service/main.js`, `bun.lock`

**Interfaces:**
- Produces: Git-installable repository and tag `v0.1.0`.

- [ ] **Step 1: Write the README**

Include prerequisites, the Git URL installation flow, local-folder development flow, requested permission explanation, `webServerEnabled: true`, default port `4747`, build commands, architecture diagram, security boundary, troubleshooting for each recovery state, and screenshots of panel/page after verification.

- [ ] **Step 2: Validate package contents**

Confirm the repository includes built JS and excludes `node_modules`, local fixtures containing personal data, screenshots with sensitive content, `.env`, credentials, and absolute-path config files.

- [ ] **Step 3: Run final checks**

Run: `bun run check && git status --short && git diff --check`

Expected: checks pass; only intentional release files are changed.

- [ ] **Step 4: Independent audit**

Dispatch a fresh read-only `goal-verify` auditor covering requirement completeness, proxy security, logic, edge cases, code quality, non-tautological tests, and actual OpenChamber runtime evidence. Fix BLOCKER findings and rerun the audit until PASS, up to three rounds.

- [ ] **Step 5: Commit and push**

Before committing, verify `git config user.email` is `2822603942@qq.com` and public package metadata uses `epeiuss@waterflames.cn` where contact information is needed.

```bash
git add package.json bun.lock README.md LICENSE panel service tests docs
git commit -m "feat: release OpenChamber memory graph UI"
git push -u origin main
git tag v0.1.0
git push origin v0.1.0
```

- [ ] **Step 6: Verify the remote artifact**

Run:

```bash
git ls-remote https://github.com/yulimfish/openchamber-memory-graph-ui.git HEAD
```

Then install `https://github.com/yulimfish/openchamber-memory-graph-ui.git#v0.1.0` in OpenChamber and repeat the health, list, graph, and profile smoke checks.

## Definition of Done

- The extension installs from Git and requests only local-service permission.
- Both rail panel and full-screen page load and follow OpenChamber theme/locale.
- The service cannot proxy arbitrary hosts, traversal paths, migration routes, or unsupported methods.
- List, search, pagination, details, create, edit, pin/unpin, single delete, bulk delete, cleanup, and deduplicate work against the live local service.
- Graph renders real memories/prompts, stabilizes before reveal, freezes without jitter, filters/searches, and opens details.
- Profile renders preferences, patterns, and workflows in grouped hierarchy and supports explicit refresh.
- Offline, unauthorized, unapproved-service, malformed-response, empty, and retry states are distinguishable.
- `bun run check` passes, manual verification is recorded, and independent audit returns PASS.
- `main` and tag `v0.1.0` are pushed to `https://github.com/yulimfish/openchamber-memory-graph-ui`.
