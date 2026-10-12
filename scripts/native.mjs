import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

const PREFIX = "obsidian-excalidraw-plugin:";
const WRITE_COMMANDS = new Set(["create", "apply", "export", "script"]);

function cliValue(value) {
  if (typeof value === "boolean") return String(value);
  if (typeof value === "string" || typeof value === "number") return String(value);
  return JSON.stringify(value);
}

export function makeRequest(command, request = {}) {
  const effective = { apiVersion: 1, ...request, command };
  if (WRITE_COMMANDS.has(command) && !effective.requestId) {
    effective.requestId = `agent-${randomUUID()}`;
  }
  if (WRITE_COMMANDS.has(command) && !effective.path && command !== "script") {
    throw new Error(`${command} requires an explicit exact path; active drawings are never inferred`);
  }
  return effective;
}

export function buildArgs({ vault, command, request = {}, requestFile, executableArgs = [] }) {
  if (!vault?.trim()) throw new Error("Pass an explicit Obsidian vault name or ID");
  const effective = makeRequest(command, request);
  const args = [...executableArgs, `vault=${vault}`, `${PREFIX}${command}`];
  if (requestFile) {
    if (requestFile.startsWith("/") || requestFile.includes("..") || requestFile.includes("\\")) {
      throw new Error("requestFile must be a vault-relative path without traversal");
    }
    if (WRITE_COMMANDS.has(command) && !request.requestId) {
      throw new Error("A request-file write must include its requestId in request metadata");
    }
    args.push(`input=${requestFile}`);
    return { args, request: effective };
  }
  const usesInlineJson = ["elements", "operations", "args"].some((key) => key in effective);
  if (usesInlineJson) {
    const json = JSON.stringify(effective);
    if (Buffer.byteLength(json, "utf8") > 8 * 1024) {
      throw new Error("Inline request exceeds 8 KiB; put it in a vault-relative JSON file and pass requestFile");
    }
    args.push(`json=${json}`);
    return { args, request: effective };
  }
  for (const [key, value] of Object.entries(effective)) {
    if (["apiVersion", "command"].includes(key)) continue;
    args.push(`${key}=${cliValue(value)}`);
  }
  return { args, request: effective };
}

function parseResponse(stdout, stderr, exitCode) {
  const text = stdout.trim();
  let response;
  try {
    response = JSON.parse(text);
  } catch {
    throw new Error(
      `Native CLI did not return a JSON response (exit ${exitCode}). ` +
        `Inspect stdout/stderr; do not repeat an uncertain write blindly.\n${text}\n${stderr.trim()}`,
    );
  }
  const pendingReceipt =
    response?.command === "result" && response?.status === "pending" && response?.ok === null;
  if (response?.apiVersion !== 1 || (typeof response.ok !== "boolean" && !pendingReceipt)) {
    throw new Error("Unexpected native CLI response: expected apiVersion 1 and an ok boolean");
  }
  return response;
}

export function invokeNative({
  vault,
  command,
  request = {},
  requestFile,
  executable = process.env.OBSIDIAN_CLI || "obsidian",
  executableArgs = [],
  timeoutMs = 60_000,
} = {}) {
  const { args, request: effectiveRequest } = buildArgs({
    vault,
    command,
    request,
    requestFile,
    executableArgs,
  });
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      error ? reject(error) : resolve(result);
    };
    const timer = setTimeout(() => {
      child.kill();
      finish(
        new Error(
          `Native CLI timed out after ${timeoutMs}ms. A write may have completed; recover its ` +
            `receipt and read the target before issuing another write.`,
        ),
      );
    }, timeoutMs);
    child.stdout.setEncoding("utf8").on("data", (chunk) => (stdout += chunk));
    child.stderr.setEncoding("utf8").on("data", (chunk) => (stderr += chunk));
    child.once("error", (error) =>
      finish(new Error(`Could not start Obsidian CLI (${executable}): ${error.message}`)),
    );
    child.once("close", (code) => {
      try {
        const response = parseResponse(stdout, stderr, code);
        if (code !== 0 || !response.ok) {
          finish(
            new Error(
              `Native command ${command} failed (exit ${code}, ok=${response.ok}, ` +
                `mutation=${response.mutation ?? "unknown"}, ` +
                `persistence=${response.persistence ?? "unknown"}): ` +
                `${response.error?.message ?? JSON.stringify(response.error ?? response)}`,
            ),
          );
          return;
        }
        finish(null, { request: effectiveRequest, response, stderr });
      } catch (error) {
        finish(error);
      }
    });
  });
}

export async function discover({ vault, ...options } = {}) {
  const [help, status, lib] = await Promise.all([
    invokeNative({ vault, command: "help", ...options }),
    invokeNative({ vault, command: "status", ...options }),
    invokeNative({ vault, command: "api", request: { surface: "lib" }, ...options }),
  ]);
  return { help: help.response, status: status.response, lib: lib.response };
}

export async function readAll({ vault, path, source = "live", view, limit = 200, ...options }) {
  if (!vault?.trim() || !path?.trim()) throw new Error("readAll requires an explicit vault and exact drawing path");
  const elements = [];
  let offset = 0;
  let revision;
  let last;
  do {
    const request = { path, source, detail: "elements", limit, offset };
    if (view) request.view = view;
    if (revision) request.revision = revision;
    const { response } = await invokeNative({ vault, command: "read", request, ...options });
    const data = response.data ?? {};
    revision ??= data.revision ?? response.revision;
    if (revision && (data.revision ?? response.revision) !== revision) {
      throw new Error("Read pagination changed revision; restart from offset zero");
    }
    elements.push(...(data.elements ?? []));
    last = data.nextOffset;
    if (last == null) break;
    if (!Number.isInteger(last) || last <= offset) throw new Error("Invalid nextOffset in native read response");
    offset = last;
  } while (true);
  return { elements, revision, pagesComplete: last == null };
}

export async function recoverWrite({ vault, requestId, path, ...options }) {
  if (!vault?.trim() || !requestId) throw new Error("Receipt recovery requires explicit vault and requestId");
  const receipt = await invokeNative({
    vault,
    command: "result",
    request: { requestId },
    ...options,
  });
  if (receipt.response.ok && receipt.response.data?.status !== "pending") {
    return { kind: "receipt", ...receipt };
  }
  if (!path) {
    return {
      kind: "unknown",
      reason: "No completed receipt and no exact path was supplied; inspect before retrying.",
      ...receipt,
    };
  }
  const readback = await invokeNative({
    vault,
    command: "read",
    request: { path, source: "disk", detail: "elements", limit: 200 },
    ...options,
  });
  return {
    kind: "read-back-required",
    reason: "The receipt is unavailable or pending. Inspect the read-back and determine state before any new write.",
    receipt: receipt.response,
    readback: readback.response,
  };
}
