import type { z } from "zod";
import type { Result } from "../../domain/rentals/types.js";

export async function parseRequestBody<T>(request: Request, schema: z.ZodType<T>): Promise<Result<T>> {
  const invalid = { ok: false, error: { code: "INVALID_INPUT", message: "入力形式を確認してください。" } } as const;
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return invalid;
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return invalid;
  }
  const parsed = schema.safeParse(input);
  return parsed.success ? { ok: true, value: parsed.data } : invalid;
}
