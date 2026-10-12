import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import { discover } from "./native.mjs";

/** Read-only discovery. A successful transport response is not runtime readiness. */
export async function doctor(options) {
  const discovery = await discover(options);
  const status = discovery.status.data ?? {};
  const problems = [];
  for (const key of ["nativeCLI", "ready", "converter"]) {
    if (status[key] !== true) problems.push(`status.data.${key} is not true`);
  }
  const sessions = Object.values(discovery).map((response) => response.session);
  if (sessions.some((session) => typeof session !== "string" || !session) || new Set(sessions).size !== 1) {
    problems.push("Discovery did not return one stable plugin session; repeat read-only discovery");
  }
  const commands = discovery.help.data?.commands ?? {};
  for (const command of ["create", "open", "read", "apply", "export", "result"]) {
    if (!Object.hasOwn(commands, command)) problems.push(`Missing native command: ${command}`);
  }
  return {
    ready: problems.length === 0,
    problems,
    vault: status.vault,
    pluginVersion: status.version,
    session: discovery.status.session,
    discovery,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { values } = parseArgs({ options: {
      vault: { type: "string" },
      executable: { type: "string" },
      action: { type: "string", default: "create" },
      help: { type: "boolean", default: false },
    } });
    if (values.help) {
      process.stdout.write('Usage: node scripts/doctor.mjs --vault "My vault" [--executable /path/to/obsidian] [--action create]\nRead-only discovery; never installs, opens drawings, or changes settings.\n');
    } else {
      const report = await doctor(values);
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      if (!report.ready) process.exitCode = 1;
    }
  } catch (error) {
    process.stderr.write(`${error.message}\nSee docs/getting-started.md for host and launcher checks.\n`);
    process.exitCode = 1;
  }
}
