# Text, shapes, and layout

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

Before publication, inspect adjacent, same-style paths that meet end to end and
continue smoothly. Endpoints within about one stroke width are a useful review
cue, not sufficient evidence to merge. Confirm that the paths describe the same
contour and have compatible group, frame, and stacking context.

Concatenate eligible paths in scene coordinates, accounting for element position,
rotation, and point order. Reconcile small gaps or overlaps, remove redundant join
points, and simplify the combined path. Preserve its intended shape, style, group,
frame, and layering. Inspect the native render for cusps, doubled joins, and
accidental closures.

Keep intentional gaps, separate marks, branches, occluded sections, and style
changes separate. This contour rule does not combine semantically distinct diagram
connectors merely because their endpoints are nearby.
