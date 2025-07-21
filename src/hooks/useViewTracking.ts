import { useState, useCallback, useRef, useEffect } from 'react';

export interface ViewSession {
  sessionId: string;
  flipbookId: string;
  userId?: string;
  startTime: number;
  endTime?: number;
  pageViews: PageView[];
  metadata: ViewMetadata;
}

export interface PageView {
  pageIndex: number;
  startTime: number;
  endTime?: number;
  duration?: number;
  scrollDepth?: number;
  interactions?: InteractionEvent[];
}

export interface InteractionEvent {
  type: 'click' | 'scroll' | 'zoom' | 'page-turn' | 'audio-toggle';
  timestamp: number;
  pageIndex: number;
  metadata?: Record<string, any>;
}

export interface ViewMetadata {
  userAgent: string;
  screenResolution: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  referrer?: string;
  language: string;
  timezone: string;
  networkSpeed?: string;
}

export interface ViewAnalytics {
  totalViews: number;
  uniqueViews: number;
  averageSessionTime: number;
  averagePageTime: number;
  mostViewedPages: { pageIndex: number; views: number }[];
  deviceBreakdown: Record<string, number>;
  referrerBreakdown: Record<string, number>;
  conversionRate?: number; // 완료율 (끝까지 본 비율)
}

interface UseViewTrackingOptions {
  flipbookId: string;
  totalPages: number;
  userId?: string;
  trackAnonymous?: boolean;
  batchSize?: number; // 배치로 전송할 이벤트 수
  flushInterval?: number; // 자동 전송 간격 (ms)
  enableRealtime?: boolean;
  onViewStart?: (session: ViewSession) => void;
  onViewEnd?: (session: ViewSession) => void;
  onPageView?: (pageView: PageView) => void;
}

