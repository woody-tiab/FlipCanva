import { useCallback, useRef, useEffect } from 'react';
import { useFlipbookAudio } from './useFlipbookAudio';
import { PageTransitionType } from '../types/flipbook';

interface SoundConfig {
  volume: number;
  delay: number; // ms
  playbackRate?: number; // 재생 속도
}

interface FlipbookSoundAssets {
  // 페이지 넘김 사운드 (전환 타입별)
  pageFlip: {
    normal: string;
    soft: string;
    paper: string;
    digital: string;
  };
  
  // UI 인터랙션 사운드
  ui: {
    buttonClick: string;
    menuOpen: string;
    menuClose: string;
    success: string;
    error: string;
    warning: string;
  };
  
  // 책 관련 사운드
  book: {
    open: string;
    close: string;
    thud: string; // 책이 떨어지는 소리
  };
  
  // 환경음 (배경음)
  ambient?: {
    library: string;
    nature: string;
    cafe: string;
  };
}

const DEFAULT_SOUND_ASSETS: FlipbookSoundAssets = {
  pageFlip: {
    normal: '/sounds/page-flip.mp3',
    soft: '/sounds/page-flip-soft.mp3',
    paper: '/sounds/page-flip-paper.mp3',
    digital: '/sounds/page-flip-digital.mp3'
  },
  ui: {
    buttonClick: '/sounds/button-click.mp3',
    menuOpen: '/sounds/menu-open.mp3',
    menuClose: '/sounds/menu-close.mp3',
    success: '/sounds/success.mp3',
    error: '/sounds/error.mp3',
    warning: '/sounds/warning.mp3'
  },
  book: {
    open: '/sounds/book-open.mp3',
    close: '/sounds/book-close.mp3',
    thud: '/sounds/book-thud.mp3'
  },
  ambient: {
    library: '/sounds/ambient-library.mp3',
    nature: '/sounds/ambient-nature.mp3',
    cafe: '/sounds/ambient-cafe.mp3'
  }
};

const DEFAULT_SOUND_CONFIGS: Record<string, SoundConfig> = {
  // 페이지 넘김 - 애니메이션 시작 시점에서 재생
  pageFlipNormal: { volume: 0.6, delay: 0 },
  pageFlipSoft: { volume: 0.4, delay: 0 },
  pageFlipPaper: { volume: 0.7, delay: 50 }, // 살짝 늦게 재생 (종이 질감)
  pageFlipDigital: { volume: 0.5, delay: 0, playbackRate: 1.2 },
  
  // UI 사운드 - 즉시 재생
  buttonClick: { volume: 0.3, delay: 0 },
  menuOpen: { volume: 0.4, delay: 0 },
  menuClose: { volume: 0.4, delay: 0 },
  success: { volume: 0.5, delay: 0 },
  error: { volume: 0.6, delay: 0 },
  warning: { volume: 0.5, delay: 0 },
  
  // 책 사운드
  bookOpen: { volume: 0.5, delay: 0 },
  bookClose: { volume: 0.5, delay: 200 }, // 닫는 애니메이션 중간에
  bookThud: { volume: 0.7, delay: 0 },
  
  // 환경음 - 배경음악
  ambientLibrary: { volume: 0.2, delay: 0 },
  ambientNature: { volume: 0.2, delay: 0 },
  ambientCafe: { volume: 0.2, delay: 0 }
};

interface UseFlipbookSoundsOptions {
  assets?: Partial<FlipbookSoundAssets>;
  configs?: Record<string, Partial<SoundConfig>>;
  onSoundPlay?: (soundId: string) => void;
  onSoundError?: (soundId: string, error: Error) => void;
}

