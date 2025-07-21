import { useState, useCallback, useEffect } from 'react';
import { AudioSettings } from './useFlipbookAudio';

interface AudioPreset {
  name: string;
  description: string;
  settings: AudioSettings;
}

const AUDIO_PRESETS: AudioPreset[] = [
  {
    name: 'silent',
    description: '완전 무음',
    settings: {
      masterVolume: 0,
      soundEffectsVolume: 0,
      backgroundMusicVolume: 0,
      enableSoundEffects: false,
      enableBackgroundMusic: false,
      enableSpatialAudio: false
    }
  },
  {
    name: 'minimal',
    description: '최소한의 사운드',
    settings: {
      masterVolume: 0.4,
      soundEffectsVolume: 0.6,
      backgroundMusicVolume: 0,
      enableSoundEffects: true,
      enableBackgroundMusic: false,
      enableSpatialAudio: false
    }
  },
  {
    name: 'balanced',
    description: '균형잡힌 사운드',
    settings: {
      masterVolume: 0.7,
      soundEffectsVolume: 0.8,
      backgroundMusicVolume: 0.4,
      enableSoundEffects: true,
      enableBackgroundMusic: true,
      enableSpatialAudio: false
    }
  },
  {
    name: 'immersive',
    description: '몰입형 경험',
    settings: {
      masterVolume: 0.8,
      soundEffectsVolume: 0.9,
      backgroundMusicVolume: 0.6,
      enableSoundEffects: true,
      enableBackgroundMusic: true,
      enableSpatialAudio: true
    }
  }
];

const STORAGE_KEYS = {
  AUDIO_ENABLED: 'flipbook-audio-enabled',
  AUDIO_SETTINGS: 'flipbook-audio-settings',
  AUDIO_PRESET: 'flipbook-audio-preset',
  FIRST_AUDIO_INTERACTION: 'flipbook-first-audio-interaction'
} as const;

interface UseAudioSettingsOptions {
  defaultPreset?: string;
  onSettingsChange?: (settings: AudioSettings) => void;
  onFirstInteraction?: () => void;
}

