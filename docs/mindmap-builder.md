# MindMap Builder: install, start, and automate

Use MindMap Builder for native editable mind maps: nodes and branch arrows,
Markdown outline import, layout, folding, boundaries, and map configuration.
It is an Excalidraw Automate **script**, installed separately from the plugin.
The [MindMap Builder API reference](https://github.com/zsviczian/obsidian-excalidraw-plugin/blob/master/docs/ea-script-docs/MindMapBuilderAPI.md)
documents `window.MindMapBuilderAPI`. Read it before authoring API operations;
discover the installed script's contract at runtime before executing them.
The ordinary `api surface=ea` / `surface=lib` lookup does not enumerate this API.

Follow [getting started](getting-started.md) and [native workflow](native-cli-workflow.md)
first. A request to install or use MindMap Builder authorizes its necessary
installation and startup; retain that authorization through the workflow.
Inspection alone does not authorize downloading executable code, opening a
drawing, or starting the script. Keep all work in the explicitly selected vault.

## Discover installation and the configured folder

Query the installed script schema and Obsidian command registry:

```sh
obsidian vault="My vault" obsidian-excalidraw-plugin:schema action=script
obsidian vault="My vault" obsidian-excalidraw-plugin:status
obsidian vault="My vault" commands filter="obsidian-excalidraw-plugin:"
```

Find the exact command ending in `Mindmap Builder`, retaining its subfolder
prefix. With a default installation it is
`obsidian-excalidraw-plugin:Downloaded/Mindmap Builder`. A registered command
means installed, not necessarily running. An absent `window.MindMapBuilderAPI`
means inactive or unavailable, not proof that the script needs downloading.

When the installed status response includes `mindMapBuilder`, use its `available`
and `ready` booleans for a read-only readiness check without a trusted probe.
These fields describe the active script API, not installation or the correct
drawing target. Older plugin releases omit them; only then use the probe below.
They were merged in [plugin PR #3065](https://github.com/zsviczian/obsidian-excalidraw-plugin/pull/3065).
Check the actual response to confirm your installed release includes them.

Resolve **Excalidraw Automate script folder (CASE SeNSitiVE!)** in the selected
vault's Excalidraw settings. Its setting key is `scriptFolderPath`, defaulting
to `Excalidraw/Scripts`. With local filesystem access, read only the relevant
keys (`scriptFolderPath`, `allowJavaScriptFiles`, `storeScriptFilesAsJavaScript`)
from the selected vault's config directory, `plugins/obsidian-excalidraw-plugin/data.json`.
The config directory is commonly `.obsidian`; verify it for this vault.
Do not print the full settings file, which can contain credentials, or edit it
to install a script. Use the current settings UI if the persisted values are
missing, invalid, or may differ from pending in-app settings. Preserve the
configured folder and case; do not silently reset it to the default.

## Install only when missing

1. Inspect the configured Scripts folder and its subfolders for an existing
   `Mindmap Builder.md` or enabled `Mindmap Builder.js`. Reuse an existing copy
   and its registered command. If the file exists but the command is missing,
   diagnose indexing, script loading, folder configuration, and `.js` support
   before downloading a duplicate.
2. Download the official [raw Mindmap Builder.md](https://raw.githubusercontent.com/zsviczian/obsidian-excalidraw-plugin/master/ea-scripts/Mindmap%20Builder.md).
   Fetch the raw file, not the GitHub HTML page or modular development source.
   Check HTTP success and review the downloaded executable source under the
   task's script authorization. Record its source and revision/hash when available.
3. Create the configured folder's `Downloaded` subfolder if needed, then save
   the reviewed source as **`<scriptFolderPath>/Downloaded/Mindmap Builder.md`**.
   The default destination is
   **`Excalidraw/Scripts/Downloaded/Mindmap Builder.md`**, relative to the vault.
   Use a create-only write (Vault API `create`, or exclusive filesystem creation)
   so a concurrent install cannot overwrite an existing script. Do not overwrite
   a customized copy or create a second `.md`/`.js` variant as a repair.
4. Keep the `.md` extension: these files contain executable EA source and work
   without enabling JavaScript-file loading. The script store chooses `.js`
   only when both `allowJavaScriptFiles` and `storeScriptFilesAsJavaScript` are
   true; do not change those preferences for this workflow. An optional matching
   [SVG toolbar icon](https://raw.githubusercontent.com/zsviczian/obsidian-excalidraw-plugin/master/ea-scripts/Mindmap%20Builder.svg)
   can be saved beside the script with the same basename; it is not needed for
   command execution.
5. Let Obsidian index the file and repeat command discovery. A registered command
   is required before launch. If it stays missing, inspect script-loading errors
   and the actual file/folder first; do not repeatedly download or start copies.

The Excalidraw script store in the app is also an installation option and applies
its configured `.md`/`.js` storage preference. Confirm the installed path afterward.

## Start the persistent script

Open the exact authorized drawing (create it through the normal guarded `create`
workflow first if needed), retain the returned `viewId`, and launch the discovered
command while that drawing is active:

```sh
obsidian vault="My vault" obsidian-excalidraw-plugin:open path="Drawings/Ideas.excalidraw.md"
obsidian vault="My vault" command id="obsidian-excalidraw-plugin:Downloaded/Mindmap Builder"
```

Replace the sample command with the actual ID from discovery. Obsidian's
`command` acts on the active view; avoid concurrent focus changes and resolve
duplicate tabs explicitly. Check that the Builder sidepanel starts and verify
API readiness below. Launch completion alone is not readiness: initialization
can continue asynchronously. On an initial not-ready result, inspect startup
and repeat the readiness probe within a bounded wait before considering another
launch. Do not keep re-running the command to poll readiness.

Start Builder through its normal registered command, **not** by passing the
Builder file to `obsidian-excalidraw-plugin:script`. That command is for one-shot
EA invocations and destroys its EA instance when execution returns; Builder
needs its persistent script/sidepanel lifetime. Use `:script` for short API
wrappers after startup. No `obsidian eval` fallback is needed.

## Discover and call the runtime API

Save this reviewed probe as a visible vault-local EA script, for example
`CLI/Mindmap inspect.md` (outside the downloaded script itself):

```js
const mmb = window.MindMapBuilderAPI;
if (!mmb?.ready()) return { ready: false };
const context = mmb.getView();
return {
  ready: true,
  filePath: context.ok ? context.data.filePath : null,
  spec: mmb.spec(),
  methods: mmb.listMethods(),
  errors: mmb.getErrorCodes(),
};
```

Invoke through the installed `script` schema, using the actual `viewId` from
`open` and a new request ID:

```sh
obsidian vault="My vault" obsidian-excalidraw-plugin:script script="CLI/Mindmap inspect.md" path="Drawings/Ideas.excalidraw.md" view="<viewId>" trusted=true requestId=mmb-inspect-unique-1
```

The native response's `data` is the wrapper's JSON return value. Check both the
outer receipt and nested API `ok` results. Return serializable data only;
`getView()` and `setView()` include live view objects that must not be returned
directly. Discover `help(method)`, `validate(method, args)`, and `spec()` from the
active runtime rather than inspecting minified function signatures. A missing
method requires an explicit update decision, not guessed arguments.

For a mutation, write a separate reviewed wrapper that uses `ea.targetView`
from the exact CLI path/view, checks `mmb.setView(ea.targetView)`, and verifies
its returned `filePath` before acting. Do not rely on whichever drawing the
Builder previously targeted. Pass the outline, node IDs, and configuration as
JSON `args` / `utils.input`; never interpolate them into executable source.
For example, save this as `CLI/Mindmap import.md` and invoke it through the same
`script` command with the exact path/view, a fresh request ID, and JSON `args`
such as `{"markdown":"- Project\n  - Research\n  - Delivery"}`:

```js
const mmb = window.MindMapBuilderAPI;
if (!mmb?.ready()) throw new Error("MindMap Builder is not ready");
const view = ea.targetView;
if (!view?.file || typeof view.save !== "function") {
  throw new Error("An explicit target with an awaited save method is required");
}
const bound = mmb.setView(view);
if (!bound.ok) return bound;
if (bound.data.filePath !== view.file.path) {
  throw new Error("MindMap Builder target does not match the CLI drawing");
}
const checked = mmb.validate("importMarkdown", utils.input);
if (!checked.ok || !checked.data.valid) return JSON.parse(JSON.stringify(checked));
const result = await mmb.importMarkdown(checked.data.normalizedArgs);
if (!result.ok) return JSON.parse(JSON.stringify(result));
await view.save(false);
return JSON.parse(JSON.stringify(result));
```

Use the ordinary queued save policy and return JSON-safe data; see
[result serialization and save policies](results.md#script-results-and-save-policy).
Supply an explicit `parentId` from
the actual scene when appending to a branch; otherwise inspect/clear the current
node selection deliberately before importing a new map. Selection can influence
the destination. Useful follow-up APIs include `addNode`, `refreshMapLayout`,
`getMapConfig` / `setMapConfig`, `getElementIdsByRole`, and `performAction` with
the runtime's `Actions` constants. Global configuration changes affect later
work too; keep them within the requested scope.

## Verify and recover

The `script` command has no caller-supplied `expectedRevision` guard and arbitrary
API work is not transactional. Read the complete live scene before a mutation,
avoid concurrent editing, await API operations and saving, and follow receipt
recovery on timeout or failure before issuing another mutation. A failed nested
API result may follow partial work; a successful outer receipt is not a save
certificate. Never repeat an uncertain import automatically.

Read live and disk content after saving; verify expected nodes, text, parent/child
bindings, branch metadata, and returned IDs. Export to an explicit unused preview
path and inspect layout, wrapping, branches, boundaries, and clipping. Confirm
editability and saved/reopened content. MindMap Builder creates a graph with
native semantic structure; [Mermaid's `mindmap` image output](mermaid.md) and
SVG-to-geometry conversion have different behavior. Report actual checks and
remaining limitations, especially popout/window migration or mobile behavior
that has not been tested.

Source inspection (2026-11-21): plugin
[`5e8ec2a`](https://github.com/zsviczian/obsidian-excalidraw-plugin/tree/5e8ec2a4a232504820ae9693b75861b16c0cb856)
(`settingsDefaults.ts`, `settings.ts`, `scriptLibraryUtils.ts`, `Scripts.ts`,
and `core/cli/cliScripts.ts`), and Builder
[`ec0d228`](https://github.com/zsviczian/ea-scripts/tree/ec0d228a41985ae8779eeefa27bc09696e11e58c/src/scripts/mindmap-builder).
[Obsidian CLI documentation](https://help.obsidian.md/cli) defines `commands` and
`command`. These references explain the workflow; installed responses and the
active Builder API remain authoritative. This guide is not a live acceptance run.
