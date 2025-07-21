import { useState, useCallback, useEffect, useRef } from 'react';

export interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop';
  orientation: 'portrait' | 'landscape';
  hasTouch: boolean;
  pixelRatio: number;
  screenSize: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export interface ViewportSize {
  width: number;
  height: number;
  aspectRatio: number;
}

export interface LayoutConfig {
  // 3D 캔버스 설정
  canvasScale: number; // 캔버스 전체 스케일
  canvasPosition: { x: number; y: number }; // 캔버스 위치 조정
  
  // 플립북 크기 설정
  bookScale: number; // 책 자체 크기
  bookMaxWidth: number; // 최대 너비 (px)
  bookMaxHeight: number; // 최대 높이 (px)
  
  // 여백 및 패딩
  containerPadding: { top: number; bottom: number; left: number; right: number };
  
  // UI 요소 크기
  navigationSize: 'sm' | 'md' | 'lg';
  controlsSize: 'sm' | 'md' | 'lg';
  
  // 인터랙션 설정
  touchZoneSize: number; // 터치 영역 크기 배율
  
  // 성능 설정
  enableEffects: boolean; // 고급 효과 활성화
  textureQuality: number; // 텍스처 품질 (0-1)
  shadowQuality: 'none' | 'low' | 'medium' | 'high';
}

const BREAKPOINTS = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
};

const DEFAULT_LAYOUTS: Record<DeviceInfo['type'], LayoutConfig> = {
  mobile: {
    canvasScale: 0.9,
    canvasPosition: { x: 0, y: 0 },
    bookScale: 0.8,
    bookMaxWidth: 350,
    bookMaxHeight: 500,
    containerPadding: { top: 10, bottom: 60, left: 10, right: 10 },
    navigationSize: 'lg',
    controlsSize: 'lg',
    touchZoneSize: 1.5,
    enableEffects: false,
    textureQuality: 0.7,
    shadowQuality: 'low'
  },
  tablet: {
    canvasScale: 0.95,
    canvasPosition: { x: 0, y: 0 },
    bookScale: 1.0,
    bookMaxWidth: 600,
    bookMaxHeight: 800,
    containerPadding: { top: 20, bottom: 80, left: 20, right: 20 },
    navigationSize: 'md',
    controlsSize: 'md',
    touchZoneSize: 1.2,
    enableEffects: true,
    textureQuality: 0.85,
    shadowQuality: 'medium'
  },
  desktop: {
    canvasScale: 1.0,
    canvasPosition: { x: 0, y: 0 },
    bookScale: 1.2,
    bookMaxWidth: 800,
    bookMaxHeight: 1000,
    containerPadding: { top: 40, bottom: 40, left: 40, right: 40 },
    navigationSize: 'sm',
    controlsSize: 'sm',
    touchZoneSize: 1.0,
    enableEffects: true,
    textureQuality: 1.0,
    shadowQuality: 'high'
  }
};

