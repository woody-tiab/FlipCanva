/**
 * Lighthouse 성능 최적화 유틸리티
 * 목표: Performance 85+, Accessibility 90+, Best Practices 85+
 */

interface PerformanceMetrics {
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  tti: number; // Time to Interactive
}

interface OptimizationConfig {
  // Core Web Vitals 목표값 (Fast 3G 기준)
  targets: {
    fcp: number; // ≤ 1.8s
    lcp: number; // ≤ 2.5s
    fid: number; // ≤ 100ms
    cls: number; // ≤ 0.1
    tti: number; // ≤ 3.8s
  };
  
  // 최적화 전략
  strategies: {
    enableImageOptimization: boolean;
    enableResourceHints: boolean;
    enableServiceWorker: boolean;
    enableLazyLoading: boolean;
    enableCodeSplitting: boolean;
  };
}

const DEFAULT_CONFIG: OptimizationConfig = {
  targets: {
    fcp: 1800, // 1.8초
    lcp: 2500, // 2.5초
    fid: 100,  // 100ms
    cls: 0.1,  // 0.1
    tti: 3800  // 3.8초
  },
  strategies: {
    enableImageOptimization: true,
    enableResourceHints: true,
    enableServiceWorker: true,
    enableLazyLoading: true,
    enableCodeSplitting: true
  }
};

class PerformanceOptimizer {
  private config: OptimizationConfig;
  private metrics: Partial<PerformanceMetrics> = {};
  private observer?: PerformanceObserver;

  constructor(config: Partial<OptimizationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeMonitoring();
  }

