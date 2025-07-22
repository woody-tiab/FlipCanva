# FlipCanva - 캔바 플립북 변환기

캔바(Canva) 디자인을 인터랙티브한 3D 플립북으로 변환하는 웹 애플리케이션입니다.

## 🌟 주요 기능

### 현재 구현된 기능
- **Canva 디자인 링크 입력 및 검증**
- **Canva OAuth 인증 연동**
- **3D 플립북 뷰어** (페이지 넘기기, 확대/축소)
- **실시간 플립북 생성 및 미리보기**
- **Canva API와 Mock 데이터 Fallback 시스템**

### 최근 추가된 기능 (진행중)
- **Canva 연결 상태 실시간 확인**
- **Canva 디자인 테스터** (URL/ID 입력 및 검증)
- **API 응답 캐싱** (토큰 소모 최적화)
- **실제 Canva API vs Mock 데이터 구분 처리**

## 🚀 기술 스택

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: CSS3 + CSS Modules
- **3D Effects**: CSS Transform3D
- **API Integration**: Canva Connect API
- **Deployment**: Netlify + GitHub Actions

## 📦 설치 및 실행

### 개발 환경 설정

```bash
# 저장소 클론
git clone https://github.com/woody-tiab/FlipCanva.git
cd FlipCanva

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env.local
# .env.local 파일에 Canva API 키 설정

# 개발 서버 실행
npm run dev
```

### 환경 변수 설정

`.env.local` 파일에 다음 변수들을 설정하세요:

```env
VITE_API_BASE_URL=http://localhost:3002
VITE_CANVA_CLIENT_ID=your_canva_client_id
VITE_CANVA_CLIENT_SECRET=your_canva_client_secret  
VITE_CANVA_REDIRECT_URI=https://flipcanva.netlify.app/auth/callback
VITE_CANVA_API_BASE_URL=https://api.canva.com/rest/v1
VITE_CANVA_AUTH_URL=https://www.canva.com/api/oauth/authorize
```

## 🎯 사용 방법

### 기본 사용법
1. **Canva 연결하기** 버튼을 클릭하여 OAuth 인증
2. Canva 디자인 URL 또는 ID를 입력
3. **플립북 생성 시작** 버튼 클릭
4. 생성된 플립북을 3D 뷰어로 미리보기

### Canva 디자인 URL 형식
- 전체 URL: `https://www.canva.com/design/DAGh8bZ9l9E/edit`
- 디자인 ID만: `DAGh8bZ9l9E`

## 🏗️ 프로젝트 구조

```
src/
├── components/           # React 컴포넌트
│   ├── FlipbookProcessor.tsx    # 메인 처리 컴포넌트
│   ├── FlipbookViewer.tsx      # 3D 플립북 뷰어
│   ├── CanvaConnectionStatus.tsx # 연결 상태 확인
│   ├── CanvaDesignTester.tsx   # 디자인 테스터
│   ├── CanvaLinkInput.tsx      # URL 입력 컴포넌트
│   └── CanvaAuth.tsx           # OAuth 인증
├── services/            # API 서비스
│   ├── canvaApi.ts             # Canva API 통합
│   └── flipbookApi.ts          # 플립북 API
├── types/               # TypeScript 타입 정의
├── hooks/               # 커스텀 React 훅
└── utils/               # 유틸리티 함수
```

## 🐛 알려진 이슈

### 현재 문제점
- ❌ Canva OAuth 인증 후 연결 상태가 즉시 업데이트되지 않음
- ❌ 디자인 테스터에서 URL 입력 시 간헐적 오류 발생
- ❌ `designId is not defined` 에러 (일부 해결됨)
- ⚠️ 실제 Canva API 연동 시 Mock 데이터만 표시됨

### 성능 이슈
- 🐌 불필요한 API 호출로 인한 토큰 소모
- 🐌 플립북 뷰어 렌더링 최적화 필요

## 🔄 배포

### Netlify 자동 배포
- **Production URL**: https://flipcanva.netlify.app
- **GitHub Push 시 자동 배포**
- **빌드 명령어**: `npm run build`
- **배포 디렉토리**: `dist`

### 수동 배포
```bash
# 프로덕션 빌드
npm run build

# dist 폴더 내용을 호스팅 서비스에 업로드
```

## 🤝 기여 가이드

1. 이슈 생성 또는 기존 이슈 확인
2. Feature 브랜치 생성: `git checkout -b feature/new-feature`
3. 변경사항 커밋: `git commit -m 'feat: add new feature'`
4. 브랜치 푸시: `git push origin feature/new-feature`
5. Pull Request 생성

## 📄 라이선스

이 프로젝트는 교육용으로 제작되었습니다.

## 📞 지원

문제가 있거나 제안사항이 있으시면 [GitHub Issues](https://github.com/woody-tiab/FlipCanva/issues)에 등록해 주세요.

---

**개발자**: [@woody-tiab](https://github.com/woody-tiab)  
**최종 업데이트**: 2025년 7월 22일