export const useFlipbookSounds = ({
  assets = {},
  configs = {},
  onSoundPlay,
  onSoundError
}: UseFlipbookSoundsOptions = {}) => {
  const {
    playSoundEffect,
    playBackgroundMusic,
    stopBackgroundMusic,
    settings,
    isAudioEnabled
  } = useFlipbookAudio();

  const finalAssets = {
    ...DEFAULT_SOUND_ASSETS,
    ...assets,
    pageFlip: { ...DEFAULT_SOUND_ASSETS.pageFlip, ...assets.pageFlip },
    ui: { ...DEFAULT_SOUND_ASSETS.ui, ...assets.ui },
    book: { ...DEFAULT_SOUND_ASSETS.book, ...assets.book },
    ambient: { ...DEFAULT_SOUND_ASSETS.ambient, ...assets.ambient }
  };

  const finalConfigs = { ...DEFAULT_SOUND_CONFIGS, ...configs };
  const activeTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // 사운드 재생 헬퍼
  const playSound = useCallback(async (
    soundId: string,
    url: string,
    config: SoundConfig
  ) => {
    if (!isAudioEnabled || !settings.enableSoundEffects) {
      return;
    }

    try {
      // 기존 동일한 사운드 타임아웃 정리
      const existingTimeout = activeTimeoutsRef.current.get(soundId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      const playAudio = () => {
        playSoundEffect(url, {
          volume: config.volume,
          loop: false
        });
        onSoundPlay?.(soundId);
      };

      if (config.delay > 0) {
        const timeout = setTimeout(playAudio, config.delay);
        activeTimeoutsRef.current.set(soundId, timeout);
      } else {
        playAudio();
      }
    } catch (error) {
      console.error('사운드 재생 실패:', soundId, error);
      onSoundError?.(soundId, error as Error);
    }
  }, [isAudioEnabled, settings.enableSoundEffects, playSoundEffect, onSoundPlay, onSoundError]);

  // 페이지 넘김 사운드 (전환 타입과 타이밍에 따라)
  const playPageFlipSound = useCallback((
    transitionType: PageTransitionType = PageTransitionType.FLIP,
    animationProgress?: number // 0-1, 애니메이션 진행률
  ) => {
    let soundType: keyof typeof finalAssets.pageFlip;
    let configKey: string;

    switch (transitionType) {
      case PageTransitionType.FLIP:
        soundType = 'normal';
        configKey = 'pageFlipNormal';
        break;
      case PageTransitionType.CURL:
        soundType = 'paper';
        configKey = 'pageFlipPaper';
        break;
      case PageTransitionType.FADE:
      case PageTransitionType.ZOOM:
        soundType = 'digital';
        configKey = 'pageFlipDigital';
        break;
      case PageTransitionType.SLIDE:
        soundType = 'soft';
        configKey = 'pageFlipSoft';
        break;
      default:
        soundType = 'normal';
        configKey = 'pageFlipNormal';
    }

    // 애니메이션 진행률에 따른 재생 시점 조정
    let adjustedConfig = { ...finalConfigs[configKey] };
    
    if (animationProgress !== undefined) {
      // 플립/컬 애니메이션의 경우 50% 지점에서 재생
      if (transitionType === PageTransitionType.FLIP || transitionType === PageTransitionType.CURL) {
        if (animationProgress < 0.4) {
          adjustedConfig.delay = Math.max(0, (0.5 - animationProgress) * 800); // 800ms 애니메이션 가정
        }
      }
      // 페이드/줌의 경우 즉시 재생
      else if (transitionType === PageTransitionType.FADE || transitionType === PageTransitionType.ZOOM) {
        adjustedConfig.delay = 0;
      }
    }

    playSound(`pageFlip_${soundType}`, finalAssets.pageFlip[soundType], adjustedConfig);
  }, [finalAssets.pageFlip, finalConfigs, playSound]);

  // UI 사운드
  const playUISound = useCallback((soundType: keyof typeof finalAssets.ui) => {
    const config = finalConfigs[soundType] || finalConfigs.buttonClick;
    playSound(`ui_${soundType}`, finalAssets.ui[soundType], config);
  }, [finalAssets.ui, finalConfigs, playSound]);

  // 책 관련 사운드
  const playBookSound = useCallback((soundType: keyof typeof finalAssets.book) => {
    const configKey = soundType === 'open' ? 'bookOpen' : 
                     soundType === 'close' ? 'bookClose' : 'bookThud';
    const config = finalConfigs[configKey];
    playSound(`book_${soundType}`, finalAssets.book[soundType], config);
  }, [finalAssets.book, finalConfigs, playSound]);

  // 환경음 재생/중지
  const playAmbientSound = useCallback((soundType: keyof NonNullable<typeof finalAssets.ambient>) => {
    if (!finalAssets.ambient || !settings.enableBackgroundMusic) return;
    
    const url = finalAssets.ambient[soundType];
    playBackgroundMusic(url, true);
  }, [finalAssets.ambient, settings.enableBackgroundMusic, playBackgroundMusic]);

  const stopAmbientSound = useCallback(() => {
    stopBackgroundMusic();
  }, [stopBackgroundMusic]);

  // 사운드 프리셋 (일반적인 플립북 시나리오)
  const soundPresets = {
    // 플립북 열기
    openFlipbook: () => {
      playBookSound('open');
    },
    
    // 플립북 닫기
    closeFlipbook: () => {
      playBookSound('close');
    },
    
    // 성공적인 액션 (북마크 추가, 공유 등)
    successAction: () => {
      playUISound('success');
    },
    
    // 에러 발생
    errorAction: () => {
      playUISound('error');
    },
    
    // 메뉴 열기/닫기
    toggleMenu: (isOpen: boolean) => {
      playUISound(isOpen ? 'menuOpen' : 'menuClose');
    },
    
    // 버튼 클릭
    buttonClick: () => {
      playUISound('buttonClick');
    },
    
    // 경고 알림
    warning: () => {
      playUISound('warning');
    }
  };

  // 전체 사운드 정지
  const stopAllSounds = useCallback(() => {
    // 대기 중인 모든 타임아웃 정리
    activeTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    activeTimeoutsRef.current.clear();
    
    // 배경음 정지
    stopBackgroundMusic();
  }, [stopBackgroundMusic]);

  // 사운드 볼륨 조절
  const setSoundVolume = useCallback((category: 'effects' | 'background', volume: number) => {
    // useFlipbookAudio의 updateSettings를 통해 볼륨 조절
    // 이는 AudioControl 컴포넌트와 연동됨
  }, []);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      stopAllSounds();
    };
  }, [stopAllSounds]);

  return {
    // 기본 사운드 재생 함수들
    playPageFlipSound,
    playUISound,
    playBookSound,
    playAmbientSound,
    stopAmbientSound,
    stopAllSounds,
    
    // 사운드 프리셋
    ...soundPresets,
    
    // 설정 및 상태
    isAudioEnabled,
    soundAssets: finalAssets,
    soundConfigs: finalConfigs,
    setSoundVolume,
    
    // 고급 기능
    customSound: (url: string, config: Partial<SoundConfig> = {}) => {
      const finalConfig = { volume: 0.5, delay: 0, ...config };
      playSound('custom', url, finalConfig);
    }
  };
};