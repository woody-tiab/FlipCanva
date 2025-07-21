# Render용 Dockerfile (무료 플랜)
FROM node:18-alpine

WORKDIR /app

# 패키지 파일 복사
COPY package*.json ./

# 의존성 설치
RUN npm ci --only=production

# 앱 소스 복사
COPY . .

# 빌드
RUN npm run build

# 포트 설정
EXPOSE 10000

# 앱 시작
CMD ["npm", "run", "start:prod"]