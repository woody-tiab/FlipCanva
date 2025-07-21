# Canva Connect API 설정 가이드

## 1. Canva Developer 계정 설정

1. [Canva Developer Portal](https://www.canva.dev/)에 접속
2. "Create app" 버튼 클릭
3. 앱 정보 입력:
   - App name: FlipCanva
   - Description: Canva to Flipbook converter
   - Website URL: http://localhost:3002

## 2. 환경변수 설정

`.env` 파일에 다음 정보를 추가하세요:

```env
# Canva API Configuration
CANVA_CLIENT_ID=your_client_id_here
CANVA_CLIENT_SECRET=your_client_secret_here
CANVA_REDIRECT_URI=http://localhost:3002/api/canva/auth/callback
```

## 3. API 사용법

### 3.1 OAuth 인증 프로세스

#### Step 1: 인증 URL 생성
```bash
curl -X GET "http://localhost:3002/api/canva/auth/url?state=random_state_string"
```

Response:
```json
{
  "success": true,
  "data": {
    "authUrl": "https://www.canva.com/api/oauth/authorize?...",
    "codeVerifier": "abc123...", // 저장 필요!
    "message": "Please visit this URL to authorize Canva access..."
  }
}
```

#### Step 2: 사용자가 authUrl 방문하여 승인

#### Step 3: 인증 코드를 액세스 토큰으로 교환
```bash
curl -X POST "http://localhost:3002/api/canva/auth/callback" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "authorization_code_from_callback",
    "codeVerifier": "abc123...", 
    "state": "random_state_string"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "message": "Authorization successful",
    "accessToken": "access_token_here",
    "refreshToken": "refresh_token_here", 
    "expiresAt": 1234567890,
    "scope": "design:meta:read design:content:read"
  }
}
```

### 3.2 디자인 작업

#### 디자인 유효성 검사
```bash
curl -X POST "http://localhost:3002/api/canva/validate-design" \
  -H "Content-Type: application/json" \
  -d '{
    "designId": "DAGabcd1234567890",
    "accessToken": "your_access_token_here"
  }'
```

#### 디자인 이미지 내보내기
```bash
curl -X POST "http://localhost:3002/api/canva/export-design" \
  -H "Content-Type: application/json" \
  -d '{
    "designId": "DAGabcd1234567890",
    "format": "PNG",
    "accessToken": "your_access_token_here"
  }'
```

#### 토큰 갱신
```bash
curl -X POST "http://localhost:3002/api/canva/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "your_refresh_token_here"
  }'
```

## 4. API 제한사항

- **Rate Limits**:
  - Design Info: 100 requests/minute/user
  - Export Jobs: 20 requests/minute/user
  
- **Required Scopes**:
  - `design:meta:read`: 디자인 정보 조회
  - `design:content:read`: 디자인 내보내기

## 5. 에러 처리

모든 API 응답은 다음 형태를 따릅니다:

```json
{
  "success": true/false,
  "data": { ... },        // 성공 시
  "error": {              // 실패 시
    "message": "Error description",
    "code": "ERROR_CODE"
  }
}
```

## 6. Mock 모드

Canva API 키가 설정되지 않은 경우, 자동으로 Mock 모드로 동작합니다:
- 디자인 ID 형식 검증 (DAGxxxxx)
- 플레이스홀더 이미지 반환
- 개발 및 테스트용으로 사용 가능

## 7. 보안 고려사항

- `codeVerifier`는 클라이언트에서 안전하게 저장해야 합니다
- Access token은 서버에서만 처리하세요
- State parameter로 CSRF 공격을 방지하세요
- Token은 안전한 저장소에 보관하세요