# Native Lucide icons

Use this route for editable icons from the running Obsidian Lucide registry.
It creates ordinary grouped elements, with no image asset or attachment. Saved
elements retain edits independently of future registry changes. For arbitrary
SVG sources use [SVG import](svg-import.md); for structured library items use
[library reuse](library-reuse.md).

## Discover availability and names

Complete the bundle's version/readiness checks, then query the installed contract:

```sh
obsidian vault="My vault" obsidian-excalidraw-plugin:schema action=icons
obsidian vault="My vault" obsidian-excalidraw-plugin:icons query=database limit=20
obsidian vault="My vault" obsidian-excalidraw-plugin:schema action=create
obsidian vault="My vault" obsidian-excalidraw-plugin:schema action=apply
obsidian vault="My vault" obsidian-excalidraw-plugin:api surface=ea name=addLucideIcon
```

This feature accompanies PR #3019 and the next plugin release. Do not infer it
from the source branch, general CLI readiness, or a guessed higher minimum
version. Confirm `help` lists `icons`, the schemas expose `create.icons` and
`apply`'s `lucide` operation, and `status.data.lucideIcons` is true. If absent,
report the missing installed capability and ask the user to update/reload when
the release is available. Do not bypass it with arbitrary eval.

Discovery is read-only. Results contain canonical `lucide-...` identifiers and
readable names, never serialized SVGs. Follow `nextOffset` with the same revision
for a full inventory; restart if the registry changes. Use actual returned names.
The constructor also accepts the corresponding unprefixed form, such as
`database`. Custom non-Lucide registry icons and remote URLs are rejected.
An installed name can also be refused if its SVG is empty, clipped or contains
omitted geometry; report the refusal rather than silently replacing it with an image.

## Create or edit explicitly

Copy [the request example](../examples/lucide.request.json) into a visible vault
JSON file, replace its destination and request ID, then use the normal `create
input=...` workflow. It inserts a database icon and a dot at explicit scene
coordinates. Creation never overwrites. Template/base elements and ordinary
`elements` precede icons; icons follow array order. Invalid later icons prevent
the entire creation.

For an existing drawing, open the exact path, retain its view ID and complete
live revision, and submit a narrow `apply` request through the existing wrapper:

```json
{
  "apiVersion": 1,
  "command": "apply",
  "requestId": "replace-with-a-unique-id",
  "path": "Drawings/Architecture.excalidraw.md",
  "view": "replace-with-returned-viewId",
  "expectedRevision": "replace-with-live-revision",
  "operations": [
    {"op":"lucide","id":"database-icon","icon":"lucide-database","x":100,"y":100,"size":96,"strokeColor":"#1e1e1e","roughness":1,"opacity":100}
  ]
}
```

`x`/`y` locate the nominal viewport's upper-left, preserving source aspect ratio
and padding. `size` is its longest side, independent of zoom or pixel ratio.
Presets are 48/96/192; a normal 2-unit source stroke becomes 4/8/16 scene units.
`strokeWidth`, when supplied, overrides the initial width in final scene units.
CLI defaults are deterministic: size 96, color `#1e1e1e`, roughness 1, opacity
100. They do not read an unrelated active drawing or picker selection.
**Scaling differs from an SVG image.** Initial `size` scales the source strokes
proportionally, but later ordinary Excalidraw resizing changes native geometry
without proportionally scaling its stored `strokeWidth`. An SVG inserted as an
image scales its visible strokes together with the image. For example, creating
a normal icon at size 192 gives a 16-unit stroke; resizing a size-96 icon with an
8-unit stroke to twice its width can retain that 8-unit stroke and look thinner.
For a consistent size/stroke ratio, create at the intended final size or adjust
the returned member elements' stroke widths explicitly. Verify the chosen
resize API's behavior; dots/fill pieces also have geometry of their own.

Each logical icon ID must be unique and cannot collide with shape aliases or
existing element IDs. `data.groupMap[logicalId]` returns `groupId`, every
`elementIds` member, canonical `icon`, nominal `viewport`, and warning codes.
Every member has the fresh outer group ID, even for a single-element icon.
`idMap` keeps its single-element meaning. An icon alias is not a bindable node
or a valid element update target; use returned member IDs for supported edits.
Finer ordering uses ordered apply operations. Discover current aggregate limits
from the schema/docs: expanded members and points count, not only icon requests.

## Verify the result

Check `ok`, mutation and persistence; inspect warnings. Missing/empty/partially
omitted geometry fails preparation; native stroke/compositing approximations
can return warnings. Read all saved elements back and verify every group member,
style, placement and absence of new image assets. Export to an explicit unused
path and inspect curves, dots and scale. Recolor outline pieces through their
stroke color; a dot represented as a fill needs its background color changed.
Follow [receipt recovery](native-cli-workflow.md) after uncertain writes.

Advanced reviewed EA scripts can call `ea.addLucideIcon(options)` without a view.
It synchronously appends only to the EA workbench and returns the same handles;
color/roughness/opacity default to that EA's style. It does not clear, insert,
save or modify image/style state. Scene publication remains explicit.
