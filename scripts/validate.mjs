import { elementBounds, groupBounds, overlaps } from "./layout.mjs";

export function validateScene({
  elements,
  canvas,
  requiredIds = [],
  measuredText = {},
  allowedOverlaps = [],
  checkOverlaps = false,
} = {}) {
  const diagnostics = [];
  const ids = new Set((elements ?? []).map((element) => element.id));
  for (const id of requiredIds) {
    if (!ids.has(id)) diagnostics.push({ code: "MISSING_COMPONENT", id, message: `Expected element "${id}" is missing` });
  }
  const visible = (elements ?? []).filter((element) => !element.isDeleted);
  const boxes = new Map();
  for (const element of visible) {
    const box = elementBounds(element);
    if (!box) {
      diagnostics.push({ code: "UNMEASURED_BOUNDS", id: element.id, message: "Could not compute element bounds" });
      continue;
    }
    boxes.set(element.id, box);
    if (canvas && (box.x < canvas.x || box.y < canvas.y ||
      box.x + box.width > canvas.x + canvas.width || box.y + box.height > canvas.y + canvas.height)) {
      diagnostics.push({
        code: "OUT_OF_CANVAS",
        id: element.id,
        expected: canvas,
        observed: box,
        message: `Element "${element.id}" extends outside the canvas`,
      });
    }
    const measured = measuredText[element.id];
    if (measured && element.type === "text") {
      if (measured.width > measured.maxWidth || measured.height > measured.maxHeight) {
        diagnostics.push({
          code: "TEXT_OVERFLOW",
          id: element.id,
          expected: { width: measured.maxWidth, height: measured.maxHeight },
          observed: { width: measured.width, height: measured.height },
          message: `Measured text "${element.id}" does not fit its available box`,
        });
      }
    }
  }
  if (checkOverlaps) {
    const allow = new Set(allowedOverlaps.map(([a, b]) => [a, b].sort().join("\0")));
    const items = [...boxes];
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const [aId, a] = items[i];
        const [bId, b] = items[j];
        if (allow.has([aId, bId].sort().join("\0"))) continue;
        const intersection = overlaps(a, b);
        if (intersection) diagnostics.push({
          code: "OVERLAP",
          ids: [aId, bId],
          observed: intersection,
          message: `Elements "${aId}" and "${bId}" overlap; confirm this is intentional`,
        });
      }
    }
  }
  return { ok: diagnostics.length === 0, diagnostics, elementCount: visible.length, groups: groupBounds(visible) };
}
