import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm, writeFile, access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { planDemo, runDemo } from "../examples/first-drawing.mjs";
import { doctor } from "../scripts/doctor.mjs";
import { invokeNative, listWriteRecords, readAll, recoverWrite } from "../scripts/native.mjs";

const exec = promisify(execFile);
const root = fileURLToPath(new URL("../", import.meta.url));
const target = { vault: "Test café →", path: "Drawings/First.excalidraw.md", out: "Drawings/First.png" };

// This is a subprocess protocol fixture, not an Excalidraw implementation or a renderer.
// Shapes follow plugin PR #2988's merged CLI envelopes, idMap, and viewId fields.
async function host(t, scenario = "normal") {
  const dir = await mkdtemp(path.join(os.tmpdir(), "excalidraw-onboarding-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const executableFile = path.join(dir, "host.mjs");
  const log = path.join(dir, "calls.jsonl"), sceneFile = path.join(dir, "scene.json");
  await writeFile(executableFile, `
import assert from "node:assert/strict";
import fs from "node:fs";
const scenario = ${JSON.stringify(scenario)}, sceneFile = ${JSON.stringify(sceneFile)};
const args = process.argv.slice(2);
assert.equal(args[0], ${JSON.stringify(`vault=${target.vault}`)});
const command = args[1].replace("obsidian-excalidraw-plugin:", "");
const flags = Object.fromEntries(args.slice(2).map(arg => {const i=arg.indexOf("="); return [arg.slice(0,i),arg.slice(i+1)];}));
const req = flags.json ? JSON.parse(flags.json) : flags;
fs.appendFileSync(${JSON.stringify(log)}, JSON.stringify({command, req}) + "\\n");
const reply = {apiVersion:1,session:scenario==="mixed-session" && command==="api"?"session-2":"session-1",command,status:"completed",ok:true,mutation:"not-applied",persistence:"not-applicable",warnings:[]};
const fail = (code) => Object.assign(reply,{ok:false,status:"failed",error:{code,message:code}});
const commands = Object.fromEntries(["create","open","read","apply","export","result"].map(c=>[c,{}]));
let scene = fs.existsSync(sceneFile) ? JSON.parse(fs.readFileSync(sceneFile,"utf8")) : null;
if(command === "help") reply.data={commands};
else if(command === "status") reply.data={ready:scenario!=="not-ready",nativeCLI:true,converter:true,vault:${JSON.stringify(target.vault)},version:"fixture"};
else if(command === "schema") reply.data={command:req.action,jsonSchema:{},example:{apiVersion:1,command:req.action}};
else if(command === "api") reply.data={surface:req.surface,entries:req.query && req.query!=="text"?[]:[{name:req.surface==="ea"?"addText":"getCommonBounds"}]};
else if(command === "create") {
  if(scene) fail("ALREADY_EXISTS");
  else {
    assert.equal(req.path,${JSON.stringify(target.path)});
    assert.equal(req.elements.length,3);
    scene={revision:"disk-1",elements:[
      {id:"start001",type:"rectangle"},{id:"finish01",type:"rectangle"},
      {id:"arrow001",type:"arrow",startBinding:{elementId:scenario==="bad-bindings"?"wrong":"start001"},endBinding:{elementId:"finish01"}},
      {id:"label001",type:"text",text:"Start",containerId:"start001"},
      {id:"label002",type:"text",text:"Finish",containerId:"finish01"}
    ]};
    fs.writeFileSync(sceneFile,JSON.stringify(scene));
    Object.assign(reply,{mutation:"applied",persistence:"saved",data:{path:req.path,idMap:{start:"start001",finish:"finish01",connection:"arrow001"}}});
  }
} else if(command === "open") reply.data={viewId:"view-1",path:req.path};
else if(command === "read") {
  if(req.source==="live") assert.equal(req.view,"view-1");
  else assert.equal(req.view,undefined);
  reply.data={revision:req.source==="live"?"live-1":scene.revision,elements:scene.elements,nextOffset:null};
} else if(command === "apply") {
  assert.equal(req.view,"view-1"); assert.equal(req.expectedRevision,"live-1");
  assert.equal(req.operations[0].id,"start001");
  if(scenario==="stale") fail("STALE_REVISION");
  else {
    Object.assign(scene.elements[0],req.operations[0].set); scene.revision="disk-2";
    fs.writeFileSync(sceneFile,JSON.stringify(scene));
    Object.assign(reply,{mutation:"applied",persistence:scenario==="unsaved"?"unsaved":"saved"});
  }
} else if(command === "export") {
  assert.equal(req.source,"disk"); assert.equal(req.view,undefined); assert.equal(req.overwrite,undefined);
  Object.assign(reply,{mutation:"applied",persistence:"saved",data:{path:req.out,source:"disk",revision:scenario==="export-race"?"disk-3":scene.revision,bytes:128,width:480,height:100}});
} else throw new Error("Unexpected command: " + command);
process.stdout.write(JSON.stringify(reply));
`);
  return {
    options: { ...target, executable: process.execPath, executableArgs: [executableFile], stateDirectory: path.join(dir, "private-state") },
    calls: async () => (await readFile(log, "utf8")).trim().split("\n").map(JSON.parse),
  };
}

test("offline plan requires exact targets and assigns fresh request IDs", () => {
  const a = planDemo(target), b = planDemo(target);
  assert.notEqual(a.requestIds.create, b.requestIds.create);
  for (const id of Object.values(a.requestIds)) assert.match(id, /^[\w.-]{1,80}$/);
  assert.equal(a.create.elements[2].end.id, "finish");
  assert.equal(a.export.source, "disk");
  assert.throws(() => planDemo({ ...target, vault: "" }), /explicit vault/);
  for (const drawing of ["../bad.excalidraw.md", "/bad.excalidraw.md", "C:/bad.excalidraw.md", ".hidden/bad.excalidraw.md", "a\\bad.excalidraw.md"]) {
    assert.throws(() => planDemo({ ...target, path: drawing }), /visible vault-relative/);
  }
});

test("CLI defaults to an offline plan even when the executable is unavailable", async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "excalidraw-plan-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const state = path.join(dir, "not-created");
  const { stdout, stderr } = await exec(process.execPath, [path.join(root, "examples/first-drawing.mjs"),
    "--vault", target.vault, "--path", target.path, "--out", target.out,
    "--state-directory", state, "--executable", path.join(dir, "not-an-executable")], { cwd: dir });
  assert.equal(JSON.parse(stdout).mode, "plan");
  assert.equal(stderr, "");
  await assert.rejects(access(state), { code: "ENOENT" });
  await assert.rejects(runDemo({ ...target, execute: true }), /absolute private stateDirectory/);
});

test("doctor discovers a ready host without any mutating command", async (t) => {
  const fixture = await host(t);
  const report = await doctor(fixture.options);
  assert.equal(report.ready, true);
  assert.equal(report.discovery.ea.data.entries[0].name, "addText");
  assert.deepEqual((await fixture.calls()).map(c => c.command).sort(), ["api", "api", "help", "schema", "status"]);
  await assert.rejects(access(fixture.options.stateDirectory), { code: "ENOENT" });
});

test("doctor rejects mixed-session discovery without creating a drawing", async (t) => {
  const fixture = await host(t, "mixed-session");
  const report = await doctor(fixture.options);
  assert.equal(report.ready, false);
  assert.match(report.problems.join("; "), /stable plugin session/);
  assert.ok(!(await fixture.calls()).some(c => c.command === "create"));
});

test("an unready host stops the demo before creation", async (t) => {
  const fixture = await host(t, "not-ready");
  await assert.rejects(runDemo({ ...fixture.options, execute: true }), /status.data.ready is not true/);
  assert.ok(!(await fixture.calls()).some(c => c.command === "create"));
});

test("demo creates, uses actual IDs/view/revision, verifies disk, and exports the saved revision", async (t) => {
  const fixture = await host(t);
  const report = await runDemo({ ...fixture.options, execute: true });
  assert.equal(report.mode, "executed");
  assert.equal(report.elementCount, 5);
  assert.equal(report.checks.savedReadback, true);
  assert.equal(report.checks.visualInspection, "not-performed");
  const records = await listWriteRecords(fixture.options);
  assert.equal(records.length, 3);
  assert.ok(records.every(record => record.receipt.persistence === "saved"));
  const writes = (await fixture.calls()).filter(c => ["create", "apply", "export"].includes(c.command));
  assert.deepEqual(writes.map(c => c.command), ["create", "apply", "export"]);
  assert.equal(writes[1].req.expectedRevision, "live-1");
  assert.equal(writes[1].req.operations[0].id, "start001");
});

for (const [scenario, message, forbidden] of [
  ["stale", /STALE_REVISION/, "export"],
  ["unsaved", /no completed saved receipt/, "export"],
  ["bad-bindings", /endpoint bindings/, "apply"],
  ["export-race", /same saved revision/, null],
]) {
  test(`demo stops on ${scenario} without automatic retry or cleanup`, async (t) => {
    const fixture = await host(t, scenario);
    await assert.rejects(runDemo({ ...fixture.options, execute: true }), message);
    const calls = await fixture.calls();
    if (forbidden) assert.ok(!calls.some(c => c.command === forbidden));
    for (const command of ["create", "apply", "export"]) assert.ok(calls.filter(c => c.command === command).length <= 1);
    assert.ok(!calls.some(c => c.command === "delete" || c.command === "script"));
  });
}

test("result retains pending receipts carrying the original write command", async () => {
  const options = { vault: "Demo", executable: process.execPath, executableArgs: ["-e", `
const isResult=process.argv.some(a=>a.endsWith(":result"));
process.stdout.write(JSON.stringify(isResult
  ? {apiVersion:1,command:"apply",status:"pending",ok:null,mutation:"not-applied",persistence:"unknown"}
  : {apiVersion:1,command:"read",status:"completed",ok:true,data:{revision:"disk-1",elements:[],nextOffset:null}}));`] };
  const result = await invokeNative({ ...options, command: "result", request: { requestId: "pending-1" } });
  assert.equal(result.response.ok, null);
  const recovered = await recoverWrite({ ...options, requestId: "pending-1", path: "Drawing.excalidraw.md" });
  assert.equal(recovered.kind, "read-back-required");
  assert.equal(recovered.receipt.command, "apply");
  assert.equal(recovered.receiptError, undefined);
});

test("readAll rejects incomplete and revision-changing pages instead of claiming a complete inventory", async () => {
  for (const data of [{ elements: [], nextOffset: null }, { revision: "r", elements: [] }, { revision: "r", nextOffset: null }]) {
    await assert.rejects(readAll({ vault: "Demo", path: "Drawing.excalidraw.md", executable: process.execPath,
      executableArgs: ["-e", `process.stdout.write(JSON.stringify({apiVersion:1,ok:true,data:${JSON.stringify(data)}}));`],
    }), /Incomplete native read page/);
  }
  await assert.rejects(readAll({ vault: "Demo", path: "Drawing.excalidraw.md", executable: process.execPath,
    executableArgs: ["-e", `const second=process.argv.includes("offset=1"); process.stdout.write(JSON.stringify({apiVersion:1,ok:true,data:{revision:second?"r2":"r1",elements:[{id:"a"}],nextOffset:second?null:1}}));`],
  }), /changed revision/);
});
