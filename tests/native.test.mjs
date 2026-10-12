import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  buildArgs,
  invokeNative,
  makeRequest,
  listWriteRecords,
  readAll,
  recoverWrite,
} from "../scripts/native.mjs";

test("native requests require an explicit vault and target, and get unique write IDs", () => {
  assert.throws(() => buildArgs({ command: "status" }), /explicit Obsidian vault/);
  assert.throws(() => makeRequest("apply", {}), /explicit exact path/);
  const first = makeRequest("create", { path: "Drawings/One.excalidraw.md" });
  const second = makeRequest("create", { path: "Drawings/One.excalidraw.md" });
  assert.notEqual(first.requestId, second.requestId);
});

test("structured input uses a vault-relative file and a caller-retained request ID", () => {
  const result = buildArgs({
    vault: "Demo vault",
    command: "create",
    request: { path: "Drawings/One.excalidraw.md", requestId: "keep-this" },
    requestFile: "CLI/create.json",
  });
  assert.deepEqual(result.args, [
    'vault=Demo vault',
    "obsidian-excalidraw-plugin:create",
    "input=CLI/create.json",
  ]);
  assert.equal(result.request.requestId, "keep-this");
  assert.throws(
    () => buildArgs({ vault: "Demo", command: "create", request: { path: "x", requestId: "id" }, requestFile: "../outside.json" }),
    /vault-relative/,
  );
});

test("large inline payloads are directed to structured request files", () => {
  assert.throws(
    () => buildArgs({
      vault: "Demo",
      command: "create",
      request: { path: "x", elements: [{ text: "x".repeat(9000) }] },
    }),
    /8 KiB/,
  );
});

test("invocation preserves Unicode and validates the native response", async () => {
  const { response } = await invokeNative({
    vault: "日本語",
    command: "status",
    executable: process.execPath,
    executableArgs: ["-e", 'process.stdout.write(JSON.stringify({apiVersion:1,ok:true,label:"café →"}))'],
  });
  assert.equal(response.label, "café →");
});

test("write outcomes expose persistence verification rather than trusting exit code", async () => {
  const stateDirectory = await mkdtemp(path.join(os.tmpdir(), "excalidraw-cli-state-"));
  try {
    const result = await invokeNative({
      vault: "Demo",
      command: "create",
      request: { path: "Drawing.excalidraw.md", requestId: "saved-1" },
      stateDirectory,
      executable: process.execPath,
      executableArgs: [
        "-e",
        'process.stdout.write(JSON.stringify({apiVersion:1,ok:true,mutation:"created",persistence:"saved"}))',
      ],
    });
    assert.equal(result.outcome.persistenceVerified, true);
    assert.equal(result.outcome.readBackRequired, false);
    assert.ok(result.preflight.status);
    const [record] = await listWriteRecords({ stateDirectory });
    assert.equal(record.request.path, "Drawing.excalidraw.md");
    assert.equal(record.receipt.persistence, "saved");
    assert.ok(record.preflight.schema);
    await assert.rejects(
      invokeNative({
        vault: "Demo",
        command: "create",
        request: { path: "Another.excalidraw.md", requestId: "saved-1" },
        stateDirectory,
        executable: process.execPath,
        executableArgs: ["-e", "process.exit(0)"],
      }),
      /different payload/,
    );
  } finally {
    await rm(stateDirectory, { recursive: true, force: true });
  }
});

test("readAll exhausts all pages using one revision", async () => {
  const { elements, revision, pagesComplete } = await readAll({
    vault: "Demo",
    path: "Drawing.excalidraw.md",
    executable: process.execPath,
    executableArgs: [
      "-e",
      `const a=process.argv.slice(1); const off=Number(a.find(x=>x.startsWith("offset="))?.slice(7)||0); const page=off===0?Array.from({length:50},(_,i)=>({id:String(i)})):[{id:"50"}]; process.stdout.write(JSON.stringify({apiVersion:1,ok:true,data:{revision:"r1",elements:page,nextOffset:off===0?50:null}}));`,
    ],
  });
  assert.equal(elements.length, 51);
  assert.equal(revision, "r1");
  assert.equal(pagesComplete, true);
});

test("pending receipt recovery reads back before any possible retry", async () => {
  const stateDirectory = await mkdtemp(path.join(os.tmpdir(), "excalidraw-cli-state-"));
  try {
    const { kind, readback, reason } = await recoverWrite({
      vault: "Demo",
      requestId: "uncertain-1",
      path: "Drawing.excalidraw.md",
      stateDirectory,
      executable: process.execPath,
      executableArgs: [
        "-e",
        `const a=process.argv.slice(1); const cmd=a.find(x=>x.startsWith("obsidian-excalidraw-plugin:")); const result=cmd.endsWith(":result"); process.stdout.write(JSON.stringify(result?{apiVersion:1,command:"result",status:"pending",ok:null}:{apiVersion:1,ok:true,data:{revision:"r1",elements:[],nextOffset:null}}));`,
      ],
    });
    assert.equal(kind, "read-back-required");
    assert.equal(readback.pagesComplete, true);
    assert.match(reason, /before any new write/);
  } finally {
    await rm(stateDirectory, { recursive: true, force: true });
  }
});
