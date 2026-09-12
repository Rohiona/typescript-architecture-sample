import { useCallback, useEffect, useRef, useState } from "react";
import type { Dashboard } from "../../contracts/dashboard.js";
import type { DashboardQueryPort } from "../../application/ports/dashboard-query-port.js";

export function useDeskDashboard(query: DashboardQueryPort) {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);

  const refresh = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const result = await query.readDashboard();
      if (id === requestId.current) {
        setDashboard(result);
        setLoadError("");
      }
      return result;
    } catch (error) {
      if (id === requestId.current) {
        setLoadError(error instanceof Error ? error.message : "情報を読み込めませんでした。");
      }
      throw error;
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    const id = ++requestId.current;
    void query.readDashboard().then(
      (result) => {
        if (!cancelled && id === requestId.current) {
          setDashboard(result);
          setLoadError("");
          setLoading(false);
        }
      },
      (error: unknown) => {
        if (!cancelled && id === requestId.current) {
          setLoadError(error instanceof Error ? error.message : "情報を読み込めませんでした。");
          setLoading(false);
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [query]);

  return { dashboard, loadError, loading, refresh };
}
