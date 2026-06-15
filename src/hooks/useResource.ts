import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';

export function useResource<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<T>(url);
      setData(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => { reload(); }, [reload]);

  return { data, loading, error, reload, setData };
}
