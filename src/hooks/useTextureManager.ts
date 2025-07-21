import { useState, useRef, useCallback, useEffect } from 'react';
import * as THREE from 'three';

interface TextureInfo {
  texture: THREE.Texture;
  url: string;
  loadTime: number;
  size: number;
  isLoaded: boolean;
}

interface UseTextureManagerOptions {
  maxCacheSize?: number; // MB 단위
  preloadCount?: number; // 현재 페이지 기준 앞뒤로 미리 로드할 페이지 수
  compressionLevel?: number; // 0-1, 텍스처 압축 레벨
  onTextureLoad?: (url: string) => void;
  onTextureError?: (url: string, error: Error) => void;
  onCacheUpdate?: (cacheSize: number, cacheCount: number) => void;
}

export const useTextureManager = ({
  maxCacheSize = 100, // 100MB 기본 제한
  preloadCount = 2,
  compressionLevel = 0.8,
  onTextureLoad,
  onTextureError,
  onCacheUpdate
}: UseTextureManagerOptions = {}) => {
  const [isLoading, setIsLoading] = useState<Set<string>>(new Set());
  const [loadedTextures, setLoadedTextures] = useState<Map<string, TextureInfo>>(new Map());
  
  const textureCache = useRef<Map<string, TextureInfo>>(new Map());
  const loadingQueue = useRef<Set<string>>(new Set());
  const loader = useRef(new THREE.TextureLoader());
  const currentCacheSize = useRef(0); // MB 단위

  // 텍스처 메모리 사용량 계산
  const calculateTextureSize = useCallback((texture: THREE.Texture): number => {
    if (!texture.image) return 0;
    
    const { width, height } = texture.image;
    const bytesPerPixel = 4; // RGBA
    const sizeInBytes = width * height * bytesPerPixel;
    return sizeInBytes / (1024 * 1024); // MB로 변환
  }, []);

  // 캐시 정리 (LRU 방식)
  const cleanupCache = useCallback(() => {
    const cache = textureCache.current;
    
    if (currentCacheSize.current <= maxCacheSize) return;

    // 로드 시간 기준으로 정렬하여 오래된 것부터 제거
    const sortedEntries = Array.from(cache.entries())
      .sort(([, a], [, b]) => a.loadTime - b.loadTime);

    while (currentCacheSize.current > maxCacheSize * 0.8 && sortedEntries.length > 0) {
      const [url, textureInfo] = sortedEntries.shift()!;
      
      // 텍스처 메모리 해제
      textureInfo.texture.dispose();
      cache.delete(url);
      currentCacheSize.current -= textureInfo.size;
    }

    setLoadedTextures(new Map(cache));
    onCacheUpdate?.(currentCacheSize.current, cache.size);
  }, [maxCacheSize, onCacheUpdate]);

  // 텍스처 로딩
  const loadTexture = useCallback(async (url: string): Promise<THREE.Texture | null> => {
    // 이미 캐시된 경우
    const cached = textureCache.current.get(url);
    if (cached) {
      cached.loadTime = Date.now(); // LRU 업데이트
      return cached.texture;
    }

    // 이미 로딩 중인 경우
    if (loadingQueue.current.has(url)) {
      return null;
    }

    loadingQueue.current.add(url);
    setIsLoading(prev => new Set(prev).add(url));

    try {
      const texture = await new Promise<THREE.Texture>((resolve, reject) => {
        loader.current.load(
          url,
          resolve,
          undefined,
          reject
        );
      });

      // 텍스처 최적화 설정
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.generateMipmaps = false;

      // 압축 설정 (WebGL 2.0 지원시)
      if (compressionLevel < 1) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (ctx && texture.image) {
          const { width, height } = texture.image;
          const targetWidth = Math.floor(width * compressionLevel);
          const targetHeight = Math.floor(height * compressionLevel);
          
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          ctx.drawImage(texture.image, 0, 0, targetWidth, targetHeight);
          
          texture.image = canvas;
          texture.needsUpdate = true;
        }
      }

      const size = calculateTextureSize(texture);
      const textureInfo: TextureInfo = {
        texture,
        url,
        loadTime: Date.now(),
        size,
        isLoaded: true
      };

      // 캐시에 추가
      textureCache.current.set(url, textureInfo);
      currentCacheSize.current += size;
      
      // 캐시 정리
      cleanupCache();

      setLoadedTextures(new Map(textureCache.current));
      onTextureLoad?.(url);

      return texture;
    } catch (error) {
      console.error('텍스처 로딩 실패:', url, error);
      onTextureError?.(url, error as Error);
      return null;
    } finally {
      loadingQueue.current.delete(url);
      setIsLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(url);
        return newSet;
      });
    }
  }, [calculateTextureSize, cleanupCache, compressionLevel, onTextureLoad, onTextureError]);

  // 페이지별 텍스처 미리 로딩
  const preloadTextures = useCallback(async (urls: string[], currentIndex: number) => {
    const preloadUrls: string[] = [];
    
    // 현재 페이지 우선
    if (urls[currentIndex]) {
      preloadUrls.push(urls[currentIndex]);
    }

    // 앞뒤 페이지들
    for (let i = 1; i <= preloadCount; i++) {
      if (urls[currentIndex + i]) preloadUrls.push(urls[currentIndex + i]);
      if (urls[currentIndex - i]) preloadUrls.push(urls[currentIndex - i]);
    }

    // 병렬 로딩 (동시 로딩 수 제한)
    const concurrent = 3;
    for (let i = 0; i < preloadUrls.length; i += concurrent) {
      const batch = preloadUrls.slice(i, i + concurrent);
      await Promise.allSettled(batch.map(url => loadTexture(url)));
    }
  }, [preloadCount, loadTexture]);

  // 특정 텍스처 가져오기
  const getTexture = useCallback((url: string): THREE.Texture | null => {
    const cached = textureCache.current.get(url);
    if (cached) {
      cached.loadTime = Date.now(); // LRU 업데이트
      return cached.texture;
    }
    return null;
  }, []);

  // 텍스처 강제 로딩 (동기적)
  const loadTextureSync = useCallback((url: string) => {
    if (!loadingQueue.current.has(url) && !textureCache.current.has(url)) {
      loadTexture(url);
    }
  }, [loadTexture]);

  // 캐시 정보
  const getCacheInfo = useCallback(() => ({
    size: currentCacheSize.current,
    count: textureCache.current.size,
    maxSize: maxCacheSize,
    utilizationPercent: (currentCacheSize.current / maxCacheSize) * 100
  }), [maxCacheSize]);

  // 캐시 완전 정리
  const clearCache = useCallback(() => {
    textureCache.current.forEach(({ texture }) => {
      texture.dispose();
    });
    
    textureCache.current.clear();
    currentCacheSize.current = 0;
    setLoadedTextures(new Map());
    setIsLoading(new Set());
    onCacheUpdate?.(0, 0);
  }, [onCacheUpdate]);

  // 성능 모니터링
  const getPerformanceStats = useCallback(() => {
    const cache = textureCache.current;
    const totalSize = currentCacheSize.current;
    const loadedCount = cache.size;
    const loadingCount = loadingQueue.current.size;
    
    return {
      totalSize,
      loadedCount,
      loadingCount,
      averageSize: loadedCount > 0 ? totalSize / loadedCount : 0,
      cacheHitRate: loadedCount / (loadedCount + loadingCount) || 0
    };
  }, []);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      clearCache();
    };
  }, [clearCache]);

  return {
    loadTexture,
    preloadTextures,
    getTexture,
    loadTextureSync,
    clearCache,
    getCacheInfo,
    getPerformanceStats,
    isLoading: isLoading.size > 0,
    loadingUrls: Array.from(isLoading),
    loadedTextures: Array.from(loadedTextures.keys())
  };
};