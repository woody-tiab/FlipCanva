import { useCallback, useRef, useEffect } from 'react';

// 쓰로틀 훅 - 지정된 시간 간격으로만 함수 실행
export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const lastExecRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const throttledCallback = useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastExec = now - lastExecRef.current;

    if (timeSinceLastExec >= delay) {
      // 즉시 실행
      lastExecRef.current = now;
      return callback(...args);
    } else {
      // 대기 중인 실행 취소 후 새로 스케줄링
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        lastExecRef.current = Date.now();
        callback(...args);
      }, delay - timeSinceLastExec);
    }
  }, [callback, delay]) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return throttledCallback;
};

// 디바운스 훅 - 마지막 호출 후 지정된 시간이 지나면 함수 실행
export const useDebounce = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const timeoutRef = useRef<NodeJS.Timeout>();

  const debouncedCallback = useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
};

// 고급 쓰로틀 - leading과 trailing 옵션 지원
interface ThrottleOptions {
  leading?: boolean; // 첫 번째 호출을 즉시 실행할지 여부
  trailing?: boolean; // 마지막 호출을 지연 실행할지 여부
}

export const useAdvancedThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  options: ThrottleOptions = { leading: true, trailing: true }
): T => {
  const lastCallTimeRef = useRef<number>(0);
  const lastExecTimeRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastArgsRef = useRef<Parameters<T>>();

  const throttledCallback = useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    lastCallTimeRef.current = now;
    lastArgsRef.current = args;

    const timeSinceLastExec = now - lastExecTimeRef.current;
    const shouldExecuteLeading = options.leading && timeSinceLastExec >= delay;

    if (shouldExecuteLeading) {
      lastExecTimeRef.current = now;
      return callback(...args);
    }

    if (options.trailing) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        if (lastCallTimeRef.current > lastExecTimeRef.current) {
          lastExecTimeRef.current = Date.now();
          if (lastArgsRef.current) {
            callback(...lastArgsRef.current);
          }
        }
      }, delay - timeSinceLastExec);
    }
  }, [callback, delay, options.leading, options.trailing]) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return throttledCallback;
};

// 연속 호출 방지 훅 - 더블클릭, 빠른 연속 클릭 방지
interface AntiSpamOptions {
  delay: number; // 연속 호출 방지 시간 (ms)
  maxCalls?: number; // 지정된 시간 내 최대 호출 횟수
  timeWindow?: number; // 호출 횟수를 계산할 시간 창 (ms)
  onSpamDetected?: () => void; // 스팸 감지 시 콜백
}

export const useAntiSpam = <T extends (...args: any[]) => any>(
  callback: T,
  options: AntiSpamOptions
): T => {
  const lastCallTimeRef = useRef<number>(0);
  const callHistoryRef = useRef<number[]>([]);

  const antiSpamCallback = useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTimeRef.current;

    // 기본 딜레이 체크
    if (timeSinceLastCall < options.delay) {
      options.onSpamDetected?.();
      return;
    }

    // 시간 창 내 호출 횟수 체크
    if (options.maxCalls && options.timeWindow) {
      const cutoffTime = now - options.timeWindow;
      callHistoryRef.current = callHistoryRef.current.filter(time => time > cutoffTime);
      
      if (callHistoryRef.current.length >= options.maxCalls) {
        options.onSpamDetected?.();
        return;
      }
      
      callHistoryRef.current.push(now);
    }

    lastCallTimeRef.current = now;
    return callback(...args);
  }, [callback, options]) as T;

  return antiSpamCallback;
};

// 복합 최적화 훅 - 쓰로틀, 디바운스, 스팸 방지를 모두 적용
interface OptimizationOptions {
  throttle?: number;
  debounce?: number;
  antiSpam?: AntiSpamOptions;
  throttleOptions?: ThrottleOptions;
}

