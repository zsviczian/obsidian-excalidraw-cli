import { createHash } from "node:crypto";
import { elementBounds } from "./layout.mjs";

function unionBounds(elements) {
  const boxes = elements.map(elementBounds).filter(Boolean);
  if (!boxes.length) return null;
  const minX = Math.min(...boxes.map((box) => box.x));
  const minY = Math.min(...boxes.map((box) => box.y));
  const maxX = Math.max(...boxes.map((box) => box.x + box.width));
  const maxY = Math.max(...boxes.map((box) => box.y + box.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function inspectLibrary(raw, { maxBytes = 2 * 1024 * 1024, maxElements = 500 } = {}) {
  const source = typeof raw === "string" ? Buffer.from(raw, "utf8") : Buffer.from(raw);
  if (source.byteLength > maxBytes) throw new Error(`Library payload exceeds ${maxBytes} bytes`);
  let library;
  try {
    library = JSON.parse(source.toString("utf8"));
  } catch {
    throw new Error("Library must be valid UTF-8 JSON");
  }
  const items = library.libraryItems ?? library.items;
  if (!Array.isArray(items)) throw new Error("Library JSON has no libraryItems/items array");
  if (items.some((item) => !item || typeof item !== "object" || !Array.isArray(item.elements))) {
    throw new Error("Library items must be objects with an elements array");
  }
  if (items.some((item) => item.elements.some((element) => !element || typeof element !== "object"))) {
    throw new Error("Library elements must be JSON objects");
  }
  const count = items.reduce((total, item) => total + (Array.isArray(item.elements) ? item.elements.length : 0), 0);
  if (count > maxElements) throw new Error(`Library has ${count} elements; limit is ${maxElements}`);
  const hash = createHash("sha256").update(source).digest("hex");
  const availableFiles = new Set(
    Array.isArray(library.files)
      ? library.files.map((file) => file.id).filter(Boolean)
      : Object.keys(library.files ?? {}),
  );
  return {
    hash,
    itemCount: items.length,
    elementCount: count,
    items: items.map((item, index) => ({
      index,
      id: item.id ?? null,
      name: item.name ?? null,
      elementCount: item.elements?.length ?? 0,
      bounds: unionBounds(item.elements ?? []),
      groupIds: [...new Set((item.elements ?? []).flatMap((element) => element.groupIds ?? []))],
      bindings: (item.elements ?? [])
        .filter((element) => element.startBinding || element.endBinding || element.boundElements?.length)
        .map((element) => ({
          id: element.id,
          startBinding: element.startBinding ?? null,
          endBinding: element.endBinding ?? null,
          boundElements: element.boundElements ?? [],
        })),
      text: (item.elements ?? [])
        .filter((element) => element.type === "text" || typeof element.text === "string")
        .map((element) => ({ id: element.id, text: element.text ?? "", fontFamily: element.fontFamily })),
      assets: [...new Set((item.elements ?? []).map((element) => element.fileId).filter(Boolean))],
      unresolvedAssets: [...new Set((item.elements ?? []).map((element) => element.fileId).filter(Boolean))]
        .filter((fileId) => !availableFiles.has(fileId)),
    })),
  };
}

export function selectLibraryItem(raw, itemIndex, limits) {
  const inspected = inspectLibrary(raw, limits);
  const library = JSON.parse(Buffer.from(raw).toString("utf8"));
  const items = library.libraryItems ?? library.items;
  if (!Number.isInteger(itemIndex) || itemIndex < 0 || itemIndex >= items.length) {
    throw new Error(`Library item index ${itemIndex} is out of range`);
  }
  const selected = items[itemIndex];
  if (!Array.isArray(selected.elements) || selected.elements.length === 0) {
    throw new Error("Selected library item has no elements");
  }
  return {
    item: selected,
    provenance: {
      sha256: inspected.hash,
      itemId: selected.id ?? null,
      itemIndex,
      source: null,
      revision: null,
      author: null,
      license: null,
    },
    warning: "Inspection is not insertion: pass only this selected item to an installed native/EA import path that preserves groups and bindings.",
  };
}
