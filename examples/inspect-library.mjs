import { readFile } from "node:fs/promises";
import { selectLibraryItem } from "../scripts/libraries.mjs";

const [, , file, indexText] = process.argv;
if (!file || !/^\d+$/.test(indexText ?? "")) {
  console.error("Usage: node examples/inspect-library.mjs <library.excalidrawlib> <item-index>");
  process.exitCode = 2;
} else {
  const selected = selectLibraryItem(await readFile(file), Number(indexText));
  console.log(JSON.stringify({
    ...selected.provenance,
    item: {
      name: selected.item.name ?? null,
      elementCount: selected.item.elements.length,
      elements: selected.item.elements,
    },
    warning: selected.warning,
  }, null, 2));
}
