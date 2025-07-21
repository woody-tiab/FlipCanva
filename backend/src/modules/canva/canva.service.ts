import { Injectable, BadRequestException, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface CanvaAuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at: number;
  scope: string;
  refresh_token?: string;
}

export interface CanvaDesignInfo {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  thumbnail?: {
    url: string;
    width: number;
    height: number;
  };
}

export interface CanvaExportResult {
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

@Injectable()
export class CanvaService {
  private readonly logger = new Logger(CanvaService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly baseUrl = 'https://api.canva.com/rest/v1';

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.clientId = this.configService.get<string>('CANVA_CLIENT_ID');
    this.clientSecret = this.configService.get<string>('CANVA_CLIENT_SECRET');
    this.redirectUri = this.configService.get<string>('CANVA_REDIRECT_URI');

    if (!this.clientId || !this.clientSecret) {
      this.logger.warn('Canva API credentials not configured. Set CANVA_CLIENT_ID and CANVA_CLIENT_SECRET.');
    }
  }

  // PKCE용 코드 생성
  private generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    // Node.js의 crypto 모듈 사용 (더 안전)
    const crypto = require('crypto');
    crypto.randomFillSync(array);
    return Buffer.from(array).toString('base64url');
  }

  private async generateCodeChallenge(verifier: string): Promise<string> {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(verifier).digest();
    return Buffer.from(hash).toString('base64url');
  }

  // OAuth 인증 URL 생성 (PKCE 포함)
  async getAuthorizationUrl(state?: string): Promise<{ authUrl: string; codeVerifier: string }> {
    if (!this.clientId) {
      throw new BadRequestException('Canva Client ID not configured');
    }

    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);

    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      scope: 'design:meta:read design:content:read',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    if (state) {
      params.append('state', state);
    }

