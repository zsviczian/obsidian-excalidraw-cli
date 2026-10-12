import { randomUUID } from "node:crypto";
import path from "node:path";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import { invokeNative, readAll } from "../scripts/native.mjs";
import { doctor } from "../scripts/doctor.mjs";

function exactPath(value, extension, name) {
  if (typeof value !== "string" || !value.endsWith(extension) || /[\\:\x00-\x1f]/.test(value) ||
      value.split("/").some((part) => !part || part.startsWith("."))) {
    throw new Error(`${name} must be an explicit visible vault-relative ${extension} path`);
  }
  return value;
}

/** Build an offline plan. No processes, vault writes, or state files are created. */
export function planDemo({ vault, path: drawing, out }) {
  if (typeof vault !== "string" || !vault.trim()) throw new Error("Pass an explicit vault name or ID");
  exactPath(drawing, ".excalidraw.md", "path");
  exactPath(out, ".png", "out");
  const prefix = `demo-${randomUUID()}`;
  const requestIds = { create: `${prefix}-create`, apply: `${prefix}-apply`, export: `${prefix}-export` };
  return {
    mode: "plan",
    vault,
    drawing,
    preview: out,
    requestIds,
    steps: ["discover", "create", "read disk", "open", "read live", "apply at live revision", "read disk", "export disk", "inspect PNG manually"],
    note: "The demo uses the installed default font. Opening can run configured drawing scripts. Nothing is overwritten or automatically retried.",
    create: {
      apiVersion: 1, command: "create", requestId: requestIds.create, path: drawing,
      elements: [
        { id: "start", type: "rectangle", x: 0, y: 0, width: 180, height: 80, label: { text: "Start" } },
        { id: "finish", type: "rectangle", x: 280, y: 0, width: 180, height: 80, label: { text: "Finish" } },
        { id: "connection", type: "arrow", x: 180, y: 40, start: { id: "start" }, end: { id: "finish" } },
      ],
    },
    export: { apiVersion: 1, command: "export", requestId: requestIds.export, path: drawing, source: "disk", out },
  };
}

function requireSaved(result) {
  if (result.response.ok !== true || result.response.status !== "completed" ||
      result.response.mutation !== "applied" || result.response.persistence !== "saved") {
    throw new Error(`${result.request.command} has no completed saved receipt; inspect live/disk state before proceeding`);
  }
}

function verifyScene(snapshot, idMap, edited = false) {
  if (!snapshot.pagesComplete || !snapshot.revision) throw new Error("Incomplete scene read-back");
  const elements = snapshot.elements.filter((element) => !element.isDeleted);
  const get = (key, type) => {
    const id = idMap?.[key];
    const element = elements.find((entry) => entry.id === id && entry.type === type);
    if (!id || !element) throw new Error(`Read-back is missing the actual ${key} ${type} from idMap`);
    return element;
  };
  const start = get("start", "rectangle"), finish = get("finish", "rectangle"), arrow = get("connection", "arrow");
  if (arrow.startBinding?.elementId !== start.id || arrow.endBinding?.elementId !== finish.id) {
    throw new Error("Read-back did not preserve the arrow's endpoint bindings");
  }
  for (const [shape, text] of [[start, "Start"], [finish, "Finish"]]) {
    if (!elements.some((element) => element.type === "text" && element.containerId === shape.id && element.text === text)) {
      throw new Error(`Read-back is missing the bound ${text} label`);
    }
  }
  if (edited && (start.backgroundColor !== "#e7f5ff" || start.fillStyle !== "solid")) {
    throw new Error("Saved read-back does not contain the accepted style edit");
  }
  return elements.length;
}

/** Opt-in integration example; never retry, overwrite, delete, or run trusted EA code. */
export async function runDemo({ execute = false, stateDirectory, onPlan, ...options }) {
  const plan = planDemo(options);
  if (!execute) return plan;
  if (!stateDirectory || !path.isAbsolute(stateDirectory)) {
    throw new Error("Execution requires an absolute private stateDirectory, dedicated to this vault and outside source control");
  }
  onPlan?.(plan);
  const { vault, executable, executableArgs, timeoutMs } = options;
  const transport = { vault, executable, executableArgs, timeoutMs };
  const receipts = {};
  const write = async (command, request) => {
    const result = await invokeNative({ ...transport, stateDirectory, command, request });
    requireSaved(result);
    receipts[command] = { requestId: result.request.requestId, recordPath: result.recordPath, response: result.response };
    return result.response;
  };
  try {
    const readiness = await doctor(transport);
    if (!readiness.ready) throw new Error(readiness.problems.join("; "));
    const created = await write("create", plan.create);
    const idMap = created.data?.idMap;
    verifyScene(await readAll({ ...transport, path: plan.drawing, source: "disk" }), idMap);
    const opened = await invokeNative({ ...transport, command: "open", request: { path: plan.drawing } });
    const view = opened.response.data?.viewId;
    if (typeof view !== "string" || !view) throw new Error("Open did not return an explicit viewId");
    const live = await readAll({ ...transport, path: plan.drawing, source: "live", view });
    verifyScene(live, idMap);
    await write("apply", {
      path: plan.drawing, view, requestId: plan.requestIds.apply, expectedRevision: live.revision,
      operations: [{ op: "update", id: idMap.start, set: { backgroundColor: "#e7f5ff", fillStyle: "solid" } }],
    });
    const saved = await readAll({ ...transport, path: plan.drawing, source: "disk" });
    const elementCount = verifyScene(saved, idMap, true);
    const exported = await write("export", plan.export);
    if (exported.data?.path !== plan.preview || exported.data?.source !== "disk" ||
        exported.data?.revision !== saved.revision || !(exported.data?.bytes > 0) ||
        !(exported.data?.width > 0) || !(exported.data?.height > 0)) {
      throw new Error("Export did not confirm the same saved revision and a nonempty sized artifact");
    }
    return {
      mode: "executed", vault: readiness.vault, pluginVersion: readiness.pluginVersion,
      drawing: plan.drawing, preview: plan.preview, view, idMap, elementCount, receipts,
      checks: { savedReadback: true, boundLabels: true, arrowBindings: true, styleEdit: true, visualInspection: "not-performed" },
      next: "Inspect the PNG and editable drawing. This report is structural verification, not visual or user acceptance.",
    };
  } catch (error) {
    throw new Error(`${error.message}\nStopped without retry or cleanup. Request IDs: ${JSON.stringify(plan.requestIds)}. Recover receipts and inspect ${plan.drawing} and ${plan.preview} before another write.`, { cause: error });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { values } = parseArgs({ options: {
      vault: { type: "string" }, path: { type: "string" }, out: { type: "string" },
      "state-directory": { type: "string" }, executable: { type: "string" },
      execute: { type: "boolean", default: false }, help: { type: "boolean", default: false },
    } });
    if (values.help) {
      process.stdout.write('Usage: node examples/first-drawing.mjs --vault "My vault" --path "Demo.excalidraw.md" --out "Demo.png" [--execute --state-directory /private/state] [--executable /path/to/obsidian]\nWithout --execute, prints an offline plan and does not contact Obsidian.\n');
    } else {
      const report = await runDemo({ ...values, stateDirectory: values["state-directory"],
        onPlan: (plan) => process.stderr.write(`${JSON.stringify(plan)}\n`),
      });
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    }
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
