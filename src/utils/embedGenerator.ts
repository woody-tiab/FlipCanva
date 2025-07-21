/**
 * 플립북 임베드 코드 및 QR 코드 생성 유틸리티
 */

export interface EmbedOptions {
  width: number;
  height: number;
  responsive: boolean;
  border: boolean;
  allowFullscreen: boolean;
  showControls: boolean;
  autoPlay: boolean;
  startPage: number;
  theme: 'light' | 'dark' | 'auto';
  customCSS?: string;
}

export interface QRCodeOptions {
  size: number; // 픽셀 크기
  format: 'png' | 'jpg' | 'svg';
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
  margin: number;
  darkColor: string;
  lightColor: string;
  logoUrl?: string; // 중앙에 삽입할 로고
  logoSize?: number; // 로고 크기 (%)
}

export interface ShareLinkOptions {
  includeControls: boolean;
  autoPlay: boolean;
  startPage: number;
  theme: 'light' | 'dark' | 'auto';
  hideNavigation?: boolean;
  hideProgress?: boolean;
  customDomain?: string;
}

const DEFAULT_EMBED_OPTIONS: EmbedOptions = {
  width: 800,
  height: 600,
  responsive: true,
  border: false,
  allowFullscreen: true,
  showControls: true,
  autoPlay: false,
  startPage: 0,
  theme: 'auto'
};

const DEFAULT_QR_OPTIONS: QRCodeOptions = {
  size: 256,
  format: 'png',
  errorCorrectionLevel: 'M',
  margin: 2,
  darkColor: '#000000',
  lightColor: '#FFFFFF'
};

const DEFAULT_SHARE_OPTIONS: ShareLinkOptions = {
  includeControls: true,
  autoPlay: false,
  startPage: 0,
  theme: 'auto'
};

