import { useState, useEffect } from 'react';

/**
 * 값의 변경을 지정된 시간만큼 지연시키는 훅
 * 검색 입력 등에서 API 호출 최적화에 유용
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
