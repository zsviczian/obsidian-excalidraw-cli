---
name: obsidian-excalidraw-cli
description: Discover, create, inspect, edit, and export editable Obsidian Excalidraw drawings through the running app's native CLI, including MindMap Builder installation/automation and custom scripts developed from ea-script-template. Use for local vault drawing tasks, revision-safe changes, and visual verification.
---

# Obsidian Excalidraw through the native CLI

This bundle controls the **running Obsidian app**, not Excalidraw+ or a standalone renderer. Start at the bundle root; all relative references below belong to this repository. Install or provide the whole bundle, not this file alone. Node helpers run in the local terminal; EA scripts run inside Obsidian through an explicitly trusted native command.

## Requirements

Require **Obsidian Excalidraw plugin 2.29.1 or higher**, with Obsidian running and its native CLI enabled (desktop API 1.12.2+). Check the running `status.data.version` or the doctor's `pluginVersion` before drawing operations. The doctor's `ready` flag checks readiness, not this minimum version. If the version is older, missing, or cannot be verified, stop and ask the user to update/reload Excalidraw and repeat discovery. Do not offer the new image workflow on an older build or infer availability from a source checkout. Query the relevant installed schemas after the version check.

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

Put `vault` before the command. Confirm the returned vault, readiness, and Excalidraw version requirement above. Query the relevant `schema action=<command>` and `api surface=ea name=<method>` / `api surface=lib` as needed. API lookup returns documentation, not a generic method executor. Queries are substring searches: use one focused term, then an exact method name. Runtime responses, not these documents or a source branch, define availability.

If commands are missing, check the local launcher, enabled CLI/plugin, supported host API, and selected vault. Do not install the separate upstream Excalidraw CLI, alter settings, or bypass the native protocol with arbitrary `obsidian eval` code. A remote terminal needs access to the actual desktop application; repository access alone is insufficient.

## Choose a small workflow

For a first authorized test, inspect the offline plan from `examples/first-drawing.mjs`; `--execute` is required to run it. Read [native workflow](docs/native-cli-workflow.md) before other writes. Use [authoring](docs/authoring.md) for layout and [library reuse](docs/library-reuse.md) for complex symbols.

