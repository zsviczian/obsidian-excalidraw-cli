export const DEFAULT_HANDWRITTEN_FONT = "Excalifont";

export function resolveFont(name = DEFAULT_HANDWRITTEN_FONT, availableFonts = []) {
  const match = availableFonts.find(
    (font) => font.name?.toLocaleLowerCase() === name.toLocaleLowerCase(),
  );
  if (!match) {
    throw new Error(`Required font "${name}" is not available; choose an installed font explicitly.`);
  }
  if (!Number.isInteger(match.id)) throw new Error(`Runtime did not provide a numeric ID for "${name}"`);
  return { name: match.name, id: match.id };
}

export function placeText({
  text,
  box,
  measure,
  wrap,
  font = { name: DEFAULT_HANDWRITTEN_FONT },
  fontSize = 24,
  align = "left",
  padding = 0,
  lineHeight,
}) {
  if (typeof measure !== "function") throw new Error("Supply the runtime's native text-measurement function");
  if (typeof text !== "string" || !box || !Number.isFinite(box.width) || !Number.isFinite(box.height)) {
    throw new Error("Text and a finite target box are required");
  }
  if (!["left", "center", "right"].includes(align)) throw new Error(`Unsupported text anchor: ${align}`);
  const maxWidth = box.width - padding * 2;
  if (maxWidth <= 0) throw new Error("Padding leaves no available text width");
  const fontName = typeof font === "string" ? font : font.name;
  const fontId = typeof font === "object" ? font.id : undefined;
  if (!fontName) throw new Error("A resolved font name is required");
  const prepared = typeof wrap === "function" ? wrap(text, maxWidth, fontName, fontSize) : text;
  const measured = measure(prepared, fontName, fontSize, lineHeight);
  if (!Number.isFinite(measured?.width) || !Number.isFinite(measured?.height)) {
    throw new Error("Runtime text measurement returned invalid dimensions");
  }
  if (measured.width > maxWidth) {
    throw new Error(`Text is ${measured.width}px wide but only ${maxWidth}px is available`);
  }
  if (measured.height > box.height - padding * 2) {
    throw new Error(`Text is ${measured.height}px tall but only ${box.height - padding * 2}px is available`);
  }
  const anchorX =
    align === "left"
      ? box.x + padding
      : align === "center"
        ? box.x + box.width / 2
        : box.x + box.width - padding;
  return {
    text: prepared,
    x: anchorX,
    y: box.y + (box.height - measured.height) / 2,
    width: measured.width,
    height: measured.height,
    textAlign: align,
    fontFamily: fontId ?? fontName,
    fontName,
    fontSize,
  };
}

function rotate(point, center, angle) {
  const radians = angle ?? 0;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return { x: center.x + dx * cos - dy * sin, y: center.y + dx * sin + dy * cos };
}

function bounds(points) {
  if (!points.length) return null;
  const xs = points.map(({ x }) => x);
  const ys = points.map(({ y }) => y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function elementBounds(element) {
  if (!element || !Number.isFinite(element.x) || !Number.isFinite(element.y)) return null;
  if (Array.isArray(element.points) && element.points.length) {
    const points = element.points.map(([x, y]) => ({ x: element.x + x, y: element.y + y }));
    if (!element.angle) return bounds(points);
    const path = bounds(points);
    const center = { x: path.x + path.width / 2, y: path.y + path.height / 2 };
    return bounds(points.map((point) => rotate(point, center, element.angle)));
  }
  if (!Number.isFinite(element.width) || !Number.isFinite(element.height)) return null;
  const cx = element.x + element.width / 2;
  const cy = element.y + element.height / 2;
  const corners = [
    { x: element.x, y: element.y },
    { x: element.x + element.width, y: element.y },
    { x: element.x + element.width, y: element.y + element.height },
    { x: element.x, y: element.y + element.height },
  ];
  return bounds(corners.map((point) => rotate(point, { x: cx, y: cy }, element.angle)));
}

export function groupBounds(elements = []) {
  const groups = new Map();
  for (const element of elements) {
    const box = elementBounds(element);
    if (!box) continue;
    for (const groupId of element.groupIds ?? []) {
      const entries = groups.get(groupId) ?? [];
      entries.push({ id: element.id, bounds: box });
      groups.set(groupId, entries);
    }
  }
  return [...groups].map(([id, entries]) => {
    const x = Math.min(...entries.map(({ bounds: box }) => box.x));
    const y = Math.min(...entries.map(({ bounds: box }) => box.y));
    const right = Math.max(...entries.map(({ bounds: box }) => box.x + box.width));
    const bottom = Math.max(...entries.map(({ bounds: box }) => box.y + box.height));
    return { id, elementIds: entries.map(({ id: elementId }) => elementId), bounds: { x, y, width: right - x, height: bottom - y } };
  });
}

export function fitUniform(source, target) {
  if (![source?.x, source?.y, source?.width, source?.height, target?.x, target?.y, target?.width, target?.height].every(Number.isFinite)) {
    throw new Error("Source and target bounds must be finite");
  }
  if (source.width <= 0 || source.height <= 0 || target.width <= 0 || target.height <= 0) {
    throw new Error("Source and target bounds must have positive dimensions");
  }
  const scale = Math.min(target.width / source.width, target.height / source.height);
  return {
    scale,
    x: target.x + (target.width - source.width * scale) / 2 - source.x * scale,
    y: target.y + (target.height - source.height * scale) / 2 - source.y * scale,
  };
}

export function overlaps(a, b) {
  const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return width > 0 && height > 0 ? { x: Math.max(a.x, b.x), y: Math.max(a.y, b.y), width, height } : null;
}
