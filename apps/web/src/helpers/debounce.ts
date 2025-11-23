import { useCallback, useMemo } from 'react';

// Basic debounce function (non-React)
export function debounce<T extends (...args: any[]) => void>(func: T, delay: number = 300) {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);

    timer = setTimeout(() => {
      func(...args);
    }, delay);
  };
}

// React hook for debounced callbacks
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300,
  deps: React.DependencyList = [],
) {
  // Memoize the callback to prevent unnecessary recreations
  const memoizedCallback = useCallback(callback, deps);

  // Create a memoized debounced version
  const debouncedCallback = useMemo(() => {
    return debounce(memoizedCallback, delay);
  }, [memoizedCallback, delay]);

  return debouncedCallback;
}