export const useResponsiveLayout = () => {
  const [viewport, setViewport] = useState<ViewportSize>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
    aspectRatio: 1024 / 768
  });

  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    type: 'desktop',
    orientation: 'landscape',
    hasTouch: false,
    pixelRatio: 1,
    screenSize: 'lg'
  });

  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>(DEFAULT_LAYOUTS.desktop);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const resizeTimeoutRef = useRef<NodeJS.Timeout>();
  const initialViewportHeightRef = useRef<number>(
    typeof window !== 'undefined' ? window.innerHeight : 768
  );

  // 디바이스 타입 감지
  const detectDeviceType = useCallback((width: number, height: number): DeviceInfo['type'] => {
    if (width < BREAKPOINTS.md) return 'mobile';
    if (width < BREAKPOINTS.lg) return 'tablet';
    return 'desktop';
  }, []);

  // 화면 크기 분류
  const getScreenSize = useCallback((width: number): DeviceInfo['screenSize'] => {
    if (width >= BREAKPOINTS['2xl']) return '2xl';
    if (width >= BREAKPOINTS.xl) return 'xl';
    if (width >= BREAKPOINTS.lg) return 'lg';
    if (width >= BREAKPOINTS.md) return 'md';
    if (width >= BREAKPOINTS.sm) return 'sm';
    return 'xs';
  }, []);

  // 터치 지원 감지
  const detectTouchSupport = useCallback((): boolean => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }, []);

  // 가상 키보드 감지 (모바일)
  const detectKeyboardVisibility = useCallback((height: number) => {
    if (deviceInfo.type !== 'mobile') return false;
    
    const heightDifference = initialViewportHeightRef.current - height;
    const threshold = initialViewportHeightRef.current * 0.25; // 25% 이상 줄어들면 키보드로 간주
    
    return heightDifference > threshold;
  }, [deviceInfo.type]);

  // 디바이스 정보 업데이트
  const updateDeviceInfo = useCallback((width: number, height: number) => {
    const type = detectDeviceType(width, height);
    const orientation = width > height ? 'landscape' : 'portrait';
    const hasTouch = detectTouchSupport();
    const pixelRatio = window.devicePixelRatio || 1;
    const screenSize = getScreenSize(width);

    const newDeviceInfo: DeviceInfo = {
      type,
      orientation,
      hasTouch,
      pixelRatio,
      screenSize
    };

    setDeviceInfo(newDeviceInfo);
    return newDeviceInfo;
  }, [detectDeviceType, detectTouchSupport, getScreenSize]);

  // 레이아웃 설정 계산
  const calculateLayout = useCallback((device: DeviceInfo, viewport: ViewportSize): LayoutConfig => {
    const baseLayout = { ...DEFAULT_LAYOUTS[device.type] };
    
    // 화면 크기에 따른 조정
    const screenScale = Math.min(viewport.width / 1024, viewport.height / 768);
    
    // 모바일 세로 모드 특별 처리
    if (device.type === 'mobile' && device.orientation === 'portrait') {
      baseLayout.bookScale *= 0.9;
      baseLayout.canvasScale *= 0.85;
      baseLayout.containerPadding.top = 20;
      baseLayout.containerPadding.bottom = 100; // 하단 네비게이션 공간
    }
    
    // 태블릿 가로 모드 최적화
    if (device.type === 'tablet' && device.orientation === 'landscape') {
      baseLayout.bookScale *= 1.1;
      baseLayout.canvasPosition.y = -20; // 살짝 위로
    }
    
    // 고해상도 디스플레이 대응
    if (device.pixelRatio > 2) {
      baseLayout.textureQuality = Math.min(baseLayout.textureQuality * 1.2, 1.0);
    }
    
    // 성능이 낮은 디바이스 감지 및 최적화
    const isLowPerformance = device.type === 'mobile' || 
                            (device.type === 'tablet' && device.pixelRatio < 2);
    
    if (isLowPerformance) {
      baseLayout.enableEffects = false;
      baseLayout.shadowQuality = 'none';
      baseLayout.textureQuality *= 0.8;
    }
    
    // 가상 키보드 표시 시 조정
    if (isKeyboardVisible) {
      baseLayout.canvasScale *= 0.7;
      baseLayout.canvasPosition.y = -viewport.height * 0.1;
      baseLayout.containerPadding.bottom = 0;
    }
    
    return baseLayout;
  }, [isKeyboardVisible]);

  // 뷰포트 크기 업데이트
  const updateViewport = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspectRatio = width / height;

    const newViewport: ViewportSize = { width, height, aspectRatio };
    setViewport(newViewport);

    // 디바이스 정보 업데이트
    const newDeviceInfo = updateDeviceInfo(width, height);
    
    // 키보드 가시성 감지
    const keyboardVisible = detectKeyboardVisibility(height);
    setIsKeyboardVisible(keyboardVisible);
    
    // 레이아웃 재계산
    const newLayout = calculateLayout(newDeviceInfo, newViewport);
    setLayoutConfig(newLayout);
    
  }, [updateDeviceInfo, detectKeyboardVisibility, calculateLayout]);

  // 리사이즈 이벤트 핸들러 (디바운스 적용)
  const handleResize = useCallback(() => {
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    
    resizeTimeoutRef.current = setTimeout(updateViewport, 150);
  }, [updateViewport]);

  // 방향 변경 감지
  const handleOrientationChange = useCallback(() => {
    // 방향 변경 후 약간의 딜레이를 두고 업데이트
    setTimeout(updateViewport, 300);
  }, [updateViewport]);

  // 커스텀 레이아웃 설정
  const updateLayoutConfig = useCallback((updates: Partial<LayoutConfig>) => {
    setLayoutConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // 특정 디바이스 타입으로 강제 설정
  const forceDeviceType = useCallback((type: DeviceInfo['type']) => {
    const currentLayout = calculateLayout({ ...deviceInfo, type }, viewport);
    setLayoutConfig(currentLayout);
  }, [deviceInfo, viewport, calculateLayout]);

  // 반응형 값 계산 헬퍼
  const getResponsiveValue = useCallback(<T>(values: {
    mobile?: T;
    tablet?: T;
    desktop?: T;
    default: T;
  }): T => {
    return values[deviceInfo.type] ?? values.default;
  }, [deviceInfo.type]);

  // CSS 클래스 생성 헬퍼
  const getResponsiveClasses = useCallback(() => {
    const classes = [
      `device-${deviceInfo.type}`,
      `orientation-${deviceInfo.orientation}`,
      `screen-${deviceInfo.screenSize}`,
      deviceInfo.hasTouch ? 'touch-enabled' : 'no-touch',
      isKeyboardVisible ? 'keyboard-visible' : '',
      `pixel-ratio-${Math.floor(deviceInfo.pixelRatio)}`
    ].filter(Boolean);
    
    return classes.join(' ');
  }, [deviceInfo, isKeyboardVisible]);

  // 초기화 및 이벤트 리스너 설정
  useEffect(() => {
    // 초기 설정
    updateViewport();
    
    // 이벤트 리스너 등록
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    // 키보드 이벤트 (모바일)
    if (deviceInfo.type === 'mobile') {
      window.addEventListener('focusin', updateViewport);
      window.addEventListener('focusout', updateViewport);
    }
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('focusin', updateViewport);
      window.removeEventListener('focusout', updateViewport);
      
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [handleResize, handleOrientationChange, updateViewport, deviceInfo.type]);

  return {
    viewport,
    deviceInfo,
    layoutConfig,
    isKeyboardVisible,
    
    // 유틸리티 함수들
    updateLayoutConfig,
    forceDeviceType,
    getResponsiveValue,
    getResponsiveClasses,
    
    // 상태 체크 함수들
    isMobile: deviceInfo.type === 'mobile',
    isTablet: deviceInfo.type === 'tablet',
    isDesktop: deviceInfo.type === 'desktop',
    isPortrait: deviceInfo.orientation === 'portrait',
    isLandscape: deviceInfo.orientation === 'landscape',
    hasTouch: deviceInfo.hasTouch,
    isHighDPI: deviceInfo.pixelRatio > 1.5,
    
    // 성능 관련
    shouldUseReducedMotion: deviceInfo.type === 'mobile' || !layoutConfig.enableEffects,
    shouldPreloadImages: deviceInfo.type !== 'mobile',
    maxConcurrentLoads: deviceInfo.type === 'mobile' ? 2 : 4,
    
    // 디버깅용
    debug: {
      viewport,
      deviceInfo,
      layoutConfig,
      breakpoints: BREAKPOINTS
    }
  };
};