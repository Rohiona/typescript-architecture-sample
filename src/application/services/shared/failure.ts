export function failure(code: string, message: string) {
  return { ok: false, error: { code, message } } as const;
}
