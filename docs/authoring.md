# Text, shapes, and layout

For editable mind maps, use [MindMap Builder](mindmap-builder.md): install the
script when missing, start it, and discover its native node/branch/layout API.

Use [native Lucide icons](lucide-icons.md) for installed editable symbols. Choose
nominal viewport size and initial line width explicitly, retain returned group
members, and inspect their actual painted bounds before connecting nearby shapes.
Read [Mermaid output types](mermaid.md) before promising editable diagram nodes;
read [SVG import limits](svg-import.md) before converting an image to geometry.

`scripts/layout.mjs` is a small host-neutral placement/checking layer. It deliberately takes injected measurement and wrapping functions: use the runtime's installed Excalidraw helpers when available rather than copying font metrics or approximating glyph widths.

```js
import { placeText, resolveFont } from "../scripts/layout.mjs";

const font = resolveFont("Excalifont", runtimeFonts);
const fontSize = 20;
const fontString = runtime.getFontString({ fontFamily: font.id, fontSize });
const lineHeight = runtime.getLineHeight(font.id);
const placement = placeText({
  text: "A measured\nbadge",
  box: { x: 40, y: 40, width: 180, height: 72 },
  font,
  fontSize,
  align: "center",
  padding: 8,
  wrap: (text, maxWidth) => runtime.wrapText(text, fontString, maxWidth),
  measure: (text) => runtime.measureText(text, fontString, lineHeight),
});
```

The example is an adapter contract, not proof that a method is exposed by every installed plugin. Check `api surface=lib`; trusted local EA scripts can use installed Excalidraw library helpers if runtime documentation and authorization allow it. Source declarations in the maintainer's fork include `measureText`, `wrapText`, `getLineHeight`, `getFontFamilies`, `getFontFamilyString`, `refreshTextDimensions`, and common-bounds functions. Their presence in a fork does not establish their exposure by the installed plugin.

`placeText` uses explicit left/center/right anchors and refuses overflow instead of silently shrinking text. Pass the resolved `{name,id}` from `resolveFont` to retain the numeric font ID for a skeleton. After insertion, read live bounds to confirm native anchor, wrapping, auto-resize, and font semantics. `elementBounds` encloses a rotated rectangle and linear points; rounded linear paths stay inside their control-point hull. Arrowhead decorations are not independently measured. Do not use the helper as a replacement for the native bounds API for fidelity-critical geometry.

Canvas and overlap checks are diagnostics only. Intentional overlaps (participant groups, badges inside shapes, icon parts) must be allow-listed for a particular validation. Geometry cannot establish readability, similarity, or visual quality.

## Continuous contours

In freehand drawings and traced outlines, represent one uninterrupted contour with
one native line element. Simplify the control points of the whole path while
preserving its shape. Sparse points are especially useful at roughness 2; splitting
the contour into several elements introduces new stroke ends and restarts the
roughness pattern. A corner can remain a point within the same element.

Before publication, audit the endpoints of every open outline in each region,
including paths rejected by any automatic merge filter. Compare endpoints in
scene coordinates, in both point orders. Exact matches, small gaps, and short
overlaps are review candidates; use stroke width and the reference ink to judge
whether they belong together. A radius is a discovery aid, not a hard acceptance
or rejection boundary.

Do not require nearly parallel endpoint tangents. One contour can bend around an
elbow or cheek, turn a corner, or reverse sharply at a hair or feather tip. A
change in direction does not justify splitting an otherwise uninterrupted outline.
Trace the whole visible boundary through the junction before deciding. When
several endpoints meet, choose any eligible
continuation within that junction instead of rejecting every path as ambiguous;
keep the actual branch separate.

Review candidates against the source and neighboring marks, and confirm compatible
style, group, frame, and stacking context. A difference in roundness requires
checking how to retain the corner and curve in one path; it does not establish
that they are separate contours. For overlaps, trim the duplicated run before
concatenating rather than doubling back over it.