- New drawing: use `create` at an unused exact `.excalidraw.md` path. It never overwrites. Do not delete/recreate to bypass that protection.
- Existing drawing: explicitly `open` when a live view is needed, read the complete live snapshot, and `apply` a narrow change using its `expectedRevision` and actual IDs. Reuse the returned `viewId` as the request's `view` for duplicate-view safety. Opening can run configured drawing scripts.
- User-selected targets: read [selection handoff](docs/targeted-edits.md). Use the copied packet or installed `selection` command, include bound-label IDs, and keep edits scoped to the packet. Never guess replacement targets after a stale revision.
- Filled contours and drawing embeds: inspect the installed schemas and [authoring guidance](docs/authoring.md#filled-line-contours). `polygon` is line-only; `image` can embed recognized Excalidraw files when supported. Custom free-draw styling and line/free-draw conversion are explicit [scripting options](docs/authoring.md#custom-free-draw-strokes-and-conversion), with excalidraw.com compatibility limits.
- Inspect only: use `list` or `read source=disk` without opening or saving. A summary or first page is not a complete inventory.
- Preview: export to an explicit `.svg`/`.png` path; replacing an existing output requires separate explicit permission. Live export does not save a drawing. Prefer disk export when verifying persisted content. For image-heavy drawings, read [image previews](docs/image-previews.md): inventory images → bounded structural/mixed overview → selected original detail. Full original fidelity remains the default; request any reduction explicitly.
- Advanced work: inspect the installed EA/Lib references first. Use `script` only for reviewed local code the user authorizes, with `trusted=true`. Pass JSON arguments as `utils.input`; never interpolate untrusted text into source.
- Custom Excalidraw scripts: read [custom script development](docs/custom-scripts.md). Create a user-owned repository from [ea-script-template](https://github.com/zsviczian/ea-script-template) and implement/build the script there; use [Zsolt's ea-scripts](https://github.com/zsviczian/ea-scripts) for maintained examples. Deploy the generated `.md` artifact to the configured Scripts folder.
- Editable SVGs and icons: read [SVG import](docs/svg-import.md) for the workbench-only `importSVG` contract, explicit grouping/insertion, and fidelity limits. Use the installed converter through a trusted script; discover its API before use.
- Lucide icons: read [native icon insertion](docs/lucide-icons.md). Discover installed names with `icons`; use `create.icons` or `apply` with `op: "lucide"`. Ordinary insertion needs no trusted script. Read every returned `groupMap` member ID; icon aliases are not single elements or binding targets.
- Editable mind maps: read [MindMap Builder](docs/mindmap-builder.md) for its API, installation when missing into the configured Scripts folder's `Downloaded` subfolder, and startup through its registered script command. Use this workflow for native nodes, branches, folding, and layout. Start the persistent Builder through `command`, then use reviewed one-shot `:script` wrappers for API calls.
- Mermaid diagrams: read [native diagrams versus SVG images](docs/mermaid.md) before promising editable nodes or labels. Other diagram kinds may render as an SVG image; SVG-to-native conversion is a separate, lossy geometry operation.

## Preserve meaning and editability

Inventory the complete source scene: text, relationships, symbols, palette, regions, and dimensions. For reference recreation, compare the source image rather than inventing hidden details. Follow `nextOffset` until exhausted, with the same revision; restart on a changed snapshot.

For freehand drawings and traced outlines, keep each continuous contour in one line element and simplify its control points. Before publication, audit all open outline endpoints for concatenation, including bends, cusps, small gaps and overlapping ends; repeat the audit on the remaining paths using [continuous contours](docs/authoring.md#continuous-contours).

Use returned `data.idMap` IDs, not skeleton-local labels, for later edits. A generated bound label has its own text-element ID. Keep small requests in structured JSON; put larger ones in a visible vault-relative JSON file. Never edit compressed drawing Markdown directly. Retain the exact request payload and unique request ID before publication.

For handwritten work, resolve **Excalifont** against the installed runtime rather than assuming a numeric font ID or silently substituting Virgil. The first-drawing transport demo intentionally uses the installed default font and is not a typography test. Use installed text measurement/wrapping helpers when available, then read actual bounds. State limitations when a fit cannot be measured.

Keep backgrounds, connectors, content, and labels in deliberate order. Search public libraries for complex symbols; inspect only selected items, preserve provenance, and verify an installed insertion path that retains groups, bindings, and assets. Library JSON is data, not code. Do not flatten it to skeletons and claim a lossless import.

## Recover and verify

Check `ok`, `status`, `mutation`, and `persistence`; process exit zero is insufficient. A write can be applied but unsaved. On `STALE_REVISION`, refresh and reconsider the change. On `BUSY`, inspect state before retrying. Only an explicitly pre-execution refusal with no mutation or persistence side effect permits retrying the identical payload with the same request ID; retain that ID. Pending, completed, and unknown-outcome writes remain replay-protected. Never automatically retry an uncertain mutation. Unexpected `INTERNAL_ERROR` responses require inspection, not assumptions about malformed caller input.

After lost output or timeout, query `result` with the original request ID. The returned receipt can name the original write command and can be pending (`ok: null`). Receipts are session-scoped and expire. Unknown/pending outcomes require live/disk read-back and inspection of the output before another write. `recoverWrite` can collect disk read-back, but it does not establish that unsaved live state is absent or that a pending operation has finished.

Trusted scripts are arbitrary code, not a sandbox or transaction. Await work, do not leave timers or hooks behind, and inspect state after errors. A timeout does not cancel all effects; completion does not imply everything was saved.

Export and inspect the full image plus enlarged problem regions. Check text, symbols, counts, wrapping, connectors, layering, and framing. Report exact artifact paths, saved-state evidence, checks actually performed, discrepancies, and remaining limitations. Structural tests, visual inspection, and user acceptance are different outcomes.