export const useOptimizedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  options: OptimizationOptions = {}
): T => {
  // 1단계: 안티스팸 적용
  const antiSpamCallback = options.antiSpam 
    ? useAntiSpam(callback, options.antiSpam)
    : callback;

  // 2단계: 쓰로틀 적용
  const throttledCallback = options.throttle
    ? options.throttleOptions
      ? useAdvancedThrottle(antiSpamCallback, options.throttle, options.throttleOptions)
      : useThrottle(antiSpamCallback, options.throttle)
    : antiSpamCallback;

  // 3단계: 디바운스 적용
  const optimizedCallback = options.debounce
    ? useDebounce(throttledCallback, options.debounce)
    : throttledCallback;

  return optimizedCallback;
};

// 플립북 전용 최적화 설정
export const useFlipbookOptimization = () => {
  // 페이지 넘김 최적화 (빠른 연속 클릭 방지)
  const optimizePageTurn = useCallback(<T extends (...args: any[]) => any>(callback: T): T => {
    return useOptimizedCallback(callback, {
      antiSpam: {
        delay: 300, // 300ms 내 연속 클릭 방지
        maxCalls: 3, // 1초 내 최대 3번
        timeWindow: 1000,
        onSpamDetected: () => console.warn('페이지 넘김 속도가 너무 빠릅니다.')
      }
    });
  }, []);

  // 인터랙션 최적화 (드래그, 터치 등)
  const optimizeInteraction = useCallback(<T extends (...args: any[]) => any>(callback: T): T => {
    return useOptimizedCallback(callback, {
      throttle: 16, // ~60fps
      throttleOptions: { leading: true, trailing: false }
    });
  }, []);

  // UI 업데이트 최적화 (로딩 진행률 등)
  const optimizeUIUpdate = useCallback(<T extends (...args: any[]) => any>(callback: T): T => {
    return useOptimizedCallback(callback, {
      throttle: 50, // 20fps로 제한
      throttleOptions: { leading: true, trailing: true }
    });
  }, []);

  // 검색/필터 최적화
  const optimizeSearch = useCallback(<T extends (...args: any[]) => any>(callback: T): T => {
    return useOptimizedCallback(callback, {
      debounce: 300 // 300ms 후 실행
    });
  }, []);

  // 리사이즈 최적화
  const optimizeResize = useCallback(<T extends (...args: any[]) => any>(callback: T): T => {
    return useOptimizedCallback(callback, {
      throttle: 100,
      debounce: 150,
      throttleOptions: { leading: false, trailing: true }
    });
  }, []);

  // 스크롤 최적화
  const optimizeScroll = useCallback(<T extends (...args: any[]) => any>(callback: T): T => {
    return useOptimizedCallback(callback, {
      throttle: 16, // 60fps
      throttleOptions: { leading: true, trailing: false }
    });
  }, []);

  return {
    optimizePageTurn,
    optimizeInteraction,
    optimizeUIUpdate,
    optimizeSearch,
    optimizeResize,
    optimizeScroll
  };
};

// 성능 모니터링을 위한 콜백 래퍼
export const usePerformanceWrapper = <T extends (...args: any[]) => any>(
  callback: T,
  name: string,
  onPerformanceData?: (data: { name: string; duration: number; timestamp: number }) => void
): T => {
  return useCallback((...args: Parameters<T>) => {
    const startTime = performance.now();
    
    try {
      const result = callback(...args);
      
      // Promise인 경우 비동기 처리
      if (result instanceof Promise) {
        return result.finally(() => {
          const endTime = performance.now();
          onPerformanceData?.({
            name,
            duration: endTime - startTime,
            timestamp: Date.now()
          });
        });
      } else {
        const endTime = performance.now();
        onPerformanceData?.({
          name,
          duration: endTime - startTime,
          timestamp: Date.now()
        });
        return result;
      }
    } catch (error) {
      const endTime = performance.now();
      onPerformanceData?.({
        name: `${name}_ERROR`,
        duration: endTime - startTime,
        timestamp: Date.now()
      });
      throw error;
    }
  }, [callback, name, onPerformanceData]) as T;
};