    return {
      authUrl: `https://www.canva.com/api/oauth/authorize?${params.toString()}`,
      codeVerifier
    };
  }

  // 인증 코드를 액세스 토큰으로 교환 (PKCE 포함)
  async exchangeCodeForToken(code: string, codeVerifier: string, state?: string): Promise<CanvaAuthToken> {
    if (!this.clientId || !this.clientSecret) {
      throw new BadRequestException('Canva API credentials not configured');
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post('https://api.canva.com/rest/v1/oauth/token', {
          grant_type: 'authorization_code',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          redirect_uri: this.redirectUri,
          code,
          code_verifier: codeVerifier,
        }, {
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );

      const tokenData = response.data;
      
      return {
        ...tokenData,
        expires_at: Date.now() + (tokenData.expires_in * 1000),
      };
    } catch (error) {
      this.logger.error('Token exchange failed:', error.response?.data || error.message);
      throw new UnauthorizedException('Failed to exchange authorization code');
    }
  }

  // 디자인 ID 유효성 검사
  async validateDesign(designId: string, accessToken?: string): Promise<{ isValid: boolean; designInfo?: any }> {
    // Canva API가 없을 때의 Mock 구현
    if (!this.clientId) {
      this.logger.warn('Canva API not configured - using mock validation');
      
      // 캔바 디자인 ID 형식 검증 (DAGxxxxx 형태)
      const designIdPattern = /^DAG[a-zA-Z0-9_-]{8,}$/;
      const isValid = designIdPattern.test(designId);
      
      return {
        isValid,
        designInfo: isValid ? {
          id: designId,
          title: `Mock Design ${designId}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          thumbnail: {
            url: `https://via.placeholder.com/800x600?text=Design+${designId}`,
            width: 800,
            height: 600,
          }
        } : undefined
      };
    }

    // 실제 Canva API 구현
    try {
      if (!accessToken) {
        throw new BadRequestException('Access token required for design validation');
      }
      
      const designInfo = await this.getDesignInfo(designId, accessToken);
      return {
        isValid: true,
        designInfo
      };
    } catch (error) {
      this.logger.error('Design validation failed:', error.message);
      return {
        isValid: false
      };
    }
  }

  // 디자인 정보 조회
  async getDesignInfo(designId: string, accessToken: string): Promise<CanvaDesignInfo> {
    if (!this.clientId) {
      // Mock 데이터 반환
      return {
        id: designId,
        title: `Mock Design ${designId}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        thumbnail: {
          url: `https://via.placeholder.com/800x600?text=Design+${designId}`,
          width: 800,
          height: 600,
        }
      };
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/designs/${designId}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        })
      );

      const data = response.data;
      return {
        id: data.id,
        title: data.title || `Design ${designId}`,
        created_at: data.created_at,
        updated_at: data.updated_at,
        thumbnail: data.thumbnail ? {
          url: data.thumbnail.url,
          width: data.thumbnail.width,
          height: data.thumbnail.height,
        } : undefined
      };
    } catch (error) {
      this.logger.error(`Failed to get design info for ${designId}:`, error.response?.data || error.message);
      throw new BadRequestException('Failed to retrieve design information');
    }
  }

  // 디자인을 이미지로 내보내기 (Async Job 방식)
  async exportDesign(designId: string, format: 'PNG' | 'JPG' | 'PDF' = 'PNG', accessToken?: string): Promise<CanvaExportResult> {
    if (!this.clientId) {
      // Mock 데이터 반환
      const mockPages = [
        {
          id: `${designId}_page_1`,
          url: `https://via.placeholder.com/800x1200/4A90E2/FFFFFF?text=Page+1`,
          width: 800,
          height: 1200,
          thumbnail_url: `https://via.placeholder.com/200x300/4A90E2/FFFFFF?text=Page+1+Thumb`
        },
        {
          id: `${designId}_page_2`,
          url: `https://via.placeholder.com/800x1200/50C878/FFFFFF?text=Page+2`,
          width: 800,
          height: 1200,
          thumbnail_url: `https://via.placeholder.com/200x300/50C878/FFFFFF?text=Page+2+Thumb`
        },
        {
          id: `${designId}_page_3`,
          url: `https://via.placeholder.com/800x1200/FF6B6B/FFFFFF?text=Page+3`,
          width: 800,
          height: 1200,
          thumbnail_url: `https://via.placeholder.com/200x300/FF6B6B/FFFFFF?text=Page+3+Thumb`
        }
      ];

      return {
        designId,
        format,
        pages: mockPages,
        totalPages: mockPages.length,
        exportedAt: new Date().toISOString()
      };
    }

    if (!accessToken) {
      throw new BadRequestException('Access token required for design export');
    }

    try {
      // Step 1: Create export job
      const exportJobResponse = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/exports`, {
          design_id: designId,
          format: {
            type: format.toLowerCase()
          }
        }, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        })
      );

      const jobId = exportJobResponse.data.job.id;
      this.logger.log(`Created export job ${jobId} for design ${designId}`);

      // Step 2: Poll job status with exponential backoff
      const exportResult = await this.pollExportJob(jobId, accessToken);
      
      return {
        designId,
        format,
        pages: exportResult.urls.map((url, index) => ({
          id: `${designId}_page_${index + 1}`,
          url,
          width: exportResult.pages?.[index]?.width || 800,
          height: exportResult.pages?.[index]?.height || 1200,
        })),
        totalPages: exportResult.urls.length,
        exportedAt: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Export failed for design ${designId}:`, error.response?.data || error.message);
      throw new BadRequestException('Design export failed');
    }
  }

  // Export job 상태 폴링 (Exponential Backoff)
  private async pollExportJob(jobId: string, accessToken: string, maxAttempts = 30): Promise<any> {
    let attempt = 0;
    let delay = 1000; // 시작 딜레이 1초

    while (attempt < maxAttempts) {
      try {
        const response = await firstValueFrom(
          this.httpService.get(`${this.baseUrl}/exports/${jobId}`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          })
        );

        const job = response.data.job;
        
        if (job.status === 'success') {
          return job.result;
        } else if (job.status === 'failed') {
          throw new BadRequestException(`Export job failed: ${job.error?.message || 'Unknown error'}`);
        }

        // 아직 진행 중이면 대기
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * 1.5, 10000); // 최대 10초까지 증가
        attempt++;
        
      } catch (error) {
        if (error.response?.status === 404) {
          throw new BadRequestException('Export job not found');
        }
        throw error;
      }
    }

    throw new BadRequestException('Export job timed out');
  }

  // 토큰 갱신
  async refreshToken(refreshToken: string): Promise<CanvaAuthToken> {
    if (!this.clientId || !this.clientSecret) {
      throw new BadRequestException('Canva API credentials not configured');
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post('https://api.canva.com/rest/v1/oauth/token', {
          grant_type: 'refresh_token',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: refreshToken,
        }, {
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );

      const tokenData = response.data;
      
      return {
        ...tokenData,
        expires_at: Date.now() + (tokenData.expires_in * 1000),
      };
    } catch (error) {
      this.logger.error('Token refresh failed:', error.response?.data || error.message);
      throw new UnauthorizedException('Failed to refresh access token');
    }
  }
}