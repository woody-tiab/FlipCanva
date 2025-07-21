import { useCallback, useRef, useEffect, useState } from 'react';

export interface InteractionZone {
  id: string;
  x: number; // 0-1 (비율)
  y: number; // 0-1 (비율)
  width: number; // 0-1 (비율)
  height: number; // 0-1 (비율)
  action: 'next' | 'prev' | 'menu' | 'zoom' | 'custom';
  customAction?: () => void;
  priority: number; // 높을수록 우선순위
}

export interface GestureState {
  type: 'click' | 'drag' | 'swipe' | 'pinch' | 'double-tap' | 'long-press' | 'none';
  startTime: number;
  startPosition: { x: number; y: number };
  currentPosition: { x: number; y: number };
  distance: number;
  velocity: number;
  direction: 'left' | 'right' | 'up' | 'down' | null;
  isActive: boolean;
  touches: number;
  scale?: number; // pinch 제스처용
}

export interface InteractionConfig {
  clickThreshold: number; // ms, 클릭으로 간주할 최대 시간
  dragThreshold: number; // px, 드래그로 간주할 최소 거리
  swipeThreshold: number; // px, 스와이프로 간주할 최소 거리
  swipeVelocityThreshold: number; // px/ms, 스와이프 최소 속도
  doubleTapThreshold: number; // ms, 더블탭 간격
  longPressThreshold: number; // ms, 롱프레스 시간
  pinchThreshold: number; // scale, 핀치 감지 임계값
  debounceDelay: number; // ms, 연속 동작 방지
  zones: InteractionZone[];
}

const DEFAULT_CONFIG: InteractionConfig = {
  clickThreshold: 150,
  dragThreshold: 10,
  swipeThreshold: 50,
  swipeVelocityThreshold: 0.5,
  doubleTapThreshold: 300,
  longPressThreshold: 500,
  pinchThreshold: 0.1,
  debounceDelay: 100,
  zones: [
    // 기본 상호작용 영역
    {
      id: 'prev-zone',
      x: 0,
      y: 0,
      width: 0.15, // 왼쪽 15%
      height: 1,
      action: 'prev',
      priority: 1
    },
    {
      id: 'next-zone',
      x: 0.85,
      y: 0,
      width: 0.15, // 오른쪽 15%
      height: 1,
      action: 'next',
      priority: 1
    },
    {
      id: 'menu-zone',
      x: 0.4,
      y: 0,
      width: 0.2, // 상단 중앙 20%
      height: 0.1,
      action: 'menu',
      priority: 2
    }
  ]
};

interface UseAdvancedInteractionOptions {
  config?: Partial<InteractionConfig>;
  onGesture?: (gesture: GestureState, zone?: InteractionZone) => void;
  onPageChange?: (direction: 'next' | 'prev') => void;
  onMenuToggle?: () => void;
  onZoom?: (scale: number, center: { x: number; y: number }) => void;
  onLongPress?: (position: { x: number; y: number }) => void;
  onDoubleClick?: (position: { x: number; y: number }) => void;
  disabled?: boolean;
}

