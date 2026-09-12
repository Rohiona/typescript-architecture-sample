import { readdirSync, readFileSync } from "node:fs";
import { resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** @param {string} file */
function normalizePath(file) {
  return file.replaceAll("\\", "/");
}

/** @param {string} directory @returns {string[]} */
export function domainFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return domainFiles(path);
    return entry.isFile() && /(?<!\.d)\.ts$/.test(entry.name) ? [path] : [];
  });
}

/**
 * @param {readonly string[]} files
 * @param {unknown} report
 * @param {(file: string) => string} readSource
 * @returns {string[]}
 */
export function validateDomainCoverage(files, report, readSource) {
  if (files.length === 0) return ["No Domain source files found"];
  if (!isRecord(report)) return ["Coverage report must be an object"];
  const errors = [];
  /** @type {Map<string, unknown>} */
  const entries = new Map();
  for (const [file, metrics] of Object.entries(report)) {
    if (file === "total") continue;
    const normalized = normalizePath(file);
    if (entries.has(normalized)) errors.push(`${file}: duplicate coverage entry`);
    entries.set(normalized, metrics);
  }
  for (const file of files) {
    const source = readSource(file);
    if (/(?:\/\/|\/\*+)[\s*]*(?:(?:istanbul|c8|v8)\s+ignore|(?:node:)?coverage\s+(?:disable|ignore))/i.test(source)) {
      errors.push(`${file}: coverage exclusions are not allowed`);
    }
    const metrics = entries.get(normalizePath(file));
    if (!isRecord(metrics)) {
      errors.push(`${file}: missing coverage`);
      continue;
    }
    for (const name of ["lines", "statements", "functions", "branches"]) {
      const metric = metrics[name];
      if (
        !isRecord(metric) ||
        !Number.isSafeInteger(metric.total) ||
        !Number.isSafeInteger(metric.covered) ||
        typeof metric.total !== "number" ||
        metric.total < 0 ||
        metric.total !== metric.covered ||
        metric.skipped !== 0
      ) {
        errors.push(`${file}: ${name} must be exactly 100% with no skips`);
      }
    }
  }
  return errors;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const files = domainFiles(resolve("src/domain"));
    const report = JSON.parse(readFileSync("coverage/coverage-summary.json", "utf8"));
    const errors = validateDomainCoverage(files, report, (file) => readFileSync(file, "utf8"));
    if (errors.length) {
      console.error(errors.join("\n"));
      process.exitCode = 1;
    } else {
      console.log(
        `Domain coverage verified: ${files.length} files, all 4 metrics exactly 100% (${relative(process.cwd(), resolve("src/domain"))}).`,
      );
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