Concatenate eligible paths in scene coordinates, accounting for element position,
rotation, and point order. Reconcile small gaps or overlaps, remove redundant join
points, and simplify the combined path. Preserve its intended shape, style, group,
frame, and layering. Avoid packing nearly coincident corner-support points next
to long spans: uneven spacing can create spline loops or protrusions. Adjust the
spacing and inspect the native render for corner shape, doubled joins, and
accidental closures. After editing, repeat the endpoint audit on the remaining
paths. Account for nearby pairs as joined continuations or intentional breaks,
branches, occlusions, or distinct marks; the number of completed merges alone is
not evidence that the region is finished.

Keep intentional gaps, separate marks, branches, occluded sections, and style
changes separate. This contour rule does not combine semantically distinct diagram
connectors merely because their endpoints are nearby.

## Filled line contours

The contour, drawing-image and EA stroke extensions below were merged in
[plugin PR #3066](https://github.com/zsviczian/obsidian-excalidraw-plugin/pull/3066).
Require the installed schema/API before using them.

Inspect `schema action=create` and `schema action=apply` before using new fields.
When advertised, a `line` skeleton or an existing line's `update.set` can specify
boolean **`polygon`**. True requires an explicitly closed contour of at least
four points, with the last equal to the first; the CLI does not reshape it.
Set its background color for fill. False retains regular line semantics: a
closed path can still fill, so use a transparent background to remove fill.
It is rejected on arrows,
shapes and other element types. Do not set `strokeLinecap` on ordinary lines.

The updated skeleton schema permits 2–1000 points per line/arrow, with at most
100000 contour points across one skeleton batch. Older releases cap a contour
at 100. Discover the installed limit; simplify an entire continuous contour
before splitting it into strokes with new endpoints. These limits do not grant
permission to write compressed drawing Markdown directly.

Text skeleton `x` is the horizontal alignment anchor: left, center or right
according to `textAlign`. After conversion, read the actual element bounds.
An existing text element's `update.set.x` changes its stored scene coordinate;
do not apply skeleton anchor arithmetic twice.

## Drawing images

When advertised by the installed `apply` schema, `image` accepts an exact local
raster/SVG path or a file the plugin recognizes as an Excalidraw drawing,
including `.excalidraw.md` and recognized Markdown drawing files. Ordinary
Markdown notes are refused. This inserts a linked image rendition of the source
drawing using EA's existing image loader; it does not flatten the source's
elements into the host or create a live interactive editor inside it.

```json
{
  "op": "image",
  "id": "mindmap",
  "asset": "Mind Maps/Topic.excalidraw.md",
  "x": 400,
  "y": 80,
  "scale": false,
  "anchor": true
}
```

Put this operation in a normal revision-guarded `apply` request. `scale=true`
uses EA's fit-to-size behavior. With `scale=false`, `anchor=true` (the default)
adds the source-size `100%` anchor; `anchor=false` permits later manual scaling
to survive refresh. The source file is retained as a link. Direct self-embeds
are refused; the existing loader retains its nested-drawing depth limit.

Verify the source link and source-size option after saving/reopening, then export
the host drawing and inspect the embedded content. Source changes may require
reloading the host view to refresh its rendition; do not promise instantaneous
live refresh. The existing Markdown-image deletion restriction remains in place.
General `customData` is still outside structured `add`/`update`; use the bounded
`imageMetadata` operation for image labels/tags, or a reviewed custom script for
other metadata. See [CLI issue #7](https://github.com/zsviczian/obsidian-excalidraw-cli/issues/7).

## Custom free-draw strokes and conversion

For caps, tapering or pressure-shaped strokes, offer an **explicit custom-script
workflow** using [the script template](custom-scripts.md), rather than changing
the behavior of ordinary lines. The Obsidian fork supports the Perfect Freehand
configuration through `element.customData.strokeOptions.options`: thinning,
smoothing, streamline, pressure simulation, easing, and independent start/end
caps, tapers and easing. The surrounding custom-pen record also supports
highlighter and outline controls. Preserve its other fields when patching it.

Read the plugin's [pen defaults](https://github.com/zsviczian/obsidian-excalidraw-plugin/blob/master/src/utils/pens.ts),
[canonical pen types](https://github.com/zsviczian/excalidraw/blob/master/packages/excalidraw/obsidianTypes.ts),
and [free-draw renderer](https://github.com/zsviczian/excalidraw/blob/master/packages/element/src/freedrawPath.ts)
before implementing. Easing is represented by the fork's named easing strings,
not executable callbacks in JSON. The renderer derives Perfect Freehand size
from `strokeWidth` (currently multiplied by 4.25) and renders a completed stroke;
do not promise independent `size`/`last` overrides. Verify the installed contract.

**excalidraw.com ignores these custom free-draw options.** The stroke can look
different when shared there. Explain that tradeoff before choosing custom caps,
tapering or pressure behavior; keep the source drawing when preparing a separate
visual export for sharing.

Conversion between line and free-draw is a deliberate geometry operation:

- For a straight polyline, preserve its centerline points and world-space placement.
- For a rounded/spline line, sample the actual curve densely enough before making
  a free-draw stroke. Raw line control points alone do not preserve the curve.
  Use an error-bounded curve sampler and a point budget; test tight bends, cusps,
  long segments, closure and rotated lines. Account for the new stroke's smoothing
  and width. Do not claim identical roughness or ink from a type change.
- A reverse conversion loses pressure, taper and custom cap semantics. Fit and
  simplify the centerline deliberately, preserve the intended closure/fill, and
  compare the rendered result before replacement.
- Preserve IDs, grouping, frame placement and unrelated metadata when the
  operation permits it. Reject or explicitly handle labels, arrowheads or
  relationships that the destination type cannot represent. Do not silently drop
  them, or convert arrows while claiming they remain bound arrows.

Discover the installed EA methods before implementing a converter from scratch:

```sh
obsidian vault="My vault" obsidian-excalidraw-plugin:api surface=ea name=convertLineToFreedraw
obsidian vault="My vault" obsidian-excalidraw-plugin:api surface=ea name=convertFreedrawToLine
obsidian vault="My vault" obsidian-excalidraw-plugin:api surface=ea name=concatenateLines
```

When available, these methods operate on copied **workbench** elements and do
not publish or save. Conversion retains the element ID. `tolerance` is measured
in scene units (default 0.5), `maxPoints` defaults to 10000, and `strokeWidth`
can override the nominal-width estimate. Line → free-draw accepts `penOptions`
using the fork's full custom-pen shape; its uniform default preserves the sampled
centerline and nominal line width in the fork. The returned `warnings` explain
compatibility or pressure/style loss. Unsupported labels/arrowheads, invalid
options and exceeded budgets leave that operation's workbench input unchanged.

For example, in a reviewed one-shot wrapper targeting an exact live path/view:

```js
ea.clear();
const ids = utils.input.ids;
const originals = ea.getViewElements().filter(e => ids.includes(e.id));
if (originals.length !== ids.length) throw new Error("A target stroke is missing");
ea.copyViewElementsToEAforEditing(originals);
const results = ids.map(id => ea.convertLineToFreedraw(id, {
  tolerance: 0.25,
  maxPoints: 10000,
}));
if (!await ea.addElementsToView(false, false)) throw new Error("Publication failed");
await ea.targetView.save(false);
return { results };
```

Inspect warnings, bounds, saved disk content and an export. An explicit conversion
request authorizes the conversion; do not silently use it merely to obtain a cap
setting the user did not request. Preserve a source copy when visual comparison
or cross-application sharing requires it. On older versions without these APIs,
implement/test the geometry in a [user-owned template workspace](custom-scripts.md).

`ea.concatenateLines(ids, {maxGap: 1, tolerance: 0.5, maxPoints: 10000})` joins
2–100 copied open lines by nearest endpoints, including reversed/rotated sections
and sharp corners. It samples spline sections before joining, keeps the first
ID, and stages other joined IDs as deleted. Styles, frame, groups and metadata
must match; align them explicitly if needed. Disconnected/branching selections,
closed polygons, labels and arrowheads are refused without partial deletion.
Keep actual branches separate. The returned `removedIds`, `pointCount` and
`warnings` describe the staged result; publish/save explicitly as above.

Do not patch immutable live elements, merely change `type`, or expose arbitrary
`type` mutations through CLI `update`. These are EA scripting capabilities,
not a native CLI `convert` operation. See
[CLI issue #6](https://github.com/zsviczian/obsidian-excalidraw-cli/issues/6).
