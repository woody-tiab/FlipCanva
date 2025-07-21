# 💰 FlipCanva 완전 무료 배포 가이드

## 🆓 **100% 무료 플랫폼 조합**

### 옵션 1: GitHub Pages + Netlify Functions ⭐ (추천)
```
프론트엔드: GitHub Pages (무료)
백엔드: Netlify Functions (125K requests/월)
데이터베이스: LocalStorage + Mock Data
비용: $0/월
```

### 옵션 2: GitHub Pages + Railway
```
프론트엔드: GitHub Pages (무료) 
백엔드: Railway ($5 크레딧/월, 무료)
데이터베이스: SQLite (파일 기반)
비용: $0/월
```

### 옵션 3: GitHub Pages + Render
```
프론트엔드: GitHub Pages (무료)
백엔드: Render (750시간/월 무료)
데이터베이스: SQLite
비용: $0/월
```

---

## 🚀 **옵션 1: Netlify Functions 배포 (가장 안정적)**

### 1단계: GitHub Repository 준비
```bash
cd /home/kimwoody/ClaudeCode/FlipCanva
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/FlipCanva.git
git push -u origin main
```

### 2단계: Netlify 배포
1. [netlify.com](https://netlify.com) 방문 → GitHub 로그인
2. "New site from Git" 클릭
3. GitHub repository 선택: `FlipCanva`
4. Build settings:
   ```
   Build command: npm run build
   Publish directory: dist
   ```
5. Deploy site 클릭

### 3단계: 환경변수 설정 (Netlify Dashboard)
Site settings → Environment variables:
```env
VITE_API_BASE_URL=https://your-site-name.netlify.app
NODE_VERSION=18
```

### 4단계: Functions 확인
Deploy 후 다음 URL들이 작동하는지 확인:
- `https://your-site-name.netlify.app/` (프론트엔드)
- `https://your-site-name.netlify.app/api/canva/test` (API 테스트)

---

## 🚀 **옵션 2: Railway 배포**

### 1단계: Railway 계정 생성
1. [railway.app](https://railway.app) 방문
2. GitHub으로 로그인
3. 매월 $5 무료 크레딧 확인

### 2단계: 백엔드 배포
```bash
cd backend
npm install -g @railway/cli
railway login
railway new
railway add
# 환경변수 설정
railway variables set NODE_ENV=production
railway variables set PORT=3002
railway variables set CORS_ORIGIN=https://YOUR_USERNAME.github.io
# 배포
railway up
```

### 3단계: GitHub Pages 설정
Repository → Settings → Pages → GitHub Actions

---

## 🚀 **옵션 3: Render 배포**

### 1단계: Render 계정 생성
1. [render.com](https://render.com) 방문
2. GitHub으로 로그인
3. 무료 플랜 확인 (750시간/월)

### 2단계: 백엔드 배포
1. New → Web Service
2. GitHub repository 연결: `FlipCanva/backend`
3. Settings:
   ```
   Name: flipcanva-backend
   Build Command: npm install && npm run build
   Start Command: npm run start:prod
   ```
4. Environment Variables:
   ```
   NODE_ENV=production
   PORT=10000
   CORS_ORIGIN=https://YOUR_USERNAME.github.io
   ```

---

## 📊 **무료 플랫폼 비교**

| 플랫폼 | 장점 | 단점 | 제한사항 |
|--------|------|------|----------|
| **Netlify Functions** | - 빠른 CDN<br>- 안정적<br>- 쉬운 설정 | - 서버리스만 가능 | 125K requests/월 |
| **Railway** | - 풀스택 지원<br>- Docker 지원 | - 크레딧 제한 | $5 크레딧/월 |
| **Render** | - 무료 DB 지원<br>- 24/7 실행 | - Cold start | 750시간/월 |
| **Vercel** | - Next.js 최적화<br>- 빠른 배포 | - 함수 실행 시간 제한 | 100GB bandwidth/월 |

---

## 🛡️ **제한사항 해결책**

### Database 영구 저장이 필요한 경우
```javascript
// 무료 DB 옵션들:
// 1. Supabase (무료: 500MB, 2 프로젝트)
// 2. PlanetScale (무료: 1 DB)  
// 3. MongoDB Atlas (무료: 512MB)
// 4. Firebase (무료: 1GB)
```

### Cold Start 문제 해결
```javascript
// Keep-alive 핑 설정
setInterval(() => {
  fetch('https://your-backend.onrender.com/api/canva/test')
}, 14 * 60 * 1000); // 14분마다
```

### 트래픽 초과 시 대안
```javascript
// 1. 여러 플랫폼에 중복 배포
// 2. 로드 밸런싱
// 3. Mock 데이터로 폴백
```

---

## 🔧 **최적화 팁**

### 1. 번들 크기 최소화
```bash
npm run build -- --minify
```

### 2. 이미지 최적화
```javascript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          three: ['three', '@react-three/fiber']
        }
      }
    }
  }
})
```

### 3. 캐싱 전략
```javascript
// 서비스 워커 또는 브라우저 캐시 활용
```

---

## 📈 **모니터링 (무료)**

### 1. Netlify Analytics (기본 제공)
### 2. Google Analytics (무료)
### 3. Vercel Analytics (Hobby 플랜)

---

## 🎯 **완전 무료 최종 URL 예시**

```
🌐 프론트엔드: https://username.github.io/FlipCanva/
⚡ API (Netlify): https://flipcanva.netlify.app/api/
🗄️ Database: Browser LocalStorage + Mock Data
```

**월 비용: $0** ✨

---

## ⚠️ **주의사항**

1. **무료 플랜 제한**: 트래픽, 빌드 시간, 함수 실행 시간 확인
2. **데이터 백업**: 무료 DB는 데이터 손실 위험 있음
3. **성능**: Production 사용 시 유료 플랜 고려
4. **SSL 인증서**: 대부분 무료 플랫폼에서 자동 제공

**개발/테스트 용도로는 완벽하고, 소규모 상용 서비스로도 충분합니다!** 🚀