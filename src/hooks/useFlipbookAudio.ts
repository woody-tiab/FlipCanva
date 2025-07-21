import { useState, useRef, useCallback, useEffect } from 'react';

export interface AudioSettings {
  masterVolume: number; // 0-1
  soundEffectsVolume: number; // 0-1
  backgroundMusicVolume: number; // 0-1
  enableSoundEffects: boolean;
  enableBackgroundMusic: boolean;
  enableSpatialAudio: boolean;
}

export interface SoundEffect {
  id: string;
  url: string;
  volume?: number;
  loop?: boolean;
  spatial?: boolean;
  position?: [number, number, number];
}

interface AudioContextState {
  isSupported: boolean;
  isEnabled: boolean;
  hasPermission: boolean;
  context: AudioContext | null;
}

interface UseFlipbookAudioOptions {
  defaultSettings?: Partial<AudioSettings>;
  onPermissionRequest?: () => void;
  onPermissionGranted?: () => void;
  onPermissionDenied?: () => void;
  onAudioError?: (error: Error) => void;
}

const DEFAULT_SETTINGS: AudioSettings = {
  masterVolume: 0.7,
  soundEffectsVolume: 0.8,
  backgroundMusicVolume: 0.5,
  enableSoundEffects: true,
  enableBackgroundMusic: true,
  enableSpatialAudio: false
};

const SOUND_EFFECTS = {
  pageFlip: '/sounds/page-flip.mp3',
  pageFlipSoft: '/sounds/page-flip-soft.mp3',
  pageFlipPaper: '/sounds/page-flip-paper.mp3',
  bookOpen: '/sounds/book-open.mp3',
  bookClose: '/sounds/book-close.mp3',
  buttonClick: '/sounds/button-click.mp3',
  success: '/sounds/success.mp3',
  error: '/sounds/error.mp3'
};

