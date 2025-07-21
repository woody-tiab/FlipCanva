import { useState, useCallback, useEffect, useRef } from 'react';
import { useResponsiveLayout } from './useResponsiveLayout';

export interface DeviceCapabilities {
  memory: number; // GB
  cores: number; // CPU 코어 수
  networkSpeed: 'slow-2g' | 'slow-3g' | 'fast-3g' | '4g' | '5g' | 'wifi' | 'unknown';
  gpu: 'low' | 'medium' | 'high' | 'unknown';
  batteryLevel?: number; // 0-1
  isLowPowerMode?: boolean;
}

export interface QualitySettings {
  // 텍스처/이미지 품질
  textureQuality: number; // 0.1-1.0
  imageCompression: number; // 0.1-1.0
  maxImageWidth: number; // px
  maxImageHeight: number; // px
  
  // 렌더링 품질
  pixelRatio: number; // 0.5-2.0
  shadowQuality: 'none' | 'low' | 'medium' | 'high';
  antialiasing: boolean;
  
  // 성능 설정
  maxFPS: number; // 15-60
  preloadCount: number; // 미리 로드할 페이지 수
  enableAnimations: boolean;
  enableEffects: boolean;
  
  // 네트워크 최적화
  enablePreloading: boolean;
  compressionLevel: number; // 0.1-1.0
  chunkSize: number; // KB
}

interface QualityPreset {
  name: string;
  description: string;
  settings: QualitySettings;
  conditions: Partial<DeviceCapabilities>;
}

const QUALITY_PRESETS: QualityPreset[] = [
  {
    name: 'low',
    description: '저성능 디바이스용',
    settings: {
      textureQuality: 0.5,
      imageCompression: 0.6,
      maxImageWidth: 1024,
      maxImageHeight: 1024,
      pixelRatio: 0.75,
      shadowQuality: 'none',
      antialiasing: false,
      maxFPS: 30,
      preloadCount: 1,
      enableAnimations: true,
      enableEffects: false,
      enablePreloading: false,
      compressionLevel: 0.7,
      chunkSize: 64
    },
    conditions: {
      memory: 1,
      cores: 2,
      networkSpeed: 'slow-3g',
      gpu: 'low'
    }
  },
  {
    name: 'medium',
    description: '중간 성능 디바이스용',
    settings: {
      textureQuality: 0.75,
      imageCompression: 0.8,
      maxImageWidth: 1920,
      maxImageHeight: 1080,
      pixelRatio: 1.0,
      shadowQuality: 'low',
      antialiasing: true,
      maxFPS: 45,
      preloadCount: 2,
      enableAnimations: true,
      enableEffects: true,
      enablePreloading: true,
      compressionLevel: 0.8,
      chunkSize: 128
    },
    conditions: {
      memory: 2,
      cores: 4,
      networkSpeed: 'fast-3g',
      gpu: 'medium'
    }
  },
  {
    name: 'high',
    description: '고성능 디바이스용',
    settings: {
      textureQuality: 1.0,
      imageCompression: 0.95,
      maxImageWidth: 2560,
      maxImageHeight: 1440,
      pixelRatio: 1.5,
      shadowQuality: 'medium',
      antialiasing: true,
      maxFPS: 60,
      preloadCount: 3,
      enableAnimations: true,
      enableEffects: true,
      enablePreloading: true,
      compressionLevel: 0.9,
      chunkSize: 256
    },
    conditions: {
      memory: 4,
      cores: 6,
      networkSpeed: '4g',
      gpu: 'high'
    }
  },
  {
    name: 'ultra',
    description: '최고 성능 디바이스용',
    settings: {
      textureQuality: 1.0,
      imageCompression: 1.0,
      maxImageWidth: 3840,
      maxImageHeight: 2160,
      pixelRatio: 2.0,
      shadowQuality: 'high',
      antialiasing: true,
      maxFPS: 60,
      preloadCount: 4,
      enableAnimations: true,
      enableEffects: true,
      enablePreloading: true,
      compressionLevel: 1.0,
      chunkSize: 512
    },
    conditions: {
      memory: 8,
      cores: 8,
      networkSpeed: '5g',
      gpu: 'high'
    }
  }
];

interface UseAdaptiveQualityOptions {
  enableAutoDetection?: boolean;
  enableUserOverride?: boolean;
  performanceThreshold?: number; // 성능 하락 감지 임계값 (FPS)
  adaptationDelay?: number; // 적응 지연 시간 (ms)
  onQualityChange?: (preset: string, settings: QualitySettings) => void;
  onPerformanceIssue?: (fps: number, preset: string) => void;
}

