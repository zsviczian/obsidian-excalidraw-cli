# Image inventory and bounded previews

Requires **Obsidian Excalidraw plugin 2.29.1 or higher**, verified from the running `status.data.version` / doctor's `pluginVersion`. Stop and ask for an update/reload on older or unverified versions. Query `schema action=read`, `schema action=apply`, and `schema action=export` before using this workflow; the installed contract remains authoritative.

## Inventory before rendering

Use the exact target and an authorized source. `source=disk` inspects saved content without opening a view; `source=live` requires an already open, ready view and describes currently loaded content. Opening is a separate action that can run drawing scripts. Include `view=<returned viewId>` when duplicate views exist.

```sh
obsidian vault="My vault" obsidian-excalidraw-plugin:read path="Drawings/Research.excalidraw.md" source=live detail=images limit=50
```

Follow `data.nextOffset` with `offset` and the same `revision` until exhausted. Image pages are in `data.images`; the bundle's `readAll` helper reads **elements**, not images. A summary or first page is incomplete. Inventory returns element/file IDs, labels/tags, MIME and load state, placement, known dimensions, and separate `originalBytes` / `loadedRenditionBytes`. Unknown values are `null`; do not treat them as zero or fetch/decode images just to fill inventory. No base64 bodies are returned.

## Cheap overview, then selected detail

Exports retain original fidelity unless an `imagePolicy` explicitly requests reduction. For an image-heavy drawing, start with placeholders or a mixed overview, then select actual image element IDs for original detail. Never infer a screenshot's content from its placeholder label. Two elements sharing a file ID can have different representations; rules select **element IDs**.

Save a request like this as an exact, visible UTF-8 JSON file inside the chosen vault, replacing sample paths, IDs, and request ID. Its destination must be unused unless the user explicitly authorizes overwrite:

```json
{
  "apiVersion": 1,
  "command": "export",
  "requestId": "research-overview-unique-1",
  "path": "Drawings/Research.excalidraw.md",
  "source": "live",
  "out": "Previews/Research-overview.svg",
  "imagePolicy": {
    "default": "placeholder",
    "rules": [
      { "ids": ["ACTUAL_DETAIL_ELEMENT_ID"], "mode": "original" },
      { "mimeTypes": ["image/svg+xml"], "maxBytes": 65536, "mode": "original" },
      { "tags": ["context"], "mode": "thumbnail" }
    ],
    "labels": { "ACTUAL_CONTEXT_ELEMENT_ID": "Supporting screenshot" },
    "thumbnailMaxDimension": 512
  },
  "maxWidth": 1200,
  "maxHeight": 900,
  "maxPixels": 1000000,
  "maxArtifactBytes": 8000000
}
```

```sh
obsidian vault="My vault" obsidian-excalidraw-plugin:export input="CLI/research-overview.json"
```

Rules are first-match, then `default`. Conditions within a rule are ANDed; values within `ids`, `tags`, or `mimeTypes` are ORed. `maxBytes` matches only known loaded-rendition sizes; a known raw attachment size alone does not make that predicate available before loading. No scripts, expressions, or regexes are evaluated. Keep rules bounded by the installed schema. Unknown MIME/size does not satisfy a corresponding predicate; an ID rule can select a deliberately chosen asset without guessing its metadata.

- `original` retains the required loaded source under normal checks. A missing required original fails; it is not silently replaced.
- `thumbnail` creates a request-local PNG rendition with bounded resolution, preserving crop, placement, mirroring, opacity, frame clipping, and stacking. It does not modify the source.
- `placeholder` keeps the visible footprint, using a request-only label, persisted annotation, or short element ID. Labels rotate and mirror with the image. Omitted missing assets need not be loaded.

Request-only `imagePolicy.labels` does not save annotations. Persist labels/tags only when the user requests drawing edits: read a fresh live revision and use `apply` with `expectedRevision`, a unique request ID, and an operation such as:

```json
{ "op": "imageMetadata", "id": "ACTUAL_IMAGE_ELEMENT_ID", "label": "Context", "tags": ["context"] }
```

`null` clears only the specified label or tags field; omitted fields and unrelated custom data survive. Labels are bounded descriptive metadata, not authorization or a trust signal. Image **insertion** (`op: "image"`) uses boolean `scale`; export PNG `scale` remains numeric. Do not reuse one meaning for the other.

## Budgets and verification

`maxWidth`, `maxHeight`, and `maxPixels` constrain output dimensions, including padding, frame titles, and the intermediate PNG canvas. PNG can derive a scale below 0.1 to fit a requested bound. `thumbnailMaxDimension` separately controls embedded-raster resolution (default 512; inspect the schema for bounds). Resizing an SVG's display dimensions does not remove its original raster payloads. `maxArtifactBytes` caps final artifact bytes, up to the 32 MiB hard limit. A refusal requires a deliberately cheaper policy or smaller scope, not an automatic quality-degradation loop.

Thumbnail sources are limited to 24 MiB and 16 million decoded pixels, with PNG/JPEG/WebP header preflight before conversion. Unsupported or unknown dimensions require original/placeholder. Disk thumbnails require direct PNG/JPEG/WebP sources; loaded live PNG/JPEG/WebP renditions can represent composite drawing/PDF/Markdown assets. Disk exports require local Vault assets and content-check consumed dependencies before publication; use loaded live content or placeholders for remote/machine-local sources. Live content and latest disk attachment content are distinct.

A successful export does not save the live drawing. The source `revision` continues to represent original content, independent of preview quality; `representationId` identifies the requested preview. Inspect returned dimensions, bytes, `effectiveScale`, representation counts, bounded per-element decisions, and `sceneToPreview` mapping before selecting follow-up areas/IDs. Preview IDs cannot replace `expectedRevision` for edits. Changes during preparation can produce `STALE_REVISION`, including image load completion; reread and reconsider the request.

Check the full image and relevant detail. For structural SVG previews, ensure omitted originals are absent from the entire file, including unused definitions. Smaller bytes alone do not establish fewer vision tokens; output dimensions and provider/model settings also matter. Report actual visual checks and resource refusals separately from saved-state verification.
