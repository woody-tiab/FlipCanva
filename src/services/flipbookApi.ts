import { 
  FlipbookMetadata, 
  FlipbookListResponse, 
  CreateFlipbookRequest, 
  UpdateFlipbookRequest,
  FlipbookQuery,
  FlipbookStatus 
} from '../types/flipbook';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    message: string;
    code: string;
  };
}

class FlipbookApiService {
  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}/flipbooks${endpoint}`, {
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

  async createFlipbook(
    flipbookData: CreateFlipbookRequest
  ): Promise<ApiResponse<FlipbookMetadata>> {
    return this.makeRequest<FlipbookMetadata>('', {
      method: 'POST',
      body: JSON.stringify(flipbookData),
    });
  }

  async getFlipbooks(
    query: FlipbookQuery = {}
  ): Promise<ApiResponse<FlipbookListResponse>> {
    const params = new URLSearchParams();
    
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });

    const queryString = params.toString();
    const endpoint = queryString ? `?${queryString}` : '';
    
    return this.makeRequest<FlipbookListResponse>(endpoint);
  }

  async getFlipbook(
    id: string, 
    includePages = true
  ): Promise<ApiResponse<FlipbookMetadata>> {
    const params = includePages ? '' : '?includePages=false';
    return this.makeRequest<FlipbookMetadata>(`/${id}${params}`);
  }

  async getFlipbookByCanvaId(
    canvaDesignId: string
  ): Promise<ApiResponse<FlipbookMetadata | null>> {
    return this.makeRequest<FlipbookMetadata | null>(`/canva/${canvaDesignId}`);
  }

  async updateFlipbook(
    id: string, 
    updateData: UpdateFlipbookRequest
  ): Promise<ApiResponse<FlipbookMetadata>> {
    return this.makeRequest<FlipbookMetadata>(`/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async updateFlipbookStatus(
    id: string, 
    status: FlipbookStatus
  ): Promise<ApiResponse<FlipbookMetadata>> {
    return this.makeRequest<FlipbookMetadata>(`/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async incrementViewCount(id: string): Promise<ApiResponse<void>> {
    return this.makeRequest<void>(`/${id}/view`, {
      method: 'POST',
    });
  }

  async deleteFlipbook(id: string): Promise<ApiResponse<void>> {
    return this.makeRequest<void>(`/${id}`, {
      method: 'DELETE',
    });
  }

  // Helper methods for common queries
  async getMyFlipbooks(
    userId: string, 
    page = 1, 
    limit = 20
  ): Promise<ApiResponse<FlipbookListResponse>> {
    return this.getFlipbooks({
      userId,
      page,
      limit,
      sortBy: 'updatedAt',
      sortOrder: 'DESC',
    });
  }

  async getPublishedFlipbooks(
    page = 1, 
    limit = 20
  ): Promise<ApiResponse<FlipbookListResponse>> {
    return this.getFlipbooks({
      status: FlipbookStatus.PUBLISHED,
      visibility: 'public' as any,
      page,
      limit,
      sortBy: 'createdAt',
      sortOrder: 'DESC',
    });
  }

  async getFeaturedFlipbooks(
    page = 1, 
    limit = 10
  ): Promise<ApiResponse<FlipbookListResponse>> {
    return this.getFlipbooks({
      isFeatured: true,
      status: FlipbookStatus.PUBLISHED,
      visibility: 'public' as any,
      page,
      limit,
      sortBy: 'viewCount',
      sortOrder: 'DESC',
    });
  }

  async searchFlipbooks(
    searchTerm: string, 
    page = 1, 
    limit = 20
  ): Promise<ApiResponse<FlipbookListResponse>> {
    return this.getFlipbooks({
      search: searchTerm,
      status: FlipbookStatus.PUBLISHED,
      visibility: 'public' as any,
      page,
      limit,
      sortBy: 'viewCount',
      sortOrder: 'DESC',
    });
  }
}

export const flipbookApiService = new FlipbookApiService();