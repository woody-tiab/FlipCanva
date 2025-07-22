// Production에서는 같은 도메인을 사용하므로 빈 문자열 사용 (상대 경로)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '' : 'http://localhost:3002');

// Canva API Configuration
const CANVA_CLIENT_ID = import.meta.env.VITE_CANVA_CLIENT_ID || 'OC-AZgwBpp_n5_R';
const CANVA_API_BASE_URL = import.meta.env.VITE_CANVA_API_BASE_URL || 'https://api.canva.com/rest/v1';
const CANVA_AUTH_URL = import.meta.env.VITE_CANVA_AUTH_URL || 'https://www.canva.com/api/oauth/authorize';

// Debug log environment variables
console.log('🔧 Canva API Config:', {
  CLIENT_ID: CANVA_CLIENT_ID ? `${CANVA_CLIENT_ID.substring(0, 5)}...` : 'NOT_SET',
  API_BASE_URL: CANVA_API_BASE_URL,
  AUTH_URL: CANVA_AUTH_URL,
  env_available: Object.keys(import.meta.env).filter(k => k.includes('CANVA'))
});

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
  };
}

export interface DesignValidationResult {
  isValid: boolean;
  designId: string;
  designInfo?: {
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
    thumbnail?: string;
  };
}

export interface ExportResult {
  designId: string;
  format: string;
  pages: Array<{
    id: string;
    url: string;
    width: number;
    height: number;
    thumbnail_url?: string;
  }>;
  totalPages: number;
  exportedAt: string;
}

class CanvaApiService {
  private accessToken: string | null = null;

  // OAuth 인증 URL 생성
  async generateAuthUrl(state?: string): Promise<string> {
    if (!CANVA_CLIENT_ID) {
      throw new Error('Canva Client ID가 설정되지 않았습니다.');
    }

    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);
    
    // PKCE verifier를 저장 (실제로는 secure storage 사용 필요)
    sessionStorage.setItem('canva_code_verifier', codeVerifier);

    const params = new URLSearchParams({
      client_id: CANVA_CLIENT_ID,
      response_type: 'code',
      scope: 'design:read design:meta:read asset:read',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      redirect_uri: import.meta.env.VITE_CANVA_REDIRECT_URI || window.location.origin + '/auth/callback',
      ...(state && { state })
    });

    return `${CANVA_AUTH_URL}?${params.toString()}`;
  }

  // PKCE Code Verifier 생성
  private generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, Array.from(array)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  // PKCE Code Challenge 생성
  private async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(hash))))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  // 실제 Canva API 호출
  private async makeCanvaRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    if (!this.accessToken) {
      return {
        success: false,
        error: {
          message: 'Canva 인증이 필요합니다.',
          code: 'AUTH_REQUIRED',
        },
      };
    }

    try {
      const response = await fetch(`${CANVA_API_BASE_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`Canva API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Canva API error',
          code: 'CANVA_API_ERROR',
        },
      };
    }
  }

  // Fallback to our backend API (현재 Mock)
  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/canva${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Network error',
          code: 'NETWORK_ERROR',
        },
      };
    }
  }

  // Access Token 설정
  setAccessToken(token: string) {
    this.accessToken = token;
  }

  // 실제 Canva 디자인 가져오기
  async getDesign(designId: string): Promise<ApiResponse<any>> {
    if (this.accessToken) {
      return this.makeCanvaRequest(`/designs/${designId}`);
    } else {
      // Fallback to Mock API
      return this.makeRequest('/validate-design', {
        method: 'POST',
        body: JSON.stringify({ designId }),
      });
    }
  }

  // 실제 Canva 디자인 내보내기
  async createExportJob(
    designId: string, 
    format: 'PNG' | 'JPG' | 'PDF' = 'PNG',
    pages?: number[]
  ): Promise<ApiResponse<any>> {
    if (this.accessToken) {
      return this.makeCanvaRequest('/exports', {
        method: 'POST',
        body: JSON.stringify({
          design_id: designId,
          format: {
            type: format.toLowerCase()
          },
          ...(pages && { pages })
        }),
      });
    } else {
      // Fallback to Mock API
      return this.makeRequest('/export-design', {
        method: 'POST',
        body: JSON.stringify({ designId, format }),
      });
    }
  }

  // Export Job 상태 확인
  async getExportJob(exportId: string): Promise<ApiResponse<any>> {
    if (this.accessToken) {
      return this.makeCanvaRequest(`/exports/${exportId}`);
    } else {
      // Mock에서는 즉시 완료된 것으로 처리 - CORS 이슈 없는 이미지 사용
      return {
        success: true,
        data: {
          status: 'success',
          urls: [
            { url: 'https://via.placeholder.com/800x1200/667eea/ffffff?text=Page+1' },
            { url: 'https://via.placeholder.com/800x1200/764ba2/ffffff?text=Page+2' },
            { url: 'https://via.placeholder.com/800x1200/a8e6cf/000000?text=Page+3' },
          ]
        }
      };
    }
  }

  async validateDesign(
    designId: string, 
    userId?: string
  ): Promise<ApiResponse<DesignValidationResult>> {
    // 실제 API 사용 시 getDesign 호출
    const designResult = await this.getDesign(designId);
    
    if (designResult.success) {
      return {
        success: true,
        data: {
          isValid: true,
          designId,
          designInfo: designResult.data
        }
      };
    } else {
      return designResult as ApiResponse<DesignValidationResult>;
    }
  }

  async exportDesign(
    designId: string, 
    format: 'PNG' | 'JPG' | 'PDF' = 'PNG',
    userId?: string
  ): Promise<ApiResponse<ExportResult>> {
    // 실제 API 사용 시 export job 생성 후 완료 대기
    const exportJobResult = await this.createExportJob(designId, format);
    
    if (exportJobResult.success && this.accessToken) {
      // Export job 완료 대기 (실제로는 polling 필요)
      const jobResult = await this.getExportJob(exportJobResult.data.id);
      
      if (jobResult.success && jobResult.data.status === 'success') {
        return {
          success: true,
          data: {
            designId,
            format,
            pages: jobResult.data.urls.map((url: any, index: number) => ({
              id: `${designId}_page_${index + 1}`,
              url: url.url,
              width: 800,
              height: 1200,
            })),
            totalPages: jobResult.data.urls.length,
            exportedAt: new Date().toISOString()
          }
        };
      }
    }
    
    // Fallback to Mock API
    return this.makeRequest<ExportResult>('/export-design', {
      method: 'POST',
      body: JSON.stringify({ designId, format, userId }),
    });
  }

  async getDesignInfo(
    designId: string, 
    userId?: string
  ): Promise<ApiResponse<any>> {
    const query = userId ? `?userId=${userId}` : '';
    return this.makeRequest<any>(`/design/${designId}${query}`);
  }

  async getAuthUrl(state?: string): Promise<ApiResponse<{ authUrl: string; message: string }>> {
    const query = state ? `?state=${state}` : '';
    return this.makeRequest<{ authUrl: string; message: string }>(`/auth/url${query}`);
  }

  async handleAuthCallback(
    code: string, 
    state?: string
  ): Promise<ApiResponse<{ message: string; expiresAt: string; scope: string }>> {
    return this.makeRequest<{ message: string; expiresAt: string; scope: string }>('/auth/callback', {
      method: 'POST',
      body: JSON.stringify({ code, state }),
    });
  }

  async revokeAuth(userId?: string): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest<{ message: string }>('/auth/revoke', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }
}

export const canvaApiService = new CanvaApiService();