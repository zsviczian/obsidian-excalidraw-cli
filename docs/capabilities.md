# Capability report

## Inspection record

These are inspected source revisions, not the version installed in any user's Obsidian instance.

| Source | Revision | Relevant inspected paths |
| --- | --- | --- |
| Plugin native skill and CLI | [`89a2dab`](https://github.com/zsviczian/obsidian-excalidraw-plugin/commit/89a2dabdc281ec7f6c922cde2bc504394ef0412e) | [`docs/AITrainingData/excalidraw-cli/SKILL.md`](https://github.com/zsviczian/obsidian-excalidraw-plugin/blob/89a2dabdc281ec7f6c922cde2bc504394ef0412e/docs/AITrainingData/excalidraw-cli/SKILL.md), [`docs/CLI.md`](https://github.com/zsviczian/obsidian-excalidraw-plugin/blob/89a2dabdc281ec7f6c922cde2bc504394ef0412e/docs/CLI.md), `src/core/cli/cliCommands.ts`, `src/core/cli/cliApply.ts`, `src/core/cli/cliTarget.ts`, `src/core/cli/cliExport.ts` |
| Official Excalidraw CLI | [`55fe7f4`](https://github.com/excalidraw/cli/commit/55fe7f494837078781a062c4d3faf29c159ebec5) | `README.md`, `package.json`, `src/render.ts`, `src/fonts.ts` |
| Public Excalidraw libraries | [`297a349`](https://github.com/excalidraw/excalidraw-libraries/commit/297a349eaff859e678f78d4dbc8e68df5fce42e) | `README.md`, `LICENSE`, `libraries.json`, `authors.json`, example `.excalidrawlib` files |
| Obsidian Excalidraw plugin and EA | [`89a2dab`](https://github.com/zsviczian/obsidian-excalidraw-plugin/commit/89a2dabdc281ec7f6c922cde2bc504394ef0412e) | `src/shared/ExcalidrawAutomate.ts`, `src/types/excalidrawLib.d.ts`, `src/core/managers/StencilLibraryManager.ts`, `src/core/cli/cliCommands.ts`, `scripts/testing/host/nativeCLI.mjs` |
| Maintainer's Excalidraw fork | [`52e9997`](https://github.com/zsviczian/excalidraw/commit/52e99975d798fc7c252f2662ba9ba225d09b9ee2) | `packages/excalidraw/element` text/bounds helpers and package metadata |

**Dependency relationship:** the inspected plugin package declares `@zsviczian/excalidraw` version `0.18.141`; its repository package metadata resolves to the maintainer's fork/revision above. The official `excalidraw/cli` is an independent Excalidraw+ API client/local renderer, not the plugin's runtime. No upstream repository was modified or added as a dependency.

## What can be reused

### Native CLI contract (source-derived)

The plugin source defines a versioned JSON API and commands for discovery, schema/API lookup, exact-path list/read/open/create/apply/export, trusted scripts, and receipt lookup. It documents unique request IDs, idempotent receipt recovery for the same effective request, pagination with a snapshot revision, stale/busy recovery, explicit output paths, and `ok`/mutation/persistence checks. The create serializer routes through EA and refuses to overwrite. Reads default to limited pages; full-scene work must exhaust `nextOffset` at one revision.

Useful official-CLI conventions that do not require its engine: JSON-first machine output, stdout/stderr separation, explicit options/limits, and a concrete recovery/error model. Its architecture separates API client, content validation, I/O, output formatting, command wiring, and local browser rendering. `src/scene-content.ts` validates full/partial scene input before remote creation; if a second write fails, it reports the already-created scene ID instead of implying rollback. Its `test/render-validation.test.ts` protects existing output files and validates malformed scenes; `test/e2e.test.ts` gates API tests on explicit credentials, uses temporary fixtures, and cleans up only resources it created. These are workflow/testing patterns, not proof of Obsidian behavior. Its service credentials, Excalidraw+ workspace API, Playwright rendering process, and commands do not transfer to this wrapper. It is intentionally not installed.

### Text, geometry, grouping, and layering (source-derived, not runtime-proven)

- `src/types/excalidrawLib.d.ts` declares common bounds, mutation, `refreshTextDimensions`, `measureText`, `wrapText`, `getLineHeight`, `getFontMetrics`, font-name listing, font-string resolution, and export helpers. The native `api surface=lib` intentionally documents a smaller stable subset (including `convertToExcalidrawElements`, `getCommonBounds`, and `mutateElement`). A declaration or direct fork export does not prove that a particular installed build exposes the helper through the CLI.
- EA source has text-measurement/text-creation methods, grouping, element dictionaries, and `addElementsToView` (including whether added content goes on top). The native `apply` operation set includes add/update/delete/connect/group/ungroup. Its finite update fields include ordinary geometry/style/text but deliberately exclude linear resizing and element identity/binding internals.
- Fork declarations expose helpers; source inspection cannot establish exact text-anchor coordinates, auto-resize, font availability, live geometry, or view ordering for a user's installed build. Measure before insertion where the running API permits, then reread actual geometry.
- `getFontFamilies()` is declared as returning names, while skeletons use numeric font family IDs. Resolve the name-to-ID mapping only from a verified runtime capability. Excalifont is the requested default; `5` is only the task's case-study expectation, not a verified universal mapping. Do not silently use Virgil.

### Public library format and reuse

At the inspected catalog revision, `libraries.json` records library name/description, authors, source and preview paths, created/updated dates, version, ID, and sometimes item names. `authors.json` maps contributor IDs and library IDs. The inspected `libraries/youritjang/stick-figures.excalidrawlib` contains complete Excalidraw element objects with shared `groupIds`, illustrating why flattening to skeletons loses semantics. The repository README recommends grouping multi-element items as one insertable unit. The catalog repository's `LICENSE` is MIT; that license alone does not establish the terms/attribution for every contributed asset. Inspect the chosen library and its provenance individually.

The plugin has a `StencilLibraryManager` that loads/restores library items for the library collection and `ExcalidrawLib.restoreLibraryItems`; those do not themselves provide a documented selected-item-to-current-scene operation. The native CLI's documented `apply` operations do not include library insertion, and create skeletons do not preserve the full library item shape. The exact `api surface=ea` and `surface=lib` responses of the installed plugin must be queried before relying on an alternative. Never evaluate catalog files as code.

## Answers and status

| Question | Source evidence | Status here |
| --- | --- | --- |
| Discover installed fonts and IDs? | Font names and mappings have helper declarations; stable CLI subset does not list the full font mapping. | **Not runtime-verified.** Query the installed API and resolve Excalifont by name. |
| Native text measurement/bounded labels? | Fork declarations and EA source contain measurement, wrapping, refresh, and bound helpers. | **Source-derived only.** Exact installed exposure/anchor/autoresize behavior unverified. |
| Selected library item with relationships intact? | Library restoration and scene mutation are separate interfaces; no documented native `library.insert` operation. | **No insertion tested.** This is a candidate narrow native API gap, not a confirmed defect in the installed build. |
| Geometry/bounds helpers? | Lib declarations include common bounds and text bounds; native documented subset includes `getCommonBounds`. | **Source-derived only.** No live bounds comparison run. |
| Layer order? | EA supports top-on-add; `apply` can add content but has no explicit reorder operation in the inspected command registry. | **No live layering test.** An explicit order/move operation may be useful if the installed path cannot satisfy this. |
| Stable view identity and newly generated input readiness? | Source docs require explicit view IDs for ambiguous views and exact vault-relative inputs. | **No live test.** The case-study reports lifecycle/indexing discrepancies; those are not reclassified as confirmed plugin bugs. |

## Runtime versus source observations

This sandbox has Node.js 22 on Linux but no running Obsidian instance, installed plugin, dedicated vault, or reference image. Thus all upstream capability claims above are source-level findings. The problem statement's Windows/plugin 2.28.1/sandbox-vault details are case-study inputs only. The only verified execution is the offline Node test suite listed in [`results.md`](results.md); no native command, persistence, export, visual review, font ID, or library insertion was performed.

The local starter's checked-in `LICENSE` begins with GNU AGPL v3, conflicting with the issue text's claim that it advertises MIT. This change preserves the existing notice and declares the same license in `package.json`; it does not replace the repository license.

## Candidate upstream work (approval and live verification required)

1. If a running supported plugin still lacks it after checking `api`, add a focused native operation to insert one selected library item. It should import structured library data without evaluating code, remap IDs and all internal bindings, retain a group, resolve/copy dependencies explicitly, uniformly fit and translate while preserving stroke/text treatment, mutate through the normal revision/save queue, and return provenance/hash, actual IDs, bounds, and persistence.
2. If installed EA cannot reliably control order for existing elements, consider a narrow `reorder`/layer operation that does not delete and recreate elements.
3. Add runtime font name+ID discovery and a documented bounded-text placement/measurement example only if those capabilities are absent from the installed API.

These are proposals, not changes to the plugin or fork.
