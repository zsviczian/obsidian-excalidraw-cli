# Native CLI workflow

Require **Obsidian Excalidraw plugin 2.29.1 or higher**, verified through the running `status.data.version` / doctor's `pluginVersion`. Stop on older or unverified versions; the doctor's `ready` flag alone does not enforce this requirement. The Obsidian plugin is the authority for command schemas and persistence. Start from the running app, not assumptions about a repository version:

```text
obsidian vault="My vault" obsidian-excalidraw-plugin:help
obsidian vault="My vault" obsidian-excalidraw-plugin:status
obsidian vault="My vault" obsidian-excalidraw-plugin:schema action=create
obsidian vault="My vault" obsidian-excalidraw-plugin:api surface=ea query=text
obsidian vault="My vault" obsidian-excalidraw-plugin:api surface=lib
```

The vault argument must precede the plugin command. The repo's `scripts/native.mjs` uses argument-array process execution (no shell), requires an explicit vault, discovers `help`/`status`/command schema/EA/Lib capabilities before each write, creates a unique ID for writes, and checks the structured response. Writes require an explicit private `stateDirectory`; it retains the effective request metadata and receipt (mode 0700 directory/0600 files where supported), rejects changed payloads reusing a request ID, and returns the record path. It may contain private drawing text/assets: keep it out of source control and sync. Pass the exact parsed request object with a vault-relative `requestFile` so it is retained; because the wrapper does not resolve vault names to machine paths, you must ensure it matches the file in the vault. The native plugin processes and records the actual file payload. Set `OBSIDIAN_CLI` if the executable is not named `obsidian`; on Windows, use the supported console launcher such as `Obsidian.com` and test output decoding on that machine.

## Small create request

Copy [`examples/badge.request.json`](../examples/badge.request.json) into a visible JSON file in the chosen vault, change its destination to a new exact path, and invoke:

```text
obsidian vault="My vault" obsidian-excalidraw-plugin:create input="CLI/badge.json"
obsidian vault="My vault" obsidian-excalidraw-plugin:open path="Drawings/Agent Badge.excalidraw.md"
obsidian vault="My vault" obsidian-excalidraw-plugin:read path="Drawings/Agent Badge.excalidraw.md" source=live detail=elements
obsidian vault="My vault" obsidian-excalidraw-plugin:export path="Drawings/Agent Badge.excalidraw.md" source=live out="Drawings/Agent Badge.png" requestId=badge-export-unique-1
```

The destination JSON request must follow the installed `schema`; replace sample paths and request IDs before use. `create` never overwrites. A newly created file may need to be indexed before native `input=` can read it; diagnose `NOT_FOUND` through the plugin's supported readiness guidance rather than arbitrary sleep loops.

For edits, `read source=live detail=elements` and retain `data.revision`, then `apply` with that exact `expectedRevision` and returned element IDs. Page through `nextOffset` with the same revision; restart the read on `STALE_REVISION`. Check the whole response including mutation and persistence. Open is explicit, and its returned view ID is not interchangeable with an unrelated duplicate tab's ID.

## Recovery

- Keep the request payload and request ID. Repeating the same effective write can return its receipt; changed content must use a fresh request ID.
- `result requestId=<id>` recovers a receipt after lost stdout. Receipts are session scoped and may expire. Read the exact target back before retrying if the receipt is unknown or pending.
- Refresh on `STALE_REVISION`. On `BUSY`, inspect the receipt/state first. An explicitly pre-execution refusal with no mutation or persistence side effect can retry the identical payload with the same request ID once the target is free. Do not assign a fresh ID to bypass pending/completed/uncertain receipts or automatically retry writes. Unexpected `INTERNAL_ERROR` is distinct from invalid input; inspect possible write outcomes before proceeding.
- Creation is not evidence of an open view. Export does not save live state. A trusted script is not transactional; inspect live/disk state on error.

## Image previews

Use [image previews](image-previews.md) for `read detail=images`, guarded labels/tags, explicit original/thumbnail/placeholder policies, output budgets, and source-versus-preview identity. `apply` image insertion uses boolean `scale`; PNG export uses numeric `scale`. Inspect the matching operation schema. The existing `readAll` helper reads element pages only; image inventory must follow its own `images`/`nextOffset` pages at one revision.

## Pagination and machine-readable results

Follow `nextOffset` on `read`/`list`; preserve the snapshot revision for later pages. The first page and summary do not establish that all elements are present. Native JSON is the preferred machine interface; preserve Unicode as UTF-8 and do not infer content corruption from a terminal's display encoding.
