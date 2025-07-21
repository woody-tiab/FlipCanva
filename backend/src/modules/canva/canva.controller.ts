import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { CanvaService } from './canva.service';

@Controller('api/canva')
export class CanvaController {
  constructor(private readonly canvaService: CanvaService) {}

  // Test endpoint
  @Get('test')
  async test() {
    return {
      message: 'Canva API module is working!',
      timestamp: new Date().toISOString(),
      hasApiKey: !!process.env.CANVA_CLIENT_ID
    };
  }

  // Get OAuth authorization URL (PKCE 포함)
  @Get('auth/url')
  async getAuthUrl(@Query('state') state?: string) {
    try {
      const authData = await this.canvaService.getAuthorizationUrl(state);
      return {
        success: true,
        data: { 
          authUrl: authData.authUrl,
          codeVerifier: authData.codeVerifier, // 클라이언트에서 저장해야 함
          message: 'Please visit this URL to authorize Canva access. Store the codeVerifier for token exchange.'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.message,
          code: 'AUTH_URL_ERROR'
        }
      };
    }
  }

  // Handle OAuth callback (PKCE 포함)
  @Post('auth/callback')
  async handleCallback(
    @Body('code') code: string,
    @Body('codeVerifier') codeVerifier: string,
    @Body('state') state?: string
  ) {
    try {
      const tokenData = await this.canvaService.exchangeCodeForToken(code, codeVerifier, state);
      return {
        success: true,
        data: {
          message: 'Authorization successful',
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresAt: tokenData.expires_at,
          scope: tokenData.scope
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.message,
          code: 'AUTH_CALLBACK_ERROR'
        }
      };
    }
  }

  // Validate design ID
  @Post('validate-design')
  async validateDesign(
    @Body('designId') designId: string,
    @Body('accessToken') accessToken?: string
  ) {
    try {
      const validation = await this.canvaService.validateDesign(designId, accessToken);
      return {
        success: true,
        data: validation
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.message,
          code: 'DESIGN_VALIDATION_ERROR'
        }
      };
    }
  }

  // Export design to images
  @Post('export-design')
  async exportDesign(
    @Body('designId') designId: string,
    @Body('format') format: 'PNG' | 'JPG' | 'PDF' = 'PNG',
    @Body('accessToken') accessToken?: string
  ) {
    try {
      const exportResult = await this.canvaService.exportDesign(designId, format, accessToken);
      return {
        success: true,
        data: exportResult
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.message,
          code: 'DESIGN_EXPORT_ERROR'
        }
      };
    }
  }

  // Get design info
  @Post('design-info')
  async getDesignInfo(
    @Body('designId') designId: string,
    @Body('accessToken') accessToken?: string
  ) {
    try {
      const designInfo = await this.canvaService.getDesignInfo(designId, accessToken);
      return {
        success: true,
        data: designInfo
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.message,
          code: 'DESIGN_INFO_ERROR'
        }
      };
    }
  }

  // Refresh access token
  @Post('auth/refresh')
  async refreshToken(@Body('refreshToken') refreshToken: string) {
    try {
      const tokenData = await this.canvaService.refreshToken(refreshToken);
      return {
        success: true,
        data: {
          message: 'Token refreshed successfully',
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresAt: tokenData.expires_at,
          scope: tokenData.scope
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.message,
          code: 'TOKEN_REFRESH_ERROR'
        }
      };
    }
  }
}