export const useAdaptiveQuality = ({
  enableAutoDetection = true,
  enableUserOverride = true,
  performanceThreshold = 30,
  adaptationDelay = 2000,
  onQualityChange,
  onPerformanceIssue
}: UseAdaptiveQualityOptions = {}) => {
  const { deviceInfo } = useResponsiveLayout();
  
  const [currentPreset, setCurrentPreset] = useState<string>('medium');
  const [settings, setSettings] = useState<QualitySettings>(QUALITY_PRESETS[1].settings);
  const [capabilities, setCapabilities] = useState<DeviceCapabilities>({
    memory: 4,
    cores: 4,
    networkSpeed: 'fast-3g',
    gpu: 'medium'
  });
  const [isUserOverride, setIsUserOverride] = useState(false);
  const [performanceHistory, setPerformanceHistory] = useState<number[]>([]);

  const adaptationTimeoutRef = useRef<NodeJS.Timeout>();
  const performanceCounterRef = useRef(0);

  // 디바이스 성능 감지
  const detectDeviceCapabilities = useCallback(async (): Promise<DeviceCapabilities> => {
    const capabilities: DeviceCapabilities = {
      memory: 4,
      cores: 4,
      networkSpeed: 'fast-3g',
      gpu: 'medium'
    };

    try {
      // 메모리 정보
      if ('memory' in navigator) {
        const memory = (navigator as any).memory;
        if (memory?.deviceMemory) {
          capabilities.memory = memory.deviceMemory;
        }
      }

      // CPU 코어 수
      if ('hardwareConcurrency' in navigator) {
        capabilities.cores = navigator.hardwareConcurrency || 4;
      }

      // 네트워크 연결 정보
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        if (connection) {
          const effectiveType = connection.effectiveType;
          capabilities.networkSpeed = effectiveType || 'fast-3g';
        }
      }

      // GPU 성능 추정 (WebGL 기반)
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          
          // 간단한 GPU 분류 (실제로는 더 정교한 분류 필요)
          if (renderer.includes('Intel HD') || renderer.includes('Mali-400')) {
            capabilities.gpu = 'low';
          } else if (renderer.includes('GeForce GTX') || renderer.includes('Radeon')) {
            capabilities.gpu = 'high';
          } else {
            capabilities.gpu = 'medium';
          }
        }
      }

      // 배터리 정보 (지원되는 경우)
      if ('getBattery' in navigator) {
        try {
          const battery = await (navigator as any).getBattery();
          capabilities.batteryLevel = battery.level;
          capabilities.isLowPowerMode = battery.level < 0.2;
        } catch (error) {
          // 배터리 API 지원하지 않음
        }
      }

    } catch (error) {
      console.warn('디바이스 성능 감지 실패:', error);
    }

    return capabilities;
  }, []);

  // 최적 프리셋 선택
  const selectOptimalPreset = useCallback((caps: DeviceCapabilities): string => {
    // 점수 기반 선택
    const scores = QUALITY_PRESETS.map(preset => {
      let score = 0;
      
      // 메모리 점수
      if (caps.memory >= preset.conditions.memory!) score += 25;
      else if (caps.memory >= preset.conditions.memory! * 0.7) score += 15;
      
      // CPU 점수
      if (caps.cores >= preset.conditions.cores!) score += 25;
      else if (caps.cores >= preset.conditions.cores! * 0.7) score += 15;
      
      // 네트워크 점수
      const networkRanking = ['slow-2g', 'slow-3g', 'fast-3g', '4g', '5g', 'wifi'];
      const userNetworkIndex = networkRanking.indexOf(caps.networkSpeed);
      const presetNetworkIndex = networkRanking.indexOf(preset.conditions.networkSpeed!);
      
      if (userNetworkIndex >= presetNetworkIndex) score += 25;
      else if (userNetworkIndex >= presetNetworkIndex - 1) score += 15;
      
      // GPU 점수
      const gpuRanking = ['low', 'medium', 'high'];
      const userGpuIndex = gpuRanking.indexOf(caps.gpu);
      const presetGpuIndex = gpuRanking.indexOf(preset.conditions.gpu!);
      
      if (userGpuIndex >= presetGpuIndex) score += 25;
      else if (userGpuIndex >= presetGpuIndex - 1) score += 15;
      
      // 배터리 고려 (저전력 모드 시 성능 하향)
      if (caps.isLowPowerMode && preset.name !== 'low') {
        score -= 30;
      }
      
      return { preset: preset.name, score };
    });
    
    // 최고 점수 프리셋 선택
    scores.sort((a, b) => b.score - a.score);
    return scores[0].preset;
  }, []);

  // 성능 모니터링 및 적응적 조정
  const monitorPerformance = useCallback((currentFPS: number) => {
    if (!enableAutoDetection || isUserOverride) return;

    performanceCounterRef.current++;
    setPerformanceHistory(prev => {
      const newHistory = [...prev, currentFPS].slice(-10); // 최근 10개 프레임 유지
      return newHistory;
    });

    // 성능 하락 감지 (최근 5프레임 평균이 임계값 미만)
    if (performanceHistory.length >= 5) {
      const recentAverage = performanceHistory.slice(-5).reduce((a, b) => a + b, 0) / 5;
      
      if (recentAverage < performanceThreshold) {
        onPerformanceIssue?.(recentAverage, currentPreset);
        
        // 자동 품질 하향 조정
        const currentIndex = QUALITY_PRESETS.findIndex(p => p.name === currentPreset);
        if (currentIndex > 0) {
          const lowerPreset = QUALITY_PRESETS[currentIndex - 1];
          
          if (adaptationTimeoutRef.current) {
            clearTimeout(adaptationTimeoutRef.current);
          }
          
          adaptationTimeoutRef.current = setTimeout(() => {
            applyPreset(lowerPreset.name);
            console.log(`성능 하락 감지, 품질을 ${lowerPreset.name}로 조정`);
          }, adaptationDelay);
        }
      }
    }
  }, [enableAutoDetection, isUserOverride, performanceHistory, performanceThreshold, currentPreset, adaptationDelay, onPerformanceIssue]);

  // 프리셋 적용
  const applyPreset = useCallback((presetName: string) => {
    const preset = QUALITY_PRESETS.find(p => p.name === presetName);
    if (!preset) {
      console.warn('알 수 없는 프리셋:', presetName);
      return false;
    }

    setCurrentPreset(presetName);
    setSettings(preset.settings);
    onQualityChange?.(presetName, preset.settings);
    
    // 로컬스토리지에 저장
    localStorage.setItem('flipbook-quality-preset', presetName);
    
    return true;
  }, [onQualityChange]);

  // 사용자 수동 설정
  const setUserPreset = useCallback((presetName: string) => {
    setIsUserOverride(true);
    localStorage.setItem('flipbook-quality-override', 'true');
    applyPreset(presetName);
  }, [applyPreset]);

  // 자동 감지 모드 복원
  const enableAutoMode = useCallback(async () => {
    setIsUserOverride(false);
    localStorage.removeItem('flipbook-quality-override');
    
    const caps = await detectDeviceCapabilities();
    const optimalPreset = selectOptimalPreset(caps);
    applyPreset(optimalPreset);
  }, [detectDeviceCapabilities, selectOptimalPreset, applyPreset]);

  // 개별 설정 업데이트
  const updateSetting = useCallback(<K extends keyof QualitySettings>(
    key: K,
    value: QualitySettings[K]
  ) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      onQualityChange?.('custom', newSettings);
      return newSettings;
    });
    setCurrentPreset('custom');
    setIsUserOverride(true);
  }, [onQualityChange]);

  // 품질 설정 리셋
  const resetToOptimal = useCallback(async () => {
    const caps = await detectDeviceCapabilities();
    setCapabilities(caps);
    
    const savedOverride = localStorage.getItem('flipbook-quality-override');
    const savedPreset = localStorage.getItem('flipbook-quality-preset');
    
    if (savedOverride === 'true' && savedPreset) {
      setIsUserOverride(true);
      applyPreset(savedPreset);
    } else {
      const optimalPreset = selectOptimalPreset(caps);
      applyPreset(optimalPreset);
    }
  }, [detectDeviceCapabilities, selectOptimalPreset, applyPreset]);

  // 네트워크 상태 변경 감지
  useEffect(() => {
    const handleNetworkChange = () => {
      if (!isUserOverride && enableAutoDetection) {
        resetToOptimal();
      }
    };

    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection?.addEventListener('change', handleNetworkChange);
      
      return () => {
        connection?.removeEventListener('change', handleNetworkChange);
      };
    }
  }, [isUserOverride, enableAutoDetection, resetToOptimal]);

  // 초기화
  useEffect(() => {
    resetToOptimal();
  }, [resetToOptimal]);

  // 정리
  useEffect(() => {
    return () => {
      if (adaptationTimeoutRef.current) {
        clearTimeout(adaptationTimeoutRef.current);
      }
    };
  }, []);

  return {
    // 현재 상태
    currentPreset,
    settings,
    capabilities,
    isUserOverride,
    performanceHistory,
    
    // 제어 함수
    applyPreset,
    setUserPreset,
    enableAutoMode,
    updateSetting,
    resetToOptimal,
    monitorPerformance,
    
    // 유틸리티
    availablePresets: QUALITY_PRESETS,
    getPresetByName: (name: string) => QUALITY_PRESETS.find(p => p.name === name),
    
    // 성능 분석
    averageFPS: performanceHistory.length > 0 
      ? performanceHistory.reduce((a, b) => a + b, 0) / performanceHistory.length 
      : 0,
    isPerformanceGood: performanceHistory.length > 0 
      ? performanceHistory.slice(-3).every(fps => fps >= performanceThreshold)
      : true,
    
    // 추천 설정
    getRecommendedImageSize: (originalWidth: number, originalHeight: number) => ({
      width: Math.min(originalWidth, settings.maxImageWidth),
      height: Math.min(originalHeight, settings.maxImageHeight)
    }),
    
    // 디버깅
    debug: {
      capabilities,
      performanceHistory,
      isUserOverride,
      adaptationInProgress: !!adaptationTimeoutRef.current
    }
  };
};