class EmbedGenerator {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || window.location.origin;
  }

  // 공유 링크 생성
  generateShareLink(
    flipbookSlug: string,
    options: Partial<ShareLinkOptions> = {}
  ): string {
    const opts = { ...DEFAULT_SHARE_OPTIONS, ...options };
    const params = new URLSearchParams();

    // URL 파라미터 구성
    if (!opts.includeControls) params.set('controls', 'false');
    if (opts.autoPlay) params.set('autoplay', 'true');
    if (opts.startPage > 0) params.set('start', opts.startPage.toString());
    if (opts.theme !== 'auto') params.set('theme', opts.theme);
    if (opts.hideNavigation) params.set('nav', 'false');
    if (opts.hideProgress) params.set('progress', 'false');

    const queryString = params.toString();
    const baseUrl = opts.customDomain || this.baseUrl;
    
    return `${baseUrl}/flipbook/${flipbookSlug}${queryString ? `?${queryString}` : ''}`;
  }

  // iFrame 임베드 코드 생성
  generateIFrameEmbed(
    flipbookSlug: string,
    embedOptions: Partial<EmbedOptions> = {},
    shareOptions: Partial<ShareLinkOptions> = {}
  ): string {
    const opts = { ...DEFAULT_EMBED_OPTIONS, ...embedOptions };
    const shareUrl = this.generateShareLink(flipbookSlug, {
      ...shareOptions,
      includeControls: opts.showControls,
      autoPlay: opts.autoPlay,
      startPage: opts.startPage,
      theme: opts.theme
    });

    // 스타일 속성 구성
    let style = '';
    if (opts.responsive) {
      style = `width: 100%; height: 100%; max-width: ${opts.width}px; max-height: ${opts.height}px;`;
    } else {
      style = `width: ${opts.width}px; height: ${opts.height}px;`;
    }

    if (!opts.border) {
      style += ' border: none;';
    } else {
      style += ' border: 1px solid #ddd;';
    }

    if (opts.customCSS) {
      style += ` ${opts.customCSS}`;
    }

    // iFrame 속성 구성
    const attributes = [
      `src="${shareUrl}"`,
      `style="${style}"`,
      `title="Flipbook - ${flipbookSlug}"`,
      'loading="lazy"',
      'scrolling="no"'
    ];

    if (opts.allowFullscreen) {
      attributes.push('allowfullscreen');
    }

    return `<iframe ${attributes.join(' ')}></iframe>`;
  }

  // JavaScript 임베드 코드 생성 (고급 옵션)
  generateJavaScriptEmbed(
    flipbookSlug: string,
    containerId: string,
    options: Partial<EmbedOptions & ShareLinkOptions> = {}
  ): string {
    const shareUrl = this.generateShareLink(flipbookSlug, options);
    const opts = { ...DEFAULT_EMBED_OPTIONS, ...options };

    return `
<div id="${containerId}"></div>
<script>
(function() {
  var container = document.getElementById('${containerId}');
  if (!container) {
    console.error('Container element not found: ${containerId}');
    return;
  }
  
  var iframe = document.createElement('iframe');
  iframe.src = '${shareUrl}';
  iframe.width = '${opts.responsive ? '100%' : opts.width}';
  iframe.height = '${opts.responsive ? '100%' : opts.height}';
  iframe.style.border = '${opts.border ? '1px solid #ddd' : 'none'}';
  iframe.style.maxWidth = '${opts.width}px';
  iframe.style.maxHeight = '${opts.height}px';
  iframe.title = 'Flipbook - ${flipbookSlug}';
  iframe.loading = 'lazy';
  iframe.scrolling = 'no';
  ${opts.allowFullscreen ? 'iframe.allowFullscreen = true;' : ''}
  
  container.appendChild(iframe);
  
  // 반응형 리사이즈 (옵션)
  ${opts.responsive ? `
  function resizeIframe() {
    var containerWidth = container.offsetWidth;
    var aspectRatio = ${opts.height} / ${opts.width};
    iframe.style.height = (containerWidth * aspectRatio) + 'px';
  }
  
  window.addEventListener('resize', resizeIframe);
  resizeIframe();
  ` : ''}
})();
</script>`;
  }

  // WordPress 쇼트코드 생성
  generateWordPressShortcode(
    flipbookSlug: string,
    options: Partial<EmbedOptions & ShareLinkOptions> = {}
  ): string {
    const opts = { ...DEFAULT_EMBED_OPTIONS, ...options };
    const attributes = [];

    if (opts.width !== DEFAULT_EMBED_OPTIONS.width) {
      attributes.push(`width="${opts.width}"`);
    }
    if (opts.height !== DEFAULT_EMBED_OPTIONS.height) {
      attributes.push(`height="${opts.height}"`);
    }
    if (!opts.showControls) attributes.push('controls="false"');
    if (opts.autoPlay) attributes.push('autoplay="true"');
    if (opts.startPage > 0) attributes.push(`start="${opts.startPage}"`);
    if (opts.theme !== 'auto') attributes.push(`theme="${opts.theme}"`);
    if (!opts.responsive) attributes.push('responsive="false"');

    const attrString = attributes.length > 0 ? ` ${attributes.join(' ')}` : '';
    return `[flipbook slug="${flipbookSlug}"${attrString}]`;
  }

  // React/Vue 컴포넌트 코드 생성
  generateReactComponent(
    flipbookSlug: string,
    options: Partial<EmbedOptions & ShareLinkOptions> = {}
  ): string {
    const shareUrl = this.generateShareLink(flipbookSlug, options);
    const opts = { ...DEFAULT_EMBED_OPTIONS, ...options };

    return `
import React from 'react';

const FlipbookEmbed = () => {
  return (
    <iframe
      src="${shareUrl}"
      width="${opts.responsive ? '100%' : opts.width}"
      height="${opts.responsive ? '100%' : opts.height}"
      style={{
        border: '${opts.border ? '1px solid #ddd' : 'none'}',
        maxWidth: '${opts.width}px',
        maxHeight: '${opts.height}px'
      }}
      title="Flipbook - ${flipbookSlug}"
      loading="lazy"
      scrolling="no"
      ${opts.allowFullscreen ? 'allowFullScreen' : ''}
    />
  );
};

export default FlipbookEmbed;`;
  }

  // QR 코드 옵션 검증
  private validateQROptions(options: Partial<QRCodeOptions>): QRCodeOptions {
    const opts = { ...DEFAULT_QR_OPTIONS, ...options };
    
    // 크기 제한
    opts.size = Math.min(Math.max(opts.size, 64), 2048);
    
    // 여백 제한
    opts.margin = Math.min(Math.max(opts.margin, 0), 10);
    
    // 로고 크기 제한
    if (opts.logoSize) {
      opts.logoSize = Math.min(Math.max(opts.logoSize, 5), 30);
    }
    
    return opts;
  }

  // 임베드 미리보기 HTML 생성
  generatePreviewHTML(
    flipbookSlug: string,
    embedCode: string,
    title: string = 'Flipbook 미리보기'
  ): string {
    return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { 
            margin: 0; 
            padding: 20px; 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
        }
        .container { 
            max-width: 1200px; 
            margin: 0 auto; 
            background: white; 
            padding: 20px; 
            border-radius: 8px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 20px;
            border-bottom: 1px solid #eee;
        }
        .embed-container {
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${title}</h1>
            <p>플립북 임베드 미리보기</p>
        </div>
        <div class="embed-container">
            ${embedCode}
        </div>
    </div>
</body>
</html>`;
  }

  // 소셜 미디어 공유 링크 생성
  generateSocialShareLinks(shareUrl: string, title: string, description?: string) {
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedTitle = encodeURIComponent(title);
    const encodedDesc = description ? encodeURIComponent(description) : '';

    return {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      pinterest: description 
        ? `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedDesc}`
        : `https://pinterest.com/pin/create/button/?url=${encodedUrl}`,
      whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
      email: `mailto:?subject=${encodedTitle}&body=${encodedDesc}%0A%0A${encodedUrl}`
    };
  }

  // 임베드 통계 추적 코드 생성
  generateTrackingCode(flipbookSlug: string, trackingId?: string): string {
    if (!trackingId) return '';

    return `
<script>
(function() {
  // 임베드 조회 추적
  fetch('${this.baseUrl}/api/flipbooks/${flipbookSlug}/embed-view', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      trackingId: '${trackingId}',
      referrer: document.referrer,
      timestamp: Date.now()
    })
  }).catch(console.error);
  
  // 사용자 상호작용 추적
  document.addEventListener('click', function(e) {
    if (e.target.tagName === 'IFRAME' && e.target.src.includes('${flipbookSlug}')) {
      fetch('${this.baseUrl}/api/flipbooks/${flipbookSlug}/embed-interaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackingId: '${trackingId}',
          type: 'click',
          timestamp: Date.now()
        })
      }).catch(console.error);
    }
  });
})();
</script>`;
  }
}

// 싱글톤 인스턴스 생성
let embedGeneratorInstance: EmbedGenerator | null = null;

export const getEmbedGenerator = (baseUrl?: string): EmbedGenerator => {
  if (!embedGeneratorInstance || (baseUrl && embedGeneratorInstance['baseUrl'] !== baseUrl)) {
    embedGeneratorInstance = new EmbedGenerator(baseUrl);
  }
  return embedGeneratorInstance;
};

export default EmbedGenerator;