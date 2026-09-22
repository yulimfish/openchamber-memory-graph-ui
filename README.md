# openchamber-memory-graph-ui

An [OpenChamber](https://openchamber.dev) extension that brings your local
[`opencode-mem`](https://github.com/yulimfish) memory store into OpenChamber as a
rail panel and a full-screen page: browse, search, edit, and delete memories,
explore a stable interactive graph of memories and prompts, and read your grouped
user profile.

- **Panel + page**: compact rail panel for quick lookups; full-screen page
  (OpenChamber → *Extension pages*) as the primary graph workspace.
- **Local only**: everything talks to `http://127.0.0.1:4747` through an
  authenticated bundled local service. No accounts, no telemetry, no CDN assets.

## Prerequisites

- OpenChamber ≥ 1.24.0 (desktop or web)
- OpenCode running with the `opencode-mem` plugin, `webServerEnabled: true`
  (default port `4747`)
- The extension's **local-service** permission (requested once at install)

## Install

1. Open **Settings → Extensions** in OpenChamber.
2. Paste one of these into *Folder, ZIP, or URL* and choose **Add**:

   ```text
   https://github.com/yulimfish/openchamber-memory-graph-ui.git
   ```

   or a local checkout for development:

   ```text
   /Users/you/path/to/openchamber-memory-graph-ui
   ```

3. Approve the single permission: **Run a local service** → *Allow and enable*.

The rail icon **Memory Graph** appears on the right-hand rail; the full-screen
page appears under **Extension pages** above the session list.

## Build (development)

```bash
bun install
bun run check   # bun test && tsc --noEmit && build panel + service
```

Built artifacts (`panel/main.js`, `service/main.js`) are committed, so a Git or
folder install runs without any build step. Rebuild them after editing
TypeScript sources.

## Architecture

```text
┌──────────────────────────── OpenChamber ────────────────────────────┐
│  panel/index.html (sandboxed guest, panel or page surface)         │
│    panel/main.ts      host lifecycle, shell, load/poll             │
│    panel/memory-view  list / search / CRUD / maintenance           │
│    panel/graph-model  pure graph construction + filters            │
│    panel/graph-view   vis-network lifecycle, stable reveal         │
│    panel/profile-view grouped profile + manual refresh             │
│    panel/state.ts     reducer, request generations                 │
│    panel/api.ts       typed client over host.serviceRequest()      │
│              │  host.serviceRequest({ path: "/memory-api/…" })     │
│              ▼                                                     │
│  service/main.ts (bundled Node local service, host runtime)        │
│    · binds 127.0.0.1:${OPENCHAMBER_SERVICE_PORT} only              │
│    · requires Authorization: Bearer ${OPENCHAMBER_SERVICE_TOKEN}   │
│    · service/proxy.ts: fixed origin, endpoint+method allowlist,    │
│      20 s timeout, 2 MiB request cap, traversal rejection          │
│    · reads ~/.opencode-mem/.auth-token internally only             │
│              │  x-opencode-mem-token                                │
│              ▼                                                     │
│  opencode-mem Web API — http://127.0.0.1:4747                      │
│    /api/{stats,tags,memories,search,user-profile,cleanup,…}        │
└─────────────────────────────────────────────────────────────────────┘
```

## Security boundary

- The panel **never** sees upstream credentials. The service exposes `/health`
  and `/memory-api/*`; the panel itself only calls `/memory-api/*` through
  `host.serviceRequest()`.
- The service accepts no arbitrary origin, path, method, or header from the
  panel: requests are validated against an explicit allowlist and rebuilt from
  the fixed `http://127.0.0.1:4747` origin. Migration endpoints are not
  exposed.
- The dedicated `opencode-mem` token is read from its user-only file inside the
  service process and forwarded only as `x-opencode-mem-token`. It is never
  logged, persisted, returned, or rendered.
- Request bodies above 2 MiB and any `Transfer-Encoding` are rejected; every
  route (including `/health`) requires the OpenChamber bearer token.

## Troubleshooting

| State you see | Meaning | Fix |
|---|---|---|
| Local service permission is required | OpenChamber has not approved the bundled service | Settings → Extensions → review/approve the local-service permission, then **Retry** |
| opencode-mem is unavailable | Nothing answers on `127.0.0.1:4747` | Keep OpenCode running with `webServerEnabled: true`, then **Retry** |
| opencode-mem authorization failed | The dedicated token file is missing/rejected | Restart OpenCode so `opencode-mem` rewrites `~/.opencode-mem/.auth-token`, then **Retry** |
| Memory request failed | Unexpected upstream/service response | Check the OpenCode logs and **Retry** once |
| Empty list | No memories match the current search/filter | Clear the search or add a memory |

## Manual verification

The executed automated gate and the pending interactive checklist live in
[`docs/2026-09-22-manual-verification.md`](docs/2026-09-22-manual-verification.md).
The HTTP contract with the local upstream is documented in
[`docs/2026-09-22-opencode-mem-http-contract.md`](docs/2026-09-22-opencode-mem-http-contract.md).

## License

MIT · Contact: epeiuss@waterflames.cn
