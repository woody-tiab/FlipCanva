import React, { useState, useEffect } from 'react';
import { canvaApiService } from '../services/canvaApi';

interface CanvaConnectionStatusProps {
  onConnectionChange?: (isConnected: boolean) => void;
}

export const CanvaConnectionStatus: React.FC<CanvaConnectionStatusProps> = ({
  onConnectionChange
}) => {
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected' | 'error'>('checking');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkConnection = async () => {
    try {
      setConnectionStatus('checking');
      setError(null);
      
      // Check if access token exists
      const token = canvaApiService.getAccessToken();
      setAccessToken(token);
      
      if (!token) {
        setConnectionStatus('disconnected');
        onConnectionChange?.(false);
        return;
      }

      // Test API connection with user info
      const userResponse = await canvaApiService.getCurrentUser();
      
      if (userResponse.success && userResponse.data) {
        setConnectionStatus('connected');
        setUserInfo(userResponse.data);
        onConnectionChange?.(true);
      } else {
        setConnectionStatus('disconnected');
        setError('토큰이 만료되었거나 유효하지 않습니다.');
        onConnectionChange?.(false);
      }
    } catch (err) {
      setConnectionStatus('error');
      setError(err instanceof Error ? err.message : '연결 확인 중 오류가 발생했습니다.');
      onConnectionChange?.(false);
    } finally {
      setLastChecked(new Date());
    }
  };

  const handleConnect = () => {
    window.location.href = canvaApiService.generateAuthUrl();
  };

  const handleDisconnect = () => {
    canvaApiService.clearTokens();
    setAccessToken(null);
    setUserInfo(null);
    setConnectionStatus('disconnected');
    onConnectionChange?.(false);
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'checking': return '🔄';
      case 'connected': return '✅';
      case 'disconnected': return '❌';
      case 'error': return '⚠️';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'checking': return '연결 확인 중...';
      case 'connected': return 'Canva에 연결됨';
      case 'disconnected': return 'Canva에 연결되지 않음';
      case 'error': return '연결 오류';
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'checking': return '#666';
      case 'connected': return '#28a745';
      case 'disconnected': return '#dc3545';
      case 'error': return '#ffc107';
    }
  };

  return (
    <div className="canva-connection-status">
      <div className="status-header" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        padding: '12px',
        border: '1px solid #ddd',
        borderRadius: '8px',
        backgroundColor: '#f8f9fa'
      }}>
        <span style={{ fontSize: '18px' }}>{getStatusIcon()}</span>
        <div style={{ flex: 1 }}>
          <div style={{ 
            fontWeight: 'bold', 
            color: getStatusColor(),
            fontSize: '14px'
          }}>
            {getStatusText()}
          </div>
          {lastChecked && (
            <div style={{ fontSize: '12px', color: '#666' }}>
              마지막 확인: {lastChecked.toLocaleTimeString('ko-KR')}
            </div>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={checkConnection}
            disabled={connectionStatus === 'checking'}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              backgroundColor: '#fff',
              cursor: connectionStatus === 'checking' ? 'not-allowed' : 'pointer'
            }}
          >
            새로고침
          </button>
          
          {connectionStatus === 'connected' ? (
            <button
              onClick={handleDisconnect}
              style={{
                padding: '4px 8px',
                fontSize: '12px',
                border: '1px solid #dc3545',
                borderRadius: '4px',
                backgroundColor: '#dc3545',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              연결 해제
            </button>
          ) : (
            <button
              onClick={handleConnect}
              style={{
                padding: '4px 8px',
                fontSize: '12px',
                border: '1px solid #28a745',
                borderRadius: '4px',
                backgroundColor: '#28a745',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              Canva 연결
            </button>
          )}
        </div>
      </div>

      {/* Connection Details */}
      {connectionStatus === 'connected' && userInfo && (
        <div style={{
          marginTop: '8px',
          padding: '8px',
          backgroundColor: '#e8f5e9',
          borderRadius: '4px',
          fontSize: '12px'
        }}>
          <div><strong>사용자:</strong> {userInfo.display_name || userInfo.email || 'N/A'}</div>
          {accessToken && (
            <div><strong>토큰:</strong> {accessToken.substring(0, 20)}...</div>
          )}
        </div>
      )}

      {/* Error Details */}
      {error && (
        <div style={{
          marginTop: '8px',
          padding: '8px',
          backgroundColor: '#ffeaa7',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#d63031'
        }}>
          <strong>오류:</strong> {error}
        </div>
      )}

      {/* Mock Mode Warning */}
      {connectionStatus === 'disconnected' && (
        <div style={{
          marginTop: '8px',
          padding: '8px',
          backgroundColor: '#fff3cd',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#856404'
        }}>
          ⚠️ <strong>Mock 모드:</strong> Canva에 연결되지 않았습니다. 테스트용 데이터를 사용합니다.
        </div>
      )}
    </div>
  );
};