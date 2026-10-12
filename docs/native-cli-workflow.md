# Native CLI workflow

The Obsidian plugin is the authority for command schemas and persistence. Start from the running app, not assumptions about a repository version:

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
- Refresh on `STALE_REVISION`. On `BUSY`, read back before retrying. Do not automatically retry either as though it were a transient network error.
- Creation is not evidence of an open view. Export does not save live state. A trusted script is not transactional; inspect live/disk state on error.

## Pagination and machine-readable results

Follow `nextOffset` on `read`/`list`; preserve the snapshot revision for later pages. The first page and summary do not establish that all elements are present. Native JSON is the preferred machine interface; preserve Unicode as UTF-8 and do not infer content corruption from a terminal's display encoding.
