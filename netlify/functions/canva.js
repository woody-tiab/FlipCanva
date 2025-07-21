// Netlify Functions용 Canva API 핸들러
const { Handler } = require('@netlify/functions');

// 간단한 Mock API 구현
const mockDesignData = {
  'DAGabcd1234567890': {
    id: 'DAGabcd1234567890',
    title: 'Mock Design DAGabcd1234567890',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    thumbnail: {
      url: 'https://via.placeholder.com/800x600?text=Design+DAGabcd1234567890',
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
  // CORS 헤더
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
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
    const path = event.path.replace('/.netlify/functions/canva', '');
    const method = event.httpMethod;
    const body = event.body ? JSON.parse(event.body) : {};

    console.log(`${method} ${path}`, body);

    // 라우팅
    switch (true) {
      case path === '/test' && method === 'GET':
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            message: 'Netlify Canva API is working!',
            timestamp: new Date().toISOString(),
            hasApiKey: false
          }),
        };

      case path === '/validate-design' && method === 'POST':
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

      case path === '/export-design' && method === 'POST':
        const { designId: exportDesignId, format = 'PNG' } = body;
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: mockExportData(exportDesignId)
          }),
        };

      case path === '/auth/url' && method === 'GET':
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: false,
            error: {
              message: 'Canva Client ID not configured in serverless environment',
              code: 'AUTH_URL_ERROR'
            }
          }),
        };

      default:
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            success: false,
            error: {
              message: 'Not Found',
              code: 'NOT_FOUND'
            }
          }),
        };
    }
  } catch (error) {
    console.error('Function error:', error);
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