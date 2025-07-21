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
      url: `https://via.placeholder.com/800x1200/4A90E2/FFFFFF?text=Page+1`,
      width: 800,
      height: 1200,
    },
    {
      id: `${designId}_page_2`,
      url: `https://via.placeholder.com/800x1200/50C878/FFFFFF?text=Page+2`,
      width: 800,
      height: 1200,
    },
    {
      id: `${designId}_page_3`,
      url: `https://via.placeholder.com/800x1200/FF6B6B/FFFFFF?text=Page+3`,
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
    // Netlify에서 :splat으로 전달되는 경로 처리
    const path = event.path.includes('/.netlify/functions/api') 
      ? event.path.replace('/.netlify/functions/api', '')
      : '/' + (event.queryStringParameters?.splat || '');
    
    const method = event.httpMethod;
    const body = event.body ? JSON.parse(event.body) : {};

    console.log('🎯 Original path:', event.path);
    console.log('🎯 Processed path:', path, 'Method:', method, 'Body:', body);

    // === CANVA API ROUTES ===
    if (path.includes('/canva/') || path.includes('canva/')) {
      const canvaPath = path.includes('/canva/') 
        ? path.split('/canva/')[1] 
        : path.split('canva/')[1];
      
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
    if (path.startsWith('/flipbooks')) {
      const flipbookPath = path.replace('/flipbooks', '');
      
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

        case flipbookPath === '' && method === 'POST':
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
            body: JSON.stringify(flipbook),
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