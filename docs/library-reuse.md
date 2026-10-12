# Selective public-library reuse

Use libraries for complex reusable symbols, not for a rectangle or arrow that native skeletons can express clearly. This workflow inspects structured items; it does not claim an unverified lossless insertion path.

## Find and inspect one item

Search [libraries.excalidraw.com](https://libraries.excalidraw.com/) or the [public catalog](https://github.com/excalidraw/excalidraw-libraries) with generic semantic terms and aliases. Do not send private vault contents to a public search service. Compare previews for a coherent visual style, then inspect the matching catalog metadata rather than guessing a raw asset URL. The catalog's `libraries.json` and `authors.json` provide discovery/provenance context; download the chosen `.excalidrawlib` from its recorded source and pin the repository revision.

Download only the selected structured library and its needed metadata to a local working directory. From this bundle, inspect a zero-based item index:

```sh
node examples/inspect-library.mjs "/absolute/path/to/selected.excalidrawlib" 0
```

The current helper accepts JSON containing `libraryItems` or `items` arrays. It enforces size/element caps, calculates SHA-256 over the original bytes, and reports item counts, bounds, groups, bindings, text/font IDs, assets, and unresolved assets. It does not execute the content. A rejected older/different format requires a verified native conversion path, not bypassing the parser limits.

Inspect the selected item and its preview together. Use `selectLibraryItem(raw, index)` to retain only that item's complete data. Fill its provenance fields before reuse: exact source URL, revision, returned SHA-256, item ID/index, author, and applicable license/attribution. Unknown license or authorship stays unknown until checked; do not fill it with a guess. The catalog repository's license is not blanket proof about every contributed asset's terms or third-party rights.

## Insert only through a verified runtime path

First discover the installed capabilities:

```sh
obsidian vault="My vault" obsidian-excalidraw-plugin:schema action=apply
obsidian vault="My vault" obsidian-excalidraw-plugin:api surface=ea query=library
obsidian vault="My vault" obsidian-excalidraw-plugin:api surface=lib
```

A search is a limited substring query. Follow up with focused terms and exact method names from the returned documentation. At the [merged PR #2988 registry](https://github.com/zsviczian/obsidian-excalidraw-plugin/blob/3cef89dcdadf6c80171a23ebb1036f77ea7656c1/src/core/cli/cliCommands.ts), native `apply` has no dedicated library-insert operation. `restoreLibraryItems` restores library records; that alone is not insertion into a drawing. A declaration or source method is not proof that the installed runtime exposes the same behavior.

Use an installed native/EA import or duplication path only after verifying that it remaps IDs and internal bindings, retains groups, explicitly resolves assets, transforms uniformly, and keeps the elements editable. An EA script also needs review and user authorization through the trusted-script workflow. Import only the chosen item, not the whole catalog. The catalog recommends grouping multi-element symbols so they behave as a unit.

Read the resulting live scene and check group IDs, arrow endpoints, bound labels, image references, and placement bounds. Verify persistence, export, and inspect the placed item at useful magnification. Keep source provenance with the user's authorized output or task report, not in unrelated repository files.

When no verified insertion route is available, stop and state that specific limitation. Offer an editable approximation made with native primitives, or an explicitly approved raster asset with its loss of editability disclosed. Do not silently flatten library data into skeletons and claim its relationships survived.

The helper intentionally does not implement restoration, relationship remapping, or scene insertion. See [getting started](getting-started.md) for source provenance and [the historical capability inspection](capabilities.md) for earlier findings. Lossless library insertion remains a separate live-validation task.
