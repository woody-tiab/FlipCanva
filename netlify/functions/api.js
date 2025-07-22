// 통합 API 핸들러 - 모든 API 요청을 처리
const uuidv4 = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// 메모리 기반 임시 저장소
let flipbooks = [];

// Mock 디자인 데이터
const mockDesignData = {
  'DAGh8bZ9l9E': {
    id: 'DAGh8bZ9l9E',
    title: 'Mock Design DAGh8bZ9l9E',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    thumbnail: {
      url: 'https://via.placeholder.com/800x600?text=Design+DAGh8bZ9l9E',
      width: 800,
      height: 600,
    }
  }
};

const mockExportData = (designId) => ({
  designId,
  format: 'PNG',
  pages: [
    {
      id: `${designId}_page_1`,
      url: `https://picsum.photos/800/1200?random=1`,
      width: 800,
      height: 1200,
    },
    {
      id: `${designId}_page_2`,
      url: `https://picsum.photos/800/1200?random=2`,
      width: 800,
      height: 1200,
    },
    {
      id: `${designId}_page_3`,
      url: `https://picsum.photos/800/1200?random=3`,
      width: 800,
      height: 1200,
    }
  ],
  totalPages: 3,
  exportedAt: new Date().toISOString()
});

exports.handler = async (event, context) => {
  console.log('🔥 API Request:', event.httpMethod, event.path, event.body);

  // CORS 헤더
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json',
  };

  // OPTIONS 요청 처리
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    // Headers에서 원본 URL 추출
    const originalUrl = event.headers['x-forwarded-proto'] + '://' + event.headers['host'] + event.headers['x-nf-request-id'] || event.path;
    const referer = event.headers.referer || '';
    
    console.log('🎯 Event path:', event.path);
    console.log('🎯 Headers host:', event.headers.host);
    console.log('🎯 Referer:', referer);
    console.log('🎯 All headers:', JSON.stringify(event.headers, null, 2));
    
    // URL에서 /api/ 이후 경로 추출
    let apiPath = '/';
    
    // event.path에서 추출 시도
    if (event.path && event.path !== '/.netlify/functions/api') {
      apiPath = event.path;
    }
    
    const method = event.httpMethod;
    const body = event.body ? JSON.parse(event.body) : {};

    console.log('🎯 Final API path:', apiPath, 'Method:', method);

    // === CANVA API ROUTES === 
    // Headers에서 원본 요청 경로 확인
    const xOriginalURL = event.headers['x-nf-original-url'] || '';
    const isCanvaAPI = xOriginalURL.includes('/api/canva/') || apiPath.includes('/canva/');
    
    console.log('🎯 X-NF-Original-URL:', xOriginalURL);
    console.log('🎯 Is Canva API:', isCanvaAPI);
    
    if (isCanvaAPI) {
      // 원본 URL에서 endpoint 추출
      let canvaPath = 'validate-design'; // 기본값
      if (xOriginalURL.includes('/api/canva/')) {
        canvaPath = xOriginalURL.split('/api/canva/')[1] || 'validate-design';
      }
      
      console.log('🎨 Canva route detected. canvaPath:', canvaPath);
      
      switch (true) {
        case canvaPath === 'test' && method === 'GET':
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              message: 'Netlify Canva API is working!',
              timestamp: new Date().toISOString(),
              hasApiKey: false
            }),
          };

        case canvaPath === 'validate-design' && method === 'POST':
          const { designId } = body;
          const designIdPattern = /^DAG[a-zA-Z0-9_-]{8,}$/;
          const isValid = designIdPattern.test(designId);
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              data: {
                isValid,
                designInfo: isValid ? mockDesignData[designId] || {
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
              }
            }),
          };

        case canvaPath === 'export-design' && method === 'POST':
          const { designId: exportDesignId, format = 'PNG' } = body;
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              data: mockExportData(exportDesignId)
            }),
          };

        default:
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({
              success: false,
              error: {
                message: `Canva endpoint not found: ${canvaPath}`,
                code: 'NOT_FOUND'
              }
            }),
          };
      }
    }

    // === FLIPBOOK API ROUTES ===
    const isFlipbookAPI = xOriginalURL.includes('/flipbooks') || apiPath.includes('/flipbooks');
    
    if (isFlipbookAPI) {
      let flipbookPath = '';
      if (xOriginalURL.includes('/flipbooks')) {
        flipbookPath = xOriginalURL.split('/flipbooks')[1] || '';
      }
      
      console.log('📚 Flipbook route detected. flipbookPath:', flipbookPath);
      
      switch (true) {
        case flipbookPath === '/test' && method === 'GET':
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              message: 'Netlify Flipbooks API is working!',
              timestamp: new Date().toISOString(),
              totalFlipbooks: flipbooks.length
            }),
          };

        case (flipbookPath === '' || flipbookPath === '/') && method === 'POST':
          const flipbook = {
            id: uuidv4(),
            ...body,
            status: 'draft',
            visibility: 'private',
            viewCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          
          flipbooks.push(flipbook);
          
          return {
            statusCode: 201,
            headers,
            body: JSON.stringify({
              success: true,
              data: flipbook
            }),
          };

        default:
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({
              success: false,
              error: {
                message: `Flipbook endpoint not found: ${flipbookPath}`,
                code: 'NOT_FOUND'
              }
            }),
          };
      }
    }

    // Default 404
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        success: false,
        error: {
          message: `API endpoint not found: ${path}`,
          code: 'NOT_FOUND',
          availableEndpoints: [
            '/canva/test',
            '/canva/validate-design',
            '/canva/export-design',
            '/flipbooks/test',
            '/flipbooks'
          ]
        }
      }),
    };

  } catch (error) {
    console.error('🚨 Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: {
          message: error.message,
          code: 'INTERNAL_ERROR'
        }
      }),
    };
  }
};