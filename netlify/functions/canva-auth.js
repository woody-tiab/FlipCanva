// Canva OAuth 콜백 처리 함수
exports.handler = async (event, context) => {
  console.log('🔑 Canva Auth handler called:', event.httpMethod, event.path);

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
    // Client Secret은 환경 변수에서 가져옴 (Netlify 설정에서 추가 필요)
    const CLIENT_ID = process.env.CANVA_CLIENT_ID || 'OC-AZgwBpp_n5_R';
    const CLIENT_SECRET = process.env.CANVA_CLIENT_SECRET;
    
    console.log('🔧 Environment check:', {
      CLIENT_ID: CLIENT_ID ? `${CLIENT_ID.substring(0, 5)}...` : 'NOT_SET',
      CLIENT_SECRET: CLIENT_SECRET ? `${CLIENT_SECRET.substring(0, 5)}...` : 'NOT_SET',
      env_keys: Object.keys(process.env).filter(k => k.includes('CANVA'))
    });
    
    if (!CLIENT_SECRET) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: {
            message: 'Canva Client Secret이 설정되지 않았습니다.',
            code: 'CONFIG_ERROR',
            debug: {
              available_env: Object.keys(process.env).filter(k => k.includes('CANVA'))
            }
          }
        }),
      };
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { code, code_verifier } = body;

      if (!code || !code_verifier) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: {
              message: '인증 코드와 code_verifier가 필요합니다.',
              code: 'MISSING_PARAMS'
            }
          }),
        };
      }

      // Canva Token Exchange
      const tokenResponse = await fetch('https://api.canva.com/rest/v1/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: CLIENT_ID,
          code: code,
          code_verifier: code_verifier,
          redirect_uri: process.env.CANVA_REDIRECT_URI || 'https://flipcanva.netlify.app/auth/callback'
        }).toString()
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text();
        console.error('🚨 Token exchange failed:', tokenResponse.status, errorData);
        
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: {
              message: 'Canva 토큰 교환에 실패했습니다.',
              code: 'TOKEN_EXCHANGE_FAILED',
              details: errorData
            }
          }),
        };
      }

      const tokenData = await tokenResponse.json();
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          access_token: tokenData.access_token,
          token_type: tokenData.token_type,
          expires_in: tokenData.expires_in,
          scope: tokenData.scope
        }),
      };
    }

    if (event.httpMethod === 'GET') {
      // 테스트 엔드포인트
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Canva Auth function is working!',
          environment: {
            CLIENT_ID: CLIENT_ID ? `${CLIENT_ID.substring(0, 5)}...` : 'NOT_SET',
            CLIENT_SECRET: CLIENT_SECRET ? 'SET' : 'NOT_SET',
            available_env: Object.keys(process.env).filter(k => k.includes('CANVA'))
          }
        }),
      };
    }

    // 다른 HTTP 메서드는 지원하지 않음
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        success: false,
        error: {
          message: '지원하지 않는 HTTP 메서드입니다.',
          code: 'METHOD_NOT_ALLOWED'
        }
      }),
    };

  } catch (error) {
    console.error('🚨 Canva Auth error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: {
          message: error.message || '인증 처리 중 오류가 발생했습니다.',
          code: 'INTERNAL_ERROR'
        }
      }),
    };
  }
};