# Selective public-library reuse

Search [libraries.excalidraw.com](https://libraries.excalidraw.com/) and the [public catalog](https://github.com/excalidraw/excalidraw-libraries) using semantic terms and aliases. Compare previews and choose a coherent visual family, not just a matching filename. The catalog asks that multi-element items be grouped so they insert as a unit.

Before reuse:

1. Download the actual structured `.excalidrawlib` data from a selected catalog item and record the catalog URL/revision, author, and applicable license/attribution.
2. Call `inspectLibrary(raw)` to enforce a payload/element cap and record a SHA-256. It parses JSON only and never evaluates library content.
3. Inspect the selected item's elements, bounds, group IDs, bindings, labels, image/file IDs, and any external asset references. Select one item with `selectLibraryItem`; do not import an entire library.
4. Verify an installed EA/native import or duplication path before using it. Use that path to remap IDs, retain internal bindings, group/transform uniformly, and keep elements editable. Verify the placed result's bounds and relationships in the live scene.
5. Record provenance with the result. If no compatible item exists, draw editable custom geometry and disclose fidelity limits.

The helper in this first version deliberately inspects and selects data but does not reimplement Excalidraw library restoration, ID remapping, or scene insertion. Native create skeletons do not carry all library relationships. `restoreLibraryItems` restores library records, not by itself insertion into a scene. The current CLI's documented supported Lib subset and installed EA methods must be checked at runtime. No live plugin was available in this workspace to verify a lossless insertion route; see [capabilities](capabilities.md).
