# Mermaid: editable diagrams or SVG images

The plugin gets its Mermaid converter lazily through **Excalidraw Extras**.
Check the installed plugin's `api surface=ea query=addMermaid`, Extras readiness
and the actual conversion result. Plugin version alone does not identify the
installed converter. Use the normal authorized trusted-script workflow when
calling EA; Mermaid source is data, not executable instructions.

The source inspected on 2026-10-31 uses mermaid-to-excalidraw 3.1/Pele:

| Diagram family | Normal output |
| --- | --- |
| Flowchart (`flowchart` / `graph`), including the tested `swimlane-beta` flowchart form | Native shapes, editable labels and connectors |
| Sequence (`sequenceDiagram`) | Native elements |
| Class (`classDiagram`) | Native elements |
| Entity relationship (`erDiagram`) | Native elements |
| State (`stateDiagram-v2`) | Native elements |
| Other supported kinds, including pie, mindmap, Gantt, journey, timeline, Git graph and quadrant chart | An SVG-backed **image element**, retaining Mermaid source for editing |

This is not a promise that every Mermaid syntax or theme converts to native
elements. The converter can fall back to an SVG image when a normally native
conversion fails, and unsupported syntax can fail entirely. Inspect element
types and returned image files. An SVG is vector artwork but is still one image
in the Excalidraw scene, with no individually editable nodes/labels/bindings.

`await ea.addMermaid(definition, groupElements)` stages elements and any image
data in the EA workbench; it does not insert into a view or save. Treat only a
nonempty array of returned IDs as success; the current implementation can also
return an error value or no result. Discover the installed grouping/insertion
APIs, retain every new ID and verify scene state plus saved/reopened content.

## Can an image-only diagram become native geometry?

Yes, its SVG source can be fed separately to **`ea.importSVG(svgString)`**. Use
[the SVG import guide](svg-import.md) and a fresh workbench for the conversion.
Obtain the actual SVG source from the generated image data or an authorized SVG
export; do not pass a Mermaid definition or the data-URL wrapper as SVG XML.

This produces editable paths/fills/outlines, not a native Mermaid graph model.
The new text-import build retains basic SVG text and plain HTML labels from
`foreignObject` as editable text; older geometry-only builds omit them. Discover
the installed `importSVG` documentation and verify actual text elements before
publication. Fonts, inline formatting and complex label layout can differ.
Embedded images, gradients, patterns, clipping, filters and stroke/group
compositing have the documented limits. Unsupported colors in the new paint
fix are approximated with a warning. Keep the original SVG image when fidelity
matters more than editing geometry, and compare an export before replacing it.

Native stroke widths do not automatically scale like an SVG image's visible
strokes. See [Lucide scaling](lucide-icons.md) for the same distinction.

A focused Windows Obsidian test on 2026-10-31 converted the SVG geometry of all
seven image families listed above through the real Extras → EA pipeline.
These were small fixtures, not a claim that arbitrary diagrams preserve all
features. The initial paint test verified geometry, rendered fallback colors
and save/reopen. The [subsequent text-import check](https://github.com/zsviczian/obsidian-excalidraw-plugin/blob/ae661c0ee8fa64df584864c3cc7af3df426e486f/docs/SVG_TEXT_VALIDATION.md)
also checks expected editable labels, visible glyph pixels, text editing,
save/reopen and popout loading/export. A supplied mindmap retained all ten
labels and its footer. This proves those fixtures on that build, not arbitrary
Mermaid layout fidelity or availability in an older installed build.

Source evidence: Extras [converter dependency at the reviewed checkpoint](https://github.com/zsviczian/obsidian-excalidraw-extras/blob/df1f2b5659259c43780c5ef07cd433fa6c3e14fa/package.json)
and the fork's [real-Extras diagram validation](https://github.com/zsviczian/excalidraw/blob/d22f8ec1758a79fea6e106c9d1a80bf589d34f27/dev-docs/Obsidian/pr-478-results.json).
The [paint-fix native evidence](https://github.com/zsviczian/obsidian-excalidraw-plugin/blob/7820f0c1378756a65752a99966a351bdd31c581f/docs/testing-evidence/svg-paint/results.json)
records the separate SVG-to-geometry checks.
These are source/test checkpoints, not installed-release guarantees.