export const useAudioSettings = ({
  defaultPreset = 'balanced',
  onSettingsChange,
  onFirstInteraction
}: UseAudioSettingsOptions = {}) => {
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(false);
  const [settings, setSettings] = useState<AudioSettings>(
    AUDIO_PRESETS.find(p => p.name === defaultPreset)?.settings || AUDIO_PRESETS[2].settings
  );
  const [currentPreset, setCurrentPreset] = useState<string>(defaultPreset);
  const [hasInteracted, setHasInteracted] = useState<boolean>(false);

  // 로컬스토리지에서 설정 로드
  const loadSettings = useCallback(() => {
    try {
      // 오디오 활성화 상태
      const savedEnabled = localStorage.getItem(STORAGE_KEYS.AUDIO_ENABLED);
      if (savedEnabled !== null) {
        setIsAudioEnabled(savedEnabled === 'true');
      }

      // 오디오 설정
      const savedSettings = localStorage.getItem(STORAGE_KEYS.AUDIO_SETTINGS);
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings) as AudioSettings;
        setSettings(parsedSettings);
      }

      // 현재 프리셋
      const savedPreset = localStorage.getItem(STORAGE_KEYS.AUDIO_PRESET);
      if (savedPreset) {
        setCurrentPreset(savedPreset);
      }

      // 첫 상호작용 여부
      const savedInteraction = localStorage.getItem(STORAGE_KEYS.FIRST_AUDIO_INTERACTION);
      setHasInteracted(savedInteraction === 'true');

    } catch (error) {
      console.warn('오디오 설정 로드 실패:', error);
    }
  }, []);

  // 로컬스토리지에 설정 저장
  const saveSettings = useCallback((
    enabled: boolean,
    audioSettings: AudioSettings,
    preset: string
  ) => {
    try {
      localStorage.setItem(STORAGE_KEYS.AUDIO_ENABLED, enabled.toString());
      localStorage.setItem(STORAGE_KEYS.AUDIO_SETTINGS, JSON.stringify(audioSettings));
      localStorage.setItem(STORAGE_KEYS.AUDIO_PRESET, preset);
    } catch (error) {
      console.warn('오디오 설정 저장 실패:', error);
    }
  }, []);

  // 오디오 활성화/비활성화
  const toggleAudio = useCallback((enabled?: boolean) => {
    const newEnabled = enabled !== undefined ? enabled : !isAudioEnabled;
    setIsAudioEnabled(newEnabled);
    
    if (newEnabled && !hasInteracted) {
      setHasInteracted(true);
      localStorage.setItem(STORAGE_KEYS.FIRST_AUDIO_INTERACTION, 'true');
      onFirstInteraction?.();
    }
    
    saveSettings(newEnabled, settings, currentPreset);
    
    // 비활성화 시 모든 사운드 끄기
    if (!newEnabled) {
      const silentSettings = { ...settings, enableSoundEffects: false, enableBackgroundMusic: false };
      onSettingsChange?.(silentSettings);
    } else {
      onSettingsChange?.(settings);
    }
    
    return newEnabled;
  }, [isAudioEnabled, hasInteracted, settings, currentPreset, saveSettings, onFirstInteraction, onSettingsChange]);

  // 개별 설정 업데이트
  const updateSetting = useCallback(<K extends keyof AudioSettings>(
    key: K,
    value: AudioSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    setCurrentPreset('custom'); // 수동 변경 시 커스텀으로 설정
    saveSettings(isAudioEnabled, newSettings, 'custom');
    onSettingsChange?.(newSettings);
  }, [settings, isAudioEnabled, saveSettings, onSettingsChange]);

  // 프리셋 적용
  const applyPreset = useCallback((presetName: string) => {
    const preset = AUDIO_PRESETS.find(p => p.name === presetName);
    if (!preset) {
      console.warn('알 수 없는 프리셋:', presetName);
      return false;
    }

    setSettings(preset.settings);
    setCurrentPreset(presetName);
    
    // 무음 프리셋의 경우 오디오도 비활성화
    const newEnabled = presetName !== 'silent' ? isAudioEnabled : false;
    setIsAudioEnabled(newEnabled);
    
    saveSettings(newEnabled, preset.settings, presetName);
    onSettingsChange?.(preset.settings);
    
    return true;
  }, [isAudioEnabled, saveSettings, onSettingsChange]);

  // 볼륨 조절 (마스터, 효과음, 배경음 통합)
  const setVolume = useCallback((type: 'master' | 'effects' | 'background', volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    
    switch (type) {
      case 'master':
        updateSetting('masterVolume', clampedVolume);
        break;
      case 'effects':
        updateSetting('soundEffectsVolume', clampedVolume);
        break;
      case 'background':
        updateSetting('backgroundMusicVolume', clampedVolume);
        break;
    }
  }, [updateSetting]);

  // 빠른 음소거/해제
  const quickMute = useCallback(() => {
    const wasMuted = settings.masterVolume === 0;
    const newVolume = wasMuted ? 0.7 : 0;
    updateSetting('masterVolume', newVolume);
    return !wasMuted;
  }, [settings.masterVolume, updateSetting]);

  // 설정 초기화
  const resetSettings = useCallback(() => {
    const defaultSettings = AUDIO_PRESETS.find(p => p.name === defaultPreset)?.settings;
    if (defaultSettings) {
      setSettings(defaultSettings);
      setCurrentPreset(defaultPreset);
      saveSettings(isAudioEnabled, defaultSettings, defaultPreset);
      onSettingsChange?.(defaultSettings);
    }
  }, [defaultPreset, isAudioEnabled, saveSettings, onSettingsChange]);

  // 접근성 설정
  const setAccessibilityMode = useCallback((enabled: boolean) => {
    if (enabled) {
      // 접근성 모드: 효과음만 활성화, 배경음 비활성화
      const accessibleSettings: AudioSettings = {
        ...settings,
        enableBackgroundMusic: false,
        backgroundMusicVolume: 0,
        soundEffectsVolume: Math.max(settings.soundEffectsVolume, 0.7),
        enableSpatialAudio: false // 공간 오디오 비활성화
      };
      setSettings(accessibleSettings);
      setCurrentPreset('accessibility');
      saveSettings(isAudioEnabled, accessibleSettings, 'accessibility');
      onSettingsChange?.(accessibleSettings);
    } else {
      // 일반 모드로 복원
      applyPreset('balanced');
    }
  }, [settings, isAudioEnabled, saveSettings, onSettingsChange, applyPreset]);

  // 설정 가져오기/내보내기
  const exportSettings = useCallback(() => {
    return {
      isAudioEnabled,
      settings,
      currentPreset,
      hasInteracted,
      timestamp: Date.now()
    };
  }, [isAudioEnabled, settings, currentPreset, hasInteracted]);

  const importSettings = useCallback((exportedData: ReturnType<typeof exportSettings>) => {
    try {
      setIsAudioEnabled(exportedData.isAudioEnabled);
      setSettings(exportedData.settings);
      setCurrentPreset(exportedData.currentPreset);
      setHasInteracted(exportedData.hasInteracted);
      
      saveSettings(
        exportedData.isAudioEnabled,
        exportedData.settings,
        exportedData.currentPreset
      );
      
      if (exportedData.hasInteracted) {
        localStorage.setItem(STORAGE_KEYS.FIRST_AUDIO_INTERACTION, 'true');
      }
      
      onSettingsChange?.(exportedData.settings);
      return true;
    } catch (error) {
      console.error('설정 가져오기 실패:', error);
      return false;
    }
  }, [saveSettings, onSettingsChange]);

  // 초기 로드
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // 설정 변경 시 콜백 호출
  useEffect(() => {
    if (isAudioEnabled) {
      onSettingsChange?.(settings);
    }
  }, [settings, isAudioEnabled, onSettingsChange]);

  return {
    // 상태
    isAudioEnabled,
    settings,
    currentPreset,
    hasInteracted,
    
    // 기본 제어
    toggleAudio,
    updateSetting,
    applyPreset,
    setVolume,
    quickMute,
    resetSettings,
    
    // 고급 기능
    setAccessibilityMode,
    exportSettings,
    importSettings,
    
    // 유틸리티
    availablePresets: AUDIO_PRESETS,
    isCustomPreset: currentPreset === 'custom' || currentPreset === 'accessibility',
    isMuted: settings.masterVolume === 0,
    effectiveVolume: isAudioEnabled ? settings.masterVolume : 0,
    
    // 상태 확인
    canPlaySounds: isAudioEnabled && settings.enableSoundEffects && settings.masterVolume > 0,
    canPlayMusic: isAudioEnabled && settings.enableBackgroundMusic && settings.backgroundMusicVolume > 0,
    
    // 디버깅
    debug: {
      storageKeys: STORAGE_KEYS,
      loadedSettings: {
        enabled: localStorage.getItem(STORAGE_KEYS.AUDIO_ENABLED),
        settings: localStorage.getItem(STORAGE_KEYS.AUDIO_SETTINGS),
        preset: localStorage.getItem(STORAGE_KEYS.AUDIO_PRESET),
        interaction: localStorage.getItem(STORAGE_KEYS.FIRST_AUDIO_INTERACTION)
      }
    }
  };
};