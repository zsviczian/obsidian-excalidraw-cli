---
name: obsidian-excalidraw-cli
description: Author editable Obsidian Excalidraw drawings through the running plugin's native CLI, with revision-safe edits and visual verification.
---

# Obsidian Excalidraw native CLI

Use this skill only with the Obsidian CLI and Excalidraw plugin running. This companion wraps the plugin; it is not another drawing CLI or scene serializer.

## Discover before editing

1. Read the repository [native workflow](docs/native-cli-workflow.md) and [troubleshooting guide](docs/troubleshooting.md).
2. Ask for or configure the exact vault name/ID. Always put `vault="<name or ID>"` before `obsidian-excalidraw-plugin:<command>`. Never infer the active drawing or target path.
3. Query `help`, `status`, the relevant `schema`, and `api surface=ea`/`api surface=lib` on the running plugin. Runtime responses, not this repository or upstream `master`, define what is available.
4. For handwritten text request **Excalifont** by name. Resolve it against the installed runtime; never assume an ID or silently substitute Virgil. An alternate font needs an explicit user request or a documented design reason.
5. Inventory the complete source scene and its text, relationships, symbols, palette, regions, and dimensions. For reference work, locate the source image for side-by-side inspection where possible; note uncertainty instead of inventing details.

## Preserve and construct

- For a new drawing, use an exact new path. `create` does not overwrite. Never delete/recreate a drawing to bypass that rule.
- For an edit, explicitly open the target if a live view is needed; read the live scene and its revision immediately before applying a narrowly scoped change. Keep returned native IDs and use a new request ID for every changed payload.
- Put large UTF-8 requests in a vault-relative JSON file. Do not edit compressed drawing Markdown directly.
- Read every page using the same revision until `nextOffset` is exhausted. A default read is not a complete inventory.
- Measure text using the installed helpers when exposed. Set explicit line breaks/wrapping and alignment; after insertion, read actual element bounds. If the runtime cannot measure a font or text layout, state that limitation instead of claiming a fit.
- Use explicit background, connector, content, and label order. A successful save or export does not prove connectors are visible or visual quality is good.
- Search public Excalidraw libraries before drawing complex symbols. Check item style, license/attribution, revision/hash, groups, bindings, and external assets. Import only the chosen item using an installed native/EA path verified to preserve its relationships; never flatten library elements into create skeletons and claim they remain grouped.
- Use trusted scripts only when the user authorizes the code. A trusted script is arbitrary code, not a sandbox or transaction. Inspect it, pass data as JSON arguments, await work, and read back after failure.

## Recover and verify

- Check the response's `ok`, `mutation`, and `persistence`; exit code zero alone is not success.
- On `STALE_REVISION`, read a fresh snapshot and reconsider the edit. On `BUSY`, read back before retrying.
- After a timeout or lost output, query `result` with the same request ID. If the receipt is unavailable/pending, read the target before any new write. Never repeat an uncertain mutation blindly.
- On failed multi-step scripts, report actual state from read-back; do not describe it as rolled back.
- Open explicitly when a live view is required. For duplicate views, retain and reuse the exact returned view ID.
- Export to an explicit path and inspect the full image and enlarged problem regions. Review text/badge alignment, symbols, counts, connectors, wrapping, layering, and canvas framing. List concrete discrepancies. Structural checks and visual inspection are not user acceptance.
- Report artifact paths, checks actually performed, visual limitations, and whether user acceptance remains pending.

## Install

This file is portable; copy it into an agent's normal skill directory or point a compatible agent at it. This repository does not modify global agent configuration. See the [README](README.md) for installation notes and a quickstart.
