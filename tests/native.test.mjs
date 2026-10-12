import test from "node:test";
import assert from "node:assert/strict";
import { buildArgs, invokeNative, makeRequest, readAll } from "../scripts/native.mjs";

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
