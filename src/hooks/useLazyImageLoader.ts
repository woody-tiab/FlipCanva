import { useState, useRef, useCallback, useEffect } from 'react';

export interface ImageLoadState {
  url: string;
  status: 'idle' | 'loading' | 'loaded' | 'error';
  progress: number;
  timestamp: number;
  retryCount: number;
  placeholder?: string;
}

export interface LazyLoadOptions {
  preloadRange: number; // 현재 페이지 기준 앞뒤로 미리 로드할 페이지 수
  maxRetries: number; // 로딩 실패 시 최대 재시도 횟수
  retryDelay: number; // 재시도 간격 (ms)
  placeholderQuality: number; // 플레이스홀더 이미지 품질 (0-1)
  enableProgressTracking: boolean; // 로딩 진행률 추적 여부
  enablePlaceholder: boolean; // 저품질 플레이스홀더 사용 여부
  onLoadStart?: (url: string) => void;
  onLoadComplete?: (url: string) => void;
  onLoadError?: (url: string, error: Error) => void;
  onLoadProgress?: (url: string, progress: number) => void;
}

const DEFAULT_OPTIONS: LazyLoadOptions = {
  preloadRange: 2,
  maxRetries: 3,
  retryDelay: 1000,
  placeholderQuality: 0.1,
  enableProgressTracking: true,
  enablePlaceholder: true
};

