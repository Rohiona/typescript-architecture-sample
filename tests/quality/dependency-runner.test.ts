import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { sourceFiles, validateDependencyReport } from "../../scripts/check-dependencies.mjs";

const repository = fileURLToPath(new URL("../../", import.meta.url));
const temporaryDirectories: string[] = [];
const fixtureSources = {
  "src/domain/types.ts": "export interface Value { amount: number }",
  "src/domain/detached.ts": "export const detached = 1;",
  "src/domain/module.mts": "export const esm = 1;",
  "src/domain/module.cts": "export const cjs = 1;",
  "src/domain/declared.d.ts": "export interface Declared { id: string }",
  "src/presentation/web/main.tsx": "export const page = <main />;",
};

function write(directory: string, files: Record<string, string>) {
  for (const [file, content] of Object.entries(files)) {
    const path = join(directory, file);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }
}

function fixture(files: Record<string, string> = fixtureSources) {
  const directory = mkdtempSync(join(tmpdir(), "rental-dependency-runner-"));
  temporaryDirectories.push(directory);
  symlinkSync(resolve(repository, "node_modules"), join(directory, "node_modules"), "junction");
  mkdirSync(join(directory, "scripts"));
  mkdirSync(join(directory, "src"));
  for (const name of [".dependency-cruiser.cjs", ".dependency-cruiser.babel.cjs", "scripts/check-dependencies.mjs"]) {
    copyFileSync(resolve(repository, name), join(directory, name));
  }
  write(directory, {
    "package.json": JSON.stringify({ type: "module" }),
    "tsconfig.json": JSON.stringify({
      compilerOptions: { target: "ES2023", module: "ESNext", moduleResolution: "Bundler", jsx: "preserve" },
      include: ["src"],
    }),
    ...files,
  });
  return directory;
}

function run(directory: string) {
  return spawnSync(process.execPath, ["scripts/check-dependencies.mjs"], {
    cwd: directory,
    encoding: "utf8",
  });
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe("全ソースを対象とする依存チェック", () => {
  it("src から未参照ファイル・型宣言・TSX・MTS・CTS を全件列挙して実解析する", () => {
    const directory = fixture();
    expect(sourceFiles(join(directory, "src"))).toHaveLength(6);
    const result = run(directory);
    expect(result.status, result.stdout + result.stderr).toBe(0);
    expect(result.stdout).toContain("Dependency graph verified: 6 source files, 6 modules");
  }, 15_000);

  it("どこからも import されていない新しい Domain の外向き依存も拒否する", () => {
    const directory = fixture();
    write(directory, {
      "src/domain/new-unreferenced.ts": 'export { row } from "../infrastructure/store.js";',
      "src/infrastructure/store.ts": "export const row = 1;",
    });
    const result = run(directory);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("domain-is-independent");
    expect(result.stderr.replaceAll("\\", "/")).toContain("src/domain/new-unreferenced.ts");
  }, 15_000);

  it("TypeScript ソースがない src を成功扱いしない", () => {
    const result = run(fixture({}));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("No TypeScript source files found");
  }, 15_000);

  it.each([
    ["^src/domain/detached[.]ts$", "Source file was not analyzed: src/domain/detached.ts"],
    ["^src/", "Dependency analysis returned 0 modules"],
  ])(
    "設定変更で解析対象が欠落した場合も失敗する: %s",
    (excluded, expected) => {
      const directory = fixture();
      const config = join(directory, ".dependency-cruiser.cjs");
      writeFileSync(
        config,
        readFileSync(config, "utf8") +
          "\nmodule.exports.options.exclude = " +
          JSON.stringify({ path: excluded }) +
          ";\n",
      );
      const result = run(directory);
      expect(result.status).toBe(1);
      expect(result.stderr.replaceAll("\\", "/")).toContain(expected);
    },
    15_000,
  );

  it("パッケージの exports によるサブパスも Node と同様に解決する", () => {
    const directory = fixture({
      "src/server.ts": 'export { serveStatic } from "@hono/node-server/serve-static";',
    });
    const result = run(directory);
    expect(result.status, result.stdout + result.stderr).toBe(0);
    expect(result.stdout).toContain("Dependency graph verified: 1 source files");
  }, 15_000);
});

describe("解析結果の完全性", () => {
  const file = "src/domain/value.ts";
  const valid = { modules: [{ source: file }], summary: { error: 0, violations: [] } };

  it("純粋な型ファイルの依存 0 件は許可し、Windows の区切りも正規化する", () => {
    expect(
      validateDependencyReport(
        [file],
        {
          ...valid,
          modules: [{ source: "src\\domain\\value.ts" }],
        },
        repository,
      ),
    ).toEqual([]);
  });

  it("0 modules と一部ファイルだけの解析結果を見逃さない", () => {
    expect(validateDependencyReport([file], { ...valid, modules: [] }, repository)).toContain(
      "Dependency analysis returned 0 modules",
    );
    expect(validateDependencyReport([file, "src/domain/new.ts"], valid, repository)).toContain(
      "Source file was not analyzed: src/domain/new.ts",
    );
  });

  it.each([undefined, null, {}, { modules: [] }, { ...valid, summary: { error: NaN, violations: [] } }])(
    "不正な解析結果を成功扱いしない: %j",
    (report) => {
      expect(validateDependencyReport([file], report, repository).length).toBeGreaterThan(0);
    },
  );
});