export const useViewTracking = ({
  flipbookId,
  totalPages,
  userId,
  trackAnonymous = true,
  batchSize = 10,
  flushInterval = 30000,
  enableRealtime = false,
  onViewStart,
  onViewEnd,
  onPageView
}: UseViewTrackingOptions) => {
  const [currentSession, setCurrentSession] = useState<ViewSession | null>(null);
  const [currentPageView, setCurrentPageView] = useState<PageView | null>(null);
  const [analytics, setAnalytics] = useState<ViewAnalytics | null>(null);

  const eventQueueRef = useRef<any[]>([]);
  const flushTimeoutRef = useRef<NodeJS.Timeout>();
  const pageStartTimeRef = useRef<number>(0);
  const sessionStartTimeRef = useRef<number>(0);
  const isActiveRef = useRef<boolean>(true);

  // 고유 세션 ID 생성
  const generateSessionId = useCallback((): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // 디바이스 메타데이터 수집
  const collectMetadata = useCallback((): ViewMetadata => {
    const screen = window.screen;
    const nav = navigator;
    
    let deviceType: ViewMetadata['deviceType'] = 'desktop';
    if (screen.width <= 768) deviceType = 'mobile';
    else if (screen.width <= 1024) deviceType = 'tablet';

    // 네트워크 속도 감지 (지원되는 경우)
    let networkSpeed: string | undefined;
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      networkSpeed = connection?.effectiveType;
    }

    return {
      userAgent: nav.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      deviceType,
      referrer: document.referrer || undefined,
      language: nav.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      networkSpeed
    };
  }, []);

  // 이벤트 큐에 추가
  const queueEvent = useCallback((event: any) => {
    eventQueueRef.current.push({
      ...event,
      timestamp: Date.now(),
      sessionId: currentSession?.sessionId
    });

    // 배치 크기 도달 시 즉시 전송
    if (eventQueueRef.current.length >= batchSize) {
      flushEvents();
    }
  }, [currentSession?.sessionId, batchSize]);

  // 이벤트 전송
  const flushEvents = useCallback(async () => {
    if (eventQueueRef.current.length === 0) return;

    const events = [...eventQueueRef.current];
    eventQueueRef.current = [];

    try {
      const response = await fetch('/api/analytics/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          flipbookId,
          events,
          timestamp: Date.now()
        })
      });

      if (!response.ok) {
        console.error('이벤트 전송 실패:', response.status);
        // 실패한 이벤트를 다시 큐에 추가 (재시도)
        eventQueueRef.current.unshift(...events);
      }
    } catch (error) {
      console.error('이벤트 전송 오류:', error);
      // 실패한 이벤트를 다시 큐에 추가
      eventQueueRef.current.unshift(...events);
    }
  }, [flipbookId]);

  // 조회 세션 시작
  const startViewSession = useCallback(async () => {
    if (!trackAnonymous && !userId) return;

    const sessionId = generateSessionId();
    const startTime = Date.now();
    sessionStartTimeRef.current = startTime;

    const session: ViewSession = {
      sessionId,
      flipbookId,
      userId,
      startTime,
      pageViews: [],
      metadata: collectMetadata()
    };

    setCurrentSession(session);
    onViewStart?.(session);

    // 조회 시작 이벤트 전송
    queueEvent({
      type: 'session_start',
      sessionId,
      metadata: session.metadata
    });

    // 서버에 조회수 증가 요청
    try {
      await fetch(`/api/flipbooks/${flipbookId}/view`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId,
          userId,
          timestamp: startTime,
          metadata: session.metadata
        })
      });
    } catch (error) {
      console.error('조회수 증가 요청 실패:', error);
    }

    return session;
  }, [flipbookId, userId, trackAnonymous, generateSessionId, collectMetadata, onViewStart, queueEvent]);

  // 조회 세션 종료
  const endViewSession = useCallback(() => {
    if (!currentSession) return;

    const endTime = Date.now();
    const duration = endTime - currentSession.startTime;

    // 현재 페이지 뷰 종료
    if (currentPageView) {
      endPageView();
    }

    const updatedSession: ViewSession = {
      ...currentSession,
      endTime,
    };

    setCurrentSession(null);
    onViewEnd?.(updatedSession);

    // 조회 종료 이벤트 전송
    queueEvent({
      type: 'session_end',
      sessionId: currentSession.sessionId,
      duration,
      totalPages: currentSession.pageViews.length,
      completionRate: currentSession.pageViews.length / totalPages
    });

    // 즉시 전송
    flushEvents();
  }, [currentSession, currentPageView, totalPages, onViewEnd, queueEvent, flushEvents]);

  // 페이지 뷰 시작
  const startPageView = useCallback((pageIndex: number) => {
    if (!currentSession) return;

    // 이전 페이지 뷰 종료
    if (currentPageView) {
      endPageView();
    }

    const startTime = Date.now();
    pageStartTimeRef.current = startTime;

    const pageView: PageView = {
      pageIndex,
      startTime,
      interactions: []
    };

    setCurrentPageView(pageView);
    onPageView?.(pageView);

    // 페이지 뷰 시작 이벤트
    queueEvent({
      type: 'page_view',
      pageIndex,
      timestamp: startTime
    });
  }, [currentSession, currentPageView, onPageView, queueEvent]);

  // 페이지 뷰 종료
  const endPageView = useCallback(() => {
    if (!currentPageView || !currentSession) return;

    const endTime = Date.now();
    const duration = endTime - currentPageView.startTime;

    const completedPageView: PageView = {
      ...currentPageView,
      endTime,
      duration
    };

    // 세션에 페이지 뷰 추가
    setCurrentSession(prev => {
      if (!prev) return null;
      return {
        ...prev,
        pageViews: [...prev.pageViews, completedPageView]
      };
    });

    setCurrentPageView(null);

    // 페이지 뷰 종료 이벤트
    queueEvent({
      type: 'page_end',
      pageIndex: currentPageView.pageIndex,
      duration,
      interactions: currentPageView.interactions?.length || 0
    });
  }, [currentPageView, currentSession, queueEvent]);

  // 상호작용 이벤트 추적
  const trackInteraction = useCallback((
    type: InteractionEvent['type'],
    pageIndex: number,
    metadata?: Record<string, any>
  ) => {
    if (!currentSession || !currentPageView) return;

    const interaction: InteractionEvent = {
      type,
      timestamp: Date.now(),
      pageIndex,
      metadata
    };

    // 현재 페이지 뷰에 상호작용 추가
    setCurrentPageView(prev => {
      if (!prev) return null;
      return {
        ...prev,
        interactions: [...(prev.interactions || []), interaction]
      };
    });

    // 상호작용 이벤트 전송
    queueEvent({
      type: 'interaction',
      interactionType: type,
      pageIndex,
      metadata
    });
  }, [currentSession, currentPageView, queueEvent]);

  // 스크롤 깊이 업데이트
  const updateScrollDepth = useCallback((depth: number) => {
    if (!currentPageView) return;

    setCurrentPageView(prev => {
      if (!prev) return null;
      return {
        ...prev,
        scrollDepth: Math.max(prev.scrollDepth || 0, depth)
      };
    });
  }, [currentPageView]);

  // 분석 데이터 로드
  const loadAnalytics = useCallback(async (): Promise<ViewAnalytics | null> => {
    try {
      const response = await fetch(`/api/flipbooks/${flipbookId}/analytics`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
        return data;
      }
    } catch (error) {
      console.error('분석 데이터 로드 실패:', error);
    }
    return null;
  }, [flipbookId]);

  // 페이지 가시성 변경 감지
  useEffect(() => {
    const handleVisibilityChange = () => {
      isActiveRef.current = !document.hidden;
      
      if (document.hidden) {
        // 페이지가 숨겨질 때 현재 페이지 뷰 일시 정지
        if (currentPageView) {
          trackInteraction('scroll', currentPageView.pageIndex, { 
            action: 'page_hidden' 
          });
        }
      } else {
        // 페이지가 다시 보일 때 재개
        if (currentPageView) {
          trackInteraction('scroll', currentPageView.pageIndex, { 
            action: 'page_visible' 
          });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [currentPageView, trackInteraction]);

  // 주기적 이벤트 전송
  useEffect(() => {
    if (flushInterval > 0) {
      flushTimeoutRef.current = setInterval(flushEvents, flushInterval);
      return () => {
        if (flushTimeoutRef.current) {
          clearInterval(flushTimeoutRef.current);
        }
      };
    }
  }, [flushEvents, flushInterval]);

  // 브라우저 종료 시 정리
  useEffect(() => {
    const handleBeforeUnload = () => {
      endViewSession();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      endViewSession();
    };
  }, [endViewSession]);

  return {
    // 상태
    currentSession,
    currentPageView,
    analytics,
    isTracking: !!currentSession,
    
    // 세션 제어
    startViewSession,
    endViewSession,
    
    // 페이지 추적
    startPageView,
    endPageView,
    updateScrollDepth,
    
    // 상호작용 추적
    trackInteraction,
    trackPageTurn: (fromPage: number, toPage: number) => {
      trackInteraction('page-turn', fromPage, { toPage });
    },
    trackZoom: (zoomLevel: number, pageIndex: number) => {
      trackInteraction('zoom', pageIndex, { zoomLevel });
    },
    trackAudioToggle: (enabled: boolean, pageIndex: number) => {
      trackInteraction('audio-toggle', pageIndex, { enabled });
    },
    
    // 분석 데이터
    loadAnalytics,
    refreshAnalytics: loadAnalytics,
    
    // 유틸리티
    getCurrentSessionDuration: () => {
      return currentSession ? Date.now() - currentSession.startTime : 0;
    },
    getCurrentPageDuration: () => {
      return currentPageView ? Date.now() - currentPageView.startTime : 0;
    },
    getSessionStats: () => ({
      totalPages: currentSession?.pageViews.length || 0,
      totalInteractions: currentSession?.pageViews.reduce(
        (sum, pv) => sum + (pv.interactions?.length || 0), 0
      ) || 0,
      averagePageTime: currentSession?.pageViews.length 
        ? currentSession.pageViews.reduce((sum, pv) => sum + (pv.duration || 0), 0) / currentSession.pageViews.length
        : 0
    }),
    
    // 수동 제어
    flushEvents,
    clearQueue: () => {
      eventQueueRef.current = [];
    }
  };
};