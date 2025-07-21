import { useCallback, useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

export interface TouchInteraction {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  deltaX: number;
  deltaY: number;
  isActive: boolean;
  timestamp: number;
}

export interface DragInteraction {
  isDragging: boolean;
  dragDistance: number;
  dragDirection: 'left' | 'right' | 'up' | 'down' | null;
  velocity: number;
}

interface UseFlipbookInteractionOptions {
  onPageChange: (direction: 'next' | 'prev') => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onTap?: (position: { x: number; y: number }) => void;
  dragThreshold?: number;
  swipeThreshold?: number;
  tapTimeout?: number;
}

export const useFlipbookInteraction = ({
  onPageChange,
  onDragStart,
  onDragEnd,
  onTap,
  dragThreshold = 50,
  swipeThreshold = 100,
  tapTimeout = 200
}: UseFlipbookInteractionOptions) => {
  const [touchState, setTouchState] = useState<TouchInteraction>({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    deltaX: 0,
    deltaY: 0,
    isActive: false,
    timestamp: 0
  });

  const [dragState, setDragState] = useState<DragInteraction>({
    isDragging: false,
    dragDistance: 0,
    dragDirection: null,
    velocity: 0
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const tapTimeoutRef = useRef<NodeJS.Timeout>();
  const lastTouchTimeRef = useRef<number>(0);
  const velocityTrackerRef = useRef<{ x: number; time: number }[]>([]);

  // 터치/마우스 위치를 정규화된 좌표로 변환
  const getNormalizedPosition = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };

    const rect = containerRef.current.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;

    return { x: x * 2 - 1, y: -(y * 2 - 1) }; // -1 to 1 범위로 정규화
  }, []);

  // 속도 계산
  const calculateVelocity = useCallback(() => {
    const tracker = velocityTrackerRef.current;
    if (tracker.length < 2) return 0;

    const recent = tracker.slice(-5); // 최근 5개 포인트 사용
    const timeSpan = recent[recent.length - 1].time - recent[0].time;
    const distanceSpan = recent[recent.length - 1].x - recent[0].x;

    return timeSpan > 0 ? Math.abs(distanceSpan / timeSpan) : 0;
  }, []);

  // 드래그 방향 계산
  const getDragDirection = useCallback((deltaX: number, deltaY: number) => {
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX > absY) {
      return deltaX > 0 ? 'right' : 'left';
    } else {
      return deltaY > 0 ? 'up' : 'down';
    }
  }, []);

  // 마우스 이벤트 핸들러
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    const pos = getNormalizedPosition(event.clientX, event.clientY);
    const timestamp = Date.now();

    setTouchState({
      startX: pos.x,
      startY: pos.y,
      currentX: pos.x,
      currentY: pos.y,
      deltaX: 0,
      deltaY: 0,
      isActive: true,
      timestamp
    });

    velocityTrackerRef.current = [{ x: pos.x, time: timestamp }];
    onDragStart?.();
  }, [getNormalizedPosition, onDragStart]);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!touchState.isActive) return;

    const pos = getNormalizedPosition(event.clientX, event.clientY);
    const deltaX = pos.x - touchState.startX;
    const deltaY = pos.y - touchState.startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const timestamp = Date.now();

    // 속도 추적
    velocityTrackerRef.current.push({ x: pos.x, time: timestamp });
    if (velocityTrackerRef.current.length > 10) {
      velocityTrackerRef.current.shift();
    }

    setTouchState(prev => ({
      ...prev,
      currentX: pos.x,
      currentY: pos.y,
      deltaX,
      deltaY
    }));

    // 드래그 상태 업데이트
    if (distance > dragThreshold / 1000) { // 정규화된 좌표에서는 작은 값 사용
      setDragState({
        isDragging: true,
        dragDistance: distance,
        dragDirection: getDragDirection(deltaX, deltaY),
        velocity: calculateVelocity()
      });
    }
  }, [touchState, dragThreshold, getNormalizedPosition, getDragDirection, calculateVelocity]);

  const handleMouseUp = useCallback((event: React.MouseEvent) => {
    if (!touchState.isActive) return;

    const pos = getNormalizedPosition(event.clientX, event.clientY);
    const deltaX = pos.x - touchState.startX;
    const deltaY = pos.y - touchState.startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const duration = Date.now() - touchState.timestamp;
    const velocity = calculateVelocity();

    // 스와이프 감지
    const isSwipe = velocity > 0.5 && distance > swipeThreshold / 1000;
    const isTap = distance < dragThreshold / 1000 && duration < tapTimeout;

    if (isSwipe || (dragState.isDragging && distance > swipeThreshold / 1000)) {
      // 페이지 변경
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        onPageChange(deltaX > 0 ? 'prev' : 'next');
      }
    } else if (isTap) {
      // 탭 처리
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
      }

      tapTimeoutRef.current = setTimeout(() => {
        const tapPos = getNormalizedPosition(event.clientX, event.clientY);
        
        // 화면 영역에 따른 페이지 변경
        if (tapPos.x < -0.3) {
          onPageChange('prev');
        } else if (tapPos.x > 0.3) {
          onPageChange('next');
        }

        onTap?.(tapPos);
      }, 50);
    }

    // 상태 초기화
    setTouchState(prev => ({ ...prev, isActive: false }));
    setDragState({
      isDragging: false,
      dragDistance: 0,
      dragDirection: null,
      velocity: 0
    });

    velocityTrackerRef.current = [];
    onDragEnd?.();
  }, [touchState, dragState, dragThreshold, swipeThreshold, tapTimeout, getNormalizedPosition, calculateVelocity, onPageChange, onTap, onDragEnd]);

  // 터치 이벤트 핸들러
  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    event.preventDefault();
    const touch = event.touches[0];
    const pos = getNormalizedPosition(touch.clientX, touch.clientY);
    const timestamp = Date.now();

    setTouchState({
      startX: pos.x,
      startY: pos.y,
      currentX: pos.x,
      currentY: pos.y,
      deltaX: 0,
      deltaY: 0,
      isActive: true,
      timestamp
    });

    velocityTrackerRef.current = [{ x: pos.x, time: timestamp }];
    onDragStart?.();
  }, [getNormalizedPosition, onDragStart]);

  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    if (!touchState.isActive) return;

    event.preventDefault();
    const touch = event.touches[0];
    const pos = getNormalizedPosition(touch.clientX, touch.clientY);
    const deltaX = pos.x - touchState.startX;
    const deltaY = pos.y - touchState.startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const timestamp = Date.now();

    velocityTrackerRef.current.push({ x: pos.x, time: timestamp });
    if (velocityTrackerRef.current.length > 10) {
      velocityTrackerRef.current.shift();
    }

    setTouchState(prev => ({
      ...prev,
      currentX: pos.x,
      currentY: pos.y,
      deltaX,
      deltaY
    }));

    if (distance > dragThreshold / 1000) {
      setDragState({
        isDragging: true,
        dragDistance: distance,
        dragDirection: getDragDirection(deltaX, deltaY),
        velocity: calculateVelocity()
      });
    }
  }, [touchState, dragThreshold, getNormalizedPosition, getDragDirection, calculateVelocity]);

  const handleTouchEnd = useCallback((event: React.TouchEvent) => {
    if (!touchState.isActive) return;

    const touch = event.changedTouches[0];
    const pos = getNormalizedPosition(touch.clientX, touch.clientY);
    const deltaX = pos.x - touchState.startX;
    const deltaY = pos.y - touchState.startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const duration = Date.now() - touchState.timestamp;
    const velocity = calculateVelocity();

    const isSwipe = velocity > 0.5 && distance > swipeThreshold / 1000;
    const isTap = distance < dragThreshold / 1000 && duration < tapTimeout;

    if (isSwipe || (dragState.isDragging && distance > swipeThreshold / 1000)) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        onPageChange(deltaX > 0 ? 'prev' : 'next');
      }
    } else if (isTap) {
      const tapPos = getNormalizedPosition(touch.clientX, touch.clientY);
      
      if (tapPos.x < -0.3) {
        onPageChange('prev');
      } else if (tapPos.x > 0.3) {
        onPageChange('next');
      }

      onTap?.(tapPos);
    }

    setTouchState(prev => ({ ...prev, isActive: false }));
    setDragState({
      isDragging: false,
      dragDistance: 0,
      dragDirection: null,
      velocity: 0
    });

    velocityTrackerRef.current = [];
    onDragEnd?.();
  }, [touchState, dragState, dragThreshold, swipeThreshold, tapTimeout, getNormalizedPosition, calculateVelocity, onPageChange, onTap, onDragEnd]);

  // 정리
  useEffect(() => {
    return () => {
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
      }
    };
  }, []);

  return {
    containerRef,
    touchState,
    dragState,
    handlers: {
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(), // 우클릭 메뉴 방지
    }
  };
};