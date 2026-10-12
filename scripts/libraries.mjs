import { createHash } from "node:crypto";

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
  const count = items.reduce((total, item) => total + (Array.isArray(item.elements) ? item.elements.length : 0), 0);
  if (count > maxElements) throw new Error(`Library has ${count} elements; limit is ${maxElements}`);
  const hash = createHash("sha256").update(source).digest("hex");
  return {
    hash,
    itemCount: items.length,
    elementCount: count,
    items: items.map((item, index) => ({
      index,
      id: item.id ?? null,
      name: item.name ?? null,
      elementCount: item.elements?.length ?? 0,
      groupIds: [...new Set((item.elements ?? []).flatMap((element) => element.groupIds ?? []))],
      bindings: (item.elements ?? []).filter((element) => element.startBinding || element.endBinding).map((element) => element.id),
      assets: [...new Set((item.elements ?? []).map((element) => element.fileId).filter(Boolean))],
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
      source: "Record the exact catalog URL/revision, author, and applicable license before reuse.",
    },
    warning: "Inspection is not insertion: pass only this selected item to an installed native/EA import path that preserves groups and bindings.",
  };
}
