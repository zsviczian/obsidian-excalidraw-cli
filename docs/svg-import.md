# Editable SVGs and icons

Use SVG-to-native conversion when the user needs editable paths, fills,
outlines and text labels. Import as an image when exact typography, rich HTML,
embedded images, gradients, filters or clipping matter more than editing. These are
separate workflows; do not silently substitute one for the other.

## Discover the installed route

After the version/readiness checks in [SKILL.md](../SKILL.md), inspect:

```sh
obsidian vault="My vault" obsidian-excalidraw-plugin:api surface=ea query=importSVG
obsidian vault="My vault" obsidian-excalidraw-plugin:api surface=ea query=addToGroup
obsidian vault="My vault" obsidian-excalidraw-plugin:api surface=ea query=addElementsToView
obsidian vault="My vault" obsidian-excalidraw-plugin:schema action=script
```

The fidelity improvements from plugin PR #3018 are intended for release 2.29.1.
Check the running version and returned API documentation; a merged PR or local
checkout does not establish availability in the user's app. For installed Lucide
icons, discover the [native icon insertion](lucide-icons.md) capability from
PR #3019 before choosing the general SVG/trusted-script route. #3018 itself did
not add a picker or native icon operation. For other SVGs, obtain the source and
provenance explicitly; for structured library items, use [library reuse](library-reuse.md).

## Stage, then insert explicitly

`ea.importSVG(svgString): boolean` is synchronous and appends fresh editable
elements to the EA workbench. It does not clear existing workbench elements,
create an outer group for the entire SVG, insert into a drawing, or save.
`false` means fatal conversion failed before publishing converted elements.
`true` means conversion completed; empty/transparent input can succeed, and
unsupported parts can be omitted with a notice. The boolean is not a fidelity
certificate or a structured warning report.

The EA call is `ea.importSVG(svgString)`, not `addSVG` or an automatic view
insertion. For example, `ea.importSVG(utils.input.svg)` stages the supplied XML;
check the boolean and newly created workbench IDs before grouping or publishing.

Use the [trusted-script workflow](native-cli-workflow.md) with reviewed local
code and explicit user authorization. Pass SVG content as JSON data through
`utils.input`, never interpolated JavaScript. Read the exact target's complete
live snapshot, retain its revision and view ID, and target the exact path/view.
The inspected `script` schema has no caller-supplied `expectedRevision` guard;
its startup identity checks do not make arbitrary script mutations atomic.
Recheck the target before insertion and avoid concurrent edits. Account for any existing workbench content:
track newly imported IDs, check nonempty output, group only those elements when
one movable symbol is wanted, and fit/place them deliberately before insertion.
Supported SVG paint is preserved; the converter does not apply the drawing's
current color or roughness as an icon preset. Discover the installed grouping, transform,
insertion and save APIs rather than guessing their arguments. Await insertion
and saving, then check live and disk read-back. A script is not transactional;
follow receipt recovery after an error or timeout before issuing another write.

## Check fidelity and editing

Supported geometry includes primitives, open paths, adaptive curves, affine
transforms, viewports, local `defs`/`use`, inherited paint/currentColor, independent
alpha, and compound fills with transparent holes. No remote SVG resource is
fetched. Missing/cyclic/external references and excessive complexity can fail.

Group opacity, some cap/join/dash and nonuniform-stroke behavior, and viewport
clipping remain approximations. In the new text-import build, ordinary SVG
`text`/`tspan` content and plain Mermaid HTML labels in `foreignObject` become
editable text. Fonts, inline formatting, glyph baselines and complex layout can
differ; embedded images and unsupported effects remain omitted. Check the
installed `importSVG` API description for text support and inspect the resulting
text elements; the same method name also exists in older geometry-only builds.
Inspect notices and compare the exported result with the source,
including holes on light/dark or nonuniform backgrounds and small curves at
useful magnification. Complex curves can increase element/point cost; check
interaction performance for large symbols rather than assuming native is faster.

The unsupported-paint fix in [plugin PR #3027](https://github.com/zsviczian/obsidian-excalidraw-plugin/pull/3027),
documented on 2026-10-31, is next-release guidance,
not proof that an installed build includes it. It converts unsupported color
values to the SVG's own `color`/`currentColor`, or black if that is unsupported,
and reports a paint-approximation notice instead of aborting all geometry.
Independent opacity, explicit `none` and transparency remain intact. A paint
server's explicit solid/`none` fallback is used without fetching its URL;
without one, gradient/pattern paint remains omitted. No host CSS variables are
resolved. This is an approximation, not a nearest-color or gradient conversion.

The same route can convert geometry from [Mermaid's SVG-image fallback](mermaid.md),
but it cannot recover semantic nodes or bound arrows. Basic text labels can
remain editable in the text-import build; rich HTML/images/effects have the
limits above. Native geometry also resizes differently from an SVG
image: ordinary resizing does not proportionally scale stored stroke widths.

Holed fills can have separate outline elements. Recolor fill pieces through
their background color and outlines through their stroke color; adding a visible
stroke directly to a holed fill can expose internal bridge edges. Verify grouping,
editability, placement, export and save/reopen. Existing native conversions are
not regenerated when the plugin updates.

The focused [native paint/Mermaid evidence](https://github.com/zsviczian/obsidian-excalidraw-plugin/blob/7820f0c1378756a65752a99966a351bdd31c581f/docs/testing-evidence/svg-paint/results.json)
records tested build hashes, fallback-color pixels, save/reopen and seven real
Extras SVG-image geometry conversions. It is separate from this bundle's 25
offline wrapper checks and does not establish physical-mobile fidelity.

The subsequent [editable-text verification](https://github.com/zsviczian/obsidian-excalidraw-plugin/blob/ae661c0ee8fa64df584864c3cc7af3df426e486f/docs/SVG_TEXT_VALIDATION.md)
records ten focused native cases, including the real Mermaid conversions and
a supplied mindmap with all ten labels plus its footer. Native text editing,
glyph pixels, save/reopen and popout loading/export pass. Fonts and complex
layout remain approximate; this is next-release guidance, not proof of an
installed user's build.
