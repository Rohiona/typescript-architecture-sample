import { useCallback, useState } from "react";

export function useDeskActions(refresh: () => Promise<unknown>) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<{ scope: string; message: string } | null>(null);
  const [notice, setNotice] = useState("");

  const clearFeedback = useCallback(() => {
    setError(null);
    setNotice("");
  }, []);
  const run = useCallback(
    async (scope: string, operation: () => Promise<unknown>, successMessage: string) => {
      setPending(scope);
      setError(null);
      setNotice("");
      let completed = false;
      try {
        await operation();
        completed = true;
        await refresh();
        setNotice(successMessage);
        return true;
      } catch (reason) {
        const message = reason instanceof Error ? reason.message : "操作を完了できませんでした。";
        setError({
          scope,
          message: completed
            ? "操作は完了しましたが、表示を更新できませんでした。再読み込みして状態を確認してください。"
            : message,
        });
        return false;
      } finally {
        setPending(null);
      }
    },
    [refresh],
  );

  return { pending, error, notice, clearFeedback, run };
}
