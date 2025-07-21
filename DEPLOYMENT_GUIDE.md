# 🚀 FlipCanva GitHub Pages 배포 가이드

## 📋 배포 아키텍처

```
GitHub Pages (정적 사이트)  ←→  Vercel (백엔드 API)
     (프론트엔드)                  (NestJS 서버)
```

## 1️⃣ 백엔드 배포 (Vercel)

### 1.1 Vercel 계정 생성
1. [vercel.com](https://vercel.com)에서 GitHub으로 로그인
2. 새 프로젝트 생성

### 1.2 백엔드 배포
```bash
cd backend
npm install -g vercel
vercel --prod
```

### 1.3 환경변수 설정 (Vercel Dashboard)
```env
NODE_ENV=production
DB_PATH=/tmp/database.sqlite
CANVA_CLIENT_ID=your_canva_client_id
CANVA_CLIENT_SECRET=your_canva_client_secret
CANVA_REDIRECT_URI=https://your-vercel-app.vercel.app/api/canva/auth/callback
CORS_ORIGIN=https://your-username.github.io
```

## 2️⃣ 프론트엔드 배포 (GitHub Pages)

### 2.1 GitHub Repository 설정
1. GitHub에서 새 Repository 생성: `FlipCanva`
2. 코드 업로드:

```bash
cd /home/kimwoody/ClaudeCode/FlipCanva
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/FlipCanva.git
git push -u origin main
```

### 2.2 GitHub Pages 활성화
1. Repository Settings → Pages
2. Source: "GitHub Actions" 선택
3. GitHub Actions 워크플로우가 자동 실행됩니다

### 2.3 GitHub Secrets 설정
Repository Settings → Secrets and variables → Actions에서 추가:

```
VITE_API_BASE_URL=https://your-backend.vercel.app
VITE_CANVA_CLIENT_ID=your_canva_client_id
```

## 3️⃣ 대안 배포 옵션

### Option A: Netlify Functions
```bash
# netlify.toml 설정 필요
npm run build
netlify deploy --prod --dir=dist
```

### Option B: Railway
```bash
railway login
railway new
railway add
railway deploy
```

### Option C: Render
1. [render.com](https://render.com) 연결
2. GitHub Repository 연결
3. 자동 배포 설정

## 4️⃣ 도메인 설정 (선택사항)

### Custom Domain for GitHub Pages
1. Repository Settings → Pages
2. Custom domain 입력: `flipcanva.your-domain.com`
3. DNS CNAME 레코드 추가:
   ```
   CNAME flipcanva your-username.github.io
   ```

### Custom Domain for Vercel
1. Vercel Dashboard → Domains
2. Add domain: `api.your-domain.com`
3. DNS 설정 따라 진행

## 5️⃣ 배포 후 확인사항

### ✅ 체크리스트
- [ ] 프론트엔드가 https://your-username.github.io/FlipCanva에서 접근 가능
- [ ] 백엔드 API가 https://your-backend.vercel.app에서 응답
- [ ] CORS 설정이 올바르게 동작
- [ ] Canva API 연동이 정상 작동
- [ ] 모든 환경변수가 올바르게 설정됨

### 🐛 문제 해결

**CORS 에러 발생시:**
```javascript
// backend/src/main.ts에서 CORS 설정 확인
app.enableCors({
  origin: [
    'https://your-username.github.io',
    'http://localhost:5173', // 개발환경
  ],
  credentials: true,
});
```

**빌드 실패시:**
```bash
# 로컬에서 테스트
npm run build
npm run preview
```

## 6️⃣ 지속적 배포 (CI/CD)

### 자동 배포 트리거
- `main` 브랜치에 push할 때마다 자동 배포
- Pull Request 시 미리보기 배포 (선택사항)

### 환경별 배포
```yaml
# .github/workflows/deploy.yml
env:
  VITE_API_BASE_URL: ${{ secrets.VITE_API_BASE_URL }}
  VITE_CANVA_CLIENT_ID: ${{ secrets.VITE_CANVA_CLIENT_ID }}
```

## 🔧 고급 설정

### Database 영구 저장 (선택사항)
- **PlanetScale** (MySQL)
- **Supabase** (PostgreSQL) 
- **FaunaDB** (NoSQL)

### CDN 설정
- **Cloudflare** for global performance
- **AWS CloudFront** for enterprise

### 모니터링
- **Vercel Analytics**
- **Google Analytics**
- **Sentry** for error tracking

---

## 🎯 최종 URL 구조

```
프론트엔드: https://your-username.github.io/FlipCanva/
백엔드 API: https://your-backend.vercel.app/api/
Canva OAuth: https://your-backend.vercel.app/api/canva/auth/url
```

이제 전 세계 어디서나 FlipCanva를 사용할 수 있습니다! 🌍