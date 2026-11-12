#!/usr/bin/env node
// Runs guard's routing and behavior cases in real headless Claude Code sessions, one per case and model.
// Each session loads only this plugin and built-in skills: no user settings, hooks or MCP servers.
// Behavior sessions skip permission checks inside a throwaway repo, as prune's probes do; run it only on a machine
// where a session reading files under your home is acceptable.
import { spawn } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const here = dirname(fileURLToPath(import.meta.url));
const pluginDir = join(here, "..");
const cases = JSON.parse(readFileSync(join(here, "cases.json"), "utf8"));

const { values: opts } = parseArgs({
  options: {
    models: { type: "string", default: "haiku,sonnet,opus" },
    grader: { type: "string", default: "sonnet" },
    only: { type: "string" },
    case: { type: "string" },
    concurrency: { type: "string", default: "6" },
    out: { type: "string" },
    keep: { type: "boolean", default: false },
    help: { type: "boolean", short: "h" },
  },
});

if (opts.help) {
  console.log(`usage: node plugins/guard/tests/eval.mjs [--models haiku,sonnet,opus] [--only routing|behavior] [--case id]
                                       [--grader sonnet] [--concurrency 6] [--out dir] [--keep]

Runs each case on each model and prints a pass table. Writes results.json, with every final reply, to --out.`);
  process.exit(0);
}

const models = opts.models.split(",");
const out = opts.out ?? mkdtempSync(join(tmpdir(), "guard-eval-"));
mkdirSync(out, { recursive: true });

function run(cmd, args, { cwd, env = {}, timeoutMs = 15 * 60_000 } = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}

const claudeArgs = (prompt, model) => [
  "-p",
  prompt,
  "--model",
  model,
  "--plugin-dir",
  pluginDir,
  "--setting-sources",
  "project",
  "--strict-mcp-config",
  "--no-session-persistence",
  "--output-format",
  "stream-json",
  "--verbose",
];

function events(stdout) {
  return stdout.split("\n").flatMap((line) => {
    try {
      return [JSON.parse(line)];
    } catch {
      return [];
    }
  });
}

const toolUses = (evs) =>
  evs
    .filter((e) => e.type === "assistant")
    .flatMap((e) => e.message?.content ?? [])
    .filter((b) => b.type === "tool_use");
const finalText = (evs) =>
  evs.findLast((e) => e.type === "result")?.result ?? "";
const cost = (evs) =>
  evs.findLast((e) => e.type === "result")?.total_cost_usd ?? 0;

async function makeRepo(files) {
  const dir = mkdtempSync(join(tmpdir(), "guard-case-"));
  for (const [path, body] of Object.entries(files ?? {})) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), body);
  }
  const git = (...a) =>
    run(
      "git",
      ["-c", "user.name=eval", "-c", "user.email=eval@example.invalid", ...a],
      { cwd: dir },
    );
  await git("init", "-q");
  await git("add", "-A");
  await git("commit", "-q", "-m", "fixture");
  return dir;
}

async function routingCase(c, model) {
  const dir = await makeRepo({
    "README.md": "# demo\n",
    "src/index.js": "export const total = 1;\n",
  });
  // Read-only tools besides Skill, so a request no skill fits can be answered instead of forced into one.
  const r = await run(
    "claude",
    [
      ...claudeArgs(c.request, model),
      "--tools",
      "Skill,Read,Glob,Grep",
      "--max-turns",
      "3",
    ],
    { cwd: dir, timeoutMs: 5 * 60_000 },
  );
  const evs = events(r.stdout);
  const first = toolUses(evs).find((t) => t.name === "Skill");
  const skill = String(first?.input?.skill ?? "");
  const picked = skill.startsWith("guard:")
    ? skill.slice("guard:".length)
    : "none";
  if (!opts.keep) rmSync(dir, { recursive: true, force: true });
  return {
    kind: "routing",
    id: c.id,
    model,
    expect: c.expect,
    picked,
    pass: picked === c.expect,
    cost: cost(evs),
  };
}

// Each check returns null when it holds, or a reason when it fails.
const CHECKS = {
  async unchanged(dir) {
    const r = await run("git", ["status", "--porcelain"], { cwd: dir });
    return r.stdout.trim() ? `changed files:\n${r.stdout.trim()}` : null;
  },
  async catches(dir, arg) {
    const [path, ...rest] = arg.split(":");
    const probes = [
      ["node", ["scripts/check.mjs"]],
      ["node", ["--test"]],
    ];
    writeFileSync(join(dir, path), rest.join(":"));
    const bad = await Promise.all(
      probes.map(([c, a]) => run(c, a, { cwd: dir, timeoutMs: 120_000 })),
    );
    rmSync(join(dir, path));
    const good = await Promise.all(
      probes.map(([c, a]) => run(c, a, { cwd: dir, timeoutMs: 120_000 })),
    );
    if (!bad.some((r) => r.code !== 0)) return `no check failed on ${path}`;
    if (good.some((r) => r.code !== 0))
      return "a check fails on the clean tree";
    return null;
  },
  async "no-stray-violations"(dir) {
    const r = await run(
      "git",
      ["grep", "-n", "--untracked", "console\\.log", "--", "src"],
      { cwd: dir },
    );
    return r.stdout.trim()
      ? `violations left in src:\n${r.stdout.trim()}`
      : null;
  },
};

