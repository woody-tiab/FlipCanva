import React, { useState, useCallback, useEffect } from 'react';
import { useFlipbookAudio } from '../hooks/useFlipbookAudio';

interface AudioControlProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  showTooltip?: boolean;
  onAudioStateChange?: (enabled: boolean) => void;
}

interface TooltipProps {
  message: string;
  isVisible: boolean;
  type?: 'info' | 'warning' | 'error';
}

const Tooltip: React.FC<TooltipProps> = ({ message, isVisible, type = 'info' }) => {
  if (!isVisible) return null;

  const typeClasses = {
    info: 'bg-gray-800 text-white',
    warning: 'bg-yellow-500 text-white',
    error: 'bg-red-500 text-white'
  };

  return (
    <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs rounded-lg shadow-lg whitespace-nowrap z-50 ${typeClasses[type]}`}>
      {message}
      <div className={`absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent ${type === 'error' ? 'border-t-red-500' : type === 'warning' ? 'border-t-yellow-500' : 'border-t-gray-800'}`}></div>
    </div>
  );
};

const AudioControl: React.FC<AudioControlProps> = ({
  className = '',
  size = 'md',
  position = 'top-right',
  showTooltip = true,
  onAudioStateChange
}) => {
  const {
    isAudioEnabled,
    audioContext,
    settings,
    requestAudioPermission,
    updateSettings,
    playAccessibilityFeedback
  } = useFlipbookAudio({
    onPermissionRequest: () => {
      setTooltipState({
        message: '오디오 권한을 요청하는 중...',
        isVisible: true,
        type: 'info'
      });
    },
    onPermissionGranted: () => {
      setTooltipState({
        message: '사운드가 켜졌습니다',
        isVisible: true,
        type: 'info'
      });
      setUserWantsAudio(true);
      localStorage.setItem('flipbook-audio-enabled', 'true');
      playAccessibilityFeedback('success');
      setTimeout(() => hideTooltip(), 2000);
    },
    onPermissionDenied: () => {
      setTooltipState({
        message: '브라우저 설정에서 오디오 권한을 허용해주세요',
        isVisible: true,
        type: 'warning'
      });
      setTimeout(() => hideTooltip(), 3000);
    }
  });

  const [userWantsAudio, setUserWantsAudio] = useState<boolean>(false);
  const [tooltipState, setTooltipState] = useState<{
    message: string;
    isVisible: boolean;
    type: 'info' | 'warning' | 'error';
  }>({
    message: '',
    isVisible: false,
    type: 'info'
  });

  // 로컬스토리지에서 사용자 설정 로드
  useEffect(() => {
    const savedPreference = localStorage.getItem('flipbook-audio-enabled');
    if (savedPreference === 'true') {
      setUserWantsAudio(true);
    } else if (savedPreference === 'false') {
      setUserWantsAudio(false);
    }
  }, []);

  // 오디오 상태 변경 알림
  useEffect(() => {
    onAudioStateChange?.(isAudioEnabled && userWantsAudio);
  }, [isAudioEnabled, userWantsAudio, onAudioStateChange]);

  const hideTooltip = useCallback(() => {
    setTooltipState(prev => ({ ...prev, isVisible: false }));
  }, []);

  const handleAudioToggle = useCallback(async () => {
    if (!userWantsAudio) {
      // 사용자가 오디오를 원함 - 권한 요청
      try {
        const success = await requestAudioPermission();
        if (success) {
          onAudioStateChange?.(true);
        }
      } catch (error) {
        setTooltipState({
          message: '오디오 권한 요청 중 오류가 발생했습니다',
          isVisible: true,
          type: 'error'
        });
        setTimeout(() => hideTooltip(), 3000);
      }
    } else {
      // 사용자가 오디오를 끄고 싶어함
      setUserWantsAudio(false);
      localStorage.setItem('flipbook-audio-enabled', 'false');
      updateSettings({ enableSoundEffects: false, enableBackgroundMusic: false });
      
      setTooltipState({
        message: '사운드가 꺼졌습니다',
        isVisible: true,
        type: 'info'
      });
      
      onAudioStateChange?.(false);
      setTimeout(() => hideTooltip(), 2000);
    }
  }, [userWantsAudio, requestAudioPermission, updateSettings, onAudioStateChange, hideTooltip]);

  // 크기별 스타일
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg'
  };

  // 위치별 스타일
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  // 현재 오디오 상태 결정
  const isCurrentlyEnabled = isAudioEnabled && userWantsAudio && settings.enableSoundEffects;
  const hasPermission = audioContext.hasPermission;
  
  // 아이콘 및 상태 결정
  let iconComponent: JSX.Element;
  let buttonState: 'enabled' | 'disabled' | 'permission-denied' | 'loading';
  
  if (!audioContext.isSupported) {
    buttonState = 'permission-denied';
    iconComponent = (
      <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
      </svg>
    );
  } else if (!hasPermission && userWantsAudio) {
    buttonState = 'loading';
    iconComponent = (
      <div className="animate-spin">
        <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
        </svg>
      </div>
    );
  } else if (isCurrentlyEnabled) {
    buttonState = 'enabled';
    iconComponent = (
      <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.146 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.146l4.237-3.793zm2.617 2.11a3 3 0 010 4.828 1 1 0 11-1.414-1.414 1 1 0 000-1.414 1 1 0 011.414-1.414zm2.83-2.83a6 6 0 010 8.486 1 1 0 11-1.414-1.414 4 4 0 000-5.658 1 1 0 011.414-1.414z" clipRule="evenodd" />
      </svg>
    );
  } else if (!hasPermission) {
    buttonState = 'permission-denied';
    iconComponent = (
      <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.146 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.146l4.237-3.793zm7.903 1.335a1 1 0 01.2 1.4L15.6 8.9a1 1 0 11-1.6-1.2l1.886-2.51a1 1 0 011.4-.2zM15.6 11.1a1 1 0 111.6 1.2l-1.886 2.51a1 1 0 11-1.6-1.2L15.6 11.1z" clipRule="evenodd" />
      </svg>
    );
  } else {
    buttonState = 'disabled';
    iconComponent = (
      <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.146 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.146l4.237-3.793zM11.414 10l2.293-2.293a1 1 0 011.414 1.414L12.828 11.5l2.293 2.293a1 1 0 01-1.414 1.414L11.414 12.914l-2.293 2.293a1 1 0 01-1.414-1.414L10 11.5 7.707 9.207a1 1 0 011.414-1.414L11.414 10z" clipRule="evenodd" />
      </svg>
    );
  }

  // 버튼 스타일
  const buttonStateClasses = {
    enabled: 'bg-green-500 hover:bg-green-600 text-white shadow-green-200',
    disabled: 'bg-gray-400 hover:bg-gray-500 text-white shadow-gray-200',
    'permission-denied': 'bg-red-400 hover:bg-red-500 text-white shadow-red-200',
    loading: 'bg-blue-400 hover:bg-blue-500 text-white shadow-blue-200'
  };

  // 툴팁 메시지 결정
  const getTooltipMessage = () => {
    if (!audioContext.isSupported) {
      return '이 브라우저는 오디오를 지원하지 않습니다';
    }
    if (buttonState === 'loading') {
      return '오디오 권한 요청 중...';
    }
    if (buttonState === 'permission-denied' && userWantsAudio) {
      return '브라우저 설정에서 오디오 권한을 허용해주세요';
    }
    if (buttonState === 'enabled') {
      return '사운드 끄기';
    }
    return '사운드 켜기';
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-40 ${className}`}>
      <div className="relative">
        <button
          onClick={handleAudioToggle}
          disabled={!audioContext.isSupported}
          className={`
            ${sizeClasses[size]}
            ${buttonStateClasses[buttonState]}
            flex items-center justify-center
            rounded-full shadow-lg transition-all duration-200
            hover:shadow-xl active:scale-95
            disabled:cursor-not-allowed disabled:opacity-50
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          `}
          onMouseEnter={() => {
            if (showTooltip && !tooltipState.isVisible) {
              setTooltipState({
                message: getTooltipMessage(),
                isVisible: true,
                type: buttonState === 'permission-denied' ? 'warning' : 'info'
              });
            }
          }}
          onMouseLeave={hideTooltip}
          aria-label={getTooltipMessage()}
          aria-pressed={isCurrentlyEnabled}
        >
          {iconComponent}
        </button>

        {/* 툴팁 */}
        {showTooltip && (
          <Tooltip
            message={tooltipState.message}
            isVisible={tooltipState.isVisible}
            type={tooltipState.type}
          />
        )}

        {/* 오디오 레벨 인디케이터 (활성화된 경우) */}
        {isCurrentlyEnabled && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse">
            <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-75"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioControl;