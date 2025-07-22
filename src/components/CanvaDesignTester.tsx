import React, { useState } from 'react';
import { canvaApiService } from '../services/canvaApi';

interface CanvaDesignTesterProps {
  onTestDesign?: (designId: string) => void;
}

export const CanvaDesignTester: React.FC<CanvaDesignTesterProps> = ({
  onTestDesign
}) => {
  const [testUrl, setTestUrl] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [isTestLoading, setIsTestLoading] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  const extractDesignId = (url: string): string | null => {
    // Canva 디자인 URL에서 ID 추출
    // 예시: https://www.canva.com/design/DAGh8bZ9l9E/edit
    const patterns = [
      /\/design\/([A-Z0-9_-]+)/i,
      /design_id=([A-Z0-9_-]+)/i,
      /^([A-Z0-9_-]+)$/i // 직접 ID 입력
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  };

  const testDesign = async () => {
    if (!testUrl.trim()) {
      setTestError('Canva 디자인 URL 또는 ID를 입력해주세요.');
      return;
    }

    const designId = extractDesignId(testUrl.trim());
    if (!designId) {
      setTestError('유효한 Canva 디자인 URL 또는 ID가 아닙니다.');
      return;
    }

    setIsTestLoading(true);
    setTestError(null);
    setTestResult(null);

    try {
      // 1. 디자인 검증
      const validationResult = await canvaApiService.validateDesign(designId);
      
      // 2. 연결된 경우 실제 디자인 정보 가져오기
      let designInfo = null;
      const hasToken = canvaApiService.getAccessToken();
      
      if (hasToken) {
        try {
          console.log('🔍 Attempting to get real design info for:', designId);
          const designResult = await canvaApiService.getDesign(designId);
          if (designResult.success) {
            designInfo = designResult.data;
            console.log('✅ Got real design info:', designInfo);
          } else {
            console.log('⚠️ Design API failed:', designResult.error);
          }
        } catch (error) {
          console.log('❌ Real design info failed:', error);
        }
      } else {
        console.log('🔒 No access token, skipping real design fetch');
      }

      setTestResult({
        designId,
        validation: validationResult,
        designInfo: designInfo,
        isConnected: !!canvaApiService.getAccessToken(),
        url: testUrl.trim()
      });

    } catch (error) {
      setTestError(error instanceof Error ? error.message : '테스트 중 오류가 발생했습니다.');
    } finally {
      setIsTestLoading(false);
    }
  };

  const handleUseDesign = () => {
    if (testResult?.designId) {
      onTestDesign?.(testResult.designId);
    }
  };

  return (
    <div className="canva-design-tester" style={{
      padding: '16px',
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      backgroundColor: '#f9f9f9',
      marginTop: '16px'
    }}>
      <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#333' }}>
        🧪 Canva 디자인 테스트
      </h4>
      
      <div style={{ marginBottom: '12px' }}>
        <input
          type="text"
          placeholder="Canva 디자인 URL 또는 ID 입력 (예: DAGh8bZ9l9E 또는 https://www.canva.com/design/DAGh8bZ9l9E/edit)"
          value={testUrl}
          onChange={(e) => setTestUrl(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
            boxSizing: 'border-box'
          }}
          onKeyPress={(e) => e.key === 'Enter' && testDesign()}
        />
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          onClick={testDesign}
          disabled={isTestLoading}
          style={{
            padding: '8px 16px',
            backgroundColor: isTestLoading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isTestLoading ? 'not-allowed' : 'pointer',
            fontSize: '14px'
          }}
        >
          {isTestLoading ? '테스트 중...' : '디자인 테스트'}
        </button>

        {testResult && (
          <button
            onClick={handleUseDesign}
            style={{
              padding: '8px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            이 디자인으로 플립북 만들기
          </button>
        )}
      </div>

      {/* 테스트 결과 */}
      {testResult && (
        <div style={{
          padding: '12px',
          backgroundColor: testResult.validation.success ? '#e8f5e9' : '#ffebee',
          borderRadius: '4px',
          fontSize: '13px'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
            📋 테스트 결과
          </div>
          
          <div><strong>디자인 ID:</strong> {testResult.designId}</div>
          <div><strong>연결 상태:</strong> {testResult.isConnected ? '✅ Canva API 연결됨' : '❌ Mock 모드'}</div>
          <div><strong>검증 결과:</strong> {testResult.validation.success ? '✅ 유효함' : '❌ 유효하지 않음'}</div>
          
          {testResult.designInfo && (
            <>
              <div><strong>실제 디자인 정보:</strong></div>
              <div style={{ marginLeft: '12px', fontSize: '12px', color: '#666' }}>
                <div>제목: {testResult.designInfo.title || 'N/A'}</div>
                <div>생성일: {testResult.designInfo.created_at ? new Date(testResult.designInfo.created_at).toLocaleDateString() : 'N/A'}</div>
                <div>수정일: {testResult.designInfo.updated_at ? new Date(testResult.designInfo.updated_at).toLocaleDateString() : 'N/A'}</div>
              </div>
            </>
          )}
          
          {testResult.validation.data?.designInfo && (
            <>
              <div><strong>검증된 정보:</strong></div>
              <div style={{ marginLeft: '12px', fontSize: '12px', color: '#666' }}>
                {JSON.stringify(testResult.validation.data.designInfo, null, 2)}
              </div>
            </>
          )}
        </div>
      )}

      {/* 에러 표시 */}
      {testError && (
        <div style={{
          padding: '12px',
          backgroundColor: '#ffebee',
          borderRadius: '4px',
          fontSize: '13px',
          color: '#c62828'
        }}>
          <strong>❌ 오류:</strong> {testError}
        </div>
      )}

      {/* 도움말 */}
      <div style={{
        marginTop: '12px',
        padding: '8px',
        backgroundColor: '#fff3e0',
        borderRadius: '4px',
        fontSize: '12px',
        color: '#ef6c00'
      }}>
        <strong>💡 도움말:</strong>
        <ul style={{ margin: '4px 0 0 16px', paddingLeft: 0 }}>
          <li>전체 URL: https://www.canva.com/design/DAGh8bZ9l9E/edit</li>
          <li>디자인 ID만: DAGh8bZ9l9E</li>
          <li>Canva 연결 시 실제 데이터, 미연결 시 Mock 데이터 사용</li>
        </ul>
      </div>
    </div>
  );
};