export const useLazyImageLoader = (options: Partial<LazyLoadOptions> = {}) => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const [imageStates, setImageStates] = useState<Map<string, ImageLoadState>>(new Map());
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const loadQueue = useRef<Set<string>>(new Set());
  const retryTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  // 이미지 상태 업데이트
  const updateImageState = useCallback((url: string, updates: Partial<ImageLoadState>) => {
    setImageStates(prev => {
      const newStates = new Map(prev);
      const current = newStates.get(url) || {
        url,
        status: 'idle',
        progress: 0,
        timestamp: Date.now(),
        retryCount: 0
      };
      
      newStates.set(url, { ...current, ...updates, timestamp: Date.now() });
      return newStates;
    });
  }, []);

  // 저품질 플레이스홀더 생성
  const generatePlaceholder = useCallback(async (url: string): Promise<string | undefined> => {
    if (!opts.enablePlaceholder) return undefined;

    try {
      // Canvas를 사용하여 저품질 이미지 생성
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      return new Promise((resolve, reject) => {
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            resolve(undefined);
            return;
          }

          // 저품질 크기 계산
          const targetWidth = Math.floor(img.width * opts.placeholderQuality);
          const targetHeight = Math.floor(img.height * opts.placeholderQuality);
          
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          
          // 저품질로 그리기
          ctx.filter = 'blur(2px)';
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
          
          resolve(canvas.toDataURL('image/jpeg', 0.3));
        };
        
        img.onerror = () => resolve(undefined);
        img.src = url;
      });
    } catch (error) {
      console.warn('플레이스홀더 생성 실패:', error);
      return undefined;
    }
  }, [opts.enablePlaceholder, opts.placeholderQuality]);

  // 이미지 로딩 (진행률 추적 포함)
  const loadImage = useCallback(async (url: string): Promise<void> => {
    // 이미 로딩 중이거나 완료된 경우 스킵
    const currentState = imageStates.get(url);
    if (currentState?.status === 'loading' || currentState?.status === 'loaded') {
      return;
    }

    // 기존 요청 취소
    const existingController = abortControllers.current.get(url);
    if (existingController) {
      existingController.abort();
    }

    const abortController = new AbortController();
    abortControllers.current.set(url, abortController);

    loadQueue.current.add(url);
    updateImageState(url, { status: 'loading', progress: 0 });
    opts.onLoadStart?.(url);

    try {
      // 플레이스홀더 생성 (비동기)
      const placeholderPromise = generatePlaceholder(url);

      // 실제 이미지 로딩
      const response = await fetch(url, { 
        signal: abortController.signal,
        cache: 'default'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentLength = response.headers.get('content-length');
      const totalSize = contentLength ? parseInt(contentLength, 10) : 0;
      
      if (!response.body) {
        throw new Error('응답 본문이 없습니다.');
      }

      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let receivedLength = 0;

      // 스트림 읽기 (진행률 추적)
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        chunks.push(value);
        receivedLength += value.length;
        
        if (opts.enableProgressTracking && totalSize > 0) {
          const progress = Math.min((receivedLength / totalSize) * 100, 100);
          updateImageState(url, { progress });
          opts.onLoadProgress?.(url, progress);
        }
      }

      // 이미지 데이터 조립
      const imageData = new Uint8Array(receivedLength);
      let position = 0;
      for (const chunk of chunks) {
        imageData.set(chunk, position);
        position += chunk.length;
      }

      const blob = new Blob([imageData]);
      const imageUrl = URL.createObjectURL(blob);

      // 이미지 객체 생성 및 검증
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('이미지 로딩 실패'));
        img.src = imageUrl;
      });

      // 플레이스홀더 포함하여 상태 업데이트
      const placeholder = await placeholderPromise;
      updateImageState(url, { 
        status: 'loaded', 
        progress: 100,
        placeholder 
      });
      
      opts.onLoadComplete?.(url);

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return; // 취소된 요청은 무시
      }

      const currentState = imageStates.get(url);
      const retryCount = (currentState?.retryCount || 0) + 1;

      updateImageState(url, { 
        status: 'error', 
        retryCount,
        progress: 0 
      });

      console.error('이미지 로딩 실패:', url, error);
      opts.onLoadError?.(url, error as Error);

      // 재시도 로직
      if (retryCount <= opts.maxRetries) {
        const timeout = setTimeout(() => {
          retryTimeouts.current.delete(url);
          loadImage(url);
        }, opts.retryDelay * retryCount); // 지수 백오프

        retryTimeouts.current.set(url, timeout);
      }
    } finally {
      loadQueue.current.delete(url);
      abortControllers.current.delete(url);
    }
  }, [imageStates, updateImageState, generatePlaceholder, opts]);

  // 우선순위 기반 이미지 로딩
  const loadWithPriority = useCallback((urls: string[], currentIdx: number) => {
    const loadList: { url: string; priority: number }[] = [];

    urls.forEach((url, index) => {
      const distance = Math.abs(index - currentIdx);
      let priority = 0;

      if (index === currentIdx) {
        priority = 100; // 현재 페이지 최우선
      } else if (distance <= opts.preloadRange) {
        priority = 50 - distance * 10; // 인접 페이지들
      } else {
        return; // 범위 밖은 로딩하지 않음
      }

      loadList.push({ url, priority });
    });

    // 우선순위 순으로 정렬
    loadList.sort((a, b) => b.priority - a.priority);

    // 순차적으로 로딩 (동시 로딩 수 제한)
    const concurrent = 3;
    let index = 0;

    const loadNext = () => {
      const batch = loadList.slice(index, index + concurrent);
      if (batch.length === 0) return;

      Promise.allSettled(
        batch.map(item => loadImage(item.url))
      ).then(() => {
        index += concurrent;
        if (index < loadList.length) {
          setTimeout(loadNext, 100); // 다음 배치까지 딜레이
        }
      });
    };

    loadNext();
  }, [opts.preloadRange, loadImage]);

  // 현재 인덱스 업데이트 및 로딩 트리거
  const updateCurrentIndex = useCallback((newIndex: number, urls: string[]) => {
    setCurrentIndex(newIndex);
    loadWithPriority(urls, newIndex);
  }, [loadWithPriority]);

  // 특정 이미지 강제 로딩
  const forceLoadImage = useCallback((url: string) => {
    loadImage(url);
  }, [loadImage]);

  // 이미지 상태 가져오기
  const getImageState = useCallback((url: string): ImageLoadState | undefined => {
    return imageStates.get(url);
  }, [imageStates]);

  // 로딩 상태 확인
  const isLoading = useCallback((url: string): boolean => {
    return imageStates.get(url)?.status === 'loading';
  }, [imageStates]);

  const isLoaded = useCallback((url: string): boolean => {
    return imageStates.get(url)?.status === 'loaded';
  }, [imageStates]);

  const hasError = useCallback((url: string): boolean => {
    return imageStates.get(url)?.status === 'error';
  }, [imageStates]);

  // 캐시 정리
  const clearCache = useCallback(() => {
    // 모든 timeout 정리
    retryTimeouts.current.forEach(timeout => clearTimeout(timeout));
    retryTimeouts.current.clear();

    // 모든 요청 취소
    abortControllers.current.forEach(controller => controller.abort());
    abortControllers.current.clear();

    // 상태 초기화
    setImageStates(new Map());
    loadQueue.current.clear();
  }, []);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      clearCache();
    };
  }, [clearCache]);

  return {
    imageStates: Array.from(imageStates.values()),
    updateCurrentIndex,
    forceLoadImage,
    getImageState,
    isLoading,
    isLoaded,
    hasError,
    clearCache,
    currentIndex,
    loadingCount: loadQueue.current.size,
    // 편의 함수들
    getLoadedUrls: () => Array.from(imageStates.entries())
      .filter(([, state]) => state.status === 'loaded')
      .map(([url]) => url),
    getErrorUrls: () => Array.from(imageStates.entries())
      .filter(([, state]) => state.status === 'error')
      .map(([url]) => url),
    getTotalProgress: () => {
      const states = Array.from(imageStates.values());
      if (states.length === 0) return 0;
      
      const totalProgress = states.reduce((sum, state) => sum + state.progress, 0);
      return totalProgress / states.length;
    }
  };
};