export const useFlipbookAudio = ({
  defaultSettings = {},
  onPermissionRequest,
  onPermissionGranted,
  onPermissionDenied,
  onAudioError
}: UseFlipbookAudioOptions = {}) => {
  const [settings, setSettings] = useState<AudioSettings>({
    ...DEFAULT_SETTINGS,
    ...defaultSettings
  });

  const [audioContext, setAudioContext] = useState<AudioContextState>({
    isSupported: typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined',
    isEnabled: false,
    hasPermission: false,
    context: null
  });

  const audioBuffers = useRef<Map<string, AudioBuffer>>(new Map());
  const activeAudioSources = useRef<Map<string, AudioBufferSourceNode>>(new Map());
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const spatialAudioRef = useRef<PannerNode | null>(null);

  // Web Audio API 초기화
  const initializeAudioContext = useCallback(async () => {
    if (!audioContext.isSupported) {
      onAudioError?.(new Error('Web Audio API가 지원되지 않습니다.'));
      return false;
    }

    try {
      const AudioContextClass = AudioContext || (window as any).webkitAudioContext;
      const context = new AudioContextClass();

      // 사용자 상호작용 후 오디오 컨텍스트 재개
      if (context.state === 'suspended') {
        await context.resume();
      }

      // 마스터 게인 노드 생성
      const gainNode = context.createGain();
      gainNode.connect(context.destination);
      gainNode.gain.value = settings.masterVolume;

      gainNodeRef.current = gainNode;

      // 공간 오디오 설정
      if (settings.enableSpatialAudio) {
        const pannerNode = context.createPanner();
        pannerNode.panningModel = 'HRTF';
        pannerNode.distanceModel = 'inverse';
        pannerNode.connect(gainNode);
        spatialAudioRef.current = pannerNode;
      }

      setAudioContext(prev => ({
        ...prev,
        context,
        isEnabled: true,
        hasPermission: true
      }));

      onPermissionGranted?.();
      return true;
    } catch (error) {
      console.error('AudioContext 초기화 실패:', error);
      onAudioError?.(error as Error);
      return false;
    }
  }, [audioContext.isSupported, settings.masterVolume, settings.enableSpatialAudio, onAudioError, onPermissionGranted]);

  // 오디오 권한 요청 (사용자 제스처 기반)
  const requestAudioPermission = useCallback(async () => {
    onPermissionRequest?.();

    try {
      // 사용자 제스처가 필요한 오디오 컨텍스트 초기화
      const success = await initializeAudioContext();
      if (success) {
        // 테스트 사운드 재생으로 권한 확인
        const testBuffer = audioContext.context?.createBuffer(1, 1, 22050);
        if (testBuffer && audioContext.context) {
          const source = audioContext.context.createBufferSource();
          source.buffer = testBuffer;
          source.connect(audioContext.context.destination);
          source.start(0);
        }
        
        onPermissionGranted?.();
        return true;
      } else {
        onPermissionDenied?.();
        return false;
      }
    } catch (error) {
      console.warn('오디오 권한 요청 실패:', error);
      onPermissionDenied?.();
      return false;
    }
  }, [initializeAudioContext, audioContext.context, onPermissionRequest, onPermissionGranted, onPermissionDenied]);

  // 오디오 파일 로딩
  const loadAudioBuffer = useCallback(async (url: string): Promise<AudioBuffer | null> => {
    if (!audioContext.context) return null;

    // 이미 로드된 경우
    if (audioBuffers.current.has(url)) {
      return audioBuffers.current.get(url)!;
    }

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.context.decodeAudioData(arrayBuffer);
      
      audioBuffers.current.set(url, audioBuffer);
      return audioBuffer;
    } catch (error) {
      console.error('오디오 파일 로딩 실패:', url, error);
      return null;
    }
  }, [audioContext.context]);

  // 사운드 이펙트 재생
  const playSoundEffect = useCallback(async (
    effectId: keyof typeof SOUND_EFFECTS | string,
    options: Partial<SoundEffect> = {}
  ) => {
    if (!settings.enableSoundEffects || !audioContext.context || !gainNodeRef.current) {
      return;
    }

    const url = typeof effectId === 'string' && effectId.startsWith('http') 
      ? effectId 
      : SOUND_EFFECTS[effectId as keyof typeof SOUND_EFFECTS];

    if (!url) {
      console.warn('알 수 없는 사운드 이펙트:', effectId);
      return;
    }

    try {
      const audioBuffer = await loadAudioBuffer(url);
      if (!audioBuffer) return;

      // 기존 재생 중인 같은 효과음 중지
      const existingSource = activeAudioSources.current.get(effectId);
      if (existingSource) {
        existingSource.stop();
        activeAudioSources.current.delete(effectId);
      }

      // 새 오디오 소스 생성
      const source = audioContext.context.createBufferSource();
      source.buffer = audioBuffer;

      // 볼륨 설정
      const effectGain = audioContext.context.createGain();
      const volume = (options.volume ?? 1) * settings.soundEffectsVolume;
      effectGain.gain.value = volume;

      // 공간 오디오 설정
      let targetNode: AudioNode = gainNodeRef.current;
      
      if (settings.enableSpatialAudio && options.spatial && spatialAudioRef.current && options.position) {
        const [x, y, z] = options.position;
        spatialAudioRef.current.positionX.value = x;
        spatialAudioRef.current.positionY.value = y;
        spatialAudioRef.current.positionZ.value = z;
        targetNode = spatialAudioRef.current;
      }

      // 오디오 그래프 연결
      source.connect(effectGain);
      effectGain.connect(targetNode);

      // 재생 및 정리
      source.start();
      activeAudioSources.current.set(effectId, source);

      source.onended = () => {
        activeAudioSources.current.delete(effectId);
      };

      if (options.loop) {
        source.loop = true;
      }

    } catch (error) {
      console.error('사운드 이펙트 재생 실패:', effectId, error);
      onAudioError?.(error as Error);
    }
  }, [settings.enableSoundEffects, settings.soundEffectsVolume, settings.enableSpatialAudio, audioContext.context, loadAudioBuffer, onAudioError]);

  // 배경음악 재생
  const playBackgroundMusic = useCallback(async (url: string, loop = true) => {
    if (!settings.enableBackgroundMusic) return;

    try {
      // 기존 배경음악 중지
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause();
        backgroundMusicRef.current = null;
      }

      const audio = new Audio(url);
      audio.loop = loop;
      audio.volume = settings.backgroundMusicVolume * settings.masterVolume;
      
      await audio.play();
      backgroundMusicRef.current = audio;
    } catch (error) {
      console.error('배경음악 재생 실패:', error);
      onAudioError?.(error as Error);
    }
  }, [settings.enableBackgroundMusic, settings.backgroundMusicVolume, settings.masterVolume, onAudioError]);

  // 배경음악 중지
  const stopBackgroundMusic = useCallback(() => {
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.pause();
      backgroundMusicRef.current = null;
    }
  }, []);

  // 모든 사운드 중지
  const stopAllSounds = useCallback(() => {
    // 사운드 이펙트 중지
    activeAudioSources.current.forEach(source => {
      source.stop();
    });
    activeAudioSources.current.clear();

    // 배경음악 중지
    stopBackgroundMusic();
  }, [stopBackgroundMusic]);

  // 설정 업데이트
  const updateSettings = useCallback((newSettings: Partial<AudioSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      
      // 마스터 볼륨 업데이트
      if (gainNodeRef.current && 'masterVolume' in newSettings) {
        gainNodeRef.current.gain.value = updated.masterVolume;
      }

      // 배경음악 볼륨 업데이트
      if (backgroundMusicRef.current && ('backgroundMusicVolume' in newSettings || 'masterVolume' in newSettings)) {
        backgroundMusicRef.current.volume = updated.backgroundMusicVolume * updated.masterVolume;
      }

      return updated;
    });
  }, []);

  // 페이지 넘김 사운드 재생 (편의 함수)
  const playPageFlipSound = useCallback((flipType: 'normal' | 'soft' | 'paper' = 'normal') => {
    const soundMap = {
      normal: 'pageFlip',
      soft: 'pageFlipSoft',
      paper: 'pageFlipPaper'
    };
    
    playSoundEffect(soundMap[flipType]);
  }, [playSoundEffect]);

  // 접근성 관련 오디오 피드백
  const playAccessibilityFeedback = useCallback((type: 'success' | 'error' | 'navigation') => {
    const soundMap = {
      success: 'success',
      error: 'error',
      navigation: 'buttonClick'
    };

    playSoundEffect(soundMap[type]);
  }, [playSoundEffect]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      stopAllSounds();
      if (audioContext.context) {
        audioContext.context.close();
      }
    };
  }, [stopAllSounds, audioContext.context]);

  // 사운드 프리로딩
  const preloadSounds = useCallback(async () => {
    if (!audioContext.context) return;

    const soundUrls = Object.values(SOUND_EFFECTS);
    await Promise.allSettled(
      soundUrls.map(url => loadAudioBuffer(url))
    );
  }, [audioContext.context, loadAudioBuffer]);

  return {
    settings,
    audioContext,
    requestAudioPermission,
    updateSettings,
    playSoundEffect,
    playBackgroundMusic,
    stopBackgroundMusic,
    stopAllSounds,
    playPageFlipSound,
    playAccessibilityFeedback,
    preloadSounds,
    isAudioEnabled: audioContext.isEnabled && audioContext.hasPermission
  };
};