import { useEffect, useState, useCallback } from 'react';

export interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useFetch<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList = []
): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const executeFetch = useCallback(async () => {
    let isMounted = true;
    try {
      setLoading(true);
      setError(null);
      const result = await fetcher();
      if (isMounted) {
        setData(result);
      }
    } catch (err) {
      if (isMounted) {
        setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi tải dữ liệu');
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  }, deps);

  useEffect(() => {
    void executeFetch();
  }, [executeFetch]);

  return { data, loading, error, refetch: executeFetch };
}
