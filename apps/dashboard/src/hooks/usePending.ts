import { useEffect, useState } from "react";
import { fetchPending } from "../lib/api";
import type { PendingItem } from "../lib/types";

export function usePending() {
  const [items, setItems] = useState<PendingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchPending();
      setItems(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return { items, isLoading, error, reload: load };
}
