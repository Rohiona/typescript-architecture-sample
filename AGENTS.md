# Working in this repository

This is a public, runnable TypeScript architecture sample owned by Rohiona.

## Architecture

- Keep HTTP controllers and UseCases focused on orchestration.
- Put concrete decisions in Application Services and Domain, with direct tests.
- Group files by layer, feature, then purpose. Name behavioral instance creators `*-factory.ts`.
- Use purpose-specific Query and Command ports; both may use the same SQLite database.
- Keep ORM, browser APIs and clocks behind ports. Inject dependencies in Composition.
- Keep independent business rules in named, directly testable functions rather than hidden private helpers.
- Domain must not depend on UI, HTTP, storage or application code.
- Preserve atomic read/check/write transactions. An availability check alone cannot prevent races.

## Quality

- Domain coverage is 100% for every file and each of lines, statements, branches and functions.
- Do not exclude Domain files or lower thresholds. Test boundaries and failure cases, not only happy paths.
- Test database constraints, transaction rollback and concurrency using actual SQLite.
- Run targeted checks for implementation; use PR CI for equivalent full checks and fix failures.
- Oxfmt uses 120 columns as its formatting target.
- The demo must start without API keys or a separate database server.

## Publishing

- Do not commit credentials, local databases, generated reports, IDE settings or private code from other projects.
- Use a dedicated feature branch and keep PR CI green before merging.
