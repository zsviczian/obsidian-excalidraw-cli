import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { chmod, mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const PREFIX = "obsidian-excalidraw-plugin:";
const WRITE_COMMANDS = new Set(["create", "apply", "export", "script"]);
const recordLocks = new Map();

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function recordFile(directory, requestId) {
  const key = createHash("sha256").update(requestId).digest("hex");
  return path.join(directory, `${key}.json`);
}

async function withRecordLock(file, callback) {
  const prior = recordLocks.get(file) ?? Promise.resolve();
  const current = prior.then(callback, callback);
  recordLocks.set(file, current);
  try {
    return await current;
  } finally {
    if (recordLocks.get(file) === current) recordLocks.delete(file);
  }
}

async function saveRecord(directory, request, requestFile, response, recovery, preflight) {
  const file = recordFile(directory, request.requestId);
  const fingerprint = createHash("sha256")
    .update(stableJson({ request, requestFile: requestFile ?? null }))
    .digest("hex");
  return withRecordLock(file, async () => {
    let previous = null;
    try {
      previous = JSON.parse(await readFile(file, "utf8"));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    if (previous && previous.fingerprint !== fingerprint) {
      throw new Error(`requestId "${request.requestId}" was already used with a different payload; choose a new ID`);
    }
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await chmod(directory, 0o700).catch(() => {});
    const record = {
      requestId: request.requestId,
      fingerprint,
      request,
      requestFile: requestFile ?? null,
      receipt: response ?? previous?.receipt ?? null,
      recovery: recovery ?? previous?.recovery ?? null,
      preflight: preflight ?? previous?.preflight ?? null,
      updatedAt: new Date().toISOString(),
    };
    const temporary = `${file}.${randomUUID()}.tmp`;
    await writeFile(temporary, `${JSON.stringify(record, null, 2)}\n`, { flag: "wx", mode: 0o600 });
    await rename(temporary, file);
    await chmod(file, 0o600).catch(() => {});
    return file;
  });
}

export async function listWriteRecords({ stateDirectory = ".obsidian-excalidraw-cli" } = {}) {
  let names;
  try {
    names = await readdir(stateDirectory);
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  const records = [];
  for (const name of names.filter((entry) => entry.endsWith(".json"))) {
    try {
      records.push(JSON.parse(await readFile(path.join(stateDirectory, name), "utf8")));
    } catch {
      continue;
    }
  }
  return records;
}

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

function outcomeFor(command, response) {
  if (!WRITE_COMMANDS.has(command)) return null;
  if (typeof response.mutation !== "string" || typeof response.persistence !== "string") {
    throw new Error("Native write response omitted mutation or persistence; read back the target before proceeding");
  }
  return {
    mutation: response.mutation,
    persistence: response.persistence,
    persistenceVerified: response.persistence === "saved",
    readBackRequired:
      response.persistence !== "saved" ||
      response.mutation === "unknown" ||
      response.mutation === "not-applied",
  };
}

export function buildArgs({ vault, command, request = {}, requestFile, executableArgs = [] }) {
  if (!vault?.trim()) throw new Error("Pass an explicit Obsidian vault name or ID");
  const effective = makeRequest(command, request);
  const args = [...executableArgs, `vault=${vault}`, `${PREFIX}${command}`];
  if (requestFile) {
    const segments = requestFile.split("/");
    if (
      requestFile.startsWith("/") ||
      /^[A-Za-z]:/.test(requestFile) ||
      requestFile.includes("\\") ||
      segments.some((segment) => segment === "." || segment === ".." || segment === "")
    ) {
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

function parseResponse(stdout, stderr, exitCode, command) {
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
  // A result lookup returns the original command, not necessarily "result".
  const pendingReceipt =
    (command === "result" || WRITE_COMMANDS.has(command)) &&
    response?.status === "pending" && response?.ok === null;
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
  stateDirectory,
} = {}) {
  const { args, request: effectiveRequest } = buildArgs({
    vault,
    command,
    request,
    requestFile,
    executableArgs,
  });
  return (async () => {
    let writeRecordPath;
    let preflight;
    if (WRITE_COMMANDS.has(command)) {
      if (!stateDirectory) {
        throw new Error("Pass an explicit private stateDirectory so the request and receipt survive lost output");
      }
      writeRecordPath = await saveRecord(stateDirectory, effectiveRequest, requestFile);
      preflight = await discover({ vault, action: command, executable, executableArgs, timeoutMs });
      writeRecordPath = await saveRecord(stateDirectory, effectiveRequest, requestFile, undefined, undefined, preflight);
    }
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
        void (async () => {
          const response = parseResponse(stdout, stderr, code, command);
          if (writeRecordPath) {
            try {
              await saveRecord(stateDirectory, effectiveRequest, requestFile, response);
            } catch (error) {
              throw new Error(
                `Native command returned but its receipt could not be retained (${error.message}); ` +
                  `the mutation may have happened. Read back the target before retrying.`,
              );
            }
          }
          if (code !== 0 || response.ok === false) {
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
          const outcome = outcomeFor(command, response);
          finish(null, { request: effectiveRequest, response, outcome, preflight, recordPath: writeRecordPath, stderr });
        })().catch(finish);
      });
    });
  })();
}

export async function discover({ vault, action = "create", ...options } = {}) {
  const [help, status, schema, ea, lib] = await Promise.all([
    invokeNative({ vault, command: "help", ...options }),
    invokeNative({ vault, command: "status", ...options }),
    invokeNative({ vault, command: "schema", request: { action }, ...options }),
    invokeNative({ vault, command: "api", request: { surface: "ea", query: "text" }, ...options }),
    invokeNative({ vault, command: "api", request: { surface: "lib" }, ...options }),
  ]);
  return {
    help: help.response,
    status: status.response,
    schema: schema.response,
    ea: ea.response,
    lib: lib.response,
  };
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
    const pageRevision = data.revision ?? response.revision;
    if (typeof pageRevision !== "string" || !pageRevision || !Array.isArray(data.elements) ||
        !Object.hasOwn(data, "nextOffset")) {
      throw new Error("Incomplete native read page: expected revision, elements, and nextOffset");
    }
    revision ??= pageRevision;
    if (pageRevision !== revision) {
      throw new Error("Read pagination changed revision; restart from offset zero");
    }
    elements.push(...data.elements);
    last = data.nextOffset;
    if (last == null) break;
    if (!Number.isInteger(last) || last <= offset) throw new Error("Invalid nextOffset in native read response");
    offset = last;
  } while (true);
  return { elements, revision, pagesComplete: last == null };
}

export async function recoverWrite({ vault, requestId, path, ...options }) {
  if (!vault?.trim() || !requestId) throw new Error("Receipt recovery requires explicit vault and requestId");
  const stateDirectory = options.stateDirectory;
  let receipt;
  let receiptError;
  try {
    receipt = await invokeNative({
      vault,
      command: "result",
      request: { requestId },
      ...options,
    });
  } catch (error) {
    receiptError = error.message;
  }
  const receiptStatus = receipt?.response.data?.status ?? receipt?.response.status;
  if (receipt?.response.ok && receiptStatus !== "pending" && receiptStatus !== "unknown") {
    if (stateDirectory) {
      const stored = (await listWriteRecords({ stateDirectory })).find((record) => record.requestId === requestId);
      if (stored) await saveRecord(stateDirectory, stored.request, stored.requestFile, receipt.response);
    }
    return { kind: "receipt", ...receipt };
  }
  if (!path) {
    return {
      kind: "unknown",
      reason: "No completed receipt and no exact path was supplied; inspect before retrying.",
      receipt: receipt?.response ?? null,
      receiptError,
    };
  }
  try {
    const readback = await readAll({ vault, path, source: "disk", limit: 200, ...options });
    if (stateDirectory) {
      const stored = (await listWriteRecords({ stateDirectory })).find((record) => record.requestId === requestId);
      if (stored) {
        await saveRecord(stateDirectory, stored.request, stored.requestFile, null, {
          status: "read-back-required",
          readback,
        });
      }
    }
    return {
      kind: "read-back-required",
      reason: "The receipt is unavailable or pending. Inspect the complete read-back and determine state before any new write.",
      receipt: receipt?.response ?? null,
      receiptError,
      readback,
    };
  } catch (error) {
    return {
      kind: "unknown",
      reason: "Receipt recovery and read-back both failed. Do not repeat the write until the target is inspected manually.",
      receipt: receipt?.response ?? null,
      receiptError,
      readbackError: error.message,
    };
  }
}
