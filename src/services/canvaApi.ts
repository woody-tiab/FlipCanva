const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';

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

  async validateDesign(
    designId: string, 
    userId?: string
  ): Promise<ApiResponse<DesignValidationResult>> {
    return this.makeRequest<DesignValidationResult>('/validate-design', {
      method: 'POST',
      body: JSON.stringify({ designId, userId }),
    });
  }

  async exportDesign(
    designId: string, 
    format: 'PNG' | 'JPG' | 'PDF' = 'PNG',
    userId?: string
  ): Promise<ApiResponse<ExportResult>> {
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