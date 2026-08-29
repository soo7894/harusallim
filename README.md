# 하루살림

수입·지출과 투자 내역을 기록하는 한국어 가계부 프로젝트입니다. 소개 홈페이지와 설치형 웹앱을 분리해 GitHub Pages에서 함께 배포합니다.

- 소개 홈페이지: https://soo7894.github.io/harusallim/
- 설치형 앱: https://soo7894.github.io/harusallim/app/
- 저장소: https://github.com/soo7894/harusallim

## 기능

- 수입·지출 기록, 분류, 날짜, 메모, 삭제
- 주식 매수 내역과 현재가 직접 입력
- 투자원금, 평가액, 손익, 수익률 계산
- 현금성 자산과 주식 평가액을 합친 총자산
- Google 로그인과 계정별 Firebase 저장
- 모바일·데스크톱 반응형 화면
- 데모 가격 또는 직접 입력 가격 사용

GitHub Pages는 정적 호스팅이라 비밀 API 키를 안전하게 보관할 서버가 없습니다. 그래서 주가 자동조회는 제외하고, 무료로 유지 가능한 데모 가격과 직접 입력 방식만 제공합니다.

## 다른 컴퓨터에서 이어서 작업하기

Node.js 22.13 이상과 Git이 필요합니다.

```bash
git clone https://github.com/soo7894/harusallim.git
cd harusallim
corepack enable
pnpm install
pnpm dev
```

브라우저에서 `http://localhost:3001`을 엽니다.

## 확인 명령

```bash
pnpm lint
pnpm test
```

`pnpm test`는 Pages용 정적 빌드와 핵심 데이터·보안 규칙 테스트를 함께 실행합니다.

## 브랜치와 배포

- `main`: 소개 홈페이지 전용
- `app-version`: 로그인·가계부·PWA 앱 전용
- 한쪽 화면의 변경은 다른 쪽에 자동으로 적용하지 않습니다.

두 브랜치 중 하나에 Push하면 GitHub Actions가 각각 빌드한 뒤 홈페이지는 루트에, 앱은 `/app/`에 배포합니다. 별도의 유료 서버나 ChatGPT 배포 기능을 사용하지 않습니다.

Firebase Authentication에서 `soo7894.github.io`가 승인된 도메인으로 등록되어 있어야 Google 로그인이 동작합니다. Firestore 규칙은 `firestore.rules`에 있으며 로그인한 본인의 `users/{uid}` 문서만 읽고 쓸 수 있도록 제한합니다.

## 주요 파일

- `src/main.tsx`: 앱 시작점
- `app/page.tsx`: 화면 흐름과 사용자 동작
- `app/components`: 화면과 입력 모달
- `app/finance/model.ts`: 금융 타입, 검증, 계산
- `app/hooks`: 인증, 계정별 저장, 가격 처리
- `app/firebase/client.ts`: Firebase 웹 연결 설정
- `app/globals.css`: 디자인과 모바일 반응형 스타일
- `.github/workflows/pages.yml`: GitHub Pages 자동 배포
- `firestore.rules`: 계정별 데이터 접근 규칙

