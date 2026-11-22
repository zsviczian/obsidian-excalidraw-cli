# Mermaid: editable diagrams or SVG images

For native editable mind-map nodes, branches, folding, and layout, use
[MindMap Builder](mindmap-builder.md), including installation and startup when
missing. The Mermaid `mindmap` image route below has different editing behavior.

The plugin gets its Mermaid converter lazily through **Excalidraw Extras**.
Check the installed plugin's `api surface=ea query=addMermaid`, Extras readiness
and the actual conversion result. Plugin version alone does not identify the
installed converter. Use the normal authorized trusted-script workflow when
calling EA; Mermaid source is data, not executable instructions.

The 2.29.3 native-CLI feedback reports successful conversion with Mermaid
component **3.6.0**. The plugin source inspected on 2026-11-22 requires that exact
component version; Extras' plugin version and Mermaid component version are
different values. Check the installed contract, not just the plugin version.
When `status.data.extras` is available, inspect
`components.mermaid.version`, `active`, `compatible`, `requiredVersion`, and
`exact`. General `status.data.ready: true` means plugin startup is ready, not
that every optional Extras feature is compatible or enabled.

On older releases without these fields, verify the installed Extras component
version and enabled feature in its settings before conversion. An incompatible
component can open an **Extras Update Required** modal from `addMermaid`, leaving
the CLI call waiting for human input. Inspect pending dialogs and receipts before
another write; do not automatically retry a stalled script. [Plugin PR #3065](https://github.com/zsviczian/obsidian-excalidraw-plugin/pull/3065)
adds the CLI dependency preflight and component readiness reporting;
until that change ships, do not assume a newer source checkout fixes the user's
installed release.

The 3.6.0 converter documentation lists the native families below. The additional
flowchart details are contributor-reported; inspect the actual output:

| Diagram family | Normal output |
| --- | --- |
| Flowchart (`flowchart` / `graph`), including the tested `swimlane-beta` flowchart form | Native shapes, editable labels and connectors |
| Flowchart subgraphs, `classDef` fills, and reported label line breaks (`\n`) with 3.6.0 | Native editable conversion reported on 2.29.3; inspect actual frames, fills, labels and line wrapping |
| Sequence (`sequenceDiagram`) | Native elements |
| Class (`classDiagram`) | Native elements |
| Entity relationship (`erDiagram`) | Native elements |
| State (`stateDiagram-v2`) | Native elements |
| Gantt, quadrant charts, and timelines with 3.6.0 | Native editable elements |
| Other supported kinds, including pie, mindmap, journey, and Git graph | An SVG-backed **image element**, retaining Mermaid source for editing |

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

Before the converter update, a focused Windows Obsidian test on 2026-10-31 converted the SVG geometry of
pie, mindmap, Gantt, journey, timeline, Git graph and quadrant images through the real Extras → EA pipeline.
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
Current component evidence: the [Extras README](https://github.com/zsviczian/obsidian-excalidraw-extras#readme)
and its [pinned converter dependency](https://github.com/zsviczian/obsidian-excalidraw-extras/blob/master/package.json).
The installed converter 3.6.0 README was also inspected for its native family list;
this documentation update does not claim a new rendering test.
