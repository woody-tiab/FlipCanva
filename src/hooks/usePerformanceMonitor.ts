import { useState, useRef, useCallback, useEffect } from 'react';

interface PerformanceMetrics {
  fps: number;
  frameTime: number; // ms
  memoryUsage: number; // MB
  renderTime: number; // ms
  lastUpdate: number;
}

interface PerformanceThresholds {
  minFPS: number;
  maxFrameTime: number;
  maxMemoryUsage: number;
  maxRenderTime: number;
}

interface UsePerformanceMonitorOptions {
  thresholds?: Partial<PerformanceThresholds>;
  sampleSize?: number; // 평균 계산을 위한 샘플 수
  updateInterval?: number; // 업데이트 간격 (ms)
  onPerformanceIssue?: (issue: string, metrics: PerformanceMetrics) => void;
  onOptimization?: (suggestion: string) => void;
}

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  minFPS: 30,
  maxFrameTime: 33, // ~30 FPS
  maxMemoryUsage: 200, // MB
  maxRenderTime: 16 // 60 FPS target
};

export const usePerformanceMonitor = ({
  thresholds = {},
  sampleSize = 60,
  updateInterval = 1000,
  onPerformanceIssue,
  onOptimization
}: UsePerformanceMonitorOptions = {}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    frameTime: 0,
    memoryUsage: 0,
    renderTime: 0,
    lastUpdate: Date.now()
  });

  const [isMonitoring, setIsMonitoring] = useState(false);
  const [performanceLevel, setPerformanceLevel] = useState<'good' | 'moderate' | 'poor'>('good');

  const finalThresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  
  const frameTimesRef = useRef<number[]>([]);
  const renderTimesRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>();
  const updateIntervalRef = useRef<NodeJS.Timeout>();

  // FPS 및 프레임 시간 측정
  const measureFramePerformance = useCallback(() => {
    const now = performance.now();
    
    if (lastFrameTimeRef.current > 0) {
      const frameTime = now - lastFrameTimeRef.current;
      frameTimesRef.current.push(frameTime);
      
      // 샘플 크기 제한
      if (frameTimesRef.current.length > sampleSize) {
        frameTimesRef.current.shift();
      }
    }
    
    lastFrameTimeRef.current = now;
    
    if (isMonitoring) {
      animationFrameRef.current = requestAnimationFrame(measureFramePerformance);
    }
  }, [isMonitoring, sampleSize]);

  // 렌더링 시간 측정 시작
  const startRenderMeasurement = useCallback(() => {
    return performance.now();
  }, []);

  // 렌더링 시간 측정 종료
  const endRenderMeasurement = useCallback((startTime: number) => {
    const renderTime = performance.now() - startTime;
    renderTimesRef.current.push(renderTime);
    
    if (renderTimesRef.current.length > sampleSize) {
      renderTimesRef.current.shift();
    }
  }, [sampleSize]);

  // 메모리 사용량 측정
  const measureMemoryUsage = useCallback((): number => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize / (1024 * 1024); // MB로 변환
    }
    return 0;
  }, []);

  // 평균 계산
  const calculateAverage = useCallback((values: number[]): number => {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }, []);

  // 성능 메트릭 계산
  const calculateMetrics = useCallback((): PerformanceMetrics => {
    const avgFrameTime = calculateAverage(frameTimesRef.current);
    const fps = avgFrameTime > 0 ? 1000 / avgFrameTime : 0;
    const avgRenderTime = calculateAverage(renderTimesRef.current);
    const memoryUsage = measureMemoryUsage();

    return {
      fps,
      frameTime: avgFrameTime,
      memoryUsage,
      renderTime: avgRenderTime,
      lastUpdate: Date.now()
    };
  }, [calculateAverage, measureMemoryUsage]);

  // 성능 레벨 평가
  const evaluatePerformanceLevel = useCallback((currentMetrics: PerformanceMetrics): 'good' | 'moderate' | 'poor' => {
    const issues = [];
    
    if (currentMetrics.fps < finalThresholds.minFPS) issues.push('low_fps');
    if (currentMetrics.frameTime > finalThresholds.maxFrameTime) issues.push('high_frame_time');
    if (currentMetrics.memoryUsage > finalThresholds.maxMemoryUsage) issues.push('high_memory');
    if (currentMetrics.renderTime > finalThresholds.maxRenderTime) issues.push('high_render_time');

    if (issues.length === 0) return 'good';
    if (issues.length <= 2) return 'moderate';
    return 'poor';
  }, [finalThresholds]);

  // 성능 이슈 감지 및 최적화 제안
  const analyzePerformance = useCallback((currentMetrics: PerformanceMetrics) => {
    const level = evaluatePerformanceLevel(currentMetrics);
    setPerformanceLevel(level);

    // 성능 이슈 감지
    if (currentMetrics.fps < finalThresholds.minFPS) {
      onPerformanceIssue?.('낮은 FPS 감지', currentMetrics);
      onOptimization?.('텍스처 해상도를 낮이거나 동시 렌더링 오브젝트 수를 줄여보세요.');
    }

    if (currentMetrics.memoryUsage > finalThresholds.maxMemoryUsage) {
      onPerformanceIssue?.('높은 메모리 사용량 감지', currentMetrics);
      onOptimization?.('텍스처 캐시를 정리하고 사용하지 않는 리소스를 해제하세요.');
    }

    if (currentMetrics.renderTime > finalThresholds.maxRenderTime) {
      onPerformanceIssue?.('긴 렌더링 시간 감지', currentMetrics);
      onOptimization?.('복잡한 지오메트리를 단순화하거나 LOD(Level of Detail)를 적용하세요.');
    }

    // 전반적인 성능 최적화 제안
    if (level === 'poor') {
      onOptimization?.('전반적인 성능이 좋지 않습니다. 애니메이션 품질을 낮추고 효과를 줄여보세요.');
    } else if (level === 'moderate') {
      onOptimization?.('성능을 개선하기 위해 일부 고급 효과를 비활성화할 수 있습니다.');
    }
  }, [evaluatePerformanceLevel, finalThresholds, onPerformanceIssue, onOptimization]);

  // 모니터링 시작
  const startMonitoring = useCallback(() => {
    if (isMonitoring) return;

    setIsMonitoring(true);
    
    // 프레임 측정 시작
    animationFrameRef.current = requestAnimationFrame(measureFramePerformance);
    
    // 정기적인 메트릭 업데이트
    updateIntervalRef.current = setInterval(() => {
      const currentMetrics = calculateMetrics();
      setMetrics(currentMetrics);
      analyzePerformance(currentMetrics);
    }, updateInterval);
  }, [isMonitoring, measureFramePerformance, calculateMetrics, analyzePerformance, updateInterval]);

  // 모니터링 중지
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
    }
  }, []);

  // 성능 데이터 리셋
  const resetMetrics = useCallback(() => {
    frameTimesRef.current = [];
    renderTimesRef.current = [];
    lastFrameTimeRef.current = 0;
    
    setMetrics({
      fps: 0,
      frameTime: 0,
      memoryUsage: 0,
      renderTime: 0,
      lastUpdate: Date.now()
    });
    
    setPerformanceLevel('good');
  }, []);

  // 성능 보고서 생성
  const generateReport = useCallback(() => {
    const currentMetrics = calculateMetrics();
    const level = evaluatePerformanceLevel(currentMetrics);
    
    return {
      metrics: currentMetrics,
      level,
      recommendations: {
        fps: currentMetrics.fps < finalThresholds.minFPS ? '프레임 레이트 최적화 필요' : 'FPS 양호',
        memory: currentMetrics.memoryUsage > finalThresholds.maxMemoryUsage ? '메모리 사용량 최적화 필요' : '메모리 사용량 양호',
        rendering: currentMetrics.renderTime > finalThresholds.maxRenderTime ? '렌더링 최적화 필요' : '렌더링 성능 양호'
      },
      timestamp: Date.now()
    };
  }, [calculateMetrics, evaluatePerformanceLevel, finalThresholds]);

  // 자동 최적화 (기본적인 것들)
  const autoOptimize = useCallback(() => {
    const currentMetrics = calculateMetrics();
    const suggestions: string[] = [];

    if (currentMetrics.fps < finalThresholds.minFPS) {
      suggestions.push('애니메이션 품질 자동 조정');
    }

    if (currentMetrics.memoryUsage > finalThresholds.maxMemoryUsage) {
      suggestions.push('텍스처 캐시 자동 정리');
    }

    return suggestions;
  }, [calculateMetrics, finalThresholds]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  return {
    metrics,
    performanceLevel,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    resetMetrics,
    startRenderMeasurement,
    endRenderMeasurement,
    generateReport,
    autoOptimize,
    thresholds: finalThresholds
  };
};