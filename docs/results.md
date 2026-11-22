# Implementation result

## Implemented

- A portable `SKILL.md` and guides for native invocation/recovery, text/layout, public-library review, and troubleshooting.
- Dependency-free Node.js modules for native CLI invocation, runtime discovery, unique write IDs, structured request-file use, paginated reads, receipt/read-back recovery, measured text placement, font-name resolution without fallback, uniform fitting, bounds/layout validation, and bounded library JSON inspection/selection.
- Two editable native request examples and an offline library-inspection example.
- Node's built-in test runner and an offline GitHub Actions workflow.

## Checks actually run

- `npm run check` on Node.js 22. The command passed syntax checks and **13 offline unit tests**.
- `git diff --check`, the library-inspection example syntax check, and JSON parsing of both native request examples passed.
- The unit suite exercises argument construction, explicit target protections, UTF-8 output through a test child process, mock pagination over 50 elements, text placement/overflow, rotated/point bounds, fit, overlap diagnostics, and untrusted JSON limits.

Those child-process tests use controlled local fixtures. They are not native integration tests and do not prove Obsidian's argument parsing, font metrics, persistence, page lifecycle, serialization, exports, or visual quality.

## Not verified / remaining blockers

- No running Obsidian, installed plugin, dedicated test vault, Windows/PowerShell, or reference image was available. Native create/apply/read/export, receipts, lost-output recovery, stale/busy paths, file indexing, Unicode roundtrip, text anchors, Excalifont ID, visual exports, layer order, and two independent selected-library insertions remain unverified.
- The library helper inspects/selects one item and hashes the original JSON, but intentionally does not perform a scene insertion or pretend skeleton conversion retains groups/bindings.
- Geometry checks do not establish resemblance, readability, or visual quality. No reference infographic was created or reviewed; no evaluation drawing was changed.
- No safe live test cleanup was attempted: native creation is no-overwrite and this environment has no isolated vault. Live integration should run only after providing a dedicated test vault and confirming the runtime contract.

## Upstream proposals

See [capability report](capabilities.md#candidate-upstream-work-approval-and-live-verification-required). The likely useful candidates are selected library insertion with identity/binding/group preservation, explicit layer reordering if supported EA cannot satisfy it, and runtime font-name/ID plus bounded-text discovery if absent. None was implemented upstream.

## Script results and save policy

Feedback from an external native-CLI run on Excalidraw 2.29.3 reports that Builder
installation/startup and Mermaid conversion worked end to end after updating
Extras' Mermaid component to 3.6.0. This is contributor-reported evidence, not
a live run performed for this bundle.

Trusted scripts must return finite JSON. A top-level `undefined` is normalized
to `null` by the inspected plugin, but **nested** undefined object properties or
array entries fail strict result validation. The script may already have changed
and saved the drawing before the receipt reports `OUTCOME_UNKNOWN`. Prefer an
explicit JSON result object, or use `return JSON.parse(JSON.stringify(result))`
for a plain API result: undefined object fields disappear and undefined array
entries become null. This is not a serializer for circular objects, BigInt,
functions, or live view objects. Check nested API success/validation results too.
Do not rerun an uncertain import: recover its receipt and inspect live/disk state.

For ordinary CLI script saves, prefer **`await view.save(false)`**, then read back
disk content. When publishing an EA workbench and saving separately, use
`await ea.addElementsToView(false, false)` first: this publishes and marks the
view dirty, then the explicit save persists it. Do not treat the convenience
publication method's returned boolean as a persistence acknowledgment.
The normal save queue retains the same-file Markdown
edit guard. `false` controls suppression of reload from the view's own write; it
is not a force flag. **`await view.forceSave(true, true)`** uses a different policy:
silent mode, a bounded wait when busy, forced persistence, and bypass of the
same-file edit guard, with additional refresh/embed behavior. It can return
without saving and is not a stronger persistence acknowledgment. Use it only
when that policy is deliberately required, rather than as the default CLI save.
Both methods return void; neither proves that the requested revision was saved.
Prefer native guarded `apply` for ordinary supported edits; its receipt reports
persistence. With arbitrary scripts, await operations, check live/disk read-back,
and inspect/reopen the saved drawing before claiming durable success.
