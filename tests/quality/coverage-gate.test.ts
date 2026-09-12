import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { domainFiles, validateDomainCoverage } from "../../scripts/check-domain-coverage.mjs";

const metricNames = ["lines", "statements", "branches", "functions"] as const;
const file = resolve("src/domain/rentals/example.ts");
const source = () => "export const capacity = 3;";
const counts = { total: 1, covered: 1, skipped: 0, pct: 100 };
const entry = () => Object.fromEntries(metricNames.map((name) => [name, { ...counts }]));
const temporaryDirectories: string[] = [];
const scriptUrl = new URL("../../scripts/check-domain-coverage.mjs", import.meta.url);
const script = fileURLToPath(scriptUrl);

function temporaryDirectory() {
  const directory = mkdtempSync(join(tmpdir(), "rental coverage gate "));
  temporaryDirectories.push(directory);
  return directory;
}

function write(filename: string, contents: string) {
  mkdirSync(dirname(filename), { recursive: true });
  writeFileSync(filename, contents);
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true });
});

describe("Domain coverage gate", () => {
  it("accepts complete coverage using exact counts", () => {
    expect(validateDomainCoverage([file], { [file]: entry() }, source)).toEqual([]);
  });

  it.each(metricNames)("does not trust a rounded 100%% for %s", (name) => {
    const metrics = entry();
    metrics[name] = { ...counts, total: 10_000, covered: 9_999, pct: 100 };
    expect(validateDomainCoverage([file], { [file]: metrics }, source)).toEqual([
      `${file}: ${name} must be exactly 100% with no skips`,
    ]);
  });

  it("uses raw counts even when the presentation percentage is inaccurate", () => {
    const metrics = entry();
    metrics.lines.pct = 0;
    expect(validateDomainCoverage([file], { [file]: metrics }, source)).toEqual([]);
  });

  for (const name of metricNames) {
    it.each([
      undefined,
      null,
      [],
      { ...counts, total: -1, covered: -1 },
      { ...counts, covered: -1 },
      { ...counts, total: 0.5, covered: 0.5 },
      { ...counts, total: NaN, covered: NaN },
      { ...counts, total: Infinity, covered: Infinity },
      { ...counts, total: Number.MAX_SAFE_INTEGER + 1, covered: Number.MAX_SAFE_INTEGER + 1 },
      { ...counts, total: "1", covered: "1" },
      { ...counts, covered: 0 },
      { ...counts, covered: 2 },
      { ...counts, skipped: 1 },
      { ...counts, skipped: undefined },
    ])("rejects invalid " + name + " counts: %j", (invalid) => {
      const metrics: Record<string, unknown> = entry();
      metrics[name] = invalid;
      expect(validateDomainCoverage([file], { [file]: metrics }, source)).toEqual([
        `${file}: ${name} must be exactly 100% with no skips`,
      ]);
    });
  }

  it("does not let a healthy total hide an unmeasured new file", () => {
    expect(validateDomainCoverage([file], { total: entry() }, source)).toEqual([`${file}: missing coverage`]);
  });

  it("rejects an empty Domain inventory", () => {
    expect(validateDomainCoverage([], {}, source)).toEqual(["No Domain source files found"]);
  });

  it.each([null, undefined, [], "invalid", 100])("rejects an invalid report %j", (report) => {
    expect(validateDomainCoverage([file], report, source)).toEqual(["Coverage report must be an object"]);
  });

  it.each([null, [], 1])("rejects a malformed file entry %j", (metrics) => {
    expect(validateDomainCoverage([file], { [file]: metrics }, source)).toEqual([`${file}: missing coverage`]);
  });

  it.each([
    "// v8 ignore next",
    "/* v8 ignore next -- @preserve */",
    "// c8 ignore start",
    "/* istanbul ignore file */",
    "/**\n * V8 ignore next\n */",
    "/* node:coverage disable */",
    "// node:coverage ignore next",
    "// coverage ignore",
  ])("rejects exclusion directives even when coverage is complete: %s", (directive) => {
    expect(validateDomainCoverage([file], { [file]: entry() }, () => directive + "\n" + source())).toContain(
      `${file}: coverage exclusions are not allowed`,
    );
  });

  it("does not mistake ordinary text for a coverage directive", () => {
    expect(
      validateDomainCoverage([file], { [file]: entry() }, () => 'export const message = "v8 ignore next";'),
    ).toEqual([]);
  });

  it("requires but accepts a zero-runtime entry for a type-only .ts file", () => {
    const typeOnly = Object.fromEntries(
      metricNames.map((name) => [name, { total: 0, covered: 0, skipped: 0, pct: 0 }]),
    );
    const readType = () => "export type Quantity = number;";
    expect(validateDomainCoverage([file], { [file]: typeOnly }, readType)).toEqual([]);
    expect(validateDomainCoverage([file], {}, readType)).toEqual([`${file}: missing coverage`]);
  });

  it("matches Windows absolute paths regardless of separator style", () => {
    const windowsFile = String.raw`C:\samples\rental demo\src\domain\example.ts`;
    const forwardSlashFile = "C:/samples/rental demo/src/domain/example.ts";
    expect(validateDomainCoverage([windowsFile], { [forwardSlashFile]: entry() }, source)).toEqual([]);
    expect(validateDomainCoverage([forwardSlashFile], { [windowsFile]: entry() }, source)).toEqual([]);
  });

  it("rejects duplicate report entries for the same normalized path", () => {
    const windowsFile = String.raw`C:\sample\src\domain\example.ts`;
    const forwardSlashFile = "C:/sample/src/domain/example.ts";
    expect(
      validateDomainCoverage(
        [windowsFile],
        {
          [windowsFile]: entry(),
          [forwardSlashFile]: entry(),
        },
        source,
      ),
    ).toContain(`${forwardSlashFile}: duplicate coverage entry`);
  });

  it("discovers nested source and type-only files while excluding declarations and non-TypeScript files", () => {
    const directory = temporaryDirectory();
    const expected = [join(directory, "example.ts"), join(directory, "nested", "types.ts")];
    write(expected[0], source());
    write(expected[1], "export type Quantity = number;");
    write(join(directory, "nested", "external.d.ts"), "declare const external: number;");
    write(join(directory, "notes.md"), "Domain notes");
    write(join(directory, "fake.ts", "inside.json"), "{}");
    expect(domainFiles(directory).sort()).toEqual(expected.sort());
  });

  it("runs as a CLI from an absolute path with a project directory containing spaces", () => {
    const directory = temporaryDirectory();
    const domainFile = join(directory, "src", "domain", "example.ts");
    write(domainFile, source());
    write(join(directory, "coverage", "coverage-summary.json"), JSON.stringify({ [domainFile]: entry() }));
    const run = spawnSync(process.execPath, [script], { cwd: directory, encoding: "utf8" });
    expect(run.status, run.stderr).toBe(0);
    expect(run.stdout).toContain("Domain coverage verified: 1 files");
  });

  it("returns a failing CLI exit status when a source has no coverage", () => {
    const directory = temporaryDirectory();
    write(join(directory, "src", "domain", "example.ts"), source());
    write(join(directory, "coverage", "coverage-summary.json"), "{}");
    const run = spawnSync(process.execPath, [script], { cwd: directory, encoding: "utf8" });
    expect(run.status).toBe(1);
    expect(run.stderr).toContain("missing coverage");
  });

  it("returns a failing CLI exit status for invalid JSON", () => {
    const directory = temporaryDirectory();
    write(join(directory, "src", "domain", "example.ts"), source());
    write(join(directory, "coverage", "coverage-summary.json"), "{");
    const run = spawnSync(process.execPath, [script], { cwd: directory, encoding: "utf8" });
    expect(run.status).toBe(1);
    expect(run.stderr).not.toBe("");
  });

  it("can be imported without executing its CLI against the caller's directory", () => {
    const run = spawnSync(
      process.execPath,
      ["--input-type=module", "-e", `await import(${JSON.stringify(scriptUrl.href)})`],
      {
        cwd: temporaryDirectory(),
        encoding: "utf8",
      },
    );
    expect(run.status, run.stderr).toBe(0);
    expect(run.stdout).toBe("");
  });
});
