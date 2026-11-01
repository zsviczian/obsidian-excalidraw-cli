# Obsidian Excalidraw CLI agent kit

Give an agent this repository and a drawing task. It contains the skill, runnable examples, small Node helpers, and supporting context needed to discover and control **Obsidian Excalidraw through the Obsidian CLI**.

```text
Agent → local terminal → Obsidian CLI → Excalidraw plugin → editable vault drawing
```

It is not another Excalidraw CLI, renderer, cloud service, or scene serializer. The installed plugin owns drawing construction, revision checks, persistence, and exports.

## Give it to an agent

Provide a local checkout or a copy of the repository, then use this handoff, replacing the placeholders:

```text
Read AGENTS.md and SKILL.md in <absolute path to this repository>.
Use the Obsidian CLI to work in vault <exact vault name or ID>.
Task: <what to create, inspect, or change>.
Drawing: <exact vault-relative path, including extension>.
Preview: <exact vault-relative .png or .svg output path, when needed>.
Private state directory: <absolute local path outside source control, dedicated to this vault>.
Start with read-only discovery. Stay within the task's authorized changes.
Verify saved state and inspect the exported image; report what remains unverified.
```

For an agent that supports `SKILL.md` bundles, place a copy in its documented skill location **with the repository's relative structure intact**, including `docs/`, `scripts/`, `examples/`, `README.md`, and `LICENSE`. Keep `package.json` and `tests/` for offline checks. Do not copy only SKILL.md, `.git`, or any private generated state. Installation is manual; nothing changes global agent settings. Scripts resolve imports relative to their files, not the current working directory.

## Requirements

Use a terminal on the computer running Obsidian, with permission to invoke its CLI. A cloud/container agent without access to that app cannot control it merely by receiving this repository.

Enable **Settings → General → Command line interface** and the Excalidraw plugin. Require **Obsidian Excalidraw plugin 2.29.1 or higher**. Verify the running `status.data.version` (or the doctor's `pluginVersion`) before drawing operations; stop on older or unverified versions and ask the user to update/reload the plugin. A source checkout or merged PR does not establish which release is installed. The native registration gate is desktop Obsidian API 1.12.2+ with the handler method present. The [Obsidian CLI setup guide](https://help.obsidian.md/cli) separately documents the required desktop installer. Check the running `help`/`status`, not a guessed version number.

Node.js 20+ is required only for this repository's helpers and tests. There are no npm dependencies, API keys, or global package installs. On Windows, use the supported `Obsidian.com` console launcher when capturing output; `--executable` accepts its exact path. On other systems, use the registered `obsidian` executable. `OBSIDIAN_CLI` is the optional executable override for the Node helpers.

## Discover first — no drawing changes

From the repository root:

```sh
node scripts/doctor.mjs --vault "My vault"
```

This queries native help, status, the create schema, and EA/Lib references. It prints JSON and exits unsuccessfully if readiness or the discovery session is inconsistent. Its `ready` flag does not check the minimum plugin version: separately verify `pluginVersion` is 2.29.1 or higher. It does not install anything, open drawings, or change settings. To discover directly without Node:

```sh
obsidian vault="My vault" obsidian-excalidraw-plugin:help
obsidian vault="My vault" obsidian-excalidraw-plugin:status
obsidian vault="My vault" obsidian-excalidraw-plugin:schema action=create
```

## First drawing

Preview the integration example without contacting Obsidian:

```sh
node examples/first-drawing.mjs --vault "My vault" --path "Demo.excalidraw.md" --out "Demo.png"
```

After reviewing the plan, run it in an authorized test vault with unused output paths:

```sh
node examples/first-drawing.mjs --vault "My vault" --path "Demo.excalidraw.md" --out "Demo.png" --execute --state-directory "/absolute/private-state/my-vault"
```

Replace the private-state path with an absolute local directory you own; Windows examples are in [getting started](docs/getting-started.md). The demo creates two labelled shapes and a bound arrow, reads saved content, explicitly opens the drawing, edits an actual element ID at its live revision, verifies the saved edit, and exports that same disk revision. It uses the installed default font to test the transport, not a particular typography choice. Inspect the PNG yourself or through the agent's image-viewing capability.

The script does not overwrite, retry, delete, or run a trusted EA script. Opening a view can run configured drawing scripts. If any stage fails, keep the partial result, recover its receipt, and inspect the target before issuing another write. Requests and receipts are retained in the private state directory; they can contain drawing text.

## Reference map

| Need | Start here |
| --- | --- |
| First-time setup, path types, command discovery, and source provenance | [Getting started](docs/getting-started.md) |
| Agent operating rules | [SKILL.md](SKILL.md) |
| Requests, revisions, pagination, persistence, and recovery | [Native workflow](docs/native-cli-workflow.md), `scripts/native.mjs` |
| Image inventory, mixed previews, labels, and output budgets | [Image previews](docs/image-previews.md) |
| Text placement, bounds, validation, and layering | [Authoring](docs/authoring.md), `scripts/layout.mjs`, `scripts/validate.mjs` |
| Public symbols, structured library inspection, and provenance | [Library reuse](docs/library-reuse.md), `examples/inspect-library.mjs` |
| Repository development and live acceptance | [Contributing](CONTRIBUTING.md) |

The initial [capability inspection](docs/capabilities.md) and [test report](docs/results.md) are historical records. Offline tests do not establish font availability, visual fidelity, lossless library insertion, or live platform support. The upstream [Excalidraw CLI](https://github.com/excalidraw/cli) is a separate Excalidraw+ client/local renderer and is not required or invoked here.

## Check the bundle

```sh
npm run check
```

This runs syntax checks and dependency-free offline tests, including subprocess fixtures. It never launches Obsidian or edits a vault. Live integration and visual acceptance remain separate checks.

License: [GNU AGPLv3](LICENSE), preserved from this repository's original license.
