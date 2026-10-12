# obsidian-excalidraw-cli

A portable agent skill and small set of tested helpers for authoring editable Obsidian Excalidraw drawings through the plugin's **native CLI**. It does not implement a drawing engine, duplicate the native schema, install an alternate CLI, or modify agent configuration automatically.

## Requirements and support

- Obsidian desktop with the Excalidraw plugin enabled and its native CLI available. The plugin source documents native registration on supported desktop Obsidian CLI hosts (API 1.12.2+); the running host's `help`, `status`, `schema`, and `api` responses are authoritative.
- Node.js 20 or newer for offline utilities/tests; no npm runtime dependencies or global install are required. Node.js 22 on Linux is the only environment tested in this checkout. Windows/PowerShell is a target environment, not verified here; use Obsidian's supported console launcher (often `Obsidian.com`) and validate Unicode/quoting locally. macOS has not been tested.
- An explicit vault name/ID and exact drawing path for each operation. Never rely on an active drawing.

The case-study environment described by the original task (Windows, Obsidian, plugin 2.28.1, vault `sandbox`) is not this execution environment. Do not hardcode those values.

## Setup and checks

```sh
npm run check
```

This runs Node syntax checks and the dependency-free offline tests. There is no install step. Live integration requires a running Obsidian app and an isolated, dedicated test vault; no live tests were run here. See [the result report](docs/results.md).

## Quickstart

1. Start Obsidian, enable its CLI and the Excalidraw plugin, then query the installed contract. Replace the vault value with your exact vault name or ID:

   ```powershell
   obsidian vault="My vault" obsidian-excalidraw-plugin:help
   obsidian vault="My vault" obsidian-excalidraw-plugin:status
   obsidian vault="My vault" obsidian-excalidraw-plugin:schema action=create
   ```

2. Copy `examples/badge.request.json` into a visible file such as `CLI/badge.json` in that vault. Replace the destination with an unused exact path and give the write a unique request ID. The sample uses font ID `5`, which the case-study identifies as the expected Excalifont ID; confirm the mapping in the running plugin before using it. If that mapping is unavailable, resolve Excalifont by name through a supported runtime helper. Never silently use Virgil.
3. Create, open, read, and export explicitly:

   ```powershell
   obsidian vault="My vault" obsidian-excalidraw-plugin:create input="CLI/badge.json"
   obsidian vault="My vault" obsidian-excalidraw-plugin:open path="Drawings/Agent Badge.excalidraw.md"
   obsidian vault="My vault" obsidian-excalidraw-plugin:read path="Drawings/Agent Badge.excalidraw.md" source=live detail=elements
   obsidian vault="My vault" obsidian-excalidraw-plugin:export path="Drawings/Agent Badge.excalidraw.md" source=live out="Drawings/Agent Badge.png" requestId=badge-export-unique-1
   ```

   Inspect the exported image at full size. Check the returned `ok`, `mutation`, and `persistence`; a successful process exit or export is not proof of a saved, visually sound drawing. `create` never overwrites: use a new path for another run.

See [native workflow](docs/native-cli-workflow.md), [authoring helpers](docs/authoring.md), and [library reuse](docs/library-reuse.md) for the rest of the contract. `scripts/native.mjs` exports safe process invocation, pre-write runtime discovery, paginated reads, and recovery helpers. Native writes through the wrapper require an explicit private state directory so requests and receipts can be recovered after lost output; state files may contain private drawing content. The layout helpers accept injected Excalidraw measurements and do not claim to reproduce the runtime's renderer.

## Portable skill

`SKILL.md` is a portable instruction file. Copy it manually to the compatible agent's normal skills directory. For GitHub Copilot repository discovery, a user can install it as `.github/skills/obsidian-excalidraw-cli/SKILL.md` in their own project; for other compatible agents, use that agent's documented skill directory. This repository does not change global settings or install it into a user's workspace.

## Examples and library policy

- `examples/badge.request.json`: editable text badge request.
- `examples/layers.request.json`: background/connector/content ordering example.
- `examples/inspect-library.mjs`: inspect and select one public library item without evaluating its data. It does **not** insert that item into a scene; the supported lossless native/EA import path is not runtime-verified in this environment. Do not flatten the selection into create skeletons and claim groups/bindings were preserved.

Run the inspector against a downloaded `.excalidrawlib` and a zero-based item index:

```sh
node examples/inspect-library.mjs /path/to/selected-library.excalidrawlib 0
```

Search public catalog metadata/previews first. Record the exact selected source, author, revision/hash, and applicable attribution/license. The catalog repository's MIT license is not blanket proof that every asset can be reused without its own review. Follow the catalog's guidance to group multi-element items.

## Scope and limitations

This first version implements the portable agent workflow, a native subprocess wrapper, text placement/bounds utilities, and structured library inspection. It does not maintain a copied plugin schema, invoke the official Excalidraw CLI, render outside Obsidian, or promise visual fidelity. Runtime-dependent library insertion, font mapping, text anchors, export appearance, and view lifecycle remain unverified; documented candidate upstream gaps are separated in [capabilities](docs/capabilities.md).

The checkout's existing `LICENSE` is GNU AGPLv3, despite the task description's statement that the repository advertises MIT. This implementation does not replace that license. The package metadata matches the checked-in license.
