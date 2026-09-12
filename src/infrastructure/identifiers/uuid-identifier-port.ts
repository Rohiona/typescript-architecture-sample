import { randomUUID } from "node:crypto";
import type { IdentifierPort } from "../../application/ports/identifier-port.js";

export const uuidPort: IdentifierPort = { next: randomUUID };
