import React, { useState, useCallback, useRef, useEffect } from 'react';
import { FlipbookMetadata, FlipbookVisibility } from '../types/flipbook';
import QRCode from 'qrcode';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  flipbook: FlipbookMetadata;
  onVisibilityChange: (visibility: FlipbookVisibility) => void;
  onViewCountUpdate?: (count: number) => void;
}

interface ShareOptions {
  includeControls: boolean;
  autoPlay: boolean;
  startPage: number;
  theme: 'light' | 'dark' | 'auto';
}

interface IFrameOptions {
  width: number;
  height: number;
  responsive: boolean;
  border: boolean;
  allowFullscreen: boolean;
}

const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  flipbook,
  onVisibilityChange,
  onViewCountUpdate
}) => {
  const [activeTab, setActiveTab] = useState<'link' | 'embed' | 'qr' | 'settings'>('link');
  const [shareOptions, setShareOptions] = useState<ShareOptions>({
    includeControls: true,
    autoPlay: false,
    startPage: 0,
    theme: 'auto'
  });
  const [iframeOptions, setIframeOptions] = useState<IFrameOptions>({
    width: 800,
    height: 600,
    responsive: true,
    border: false,
    allowFullscreen: true
  });
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<{ type: string; timestamp: number } | null>(null);
  const [showVisibilityWarning, setShowVisibilityWarning] = useState(false);

  const shareUrlRef = useRef<string>('');
  const embedCodeRef = useRef<string>('');

  // 공유 URL 생성
  const generateShareUrl = useCallback(() => {
    const baseUrl = window.location.origin;
    const params = new URLSearchParams();
    
    if (!shareOptions.includeControls) params.set('controls', 'false');
    if (shareOptions.autoPlay) params.set('autoplay', 'true');
    if (shareOptions.startPage > 0) params.set('start', shareOptions.startPage.toString());
    if (shareOptions.theme !== 'auto') params.set('theme', shareOptions.theme);
    
    const queryString = params.toString();
    shareUrlRef.current = `${baseUrl}/flipbook/${flipbook.slug}${queryString ? `?${queryString}` : ''}`;
    
    return shareUrlRef.current;
  }, [flipbook.slug, shareOptions]);

  // iFrame 임베드 코드 생성
  const generateEmbedCode = useCallback(() => {
    const url = generateShareUrl();
    const { width, height, responsive, border, allowFullscreen } = iframeOptions;
    
    let style = '';
    if (responsive) {
      style = 'width: 100%; height: 100%; max-width: ' + width + 'px; max-height: ' + height + 'px;';
    } else {
      style = `width: ${width}px; height: ${height}px;`;
    }
    
    if (!border) style += ' border: none;';
    
    embedCodeRef.current = `<iframe 
  src="${url}"
  style="${style}"
  ${allowFullscreen ? 'allowfullscreen' : ''}
  title="${flipbook.title}"
  loading="lazy">
</iframe>`;
    
    return embedCodeRef.current;
  }, [generateShareUrl, iframeOptions, flipbook.title]);

  // QR 코드 생성
  const generateQRCode = useCallback(async () => {
    try {
      const url = generateShareUrl();
      const qrCodeUrl = await QRCode.toDataURL(url, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });
      setQrCodeDataUrl(qrCodeUrl);
    } catch (error) {
      console.error('QR 코드 생성 실패:', error);
    }
  }, [generateShareUrl]);

  // 클립보드 복사
  const copyToClipboard = useCallback(async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied({ type, timestamp: Date.now() });
      
      // 2초 후 복사 상태 리셋
      setTimeout(() => {
        setCopied(null);
      }, 2000);
    } catch (error) {
      console.error('클립보드 복사 실패:', error);
      // 폴백: 텍스트 선택
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      setCopied({ type, timestamp: Date.now() });
      setTimeout(() => setCopied(null), 2000);
    }
  }, []);

  // QR 코드 다운로드
  const downloadQRCode = useCallback(() => {
    if (!qrCodeDataUrl) return;
    
    const link = document.createElement('a');
    link.download = `${flipbook.title}-qrcode.png`;
    link.href = qrCodeDataUrl;
    link.click();
  }, [qrCodeDataUrl, flipbook.title]);

  // 접근 권한 변경
  const handleVisibilityChange = useCallback((newVisibility: FlipbookVisibility) => {
    if (newVisibility === FlipbookVisibility.PUBLIC && flipbook.visibility !== FlipbookVisibility.PUBLIC) {
      setShowVisibilityWarning(true);
    } else {
      onVisibilityChange(newVisibility);
    }
  }, [flipbook.visibility, onVisibilityChange]);

  // 공개 전환 확인
  const confirmPublicVisibility = useCallback(() => {
    onVisibilityChange(FlipbookVisibility.PUBLIC);
    setShowVisibilityWarning(false);
  }, [onVisibilityChange]);

  // 초기 설정
  useEffect(() => {
    if (isOpen) {
      generateShareUrl();
      generateEmbedCode();
      generateQRCode();
    }
  }, [isOpen, generateShareUrl, generateEmbedCode, generateQRCode]);

  // 옵션 변경 시 업데이트
  useEffect(() => {
    if (isOpen) {
      generateShareUrl();
      generateEmbedCode();
      generateQRCode();
    }
  }, [shareOptions, iframeOptions, isOpen, generateShareUrl, generateEmbedCode, generateQRCode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">플립북 공유</h2>
              <p className="text-sm text-gray-600">{flipbook.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex border-b border-gray-200">
          {[
            { id: 'link', label: '링크', icon: '🔗' },
            { id: 'embed', label: '임베드', icon: '📋' },
            { id: 'qr', label: 'QR코드', icon: '📱' },
            { id: 'settings', label: '설정', icon: '⚙️' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* 탭 콘텐츠 */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {/* 링크 탭 */}
          {activeTab === 'link' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  공유 링크
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={generateShareUrl()}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(generateShareUrl(), 'link')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    {copied?.type === 'link' ? '복사됨!' : '복사'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{flipbook.viewCount}</div>
                  <div className="text-sm text-gray-600">총 조회수</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{flipbook.pageCount}</div>
                  <div className="text-sm text-gray-600">페이지 수</div>
                </div>
              </div>
            </div>
          )}

          {/* 임베드 탭 */}
          {activeTab === 'embed' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  iFrame 임베드 코드
                </label>
                <div className="relative">
                  <textarea
                    value={generateEmbedCode()}
                    readOnly
                    className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
                  />
                  <button
                    onClick={() => copyToClipboard(generateEmbedCode(), 'embed')}
                    className="absolute top-2 right-2 px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                  >
                    {copied?.type === 'embed' ? '복사됨!' : '복사'}
                  </button>
                </div>
              </div>

              {/* iFrame 옵션 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">너비 (px)</label>
                  <input
                    type="number"
                    value={iframeOptions.width}
                    onChange={(e) => setIframeOptions(prev => ({ ...prev, width: parseInt(e.target.value) || 800 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">높이 (px)</label>
                  <input
                    type="number"
                    value={iframeOptions.height}
                    onChange={(e) => setIframeOptions(prev => ({ ...prev, height: parseInt(e.target.value) || 600 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={iframeOptions.responsive}
                    onChange={(e) => setIframeOptions(prev => ({ ...prev, responsive: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">반응형 크기</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={iframeOptions.allowFullscreen}
                    onChange={(e) => setIframeOptions(prev => ({ ...prev, allowFullscreen: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">전체화면 허용</span>
                </label>
              </div>
            </div>
          )}

          {/* QR코드 탭 */}
          {activeTab === 'qr' && (
            <div className="space-y-4 text-center">
              {qrCodeDataUrl && (
                <div className="flex flex-col items-center">
                  <img 
                    src={qrCodeDataUrl} 
                    alt="QR Code" 
                    className="w-64 h-64 border border-gray-200 rounded-lg"
                  />
                  <p className="text-sm text-gray-600 mt-2">
                    QR 코드를 스캔하여 플립북을 확인하세요
                  </p>
                </div>
              )}
              
              <div className="flex space-x-2 justify-center">
                <button
                  onClick={downloadQRCode}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  PNG 다운로드
                </button>
                <button
                  onClick={() => copyToClipboard(generateShareUrl(), 'qr')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {copied?.type === 'qr' ? '복사됨!' : '링크 복사'}
                </button>
              </div>
            </div>
          )}

          {/* 설정 탭 */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* 접근 권한 설정 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">접근 권한</label>
                <div className="space-y-2">
                  {[
                    { value: FlipbookVisibility.PRIVATE, label: '비공개', desc: '본인만 접근 가능' },
                    { value: FlipbookVisibility.UNLISTED, label: '링크가 있는 사람만', desc: '링크를 아는 사람만 접근 가능' },
                    { value: FlipbookVisibility.PUBLIC, label: '공개', desc: '누구나 접근 가능' }
                  ].map((option) => (
                    <label key={option.value} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                      <input
                        type="radio"
                        value={option.value}
                        checked={flipbook.visibility === option.value}
                        onChange={(e) => handleVisibilityChange(e.target.value as FlipbookVisibility)}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{option.label}</div>
                        <div className="text-sm text-gray-600">{option.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* 공유 옵션 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">공유 옵션</label>
                <div className="space-y-3">
                  <label className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">컨트롤 표시</span>
                    <input
                      type="checkbox"
                      checked={shareOptions.includeControls}
                      onChange={(e) => setShareOptions(prev => ({ ...prev, includeControls: e.target.checked }))}
                      className="toggle"
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">자동 재생</span>
                    <input
                      type="checkbox"
                      checked={shareOptions.autoPlay}
                      onChange={(e) => setShareOptions(prev => ({ ...prev, autoPlay: e.target.checked }))}
                      className="toggle"
                    />
                  </label>
                </div>
              </div>

              {/* 시작 페이지 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">시작 페이지</label>
                <input
                  type="number"
                  min="0"
                  max={flipbook.pageCount - 1}
                  value={shareOptions.startPage}
                  onChange={(e) => setShareOptions(prev => ({ ...prev, startPage: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          )}
        </div>

        {/* 공개 전환 경고 모달 */}
        {showVisibilityWarning && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-yellow-100 rounded-full">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">공개 설정 확인</h3>
              </div>
              <p className="text-gray-600 mb-6">
                플립북을 공개로 설정하면 <strong>누구나 링크를 통해 접근할 수 있습니다</strong>. 
                민감한 정보가 포함되어 있지 않은지 확인해주세요.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowVisibilityWarning(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={confirmPublicVisibility}
                  className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  공개 설정
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShareModal;