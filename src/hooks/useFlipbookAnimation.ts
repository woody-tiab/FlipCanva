import { useState, useRef, useCallback, useEffect } from 'react';
import { PageTransitionType } from '../types/flipbook';

export interface FlipbookAnimationState {
  currentPage: number;
  isAnimating: boolean;
  flipProgress: number;
  direction: 'next' | 'prev' | null;
  transitionType: PageTransitionType;
}

export interface FlipbookAnimationControls {
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  setTransitionType: (type: PageTransitionType) => void;
  setAnimationSpeed: (speed: number) => void;
}

interface UseFlipbookAnimationOptions {
  totalPages: number;
  initialPage?: number;
  defaultTransition?: PageTransitionType;
  animationDuration?: number;
  onPageChange?: (page: number) => void;
  onAnimationStart?: () => void;
  onAnimationEnd?: () => void;
}

export const useFlipbookAnimation = ({
  totalPages,
  initialPage = 0,
  defaultTransition = PageTransitionType.FLIP,
  animationDuration = 800,
  onPageChange,
  onAnimationStart,
  onAnimationEnd
}: UseFlipbookAnimationOptions) => {
  const [state, setState] = useState<FlipbookAnimationState>({
    currentPage: initialPage,
    isAnimating: false,
    flipProgress: 0,
    direction: null,
    transitionType: defaultTransition
  });

  const [animSpeed, setAnimSpeed] = useState(animationDuration);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // 애니메이션 정리
  const cleanupAnimation = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  // 이징 함수들
  const easingFunctions = {
    'ease-in-out': (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
    'ease-out': (t: number) => 1 - Math.pow(1 - t, 3),
    'ease-in': (t: number) => t * t * t,
    'bounce': (t: number) => {
      const n1 = 7.5625;
      const d1 = 2.75;
      if (t < 1 / d1) {
        return n1 * t * t;
      } else if (t < 2 / d1) {
        return n1 * (t -= 1.5 / d1) * t + 0.75;
      } else if (t < 2.5 / d1) {
        return n1 * (t -= 2.25 / d1) * t + 0.9375;
      } else {
        return n1 * (t -= 2.625 / d1) * t + 0.984375;
      }
    }
  };

  // 페이지 전환 애니메이션 실행
  const startPageTransition = useCallback((targetPage: number, direction: 'next' | 'prev') => {
    if (state.isAnimating || targetPage < 0 || targetPage >= totalPages || targetPage === state.currentPage) {
      return;
    }

    cleanupAnimation();

    setState(prev => ({
      ...prev,
      isAnimating: true,
      direction,
      flipProgress: 0
    }));

    onAnimationStart?.();
    startTimeRef.current = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(elapsed / animSpeed, 1);
      
      // 전환 타입에 따른 이징 함수 선택
      let easedProgress: number;
      switch (state.transitionType) {
        case PageTransitionType.FLIP:
        case PageTransitionType.CURL:
          easedProgress = easingFunctions['ease-in-out'](progress);
          break;
        case PageTransitionType.SLIDE:
          easedProgress = easingFunctions['ease-out'](progress);
          break;
        case PageTransitionType.FADE:
          easedProgress = easingFunctions['ease-in'](progress);
          break;
        case PageTransitionType.ZOOM:
          easedProgress = easingFunctions['bounce'](progress);
          break;
        default:
          easedProgress = progress;
      }

      setState(prev => ({
        ...prev,
        flipProgress: easedProgress
      }));

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // 애니메이션 완료
        setState(prev => ({
          ...prev,
          currentPage: targetPage,
          isAnimating: false,
          flipProgress: 0,
          direction: null
        }));

        onPageChange?.(targetPage);
        onAnimationEnd?.();
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [state.isAnimating, state.currentPage, state.transitionType, totalPages, animSpeed, cleanupAnimation, onAnimationStart, onPageChange, onAnimationEnd]);

  // 컨트롤 함수들
  const controls: FlipbookAnimationControls = {
    goToPage: useCallback((page: number) => {
      if (page === state.currentPage) return;
      const direction = page > state.currentPage ? 'next' : 'prev';
      startPageTransition(page, direction);
    }, [state.currentPage, startPageTransition]),

    nextPage: useCallback(() => {
      const nextPage = Math.min(state.currentPage + 1, totalPages - 1);
      startPageTransition(nextPage, 'next');
    }, [state.currentPage, totalPages, startPageTransition]),

    prevPage: useCallback(() => {
      const prevPage = Math.max(state.currentPage - 1, 0);
      startPageTransition(prevPage, 'prev');
    }, [state.currentPage, startPageTransition]),

    setTransitionType: useCallback((type: PageTransitionType) => {
      setState(prev => ({ ...prev, transitionType: type }));
    }, []),

    setAnimationSpeed: useCallback((speed: number) => {
      setAnimSpeed(Math.max(100, Math.min(2000, speed))); // 100ms ~ 2000ms 제한
    }, [])
  };

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return cleanupAnimation;
  }, [cleanupAnimation]);

  // 키보드 컨트롤 (선택적)
  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (state.isAnimating) return;

      switch (event.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault();
          controls.prevPage();
          break;
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
          event.preventDefault();
          controls.nextPage();
          break;
        case 'Home':
          event.preventDefault();
          controls.goToPage(0);
          break;
        case 'End':
          event.preventDefault();
          controls.goToPage(totalPages - 1);
          break;
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [state.isAnimating, controls, totalPages]);

  return {
    state,
    controls
  };
};