  // 성능 모니터링 초기화
  private initializeMonitoring() {
    if ('PerformanceObserver' in window) {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.processPerformanceEntry(entry);
        }
      });

      // Core Web Vitals 모니터링
      try {
        this.observer.observe({ entryTypes: ['navigation', 'paint', 'largest-contentful-paint', 'first-input', 'layout-shift'] });
      } catch (error) {
        console.warn('PerformanceObserver 초기화 실패:', error);
      }
    }

    // Web Vitals 라이브러리가 있다면 사용
    if (typeof window !== 'undefined') {
      this.measureWebVitals();
    }
  }

  // 성능 엔트리 처리
  private processPerformanceEntry(entry: PerformanceEntry) {
    switch (entry.entryType) {
      case 'paint':
        if (entry.name === 'first-contentful-paint') {
          this.metrics.fcp = entry.startTime;
        }
        break;
      case 'largest-contentful-paint':
        this.metrics.lcp = entry.startTime;
        break;
      case 'first-input':
        this.metrics.fid = (entry as any).processingStart - entry.startTime;
        break;
      case 'layout-shift':
        if (!(entry as any).hadRecentInput) {
          this.metrics.cls = (this.metrics.cls || 0) + (entry as any).value;
        }
        break;
    }
  }

  // Web Vitals 측정
  private measureWebVitals() {
    // FCP 측정
    const paintEntries = performance.getEntriesByType('paint');
    const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    if (fcpEntry) {
      this.metrics.fcp = fcpEntry.startTime;
    }

    // TTI 추정 (간단한 계산)
    window.addEventListener('load', () => {
      setTimeout(() => {
        this.metrics.tti = performance.now();
      }, 0);
    });
  }

  // 이미지 최적화
  optimizeImage(
    src: string, 
    options: {
      width?: number;
      height?: number;
      quality?: number;
      format?: 'webp' | 'avif' | 'jpg' | 'png';
    } = {}
  ): string {
    if (!this.config.strategies.enableImageOptimization) {
      return src;
    }

    const { width, height, quality = 0.8, format = 'webp' } = options;
    
    // URL 파라미터로 최적화 요청 (실제 구현에서는 이미지 서버나 CDN 사용)
    const url = new URL(src, window.location.origin);
    
    if (width) url.searchParams.set('w', width.toString());
    if (height) url.searchParams.set('h', height.toString());
    url.searchParams.set('q', Math.round(quality * 100).toString());
    url.searchParams.set('f', format);
    
    return url.toString();
  }

  // 리소스 힌트 추가
  addResourceHints() {
    if (!this.config.strategies.enableResourceHints) return;

    const head = document.head;

    // DNS 프리페치
    const dnsPrefetchDomains = [
      '//fonts.googleapis.com',
      '//fonts.gstatic.com',
      '//cdn.jsdelivr.net'
    ];

    dnsPrefetchDomains.forEach(domain => {
      if (!head.querySelector(`link[rel="dns-prefetch"][href="${domain}"]`)) {
        const link = document.createElement('link');
        link.rel = 'dns-prefetch';
        link.href = domain;
        head.appendChild(link);
      }
    });

    // 프리커넥트 (중요한 리소스)
    const preconnectDomains = [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com'
    ];

    preconnectDomains.forEach(domain => {
      if (!head.querySelector(`link[rel="preconnect"][href="${domain}"]`)) {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = domain;
        link.crossOrigin = 'anonymous';
        head.appendChild(link);
      }
    });
  }

  // 크리티컬 리소스 프리로드
  preloadCriticalResources(resources: { href: string; as: string; type?: string }[]) {
    if (!this.config.strategies.enableResourceHints) return;

    const head = document.head;

    resources.forEach(resource => {
      if (!head.querySelector(`link[rel="preload"][href="${resource.href}"]`)) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = resource.href;
        link.as = resource.as;
        if (resource.type) link.type = resource.type;
        head.appendChild(link);
      }
    });
  }

  // 지연 로딩 설정
  setupLazyLoading() {
    if (!this.config.strategies.enableLazyLoading) return;

    // Intersection Observer를 사용한 이미지 지연 로딩
    const imageObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const src = img.dataset.src;
            
            if (src) {
              img.src = src;
              img.removeAttribute('data-src');
              observer.unobserve(img);
            }
          }
        });
      },
      {
        rootMargin: '50px 0px', // 50px 전에 미리 로드
        threshold: 0.01
      }
    );

    // 페이지의 모든 data-src 이미지 관찰
    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });

    return imageObserver;
  }

  // 레이아웃 시프트 방지
  preventLayoutShift() {
    // 이미지에 aspect-ratio 설정
    const images = document.querySelectorAll('img:not([style*="aspect-ratio"])');
    images.forEach(img => {
      const htmlImg = img as HTMLImageElement;
      if (htmlImg.naturalWidth && htmlImg.naturalHeight) {
        const aspectRatio = htmlImg.naturalWidth / htmlImg.naturalHeight;
        htmlImg.style.aspectRatio = aspectRatio.toString();
      }
    });

    // 동적 콘텐츠 컨테이너에 최소 높이 설정
    const dynamicContainers = document.querySelectorAll('[data-dynamic-content]');
    dynamicContainers.forEach(container => {
      const htmlContainer = container as HTMLElement;
      if (!htmlContainer.style.minHeight) {
        htmlContainer.style.minHeight = '100px'; // 기본 최소 높이
      }
    });
  }

  // 중요하지 않은 JavaScript 지연 로딩
  deferNonCriticalJS() {
    // 분석 스크립트 등 중요하지 않은 스크립트 지연 로딩
    const nonCriticalScripts = [
      'analytics',
      'tracking',
      'chat',
      'social'
    ];

    nonCriticalScripts.forEach(scriptType => {
      const scripts = document.querySelectorAll(`script[data-type="${scriptType}"]`);
      scripts.forEach(script => {
        const htmlScript = script as HTMLScriptElement;
        if (!htmlScript.defer && !htmlScript.async) {
          htmlScript.defer = true;
        }
      });
    });
  }

  // 폰트 최적화
  optimizeFonts() {
    // font-display: swap 설정
    const style = document.createElement('style');
    style.textContent = `
      @font-face {
        font-family: 'SystemFont';
        font-display: swap;
      }
    `;
    document.head.appendChild(style);

    // 웹폰트 프리로드
    this.preloadCriticalResources([
      {
        href: 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap',
        as: 'style',
        type: 'text/css'
      }
    ]);
  }

  // 서비스 워커 등록
  async registerServiceWorker() {
    if (!this.config.strategies.enableServiceWorker || !('serviceWorker' in navigator)) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('서비스 워커 등록 성공:', registration);
      return true;
    } catch (error) {
      console.warn('서비스 워커 등록 실패:', error);
      return false;
    }
  }

  // 현재 성능 메트릭 가져오기
  getMetrics(): Partial<PerformanceMetrics> {
    return { ...this.metrics };
  }

  // 성능 점수 계산 (Lighthouse 기준)
  calculatePerformanceScore(): number {
    const { fcp, lcp, fid, cls, tti } = this.metrics;
    
    if (!fcp || !lcp || !tti) return 0;

    let score = 0;
    
    // FCP 점수 (25% 가중치)
    if (fcp <= 1800) score += 25;
    else if (fcp <= 3000) score += 15;
    else if (fcp <= 4200) score += 5;
    
    // LCP 점수 (25% 가중치)
    if (lcp <= 2500) score += 25;
    else if (lcp <= 4000) score += 15;
    else if (lcp <= 5000) score += 5;
    
    // FID 점수 (25% 가중치)
    if (fid !== undefined) {
      if (fid <= 100) score += 25;
      else if (fid <= 300) score += 15;
      else if (fid <= 500) score += 5;
    } else {
      score += 20; // FID 측정 안됨, 기본 점수
    }
    
    // CLS 점수 (15% 가중치)
    if (cls !== undefined) {
      if (cls <= 0.1) score += 15;
      else if (cls <= 0.25) score += 10;
      else if (cls <= 0.5) score += 5;
    } else {
      score += 12; // CLS 측정 안됨, 기본 점수
    }
    
    // TTI 점수 (10% 가중치)
    if (tti <= 3800) score += 10;
    else if (tti <= 7300) score += 6;
    else if (tti <= 10000) score += 3;

    return Math.round(score);
  }

  // 성능 개선 제안
  getOptimizationSuggestions(): string[] {
    const suggestions: string[] = [];
    const { fcp, lcp, fid, cls, tti } = this.metrics;

    if (fcp && fcp > this.config.targets.fcp) {
      suggestions.push('First Contentful Paint 개선: 중요 CSS 인라인화, 폰트 최적화');
    }

    if (lcp && lcp > this.config.targets.lcp) {
      suggestions.push('Largest Contentful Paint 개선: 이미지 최적화, 서버 응답 시간 단축');
    }

    if (fid && fid > this.config.targets.fid) {
      suggestions.push('First Input Delay 개선: JavaScript 실행 시간 단축, 코드 분할');
    }

    if (cls && cls > this.config.targets.cls) {
      suggestions.push('Cumulative Layout Shift 개선: 이미지/영상 크기 명시, 폰트 로딩 최적화');
    }

    if (tti && tti > this.config.targets.tti) {
      suggestions.push('Time to Interactive 개선: 불필요한 JavaScript 제거, 리소스 우선순위 조정');
    }

    return suggestions;
  }

  // 전체 최적화 실행
  async optimizeAll() {
    const results = {
      resourceHints: false,
      lazyLoading: false,
      layoutShift: false,
      fonts: false,
      serviceWorker: false,
      nonCriticalJS: false
    };

    try {
      // 리소스 힌트 추가
      this.addResourceHints();
      results.resourceHints = true;

      // 지연 로딩 설정
      this.setupLazyLoading();
      results.lazyLoading = true;

      // 레이아웃 시프트 방지
      this.preventLayoutShift();
      results.layoutShift = true;

      // 폰트 최적화
      this.optimizeFonts();
      results.fonts = true;

      // 중요하지 않은 JS 지연
      this.deferNonCriticalJS();
      results.nonCriticalJS = true;

      // 서비스 워커 등록
      results.serviceWorker = await this.registerServiceWorker();

    } catch (error) {
      console.error('성능 최적화 중 오류:', error);
    }

    return results;
  }

  // 정리
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

// 싱글톤 인스턴스
let optimizerInstance: PerformanceOptimizer | null = null;

export const getPerformanceOptimizer = (config?: Partial<OptimizationConfig>): PerformanceOptimizer => {
  if (!optimizerInstance) {
    optimizerInstance = new PerformanceOptimizer(config);
  }
  return optimizerInstance;
};

export default PerformanceOptimizer;