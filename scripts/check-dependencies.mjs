import { readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cruise } from "dependency-cruiser";

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** @param {string} directory @returns {string[]} */
export function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const file = join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error("Source symlinks are not supported: " + file);
      if (entry.isDirectory()) return sourceFiles(file);
      return entry.isFile() && /\.(?:ts|tsx|mts|cts)$/.test(entry.name) ? [file] : [];
    })
    .sort();
}

/** @param {string} file @param {string} directory */
function sourceKey(file, directory) {
  return relative(directory, resolve(directory, file.replaceAll("\\", "/"))).replaceAll("\\", "/");
}

/**
 * @param {readonly string[]} files
 * @param {unknown} report
 * @param {string} directory
 * @returns {string[]}
 */
export function validateDependencyReport(files, report, directory) {
  if (files.length === 0) return ["No TypeScript source files found"];
  if (!isRecord(report) || !Array.isArray(report.modules)) return ["Invalid dependency report: missing modules"];
  const errors = [];
  if (report.modules.length === 0) errors.push("Dependency analysis returned 0 modules");

  const analyzed = new Set();
  for (const module of report.modules) {
    if (!isRecord(module) || typeof module.source !== "string") {
      errors.push("Invalid dependency report: module source is missing");
      continue;
    }
    analyzed.add(sourceKey(module.source, directory));
  }
  for (const file of files) {
    if (!analyzed.has(sourceKey(file, directory))) errors.push("Source file was not analyzed: " + file);
  }

  const summary = report.summary;
  if (
    !isRecord(summary) ||
    !Array.isArray(summary.violations) ||
    !Number.isSafeInteger(summary.error) ||
    typeof summary.error !== "number" ||
    summary.error < 0
  ) {
    errors.push("Invalid dependency report: missing validation summary");
    return errors;
  }
  for (const violation of summary.violations) {
    if (!isRecord(violation) || !isRecord(violation.rule)) {
      errors.push("Invalid dependency report: malformed violation");
      continue;
    }
    if (violation.rule.severity === "error") {
      errors.push(
        "Dependency violation [" +
          String(violation.rule.name) +
          "]: " +
          String(violation.from) +
          " -> " +
          String(violation.to),
      );
    }
  }
  if (
    summary.error > 0 &&
    !summary.violations.some(
      (violation) => isRecord(violation) && isRecord(violation.rule) && violation.rule.severity === "error",
    )
  ) {
    errors.push("Dependency analysis reported " + summary.error + " errors");
  }
  return errors;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const directory = process.cwd();
    const files = sourceFiles("src");
    if (files.length === 0) throw new Error("No TypeScript source files found in src");
    const require = createRequire(import.meta.url);
    const configuration = require(resolve(".dependency-cruiser.cjs"));
    const babelConfig = require(resolve(".dependency-cruiser.babel.cjs"));

    // Pass every source file explicitly: the directory scanner does not recognize TypeScript 7 yet.
    const result = await cruise(
      files,
      { ...configuration.options, ruleSet: configuration, validate: true, outputType: "json" },
      configuration.options.enhancedResolveOptions,
      { babelConfig },
    );
    const report = typeof result.output === "string" ? JSON.parse(result.output) : result.output;
    const errors = validateDependencyReport(files, report, directory);
    if (result.exitCode !== 0) errors.push("Dependency parser exited with code " + result.exitCode);
    if (errors.length > 0) throw new Error(errors.join("\n"));
    console.log(
      "Dependency graph verified: " +
        files.length +
        " source files, " +
        report.modules.length +
        " modules, " +
        report.summary.totalDependenciesCruised +
        " dependencies.",
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
