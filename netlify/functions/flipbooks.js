// Netlify Functions용 Flipbooks API 핸들러
const { v4: uuidv4 } = require('uuid');

// 메모리 기반 임시 저장소 (실제로는 Supabase나 다른 DB 사용 권장)
let flipbooks = [];

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
    const path = event.path.replace('/.netlify/functions/flipbooks', '');
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
            message: 'Netlify Flipbooks API is working!',
            timestamp: new Date().toISOString(),
            totalFlipbooks: flipbooks.length
          }),
        };

      case path === '' && method === 'POST':
        // Create flipbook
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

      case path === '' && method === 'GET':
        // Get all flipbooks
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            data: flipbooks,
            total: flipbooks.length,
            page: 1,
            limit: 20,
          }),
        };

      case path.startsWith('/') && method === 'GET':
        // Get single flipbook
        const flipbookId = path.substring(1);
        const flipbook = flipbooks.find(f => f.id === flipbookId);
        
        if (!flipbook) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({
              success: false,
              error: {
                message: 'Flipbook not found',
                code: 'NOT_FOUND'
              }
            }),
          };
        }
        
        return {
          statusCode: 200,
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