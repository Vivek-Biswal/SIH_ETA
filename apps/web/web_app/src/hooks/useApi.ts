import { useState, useEffect, useCallback } from 'react';

export type ApiStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error' | 'stale';

interface UseApiResult<T> {
  data: T | null;
  status: ApiStatus;
  error: string | null;
  dataState: 'live' | 'mock' | 'cached' | 'unavailable' | 'error';
  execute: (...args: any[]) => Promise<void>;
  reset: () => void;
}

/**
 * Custom hook to manage API call state (loading, error, success, empty)
 * and extract the backend's data_state metadata.
 */
export function useApi<T, Args extends any[]>(
  apiFunction: (...args: Args) => Promise<T>,
  immediate = false,
  ...initialArgs: Args
): UseApiResult<T> {
  const [status, setStatus] = useState<ApiStatus>('idle');
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dataState, setDataState] = useState<'live' | 'mock' | 'cached' | 'unavailable' | 'error'>('live');

  const execute = useCallback(
    async (...args: Args) => {
      setStatus('loading');
      setError(null);

      try {
        const result = await apiFunction(...args);
        
        // Handle data state if present in the response
        let currentState: 'live' | 'mock' | 'cached' | 'unavailable' | 'error' = 'live';
        if (result && typeof result === 'object' && 'data_state' in result) {
           const ds = (result as any).data_state;
           if (['live', 'mock', 'cached', 'unavailable', 'error'].includes(ds)) {
             currentState = ds;
           }
        }
        
        setDataState(currentState);

        // Handle empty arrays or null responses
        if (result === null || (Array.isArray(result) && result.length === 0)) {
          setStatus('empty');
          setData(result);
        } else {
          setStatus('success');
          setData(result);
        }
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred');
        setStatus('error');
        setDataState('error');
      }
    },
    [apiFunction]
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setData(null);
    setError(null);
    setDataState('live');
  }, []);

  useEffect(() => {
    if (immediate) {
      execute(...initialArgs);
    }
  }, [execute, immediate, ...initialArgs]);

  return { data, status, error, dataState, execute, reset };
}
