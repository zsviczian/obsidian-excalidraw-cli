# Develop a custom Excalidraw script

When the user needs a custom Excalidraw script, create a repository owned by
the user from [zsviczian/ea-script-template](https://github.com/zsviczian/ea-script-template)
and implement it in that workspace. Use an existing user-owned template workspace
when the user has already selected one. Keep reusable script source, tests and
build tooling there; the vault receives the generated executable artifact.

## Create the workspace

Use GitHub's **Use this template → Create a new repository**, or an authenticated
GitHub tool that supports template generation. With GitHub CLI, for example:

```sh
gh repo create <owner>/<script-repository> --template zsviczian/ea-script-template --private --clone
cd <script-repository>
node --version
npm install
npm run new-script -- --name "My Script"
```

Resolve the owner, repository name and local destination from the task; default
to private unless the user requests public sharing. Creating a public repository
or publishing script code needs that scope in the request. If repository access
is unavailable, prepare a local workspace from the template and report the remote
creation prerequisite; continue implementation without claiming a remote exists.
Use the template's current Node requirement (22.13+ at this inspection), not the
CLI bundle's lower minimum. Read its `AGENTS.md`, `.template/AGENTS.md`, local
guides, `AUTHORING_GUIDE.md`, and `.ai/excalidraw-automate/SKILL.md` before coding.
Follow the workspace's template-update procedure, preserving local changes.

## Research and implement

Use [zsviczian/ea-scripts](https://github.com/zsviczian/ea-scripts), Zsolt's
maintained Excalidraw script repository, for concrete examples. Search its
`src/scripts/` and the template's
`.ai/excalidraw-automate/references/api-usage-index.md`, then read the relevant
implementation and API declarations. For example, the
[MindMap Builder source](https://github.com/zsviczian/ea-scripts/tree/main/src/scripts/mindmap-builder)
demonstrates a modular persistent script. Reuse patterns with attribution and
respect their license; do not edit the author's repositories to implement a
user's custom script or assume examples match every installed plugin version.

Keep the new script under `src/scripts/<slug>/`, with a thin `main.ts`, cohesive
modules, meaningful tests and a simple `preview.svg`. Put shared helpers in
`src/sharedUtils/`. The runtime injects `ea` and `utils`; obtain Obsidian runtime
classes from `ea.obsidian` and use `import type` for declarations. No runtime npm
or plugin imports are available in the Script Engine. Generated EA types belong
to the template; keep local augmentations in `src/types/local.d.ts`.

Check the installed plugin's `api`, `schema`, and component requirements before
relying on an example. For CLI automation, accept JSON through `utils.input`,
await work and saves, and return finite JSON without nested `undefined`. Prefer
an explicit result DTO; `JSON.parse(JSON.stringify(result))` removes undefined
object properties but is unsuitable for circular objects, BigInt, or live view
objects. See [script result handling](results.md#script-results-and-save-policy).
CLI prompts fail with `INTERACTION_REQUIRED`. Persistent sidepanels, listeners
and hooks need their normal registered script lifetime and cleanup, as explained
in [MindMap Builder startup](mindmap-builder.md#start-the-persistent-script).

## Build, deploy, and verify

```sh
npm run check
npm run build
```

Run relevant behavioral tests too. The deployable file is
**`build/<slug>/<slug>.md`**, plus its preview if needed. Do not copy
`src/scripts/<slug>/main.ts`, source modules, or a development checkout into the
vault as a runnable script. Never edit generated output as the source fix.

Resolve the selected vault's `scriptFolderPath` using the
[script-folder discovery guidance](mindmap-builder.md#discover-installation-and-the-configured-folder).
Install the built `.md` under that configured folder using the intended readable
script name; keep custom scripts outside the store-managed `Downloaded` folder.
Use create-only installation for new scripts; update only the exact existing
artifact owned by this task. Retain its source repository and revision/hash.

Discover the built script's registered command and start it with `command id=...`
on the exact authorized drawing. The current template scaffold uses `void main()`
inside an IIFE: its async work is detached from the outer Script Engine call.
Do not assume the resulting artifact can be awaited through one-shot `:script`;
that EA can be destroyed while the generated script is still running.

For automation, expose a narrow script-owned API and call it from a reviewed,
awaited one-shot wrapper, as in the [Builder workflow](mindmap-builder.md).
Alternatively, deliberately implement and verify a CLI-compatible entrypoint in
the source/build workflow that returns its complete operation's promise and JSON
result to the Script Engine. Do not fix this by editing generated artifacts.
For one-shot wrappers, discover `schema action=script`, explicitly open the
authorized drawing, and use `trusted=true`, the exact path/view, JSON arguments,
and a retained unique request ID. Persistent UI must retain its registered-command
lifetime.
Verify actual drawing changes, saved disk read-back and an exported preview;
typechecking and a build do not establish live behavior. Exercise cancellation,
empty selection and undo where relevant, with popout/mobile coverage for affected
UI workflows. Keep untested environments explicit.

Share the user-owned source repository and generated artifact paths with the
validation performed. Do not publish to the community script store automatically:
that is a separate request following the plugin's
[script publication rules](https://github.com/zsviczian/obsidian-excalidraw-plugin/blob/master/ea-scripts/README.md).

Template commands and paths were checked against its README and authoring guidance
on 2026-11-22. Read the generated repository's current instructions on future use.
