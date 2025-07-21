import React, { useState, useCallback } from 'react';

interface AudioPermissionGuideProps {
  isVisible: boolean;
  onClose: () => void;
  onRetry: () => void;
  browserType?: 'chrome' | 'firefox' | 'safari' | 'edge' | 'unknown';
}

interface BrowserGuide {
  name: string;
  steps: string[];
  icon: JSX.Element;
}

const getBrowserGuides = (): Record<string, BrowserGuide> => ({
  chrome: {
    name: 'Chrome',
    steps: [
      '주소창 왼쪽의 🔒 (자물쇠) 아이콘을 클릭하세요',
      '"사이트 설정" 또는 "권한"을 선택하세요',
      '"소리" 설정을 "허용"으로 변경하세요',
      '페이지를 새로고침하고 다시 시도하세요'
    ],
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
      </svg>
    )
  },
  firefox: {
    name: 'Firefox',
    steps: [
      '주소창 왼쪽의 방패 아이콘을 클릭하세요',
      '"권한" 섹션에서 "소리 자동 재생"을 찾으세요',
      '"허용"으로 설정을 변경하세요',
      '페이지를 새로고침하고 다시 시도하세요'
    ],
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    )
  },
  safari: {
    name: 'Safari',
    steps: [
      'Safari 메뉴 > 환경설정을 선택하세요',
      '"웹사이트" 탭을 클릭하세요',
      '왼쪽에서 "자동 재생"을 선택하세요',
      '현재 웹사이트를 "허용"으로 설정하세요'
    ],
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
      </svg>
    )
  },
  edge: {
    name: 'Edge',
    steps: [
      '주소창 왼쪽의 🔒 (자물쇠) 아이콘을 클릭하세요',
      '"이 사이트의 권한"을 선택하세요',
      '"소리" 권한을 "허용"으로 변경하세요',
      '페이지를 새로고침하고 다시 시도하세요'
    ],
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.5 6L12 10.5 8.5 8 12 5.5 15.5 8zM12 19c-3.87 0-7-3.13-7-7 0-1.28.35-2.47.95-3.5L9.5 12v1.5c0 .83.67 1.5 1.5 1.5h1v2h-1.5c-.83 0-1.5.67-1.5 1.5V19z"/>
      </svg>
    )
  },
  unknown: {
    name: '브라우저',
    steps: [
      '브라우저의 설정 메뉴를 여세요',
      '"개인정보 보호" 또는 "사이트 설정"을 찾으세요',
      '"소리" 또는 "미디어" 권한을 허용으로 설정하세요',
      '페이지를 새로고침하고 다시 시도하세요'
    ],
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
      </svg>
    )
  }
});

const detectBrowser = (): string => {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (userAgent.includes('chrome') && !userAgent.includes('edg')) return 'chrome';
  if (userAgent.includes('firefox')) return 'firefox';
  if (userAgent.includes('safari') && !userAgent.includes('chrome')) return 'safari';
  if (userAgent.includes('edg')) return 'edge';
  
  return 'unknown';
};

const AudioPermissionGuide: React.FC<AudioPermissionGuideProps> = ({
  isVisible,
  onClose,
  onRetry,
  browserType
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const detectedBrowser = browserType || detectBrowser();
  const browserGuide = getBrowserGuides()[detectedBrowser];

  const handleNextStep = useCallback(() => {
    if (currentStep < browserGuide.steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, browserGuide.steps.length]);

  const handlePrevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleReset = useCallback(() => {
    setCurrentStep(0);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-100 rounded-full">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 7.464a5 5 0 010 7.072m-2.121-1.414a2.5 2.5 0 000-3.536m-4.95 4.95a2.5 2.5 0 000-3.536 5 5 0 000-7.072L12 12l4.464-4.464a5 5 0 000 7.072z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">소리 권한 설정</h2>
                <p className="text-sm text-gray-600">플립북 사운드를 위해 권한이 필요합니다</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 브라우저 정보 */}
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="text-blue-600">{browserGuide.icon}</div>
            <div>
              <h3 className="font-medium text-gray-900">{browserGuide.name} 브라우저</h3>
              <p className="text-sm text-gray-600">아래 단계를 따라 설정해주세요</p>
            </div>
          </div>
        </div>

        {/* 단계별 가이드 */}
        <div className="p-6">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                단계 {currentStep + 1} / {browserGuide.steps.length}
              </span>
              <span className="text-xs text-gray-500">
                {Math.round(((currentStep + 1) / browserGuide.steps.length) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / browserGuide.steps.length) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                {currentStep + 1}
              </div>
              <p className="text-blue-900 leading-relaxed">
                {browserGuide.steps[currentStep]}
              </p>
            </div>
          </div>

          {/* 네비게이션 버튼 */}
          <div className="flex space-x-3 mb-4">
            <button
              onClick={handlePrevStep}
              disabled={currentStep === 0}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              이전
            </button>
            <button
              onClick={handleNextStep}
              disabled={currentStep === browserGuide.steps.length - 1}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              다음
            </button>
          </div>

          {/* 완료 후 액션 */}
          {currentStep === browserGuide.steps.length - 1 && (
            <div className="border-t pt-4 mt-4">
              <p className="text-sm text-gray-600 mb-4">
                설정을 완료하셨나요? 아래 버튼을 클릭해서 다시 시도해보세요.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={handleReset}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  다시 보기
                </button>
                <button
                  onClick={onRetry}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                >
                  다시 시도
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 추가 도움말 */}
        <div className="p-6 bg-gray-50 border-t border-gray-200">
          <details className="group">
            <summary className="flex items-center justify-between cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
              <span>문제가 계속되나요?</span>
              <svg className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div className="mt-3 text-sm text-gray-600 space-y-2">
              <p>다음 방법들을 시도해보세요:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>브라우저를 완전히 종료 후 다시 시작</li>
                <li>시크릿/프라이빗 브라우징 모드에서 확인</li>
                <li>다른 브라우저에서 시도</li>
                <li>브라우저 캐시 및 쿠키 삭제</li>
              </ul>
              <p className="text-xs text-gray-500 mt-3">
                그래도 문제가 해결되지 않으면 소리 없이도 플립북을 즐기실 수 있습니다.
              </p>
            </div>
          </details>
        </div>

        {/* 하단 버튼 */}
        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            나중에 설정하기
          </button>
        </div>
      </div>
    </div>
  );
};

export default AudioPermissionGuide;