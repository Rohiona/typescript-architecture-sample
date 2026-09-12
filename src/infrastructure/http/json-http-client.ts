import type { ApiError } from "../../contracts/dashboard.js";

export interface JsonHttpClient {
  request<T>(path: string, body?: unknown): Promise<T>;
}

export function createJsonHttpClient(fetcher: typeof fetch = globalThis.fetch): JsonHttpClient {
  return {
    async request<T>(path: string, body?: unknown): Promise<T> {
      let response: Response;
      try {
        response = await fetcher(
          path,
          body === undefined
            ? { headers: { Accept: "application/json" } }
            : {
                method: "POST",
                headers: { "Content-Type": "application/json", Accept: "application/json" },
                body: JSON.stringify(body),
              },
        );
      } catch {
        throw new Error("サーバーに接続できませんでした。接続を確認して、もう一度お試しください。");
      }
      let data: unknown;
      try {
        data = await response.json();
      } catch {
        throw new Error("情報を読み込めませんでした。少し待って、もう一度お試しください。");
      }
      if (!response.ok) {
        const error = data as Partial<ApiError> | null;
        throw new Error(
          typeof error?.error?.message === "string"
            ? error.error.message
            : "操作を完了できませんでした。少し待って、もう一度お試しください。",
        );
      }
      return data as T;
    },
  };
}
