import { useState, useCallback, useRef, useEffect } from 'react';

export interface LoadingState {
  isLoading: boolean;
  progress: number; // 0-100
  message: string;
  type: 'initial' | 'page-turn' | 'image-load' | 'audio-load' | 'transition';
  startTime: number;
  estimatedDuration?: number; // ms
}

export interface LoadingTrigger {
  id: string;
  type: LoadingState['type'];
  message: string;
  estimatedDuration?: number;
  minDisplayTime?: number; // 최소 표시 시간 (ms)
}

interface LoadingConfig {
  // 표시 조건
  minDisplayTime: number; // 최소 표시 시간 (ms)
  delayThreshold: number; // 이 시간 이후에만 표시 (ms)
  
  // 자동 숨김 조건
  autoHideDelay: number; // 완료 후 자동 숨김 시간 (ms)
  maxDisplayTime: number; // 최대 표시 시간 (ms)
  
  // 진행률 계산
  smoothProgress: boolean; // 부드러운 진행률 애니메이션
  progressSpeed: number; // 진행률 업데이트 속도 (ms)
}

const DEFAULT_CONFIG: LoadingConfig = {
  minDisplayTime: 500, // 최소 0.5초
  delayThreshold: 200, // 0.2초 후부터 표시
  autoHideDelay: 800, // 완료 후 0.8초 대기
  maxDisplayTime: 30000, // 최대 30초
  smoothProgress: true,
  progressSpeed: 16 // ~60fps
};

const LOADING_SCENARIOS = {
  // 초기 진입 시 - 모든 페이지 데이터 로딩 완료까지
  initial: {
    message: '플립북을 준비하고 있습니다...',
    estimatedDuration: 3000,
    minDisplayTime: 1000
  },
  
  // 페이지 넘김 시 - 다음 페이지 이미지 렌더링까지
  pageTransition: {
    message: '페이지를 준비하고 있습니다...',
    estimatedDuration: 800,
    minDisplayTime: 300
  },
  
  // 이미지 로딩 시 - 고해상도 이미지 로딩까지
  imageLoading: {
    message: '이미지를 불러오고 있습니다...',
    estimatedDuration: 2000,
    minDisplayTime: 500
  },
  
  // 오디오 로딩 시 - 사운드 파일 로딩까지
  audioLoading: {
    message: '사운드를 준비하고 있습니다...',
    estimatedDuration: 1500,
    minDisplayTime: 300
  },
  
  // 전환 효과 적용 시 - 새로운 전환 효과 준비까지
  transitionChange: {
    message: '전환 효과를 적용하고 있습니다...',
    estimatedDuration: 1000,
    minDisplayTime: 200
  }
} as const;

interface UseLoadingIndicatorOptions {
  config?: Partial<LoadingConfig>;
  onLoadingStart?: (trigger: LoadingTrigger) => void;
  onLoadingProgress?: (progress: number, trigger: LoadingTrigger) => void;
  onLoadingComplete?: (trigger: LoadingTrigger, duration: number) => void;
  onLoadingTimeout?: (trigger: LoadingTrigger) => void;
}

