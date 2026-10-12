import test from "node:test";
import assert from "node:assert/strict";
import { inspectLibrary, selectLibraryItem } from "../scripts/libraries.mjs";

const raw = JSON.stringify({
  libraryItems: [
    {
      id: "chart",
      elements: [
        { id: "a", groupIds: ["g1"], type: "rectangle", x: 0, y: 0, width: 10, height: 10 },
        { id: "b", groupIds: ["g1"], type: "arrow", x: 10, y: 10, width: 10, height: 10, startBinding: { elementId: "a" } },
      ],
    },
  ],
});

test("library inspection hashes untrusted JSON and preserves selected relationships", () => {
  const inspected = inspectLibrary(raw);
  assert.equal(inspected.itemCount, 1);
  assert.deepEqual(inspected.items[0].bounds, { x: 0, y: 0, width: 20, height: 20 });
  assert.deepEqual(inspected.items[0].groupIds, ["g1"]);
  assert.deepEqual(inspected.items[0].bindings[0], {
    id: "b",
    startBinding: { elementId: "a" },
    endBinding: null,
    boundElements: [],
  });
  const selected = selectLibraryItem(raw, 0);
  assert.equal(selected.item.elements.length, 2);
  assert.equal(selected.provenance.sha256, inspected.hash);
  assert.match(selected.warning, /not insertion/);
});

test("library parsing rejects oversized, malformed, and unbounded catalogs", () => {
  assert.throws(() => inspectLibrary("{"), /valid UTF-8 JSON/);
  assert.throws(() => inspectLibrary(raw, { maxBytes: 3 }), /exceeds/);
  assert.throws(() => inspectLibrary(raw, { maxElements: 1 }), /limit is 1/);
  assert.throws(() => inspectLibrary(JSON.stringify({ items: [null] })), /elements array/);
  assert.throws(() => selectLibraryItem(raw, 2), /out of range/);
});
