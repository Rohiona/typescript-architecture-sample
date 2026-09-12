import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repository = fileURLToPath(new URL("../../", import.meta.url));
let workspace: string;

const accepted = {
  "src/domain/rentals/value.ts": "export interface Value { amount: number }; export const value = 1;",
  "src/application/ports/value.ts": 'export type { Value } from "../../domain/rentals/value.js";',
  "src/application/services/value.ts":
    'import type { Value } from "../ports/value.js"; export const value: Value = { amount: 1 };',
  "src/application/usecases/value.ts": 'export { value } from "../services/value.js";',
  "src/contracts/value.ts": 'export type { Value } from "../domain/rentals/value.js";',
  "src/infrastructure/value.ts": "export interface Adapter { value: number }; export const adapter = 1;",
  "src/composition/browser/bootstrap.ts": 'export { adapter } from "../../infrastructure/value.js";',
  "src/presentation/web/view.ts":
    'import type { Value } from "../../application/ports/value.js"; export const value: Value = { amount: 1 };',
  "src/presentation/web/main.tsx": 'export { adapter } from "../../composition/browser/bootstrap.js";',
};

const rejected = {
  "src/domain/rentals/outer-type.ts": 'export type { Adapter } from "../../infrastructure/value.js";',
  "src/domain/rentals/contract-type.ts": 'export type { Value } from "../../contracts/value.js";',
  "src/application/services/outer-type.ts":
    'import type { Adapter } from "../../infrastructure/value.js"; export type Input = Adapter;',
  "src/application/services/outer-value.ts": 'export { adapter } from "../../infrastructure/value.js";',
  "src/application/services/outer-type-reexport.ts": 'export type { Adapter } from "../../infrastructure/value.js";',
  "src/application/services/normalized-path.ts":
    'export type { Adapter } from "../ports/../../infrastructure/value.js";',
  "src/application/services/usecase-type.ts": 'export type { value } from "../usecases/value.js";',
  "src/contracts/application-type.ts": 'export type { Value } from "../application/ports/value.js";',
  "src/presentation/web/concrete-type.ts": 'export type { Adapter } from "../../infrastructure/value.js";',
  "src/presentation/web/concrete-value.ts": 'export { adapter } from "../../infrastructure/value.js";',
  "src/presentation/web/composition-value.ts": 'export { adapter } from "../../composition/browser/bootstrap.js";',
  "src/presentation/web/main.tsx": 'export { adapter } from "../../infrastructure/value.js";',
  "src/application/services/import-type-expression.ts":
    'export type Input = import("../../infrastructure/value.js").Adapter;',
};

function writeFiles(files: Record<string, string>) {
  for (const [file, content] of Object.entries(files)) {
    const target = join(workspace, file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
}

function lint(files: string[]) {
  const result = spawnSync(
    process.execPath,
    [
      resolve(repository, "node_modules/oxlint/bin/oxlint"),
      "--config",
      ".oxlintrc.json",
      "--format",
      "json",
      "--threads=2",
      ...files,
    ],
    { cwd: workspace, encoding: "utf8" },
  );
  return result;
}

function dependencies(files: string[]) {
  return spawnSync(
    process.execPath,
    [
      resolve(repository, "node_modules/dependency-cruiser/bin/dependency-cruise.mjs"),
      "--config",
      ".dependency-cruiser.cjs",
      "--output-type",
      "err",
      ...files,
    ],
    { cwd: workspace, encoding: "utf8" },
  );
}

beforeAll(() => {
  workspace = mkdtempSync(join(tmpdir(), "rental-desk-architecture-"));
  symlinkSync(resolve(repository, "node_modules"), join(workspace, "node_modules"), "junction");
  for (const config of [".oxlintrc.json", ".dependency-cruiser.cjs", ".dependency-cruiser.babel.cjs"]) {
    copyFileSync(resolve(repository, config), join(workspace, config));
  }
  writeFileSync(
    join(workspace, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: { target: "ES2023", module: "ESNext", moduleResolution: "Bundler", types: [], strict: true },
      include: ["src/**/*.ts", "src/**/*.tsx"],
    }),
  );
  writeFileSync(join(workspace, "package.json"), JSON.stringify({ type: "module" }));
  writeFiles(accepted);
});

afterAll(() => {
  if (workspace) rmSync(workspace, { recursive: true, force: true });
});

describe("レイヤー制約の実コマンド回帰", () => {
  it("内側の型参照と起動点の Composition 参照を許可する", () => {
    const staticResult = lint(Object.keys(accepted));
    expect(staticResult.status, staticResult.stdout + staticResult.stderr).toBe(0);
    const runtimeResult = dependencies(Object.keys(accepted));
    expect(runtimeResult.status, runtimeResult.stdout + runtimeResult.stderr).toBe(0);
  }, 15_000);

  it("外側への型・値・再 export・正規化される相対参照を拒否する", () => {
    writeFiles(rejected);
    const result = lint(Object.keys(rejected));
    expect(result.status).not.toBe(0);
    const report = JSON.parse(result.stdout) as { diagnostics: { filename: string; code: string }[] };
    for (const file of Object.keys(rejected)) {
      const rule = file.endsWith("import-type-expression.ts") ? "consistent-type-imports" : "no-restricted-imports";
      expect(
        report.diagnostics.some(
          (diagnostic) => diagnostic.filename.replaceAll("\\", "/") === file && diagnostic.code.includes(rule),
        ),
        "Missing import boundary diagnostic for " + file + "\n" + result.stdout,
      ).toBe(true);
    }
  }, 15_000);

  it("動的 import も実行時の依存グラフで拒否する", () => {
    const files = {
      "src/presentation/web/dynamic-infrastructure.ts":
        'export function load() { return import("../../infrastructure/value.js"); }',
      "src/presentation/web/dynamic-composition.ts":
        'export function load() { return import("../../composition/browser/bootstrap.js"); }',
      "src/contracts/dynamic-application.ts":
        'export function load() { return import("../application/usecases/value.js"); }',
    };
    writeFiles(files);
    const result = dependencies(Object.keys(files));
    expect(result.status).not.toBe(0);
    for (const file of Object.keys(files)) {
      expect(result.stdout + result.stderr, "Missing runtime boundary diagnostic for " + file).toContain(file);
    }
    expect(result.stdout).toContain("presentation-does-not-use-infrastructure");
    expect(result.stdout).toContain("presentation-does-not-compose");
    expect(result.stdout).toContain("contracts-are-independent");
  }, 15_000);
});
