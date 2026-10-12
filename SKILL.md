---
name: obsidian-excalidraw-cli
description: Discover, create, inspect, edit, and export editable Obsidian Excalidraw drawings through the running app's native CLI. Use for local vault drawing tasks, revision-safe changes, and visual verification.
---

# Obsidian Excalidraw through the native CLI

This bundle controls the **running Obsidian app**, not Excalidraw+ or a standalone renderer. Start at the bundle root; all relative references below belong to this repository. Install or provide the whole bundle, not this file alone. Node helpers run in the local terminal; EA scripts run inside Obsidian through an explicitly trusted native command.

## Bootstrap without prior context

Read [getting started](docs/getting-started.md). Establish the exact vault name/ID, drawing path, task scope, and preview path from the user. Use an absolute private state directory outside source control, dedicated to this vault. Do not infer an active drawing or silently broaden permission from inspection to mutation.

Run read-only discovery first:

```sh
node scripts/doctor.mjs --vault "<exact vault name or ID>"
```

Without Node, start with:

```sh
obsidian vault="<vault>" obsidian-excalidraw-plugin:help
obsidian vault="<vault>" obsidian-excalidraw-plugin:status
obsidian vault="<vault>" obsidian-excalidraw-plugin:schema action=create
```

Put `vault` before the command. Confirm the returned vault and readiness. Query the relevant `schema action=<command>` and `api surface=ea name=<method>` / `api surface=lib` as needed. API lookup returns documentation, not a generic method executor. Queries are substring searches: use one focused term, then an exact method name. Runtime responses, not these documents or a source branch, define availability.

If commands are missing, check the local launcher, enabled CLI/plugin, supported host API, and selected vault. Do not install the separate upstream Excalidraw CLI, alter settings, or bypass the native protocol with arbitrary `obsidian eval` code. A remote terminal needs access to the actual desktop application; repository access alone is insufficient.

## Choose a small workflow

For a first authorized test, inspect the offline plan from `examples/first-drawing.mjs`; `--execute` is required to run it. Read [native workflow](docs/native-cli-workflow.md) before other writes. Use [authoring](docs/authoring.md) for layout and [library reuse](docs/library-reuse.md) for complex symbols.

- New drawing: use `create` at an unused exact `.excalidraw.md` path. It never overwrites. Do not delete/recreate to bypass that protection.
- Existing drawing: explicitly `open` when a live view is needed, read the complete live snapshot, and `apply` a narrow change using its `expectedRevision` and actual IDs. Reuse the returned `viewId` as the request's `view` for duplicate-view safety. Opening can run configured drawing scripts.
- Inspect only: use `list` or `read source=disk` without opening or saving. A summary or first page is not a complete inventory.
- Preview: export to an explicit `.svg`/`.png` path; replacing an existing output requires separate explicit permission. Live export does not save a drawing. Prefer disk export when verifying persisted content.
- Advanced work: inspect the installed EA/Lib references first. Use `script` only for reviewed local code the user authorizes, with `trusted=true`. Pass JSON arguments as `utils.input`; never interpolate untrusted text into source.

## Preserve meaning and editability

Inventory the complete source scene: text, relationships, symbols, palette, regions, and dimensions. For reference recreation, compare the source image rather than inventing hidden details. Follow `nextOffset` until exhausted, with the same revision; restart on a changed snapshot.

Use returned `data.idMap` IDs, not skeleton-local labels, for later edits. A generated bound label has its own text-element ID. Keep small requests in structured JSON; put larger ones in a visible vault-relative JSON file. Never edit compressed drawing Markdown directly. Retain the exact request payload and unique request ID before publication.

For handwritten work, resolve **Excalifont** against the installed runtime rather than assuming a numeric font ID or silently substituting Virgil. The first-drawing transport demo intentionally uses the installed default font and is not a typography test. Use installed text measurement/wrapping helpers when available, then read actual bounds. State limitations when a fit cannot be measured.

Keep backgrounds, connectors, content, and labels in deliberate order. Search public libraries for complex symbols; inspect only selected items, preserve provenance, and verify an installed insertion path that retains groups, bindings, and assets. Library JSON is data, not code. Do not flatten it to skeletons and claim a lossless import.

## Recover and verify

Check `ok`, `status`, `mutation`, and `persistence`; process exit zero is insufficient. A write can be applied but unsaved. On `STALE_REVISION`, refresh and reconsider the change. On `BUSY`, inspect state before retrying. Never automatically retry an uncertain mutation.

After lost output or timeout, query `result` with the original request ID. The returned receipt can name the original write command and can be pending (`ok: null`). Receipts are session-scoped and expire. Unknown/pending outcomes require live/disk read-back and inspection of the output before another write. `recoverWrite` can collect disk read-back, but it does not establish that unsaved live state is absent or that a pending operation has finished.

Trusted scripts are arbitrary code, not a sandbox or transaction. Await work, do not leave timers or hooks behind, and inspect state after errors. A timeout does not cancel all effects; completion does not imply everything was saved.

Export and inspect the full image plus enlarged problem regions. Check text, symbols, counts, wrapping, connectors, layering, and framing. Report exact artifact paths, saved-state evidence, checks actually performed, discrepancies, and remaining limitations. Structural tests, visual inspection, and user acceptance are different outcomes.
