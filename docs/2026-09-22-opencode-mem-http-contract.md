# opencode-mem HTTP Contract

## Scope

This contract describes the local `opencode-mem` Web API consumed by the
OpenChamber extension. It was verified against the running
`@yulimfish/opencode-mem@2.26.0` service at `http://127.0.0.1:4747`.

The extension must not access SQLite files directly. It must call only the
documented loopback HTTP API through its authenticated OpenChamber local
service.

## Authentication

Every `/api/*` request except `GET /api/health` requires the dedicated
`x-opencode-mem-token` header. A request without that header returns:

```json
{ "success": false, "error": "Unauthorized" }
```

The token is managed by `opencode-mem`, stored in its user-only readable local
token file, and injected into the Web UI by the upstream service. It must be
read only by the extension's local service process. The panel must never read,
render, store, log, or receive it.

This is credential strategy B from the implementation plan: use the dedicated
`opencode-mem` web token with the documented `x-opencode-mem-token` header.
The service must return a stable upstream-unauthorized error if the token file
is absent, unreadable, or rejected.

Optional HTTP Basic Auth and a configured `webServerApiToken` are separate
upstream protections. They are not enabled in the verified local contract and
must not be guessed or sourced from unrelated OpenCode credentials.

## Supported Read Requests

```text
GET /api/stats
GET /api/tags
GET /api/memories?page=1&pageSize=2&includePrompts=true
GET /api/search?q=test&page=1&pageSize=2
GET /api/user-profile
```

Representative sanitized responses are in `tests/fixtures/api/`. They retain
field names, optionality, and value types while replacing all personal content,
identifiers, repository URLs, project paths, email addresses, and timestamps.

## Verification Evidence

- The listener is the active OpenCode process with the `opencode-mem` plugin
  loaded, not the older unscoped `opencode-mem@2.19.4` package copy.
- `GET /api/stats` without a token returned HTTP 401 and the JSON unauthorized
  envelope.
- The same request with the dedicated token header returned HTTP 200 and a
  successful stats envelope.
- The upstream source enforces the token before dispatching every protected API
  route.

## Restart Verification

The current OpenCode process hosts the active working session. Restarting it
from this task would interrupt that session, so the second verification after a
normal OpenCode/OpenChamber restart is deferred to Task 9 manual runtime
verification. The test must repeat the five requests above, confirm the same
authentication behavior and schemas, and record the results without exposing
credentials.

## Service Requirements

- Keep the origin fixed at `http://127.0.0.1:4747`.
- Read the dedicated token only in the local service process at request time or
  service startup; never persist it in the extension repository.
- Forward it only as `x-opencode-mem-token` to the fixed loopback origin.
- Do not forward panel-supplied authorization headers.
- Do not support arbitrary origins, paths, methods, cookies, or credentials.
