# Text, shapes, and layout

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
