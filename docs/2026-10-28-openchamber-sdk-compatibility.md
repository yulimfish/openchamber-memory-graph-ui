# OpenChamber SDK 2.5.2 compatibility notes

## Upgrade and manifest contract

The extension upgrades the exact dependency from `@openchamber/sdk` 1.24.2 to
2.5.2. `bun install` resolved 2.5.2 and changed only its direct lock entry,
package record and integrity hash; the other direct dependencies and their
locked versions did not change.

The manifest remains `apiVersion: 1` with
`engines.openchamber: ">=1.24.0"`. Both existing commands are unchanged:

- `bunx openchamber-guest-bundle panel/main.ts panel/main.js`
- `bunx openchamber-guest-bundle --node service/main.ts service/main.js`

The extension uses the SDK host bridge for `connectHost`, `onReady`, `toast`,
`serviceRequest`, and `dispose`. Its service remains a host-runtime service
declared by `contributes.service`; no new service protocol or capability was
introduced. The 2.5.2 SDK package still publishes the `openchamber-guest-bundle`
binary in its `package.json` and documents the same Bun-based IIFE command in
`DOCUMENTATION.md`.

## Locale host contract for the UI task

The installed **2.5.2** package documents and implements repeated ready
snapshots, with locale included in each snapshot:

- `node_modules/@openchamber/sdk/dist/host.d.ts:43` declares
  `onReady(listener: (context: HostReadyContext) => void): () => void`.
- `dist/contract.d.ts:190-197` declares `HostReadyContext.locale: string`.
- `dist/host.js:126-139` accepts each host `ready` message, assigns its payload
  to `lastReady`, and emits that payload to all `onReady` listeners. At
  `dist/host.js:549-555`, a newly registered listener receives the latest
  `lastReady` snapshot and the returned function unsubscribes it.
- `dist/protocol.js:270` defines the `ready` discriminant; its payload schema
  includes `locale` as a non-empty string at `dist/protocol.js:181`.
- `API.md` lines 61-74 and 85-99 specify the method and payload; the official
  Host API page says `onReady` fires with the first snapshot and again whenever
  OpenChamber refreshes it, and identifies `locale` as the host language tag.

Thus the evidenced event is the host bridge's repeated `ready` push with
`HostReadyContext` payload (including `locale: string`), delivered through
`onReady`. If the host emits a new ready snapshot after a locale change, this
SDK delivers that locale through the existing listener; no separate locale
event needs to be invented. The subscription is already attached in
`panel/main.ts` at its `host.onReady` call, and `context.locale` is passed into
`HOST_READY`. B4 should consume each snapshot while mounting only once and
retain the returned unsubscribe.

No separate `onLocaleChange`/locale subscription exists in the exhaustive
`HostClient` declaration in `dist/host.d.ts:23-173`; locale arrives as part of
`onReady`. **Unknown / not independently proved:** although official docs say
`onReady` runs on host snapshot refresh and locale is a snapshot field, neither
the SDK package nor the retrieved official docs specifies that changing the
host language itself triggers such a refresh. Treat dynamic locale notification
as unverified unless host runtime evidence establishes that trigger. The SDK
evidence does establish how a refreshed locale snapshot is delivered.

## SDK changes relevant to this comparison

The SDK version tracks OpenChamber releases. Between the locked 1.24.2 and
2.5.2, the SDK API has expanded beyond this extension's needs. In the 2.5.2
release, the official changelog specifically lists two SDK additions:

- Work Status can use `contributes.statusSection.source` to render service
  data in the host, with its shape validated by `guestStatusViewSchema`.
- `onSessions` snapshots include linked issue/pull-request metadata.

The installed `host.d.ts` and `API.md` also document newer optional features
such as device-scoped storage, status controls, popovers, late generation
results, shell and workspace subscriptions, file-editor callbacks, and
additional host helpers. This is a surface-level inventory from the published
2.5.2 package, not an exhaustive semantic diff of every intervening release
against the old 1.24.2 source. None is adopted: the existing extension does
not need those capabilities for its current panel/service contract, and adding
them would widen scope and potentially increase host-version requirements.

The official extension docs keep `apiVersion` at 1 and describe
`engines.openchamber` as the oldest compatible host version. These declarations
are unchanged here; an SDK install/typecheck/build alone does not prove that an
OpenChamber 1.24.0 or 1.24.2 runtime supports 2.5.2 guest behavior.

## Compatibility evidence and limits

Official sources checked on 2026-10-28:

- [Build an extension](https://docs.openchamber.dev/sdk/) — manifest,
  `apiVersion`, engine declaration, and Bun bundle command.
- [Host API](https://docs.openchamber.dev/sdk/host/) — ready snapshot and host
  callbacks.
- [OpenChamber 2.5.2 release notes](https://openchamber.dev/changelog/) —
  release date and the two SDK additions summarized above.
- Installed package: `node_modules/@openchamber/sdk/package.json` reports
  version `2.5.2`; `dist/host.d.ts`, `dist/contract.d.ts`, `dist/host.js`,
  `dist/protocol.js`, `API.md`, `README.md`, and `DOCUMENTATION.md` provide the
  versioned local contract evidence cited above.

The requested documentation URL
`https://openchamber.dev/changelog/2.5.2` timed out when fetched directly;
the published changelog index at `https://openchamber.dev/changelog/` loaded
and contains the 2.5.2 section. `https://docs.openchamber.dev/sdk/host/` and
`https://docs.openchamber.dev/sdk/` loaded through the retrieval tools after
one transient timeout; no direct HTTP/curl fallback was used. Package docs and
declarations enumerate SDK behavior but do not prove runtime behavior of
legacy OpenChamber hosts.

**Not verified:** no host runtime was launched; no test was run against
OpenChamber 1.24.0 or 1.24.2; and no evidence establishes that a host locale
change triggers a refreshed `ready` message. Compatibility with those old
hosts and dynamic locale notification remain runtime questions; do not infer
them from `engines`, API version, lockfile, or successful compilation.
