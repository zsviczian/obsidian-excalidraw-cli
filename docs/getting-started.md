# Getting started from a clean agent session

Use this guide with [SKILL.md](../SKILL.md). It assumes no earlier conversation, plugin source checkout, or knowledge of Excalidraw Automate (EA). EA is the plugin's scripting API; Lib is the installed Excalidraw component's helper API.

## 1. Establish the environment and permission

The agent needs a terminal on the computer running Obsidian and permission to invoke its executable. Merely providing the repository to a cloud agent does not connect it to the desktop. Do not open network access or forward ports as an automatic workaround.

The [official Obsidian CLI guide](https://help.obsidian.md/cli) explains installer setup, CLI registration, and platform launchers. Enable **Settings → General → Command line interface**, register the launcher, and restart the terminal when PATH changes. The desktop app must be available. The plugin's native commands additionally require an enabled build containing [PR #2988](https://github.com/zsviczian/obsidian-excalidraw-plugin/pull/2988), desktop API 1.12.2+, and the registration method. Installer requirements and plugin API gating are separate checks. Do not assume the latest installed store release contains a particular merged PR.

On Windows, use `Obsidian.com` for captured console output, not the GUI executable. The helpers accept `--executable "C:\path\to\Obsidian.com"`; on macOS/Linux, use the registered `obsidian` binary or its exact path. They use argument arrays without a shell. `OBSIDIAN_CLI` overrides the default executable; it is a path/name, not a shell command containing extra arguments.

Keep these path namespaces distinct:

| Value | Meaning | Example |
| --- | --- | --- |
| Bundle path | Local filesystem location of this repository | `/home/me/tools/obsidian-excalidraw-cli` |
| Vault selector | Exact registered vault name or ID, **not** a folder path | `My vault` |
| Drawing / input / preview | Exact visible path relative to that vault | `Drawings/Flow.excalidraw.md`, `CLI/create.json`, `Drawings/Flow.png` |
| State directory | Private absolute local directory, dedicated to this vault | `/home/me/.local/state/obsidian-excalidraw-cli/my-vault` |

An input request file must be inside the selected vault and indexed by Obsidian. A JSON file in this repository is not automatically a vault file. Hidden paths, traversal, and absolute paths are not native drawing targets. State files are local helper bookkeeping and may contain private text; exclude them from Git and synchronization. Do not share logs without reviewing their content.

A drawing task authorizes only its stated changes. Setup/discovery is not authorization to install software, enable plugins, open unrelated drawings, upload assets, or run arbitrary scripts. Use a dedicated test vault for the integration demo.

## 2. Discover the installed contract without editing

Run from the bundle root, or use the scripts' absolute paths:

```sh
node scripts/doctor.mjs --vault "My vault"
```

The doctor issues only `help`, `status`, `schema`, and `api` queries. Its JSON includes the installed plugin version, returned vault, session, schema, and API references. `ready: true` requires native CLI/converter readiness, the expected workflow commands, and one consistent plugin session. Confirm the returned vault against the intended target. An unsuccessful doctor does not change settings or attempt a repair.

The equivalent discovery commands are:

```sh
obsidian vault="My vault" obsidian-excalidraw-plugin:help
obsidian vault="My vault" obsidian-excalidraw-plugin:status
obsidian vault="My vault" obsidian-excalidraw-plugin:schema action=create
obsidian vault="My vault" obsidian-excalidraw-plugin:api surface=ea query=text
obsidian vault="My vault" obsidian-excalidraw-plugin:api surface=lib
```

Read `data.commands`, `data.jsonSchema`, and `data.example` rather than guessing flags. Query `schema action=apply` or `schema action=export` before those operations. The helper also refreshes discovery before each write. A schema describes request structure; runtime geometry and lifecycle checks still apply.

EA search is a case-insensitive substring search, not a list of keywords. Search `text`, `font`, or `group` separately, then use `name=addText` or the exact returned name. A response is limited to 20 API entries; an empty or partial search is not proof that an operation is impossible. The Lib reference is intentionally a supported subset, not reflection of every runtime export. API discovery provides documentation, not a command that executes arbitrary method names.

`skill format=markdown` returns the plugin's own portable instructions when needed:

```sh
obsidian vault="My vault" obsidian-excalidraw-plugin:skill format=markdown
```

This one form returns Markdown rather than the usual JSON envelope; call it directly, not through the JSON-only `invokeNative` helper.

## 3. Run the smallest complete drawing loop

First inspect an offline plan. It does not contact Obsidian or create state files:

```sh
node examples/first-drawing.mjs --vault "My vault" --path "Demo.excalidraw.md" --out "Demo.png"
```

After authorization, use unused exact paths and a private state directory. For POSIX shells:

```sh
node examples/first-drawing.mjs --vault "My vault" --path "Demo.excalidraw.md" --out "Demo.png" --execute --state-directory "$HOME/.local/state/obsidian-excalidraw-cli/my-vault"
```

For PowerShell, substitute the actual console-launcher path:

```powershell
node examples/first-drawing.mjs --vault "My vault" --path "Demo.excalidraw.md" --out "Demo.png" --execute --state-directory "$env:LOCALAPPDATA\obsidian-excalidraw-cli\my-vault" --executable "C:\path\to\Obsidian.com"
```

The example uses short inline JSON internally, avoiding request-file indexing and shell quoting. It creates two labelled rectangles and a bound arrow, checks the saved elements, opens the explicit drawing, captures its view and live revision, edits the returned actual shape ID, reads the saved result, and exports the same disk revision. It rejects incomplete read-back, broken labels/bindings, unsaved outcomes, and export revision changes. The demo intentionally uses the installed default font; normal authoring should resolve the requested font at runtime.

A successful JSON report lists the paths, actual IDs, private receipt paths, and structural checks. It deliberately reports `visualInspection: "not-performed"`. Inspect the PNG for clipping, font, wrapping, framing, and connector visibility, then check editability in Obsidian. An agent without an image-viewing capability must report that limitation, not infer visual quality from coordinates.

Opening can run configured drawing scripts. The demo does not use the trusted `script` command, overwrite existing files, delete files, retry writes, or clean up a partial result. If it stops, retain its printed request IDs and private records. Do not rerun the whole demo to repair an uncertain stage.

## 4. Move from the example to the task

Use [native workflow](native-cli-workflow.md) for complete reads and guarded edits. Its `invokeNative`, `readAll`, `listWriteRecords`, and `recoverWrite` helpers are importable building blocks; they are not a separate drawing protocol. Large requests should use `input=<visible vault JSON file>` with the exact matching payload retained locally. The wrapper caps inline structured requests at 8 KiB; the plugin's native input limit is 2 MiB at the inspected baseline. Query the current schema rather than increasing limits blindly.

Use [authoring](authoring.md) for text and layout. Measurements come from the installed runtime when available; the offline utilities do not replace the renderer. Use [library reuse](library-reuse.md) for public symbols. Do not feed a complete library item to `create` as if it were a skeleton batch.

For an EA-only capability, inspect its signature with `api`, review a local script, and obtain explicit authorization before `script trusted=true`. Pass data through JSON `args` / `utils.input`, await writes, and read back. A trusted script is neither sandboxed nor transactional. Do not install the Excalidraw+ CLI or use arbitrary `eval` as an automatic fallback.

## 5. Recover rather than guess

Check the response body even when the process exits successfully. Ordinary envelopes contain `apiVersion`, `session`, `command`, `status`, `ok`, `mutation`, and `persistence`. A successful mutation can still be unsaved; an export receipt only acknowledges its artifact.

```sh
obsidian vault="My vault" obsidian-excalidraw-plugin:result requestId=<original-request-id>
obsidian vault="My vault" obsidian-excalidraw-plugin:read path="Demo.excalidraw.md" source=disk detail=elements
```

`result` returns the original operation's envelope, so `command` may be `create`, `apply`, or `export`, not `result`. Pending means `status: "pending", ok: null`. Receipts expire after 15 minutes or plugin-session loss at the inspected baseline, with a capacity of 128. Do not poll by issuing new mutations or assigning fresh IDs to uncertain writes.

If no completed receipt is available, inspect both saved and relevant live state, plus the output artifact. Exhaust all pages at one revision. Disk read-back alone cannot prove that a live edit is absent or that a pending operation is finished. Refresh after `STALE_REVISION`; inspect before retrying `BUSY`. A script or client timeout cannot guarantee rollback. See [troubleshooting](troubleshooting.md) for host and lifecycle failures.

## Source provenance and boundaries

Reviewed on **2026-10-12**. These sources explain the workflow; installed responses remain authoritative.

| Input | Reused here | Boundary |
| --- | --- | --- |
| [Plugin CLI reference at merged PR #2988](https://github.com/zsviczian/obsidian-excalidraw-plugin/blob/3cef89dcdadf6c80171a23ebb1036f77ea7656c1/docs/CLI.md) | Native commands, exact paths, revision/save/receipt model | A merge is not an installed-version guarantee. |
| [Plugin dispatcher](https://github.com/zsviczian/obsidian-excalidraw-plugin/blob/3cef89dcdadf6c80171a23ebb1036f77ea7656c1/src/core/managers/ExcalidrawCLI.ts) and [command registry](https://github.com/zsviczian/obsidian-excalidraw-plugin/blob/3cef89dcdadf6c80171a23ebb1036f77ea7656c1/src/core/cli/cliCommands.ts) | Readiness fields, substring API search, `viewId`, pagination, original-command receipt envelopes | Source-derived contract, not live validation of this companion. |
| [Public library catalog](https://github.com/excalidraw/excalidraw-libraries/blob/297a349eaff859e678f78d4dbc8e68df5fce42e5/README.md) | Symbol discovery and grouping guidance | Structured data and previews, not executable scripts or proof of an insertion API. |
| [Upstream Excalidraw CLI](https://github.com/excalidraw/cli/blob/55fe7f494837078781a062c4d3faf29c159ebec5/README.md) | JSON-first automation, explicit outputs, partial-failure reporting | Separate Excalidraw+ client/local renderer; no commands, credentials, or renderer imported. |

The repository's initial [capability report](capabilities.md) and [results](results.md) retain earlier inspection context. Do not mistake their original case-study environment for your runtime. Offline tests use subprocess fixtures; live platform and visual checks require the actual desktop app.