export const useLoadingIndicator = ({
  config = {},
  onLoadingStart,
  onLoadingProgress,
  onLoadingComplete,
  onLoadingTimeout
}: UseLoadingIndicatorOptions = {}) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  const [loadingState, setLoadingState] = useState<LoadingState | null>(null);
  const [queuedTriggers, setQueuedTriggers] = useState<LoadingTrigger[]>([]);
  
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const progressIntervalRef = useRef<NodeJS.Timeout>();
  const currentTriggerRef = useRef<LoadingTrigger | null>(null);

  // 진행률 부드럽게 업데이트
  const updateProgressSmooth = useCallback((targetProgress: number) => {
    if (!finalConfig.smoothProgress || !loadingState) {
      setLoadingState(prev => prev ? { ...prev, progress: targetProgress } : null);
      return;
    }

    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    progressIntervalRef.current = setInterval(() => {
      setLoadingState(prev => {
        if (!prev) return null;
        
        const diff = targetProgress - prev.progress;
        const step = diff * 0.1; // 10%씩 접근
        
        if (Math.abs(diff) < 0.5) {
          clearInterval(progressIntervalRef.current);
          return { ...prev, progress: targetProgress };
        }
        
        const newProgress = prev.progress + step;
        
        // 콜백 호출
        if (currentTriggerRef.current) {
          onLoadingProgress?.(newProgress, currentTriggerRef.current);
        }
        
        return { ...prev, progress: newProgress };
      });
    }, finalConfig.progressSpeed);
  }, [finalConfig.smoothProgress, finalConfig.progressSpeed, loadingState, onLoadingProgress]);

  // 로딩 시작
  const startLoading = useCallback((trigger: LoadingTrigger) => {
    // 기존 타임아웃 정리
    const existingTimeout = timeoutsRef.current.get(trigger.id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      timeoutsRef.current.delete(trigger.id);
    }

    currentTriggerRef.current = trigger;
    
    // 딜레이 후 표시
    const showTimeout = setTimeout(() => {
      const startTime = Date.now();
      
      setLoadingState({
        isLoading: true,
        progress: 0,
        message: trigger.message,
        type: trigger.type,
        startTime,
        estimatedDuration: trigger.estimatedDuration
      });

      onLoadingStart?.(trigger);

      // 최대 표시 시간 타임아웃
      const maxTimeout = setTimeout(() => {
        onLoadingTimeout?.(trigger);
        stopLoading(trigger.id);
      }, finalConfig.maxDisplayTime);

      timeoutsRef.current.set(`${trigger.id}_max`, maxTimeout);
    }, finalConfig.delayThreshold);

    timeoutsRef.current.set(trigger.id, showTimeout);
  }, [finalConfig.delayThreshold, finalConfig.maxDisplayTime, onLoadingStart, onLoadingTimeout]);

  // 진행률 업데이트
  const updateProgress = useCallback((triggerId: string, progress: number) => {
    if (currentTriggerRef.current?.id === triggerId) {
      updateProgressSmooth(Math.max(0, Math.min(100, progress)));
    }
  }, [updateProgressSmooth]);

  // 로딩 완료
  const stopLoading = useCallback((triggerId: string) => {
    if (!currentTriggerRef.current || currentTriggerRef.current.id !== triggerId) {
      return;
    }

    const trigger = currentTriggerRef.current;
    const now = Date.now();
    
    // 모든 관련 타임아웃 정리
    ['', '_max', '_auto'].forEach(suffix => {
      const timeout = timeoutsRef.current.get(`${triggerId}${suffix}`);
      if (timeout) {
        clearTimeout(timeout);
        timeoutsRef.current.delete(`${triggerId}${suffix}`);
      }
    });

    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    // 최종 진행률 설정
    updateProgressSmooth(100);

    if (loadingState) {
      const duration = now - loadingState.startTime;
      const minDisplayTime = trigger.minDisplayTime || finalConfig.minDisplayTime;
      
      const hideLoading = () => {
        setLoadingState(null);
        currentTriggerRef.current = null;
        onLoadingComplete?.(trigger, duration);
      };

      // 최소 표시 시간 확인
      if (duration >= minDisplayTime) {
        // 자동 숨김 딜레이 적용
        const autoHideTimeout = setTimeout(hideLoading, finalConfig.autoHideDelay);
        timeoutsRef.current.set(`${triggerId}_auto`, autoHideTimeout);
      } else {
        // 최소 표시 시간까지 대기
        const remainingTime = minDisplayTime - duration;
        const minTimeout = setTimeout(() => {
          const autoHideTimeout = setTimeout(hideLoading, finalConfig.autoHideDelay);
          timeoutsRef.current.set(`${triggerId}_auto`, autoHideTimeout);
        }, remainingTime);
        timeoutsRef.current.set(`${triggerId}_min`, minTimeout);
      }
    }
  }, [loadingState, finalConfig.minDisplayTime, finalConfig.autoHideDelay, updateProgressSmooth, onLoadingComplete]);

  // 즉시 숨김
  const hideLoading = useCallback((triggerId?: string) => {
    if (triggerId && currentTriggerRef.current?.id !== triggerId) {
      return;
    }

    // 모든 타임아웃 정리
    timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    timeoutsRef.current.clear();
    
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    setLoadingState(null);
    currentTriggerRef.current = null;
  }, []);

  // 시나리오별 로딩 헬퍼
  const loadingHelpers = {
    // 초기 로딩
    showInitialLoading: (customMessage?: string) => {
      const scenario = LOADING_SCENARIOS.initial;
      startLoading({
        id: 'initial',
        type: 'initial',
        message: customMessage || scenario.message,
        estimatedDuration: scenario.estimatedDuration,
        minDisplayTime: scenario.minDisplayTime
      });
    },

    // 페이지 전환 로딩
    showPageTransition: (pageNumber: number) => {
      const scenario = LOADING_SCENARIOS.pageTransition;
      startLoading({
        id: `page-${pageNumber}`,
        type: 'page-turn',
        message: `${pageNumber + 1}페이지로 이동 중...`,
        estimatedDuration: scenario.estimatedDuration,
        minDisplayTime: scenario.minDisplayTime
      });
    },

    // 이미지 로딩
    showImageLoading: (imageUrl: string) => {
      const scenario = LOADING_SCENARIOS.imageLoading;
      startLoading({
        id: `image-${imageUrl}`,
        type: 'image-load',
        message: scenario.message,
        estimatedDuration: scenario.estimatedDuration,
        minDisplayTime: scenario.minDisplayTime
      });
    },

    // 오디오 로딩
    showAudioLoading: () => {
      const scenario = LOADING_SCENARIOS.audioLoading;
      startLoading({
        id: 'audio',
        type: 'audio-load',
        message: scenario.message,
        estimatedDuration: scenario.estimatedDuration,
        minDisplayTime: scenario.minDisplayTime
      });
    },

    // 전환 효과 변경
    showTransitionChange: (transitionType: string) => {
      const scenario = LOADING_SCENARIOS.transitionChange;
      startLoading({
        id: `transition-${transitionType}`,
        type: 'transition',
        message: `${transitionType} 효과 적용 중...`,
        estimatedDuration: scenario.estimatedDuration,
        minDisplayTime: scenario.minDisplayTime
      });
    }
  };

  // 진행률 계산 헬퍼
  const calculateProgress = useCallback((
    loaded: number,
    total: number,
    type: 'linear' | 'exponential' | 'logarithmic' = 'linear'
  ): number => {
    if (total === 0) return 100;
    
    const ratio = Math.max(0, Math.min(1, loaded / total));
    
    switch (type) {
      case 'exponential':
        return Math.pow(ratio, 0.5) * 100; // 빠른 시작, 느린 끝
      case 'logarithmic':
        return (1 - Math.pow(1 - ratio, 2)) * 100; // 느린 시작, 빠른 끝
      default:
        return ratio * 100;
    }
  }, []);

  // 정리
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  return {
    // 상태
    loadingState,
    isLoading: loadingState?.isLoading || false,
    progress: loadingState?.progress || 0,
    message: loadingState?.message || '',
    type: loadingState?.type || 'initial',
    
    // 기본 제어
    startLoading,
    updateProgress,
    stopLoading,
    hideLoading,
    
    // 시나리오별 헬퍼
    ...loadingHelpers,
    
    // 유틸리티
    calculateProgress,
    
    // 설정
    config: finalConfig,
    scenarios: LOADING_SCENARIOS,
    
    // 디버깅
    debug: {
      currentTrigger: currentTriggerRef.current,
      activeTimeouts: Array.from(timeoutsRef.current.keys()),
      queuedTriggers
    }
  };
};