async function grade(c, reply, diff) {
  const prompt = `Grade an agent's final reply against a rubric. Judge only from the reply and the diff below.

Rubric:
${c.rubric.map((l, i) => `${i + 1}. ${l}`).join("\n")}

Final reply:
<<<
${reply}
>>>

Diff of the repo after the run (empty means nothing changed):
<<<
${diff.slice(0, 20_000)}
>>>

Answer with JSON only, no prose: {"lines": [{"met": true or false, "why": "one short sentence"}]}, one entry per rubric line in order.`;
  const r = await run(
    "claude",
    [
      "-p",
      prompt,
      "--model",
      opts.grader,
      "--setting-sources",
      "project",
      "--strict-mcp-config",
      "--no-session-persistence",
      "--tools",
      "",
      "--max-turns",
      "1",
      "--output-format",
      "json",
    ],
    { timeoutMs: 5 * 60_000 },
  );
  try {
    const parsed = JSON.parse(r.stdout);
    const text = (
      Array.isArray(parsed)
        ? parsed.findLast((e) => e.type === "result")
        : parsed
    ).result;
    return JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1))
      .lines;
  } catch {
    return c.rubric.map(() => ({
      met: false,
      why: `grader output unreadable: ${r.stdout.slice(0, 200)}`,
    }));
  }
}

async function behaviorCase(c, model) {
  const dir = await makeRepo(c.files);
  const r = await run(
    "claude",
    [
      ...claudeArgs(c.prompt, model),
      "--dangerously-skip-permissions",
      "--max-turns",
      "40",
    ],
    { cwd: dir, env: c.env },
  );
  const evs = events(r.stdout);
  const reply = finalText(evs);
  const diff = (await run("git", ["add", "-A", "-N"], { cwd: dir }),
  await run("git", ["diff"], { cwd: dir })).stdout;
  const failed = [];
  for (const spec of c.checks) {
    const [name, ...arg] = spec.split(":");
    const reason = await CHECKS[name](dir, arg.join(":"));
    if (reason) failed.push(`${name}: ${reason}`);
  }
  const rubric = await grade(c, reply, diff);
  if (!opts.keep) rmSync(dir, { recursive: true, force: true });
  const pass = !failed.length && rubric.every((l) => l.met);
  return {
    kind: "behavior",
    id: c.id,
    model,
    pass,
    failed,
    rubric,
    reply,
    skills: toolUses(evs)
      .filter((t) => t.name === "Skill")
      .map((t) => t.input?.skill),
    cost: cost(evs),
    dir: opts.keep ? dir : undefined,
  };
}

const jobs = [];
for (const model of models) {
  if (opts.only !== "behavior")
    for (const c of cases.routing)
      if (!opts.case || opts.case === c.id)
        jobs.push(() => routingCase(c, model));
  if (opts.only !== "routing")
    for (const c of cases.behavior)
      if (!opts.case || opts.case === c.id)
        jobs.push(() => behaviorCase(c, model));
}

const results = [];
let next = 0;
await Promise.all(
  Array.from({ length: Number(opts.concurrency) }, async () => {
    while (next < jobs.length) {
      const r = await jobs[next++]();
      results.push(r);
      console.error(
        `${r.pass ? "pass" : "FAIL"} ${r.kind} ${r.id} ${r.model}${r.kind === "routing" ? ` picked ${r.picked}` : ""}`,
      );
    }
  }),
);

writeFileSync(
  join(out, "results.json"),
  `${JSON.stringify(results, null, 2)}\n`,
);
const ids = [...new Set(results.map((r) => `${r.kind} ${r.id}`))];
console.log(`\n${["case", ...models].join(" | ")}`);
for (const id of ids) {
  const row = models.map((m) => {
    const r = results.find((x) => `${x.kind} ${x.id}` === id && x.model === m);
    return !r
      ? "-"
      : r.pass
        ? "pass"
        : r.kind === "routing"
          ? `FAIL (${r.picked})`
          : "FAIL";
  });
  console.log([id, ...row].join(" | "));
}
const total = results.filter((r) => r.pass).length;
console.log(
  `\n${total}/${results.length} pass, $${results.reduce((s, r) => s + r.cost, 0).toFixed(2)} in agent runs. Details: ${join(out, "results.json")}`,
);
process.exit(total === results.length ? 0 : 1);
