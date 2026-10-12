import test from "node:test";
import assert from "node:assert/strict";
import {
  elementBounds,
  fitUniform,
  placeText,
  resolveFont,
} from "../scripts/layout.mjs";
import { validateScene } from "../scripts/validate.mjs";

test("Excalifont is requested by name and missing fonts never fall back", () => {
  assert.deepEqual(resolveFont(undefined, [{ name: "Excalifont", id: 5 }]), {
    name: "Excalifont",
    id: 5,
  });
  assert.throws(() => resolveFont(undefined, [{ name: "Virgil", id: 1 }]), /Excalifont.*not available/);
});

test("text placement makes center anchoring explicit and rejects measured overflow", () => {
  const measure = (text) => ({ width: text.length * 10, height: 20 });
  const centered = placeText({
    text: "OK",
    box: { x: 10, y: 20, width: 100, height: 40 },
    align: "center",
    padding: 5,
    measure,
  });
  assert.equal(centered.x, 60);
  assert.equal(centered.y, 30);
  assert.equal(centered.textAlign, "center");
  const resolved = placeText({
    text: "OK",
    box: { x: 10, y: 20, width: 100, height: 40 },
    font: resolveFont(undefined, [{ name: "Excalifont", id: 5 }]),
    measure,
  });
  assert.equal(resolved.fontFamily, 5);
  assert.throws(
    () => placeText({ text: "oversize", box: { x: 0, y: 0, width: 50, height: 30 }, measure }),
    /only 50px is available/,
  );
  const wrapped = placeText({
    text: "a fairly long Unicode label →",
    box: { x: 0, y: 0, width: 40, height: 50 },
    wrap: (value) => `${value.slice(0, 4)}\n${value.slice(4, 8)}`,
    measure: (value) => ({ width: Math.max(...value.split("\n").map((line) => line.length * 5)), height: value.split("\n").length * 12 }),
  });
  assert.equal(wrapped.text, "a fa\nirly");
});

test("bounds enclose rotated rectangles and curved paths by their full point hull", () => {
  const rotated = elementBounds({ x: 0, y: 0, width: 100, height: 20, angle: Math.PI / 2 });
  assert.ok(Math.abs(rotated.width - 20) < 1e-8);
  assert.ok(Math.abs(rotated.height - 100) < 1e-8);
  const path = elementBounds({ x: 10, y: 20, points: [[0, 30], [100, 0], [150, 50]] });
  assert.deepEqual(path, { x: 10, y: 20, width: 150, height: 50 });
  const rotatedPath = elementBounds({
    x: 0,
    y: 0,
    angle: Math.PI / 2,
    points: [[0, 0], [100, 0], [100, 20]],
  });
  assert.ok(Math.abs(rotatedPath.width - 20) < 1e-8);
  assert.ok(Math.abs(rotatedPath.height - 100) < 1e-8);
});

test("uniform fitting preserves aspect ratio and validator reports geometry issues", () => {
  const fit = fitUniform(
    { x: 0, y: 0, width: 200, height: 100 },
    { x: 10, y: 20, width: 100, height: 100 },
  );
  assert.equal(fit.scale, 0.5);
  assert.deepEqual([fit.x, fit.y], [10, 45]);
  const result = validateScene({
    elements: [
      { id: "label", type: "text", x: 90, y: 10, width: 40, height: 20, groupIds: ["badge"] },
      { id: "card", type: "rectangle", x: 90, y: 10, width: 40, height: 20, groupIds: ["badge"] },
    ],
    canvas: { x: 0, y: 0, width: 100, height: 100 },
    requiredIds: ["missing"],
    measuredText: { label: { width: 60, maxWidth: 40, height: 20, maxHeight: 20 } },
    checkOverlaps: true,
  });
  assert.deepEqual(
    result.diagnostics.map(({ code }) => code).sort(),
    ["MISSING_COMPONENT", "OUT_OF_CANVAS", "OUT_OF_CANVAS", "OVERLAP", "TEXT_OVERFLOW"],
  );
  assert.deepEqual(result.groups, [{
    id: "badge",
    elementIds: ["label", "card"],
    bounds: { x: 90, y: 10, width: 40, height: 20 },
  }]);
});
