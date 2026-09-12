module.exports = {
  forbidden: [
    { name: "no-runtime-cycles", severity: "error", from: {}, to: { circular: true } },
    { name: "no-unresolved", severity: "error", from: {}, to: { couldNotResolve: true } },
    {
      name: "domain-is-independent",
      severity: "error",
      from: { path: "^src/domain/" },
      to: { pathNot: "^src/domain/" },
    },
    {
      name: "application-is-independent",
      severity: "error",
      from: { path: "^src/application/" },
      to: { pathNot: "^src/(application|contracts|domain)/" },
    },
    {
      name: "services-do-not-orchestrate-usecases",
      severity: "error",
      from: { path: "^src/application/services/" },
      to: { path: "^src/application/usecases/" },
    },
    {
      name: "contracts-are-independent",
      severity: "error",
      from: { path: "^src/contracts/" },
      to: { path: "^src/(application|composition|infrastructure|presentation)/" },
    },
    {
      name: "presentation-does-not-use-infrastructure",
      severity: "error",
      from: { path: "^src/presentation/" },
      to: { path: "^src/infrastructure/" },
    },
    {
      name: "presentation-does-not-compose",
      severity: "error",
      from: { path: "^src/presentation/", pathNot: "^src/presentation/web/main[.]tsx$" },
      to: { path: "^src/composition/" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: false,
    tsConfig: { fileName: "tsconfig.json" },
    babelConfig: { fileName: ".dependency-cruiser.babel.cjs" },
    enhancedResolveOptions: {
      extensions: [".ts", ".tsx", ".js", ".json"],
      conditionNames: ["import", "node", "default"],
      exportsFields: ["exports"],
    },
  },
};