export const useAdvancedInteraction = ({
  config = {},
  onGesture,
  onPageChange,
  onMenuToggle,
  onZoom,
  onLongPress,
  onDoubleClick,
  disabled = false
}: UseAdvancedInteractionOptions = {}) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  const [gestureState, setGestureState] = useState<GestureState>({
    type: 'none',
    startTime: 0,
    startPosition: { x: 0, y: 0 },
    currentPosition: { x: 0, y: 0 },
    distance: 0,
    velocity: 0,
    direction: null,
    isActive: false,
    touches: 0
  });

  const containerRef = useRef<HTMLElement>(null);
  const longPressTimeoutRef = useRef<NodeJS.Timeout>();
  const doubleTapTimeoutRef = useRef<NodeJS.Timeout>();
  const lastTapTimeRef = useRef<number>(0);
  const lastTapPositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const velocityTrackerRef = useRef<{ x: number; y: number; time: number }[]>([]);
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const initialPinchDistanceRef = useRef<number>(0);

  // 정규화된 좌표 계산
  const getNormalizedPosition = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };

    const rect = containerRef.current.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;

    return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
  }, []);

  // 상호작용 영역 찾기
  const findInteractionZone = useCallback((x: number, y: number): InteractionZone | undefined => {
    const zones = finalConfig.zones
      .filter(zone => 
        x >= zone.x && 
        x <= zone.x + zone.width &&
        y >= zone.y &&
        y <= zone.y + zone.height
      )
      .sort((a, b) => b.priority - a.priority); // 우선순위 높은 것부터

    return zones[0];
  }, [finalConfig.zones]);

  // 터치 거리 계산 (핀치 제스처용)
  const getTouchDistance = useCallback((touches: TouchList): number => {
    if (touches.length < 2) return 0;
    
    const touch1 = touches[0];
    const touch2 = touches[1];
    
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // 속도 계산
  const calculateVelocity = useCallback(() => {
    const tracker = velocityTrackerRef.current;
    if (tracker.length < 2) return 0;

    const recent = tracker.slice(-3); // 최근 3개 포인트 사용
    const timeSpan = recent[recent.length - 1].time - recent[0].time;
    
    if (timeSpan === 0) return 0;

    const dx = recent[recent.length - 1].x - recent[0].x;
    const dy = recent[recent.length - 1].y - recent[0].y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance / timeSpan;
  }, []);

  // 방향 계산
  const getDirection = useCallback((startPos: { x: number; y: number }, endPos: { x: number; y: number }) => {
    const dx = endPos.x - startPos.x;
    const dy = endPos.y - startPos.y;
    
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'right' : 'left';
    } else {
      return dy > 0 ? 'down' : 'up';
    }
  }, []);

  // 제스처 처리
  const processGesture = useCallback((newState: Partial<GestureState>) => {
    setGestureState(prev => {
      const updated = { ...prev, ...newState };
      
      // 제스처 콜백 호출
      if (onGesture) {
        const zone = findInteractionZone(updated.currentPosition.x, updated.currentPosition.y);
        onGesture(updated, zone);
      }

      return updated;
    });
  }, [onGesture, findInteractionZone]);

  // 액션 실행 (디바운스 적용)
  const executeAction = useCallback((action: string, zone?: InteractionZone) => {
    if (disabled) return;

    // 디바운스 처리
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      switch (action) {
        case 'next':
          onPageChange?.('next');
          break;
        case 'prev':
          onPageChange?.('prev');
          break;
        case 'menu':
          onMenuToggle?.();
          break;
        case 'custom':
          zone?.customAction?.();
          break;
      }
    }, finalConfig.debounceDelay);
  }, [disabled, finalConfig.debounceDelay, onPageChange, onMenuToggle]);

  // 마우스 이벤트 핸들러
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (disabled) return;

    event.preventDefault();
    const pos = getNormalizedPosition(event.clientX, event.clientY);
    const now = Date.now();

    // 더블클릭 감지
    const timeSinceLastTap = now - lastTapTimeRef.current;
    const distanceFromLastTap = Math.sqrt(
      Math.pow(pos.x - lastTapPositionRef.current.x, 2) +
      Math.pow(pos.y - lastTapPositionRef.current.y, 2)
    );

    if (timeSinceLastTap < finalConfig.doubleTapThreshold && distanceFromLastTap < 0.05) {
      // 더블클릭 처리
      if (doubleTapTimeoutRef.current) {
        clearTimeout(doubleTapTimeoutRef.current);
      }
      onDoubleClick?.(pos);
      processGesture({ type: 'double-tap' });
      return;
    }

    processGesture({
      type: 'click',
      startTime: now,
      startPosition: pos,
      currentPosition: pos,
      distance: 0,
      velocity: 0,
      direction: null,
      isActive: true,
      touches: 1
    });

    velocityTrackerRef.current = [{ ...pos, time: now }];

    // 롱프레스 타이머 시작
    longPressTimeoutRef.current = setTimeout(() => {
      onLongPress?.(pos);
      processGesture({ type: 'long-press' });
    }, finalConfig.longPressThreshold);

    lastTapTimeRef.current = now;
    lastTapPositionRef.current = pos;
  }, [disabled, getNormalizedPosition, finalConfig.doubleTapThreshold, finalConfig.longPressThreshold, onDoubleClick, onLongPress, processGesture]);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (disabled || !gestureState.isActive) return;

    const pos = getNormalizedPosition(event.clientX, event.clientY);
    const now = Date.now();

    // 속도 추적
    velocityTrackerRef.current.push({ ...pos, time: now });
    if (velocityTrackerRef.current.length > 5) {
      velocityTrackerRef.current.shift();
    }

    const distance = Math.sqrt(
      Math.pow(pos.x - gestureState.startPosition.x, 2) +
      Math.pow(pos.y - gestureState.startPosition.y, 2)
    );

    const velocity = calculateVelocity();
    const direction = getDirection(gestureState.startPosition, pos);

    // 롱프레스 취소 (움직임 감지)
    if (distance > finalConfig.dragThreshold / 1000 && longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
    }

    // 제스처 타입 결정
    let gestureType: GestureState['type'] = 'click';
    if (distance > finalConfig.dragThreshold / 1000) {
      gestureType = 'drag';
    }

    processGesture({
      type: gestureType,
      currentPosition: pos,
      distance,
      velocity,
      direction
    });
  }, [disabled, gestureState.isActive, gestureState.startPosition, getNormalizedPosition, calculateVelocity, getDirection, finalConfig.dragThreshold, processGesture]);

  const handleMouseUp = useCallback((event: React.MouseEvent) => {
    if (disabled || !gestureState.isActive) return;

    const pos = getNormalizedPosition(event.clientX, event.clientY);
    const now = Date.now();
    const duration = now - gestureState.startTime;
    const velocity = calculateVelocity();

    // 롱프레스 타이머 정리
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
    }

    // 제스처 타입 최종 결정
    let finalGestureType: GestureState['type'] = 'click';
    
    if (gestureState.distance > finalConfig.swipeThreshold / 1000 && velocity > finalConfig.swipeVelocityThreshold) {
      finalGestureType = 'swipe';
    } else if (gestureState.distance > finalConfig.dragThreshold / 1000) {
      finalGestureType = 'drag';
    } else if (duration < finalConfig.clickThreshold) {
      finalGestureType = 'click';
    }

    // 액션 실행
    const zone = findInteractionZone(pos.x, pos.y);
    if (zone && (finalGestureType === 'click' || finalGestureType === 'swipe')) {
      if (finalGestureType === 'swipe') {
        // 스와이프 방향에 따른 액션
        if (gestureState.direction === 'left') {
          executeAction('next');
        } else if (gestureState.direction === 'right') {
          executeAction('prev');
        }
      } else {
        executeAction(zone.action, zone);
      }
    }

    processGesture({
      type: finalGestureType,
      currentPosition: pos,
      isActive: false
    });

    velocityTrackerRef.current = [];
  }, [disabled, gestureState, getNormalizedPosition, calculateVelocity, finalConfig, findInteractionZone, executeAction, processGesture]);

  // 터치 이벤트 핸들러
  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    if (disabled) return;

    event.preventDefault();
    const touches = event.touches;
    const touch = touches[0];
    const pos = getNormalizedPosition(touch.clientX, touch.clientY);
    const now = Date.now();

    if (touches.length === 2) {
      // 핀치 제스처 시작
      initialPinchDistanceRef.current = getTouchDistance(touches);
      processGesture({
        type: 'pinch',
        startTime: now,
        startPosition: pos,
        currentPosition: pos,
        isActive: true,
        touches: touches.length,
        scale: 1
      });
    } else {
      // 단일 터치
      processGesture({
        type: 'click',
        startTime: now,
        startPosition: pos,
        currentPosition: pos,
        distance: 0,
        velocity: 0,
        direction: null,
        isActive: true,
        touches: touches.length
      });

      // 롱프레스 타이머 시작
      longPressTimeoutRef.current = setTimeout(() => {
        onLongPress?.(pos);
        processGesture({ type: 'long-press' });
      }, finalConfig.longPressThreshold);
    }

    velocityTrackerRef.current = [{ ...pos, time: now }];
  }, [disabled, getNormalizedPosition, getTouchDistance, onLongPress, finalConfig.longPressThreshold, processGesture]);

  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    if (disabled || !gestureState.isActive) return;

    event.preventDefault();
    const touches = event.touches;
    const touch = touches[0];
    const pos = getNormalizedPosition(touch.clientX, touch.clientY);
    const now = Date.now();

    if (touches.length === 2 && gestureState.type === 'pinch') {
      // 핀치 제스처 처리
      const currentDistance = getTouchDistance(touches);
      const scale = currentDistance / initialPinchDistanceRef.current;
      
      if (Math.abs(scale - 1) > finalConfig.pinchThreshold) {
        onZoom?.(scale, pos);
        processGesture({ scale });
      }
    } else {
      // 일반 터치 이동
      velocityTrackerRef.current.push({ ...pos, time: now });
      if (velocityTrackerRef.current.length > 5) {
        velocityTrackerRef.current.shift();
      }

      const distance = Math.sqrt(
        Math.pow(pos.x - gestureState.startPosition.x, 2) +
        Math.pow(pos.y - gestureState.startPosition.y, 2)
      );

      const velocity = calculateVelocity();
      const direction = getDirection(gestureState.startPosition, pos);

      // 롱프레스 취소
      if (distance > finalConfig.dragThreshold / 1000 && longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
      }

      processGesture({
        type: distance > finalConfig.dragThreshold / 1000 ? 'drag' : 'click',
        currentPosition: pos,
        distance,
        velocity,
        direction
      });
    }
  }, [disabled, gestureState, getNormalizedPosition, getTouchDistance, onZoom, calculateVelocity, getDirection, finalConfig, processGesture]);

  const handleTouchEnd = useCallback((event: React.TouchEvent) => {
    if (disabled || !gestureState.isActive) return;

    const touch = event.changedTouches[0];
    const pos = getNormalizedPosition(touch.clientX, touch.clientY);
    const now = Date.now();
    const duration = now - gestureState.startTime;
    const velocity = calculateVelocity();

    // 롱프레스 타이머 정리
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
    }

    // 제스처 타입 최종 결정 및 액션 실행
    if (gestureState.type !== 'pinch') {
      let finalGestureType: GestureState['type'] = 'click';
      
      if (gestureState.distance > finalConfig.swipeThreshold / 1000 && velocity > finalConfig.swipeVelocityThreshold) {
        finalGestureType = 'swipe';
      } else if (gestureState.distance > finalConfig.dragThreshold / 1000) {
        finalGestureType = 'drag';
      } else if (duration < finalConfig.clickThreshold) {
        finalGestureType = 'click';
      }

      const zone = findInteractionZone(pos.x, pos.y);
      if (zone && (finalGestureType === 'click' || finalGestureType === 'swipe')) {
        if (finalGestureType === 'swipe') {
          if (gestureState.direction === 'left') {
            executeAction('next');
          } else if (gestureState.direction === 'right') {
            executeAction('prev');
          }
        } else {
          executeAction(zone.action, zone);
        }
      }

      processGesture({
        type: finalGestureType,
        currentPosition: pos,
        isActive: false
      });
    } else {
      processGesture({ isActive: false });
    }

    velocityTrackerRef.current = [];
  }, [disabled, gestureState, getNormalizedPosition, calculateVelocity, finalConfig, findInteractionZone, executeAction, processGesture]);

  // 정리
  useEffect(() => {
    return () => {
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
      }
      if (doubleTapTimeoutRef.current) {
        clearTimeout(doubleTapTimeoutRef.current);
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return {
    containerRef,
    gestureState,
    config: finalConfig,
    handlers: {
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
      onDragStart: (e: React.DragEvent) => e.preventDefault()
    },
    // 유틸리티 함수
    addZone: (zone: InteractionZone) => {
      finalConfig.zones.push(zone);
    },
    removeZone: (zoneId: string) => {
      finalConfig.zones = finalConfig.zones.filter(zone => zone.id !== zoneId);
    },
    updateZone: (zoneId: string, updates: Partial<InteractionZone>) => {
      const index = finalConfig.zones.findIndex(zone => zone.id === zoneId);
      if (index !== -1) {
        finalConfig.zones[index] = { ...finalConfig.zones[index], ...updates };
      }
    }
  };
};