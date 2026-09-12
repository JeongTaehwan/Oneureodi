# 오늘어디 (oneureodi)

성향·위치·예산·차·시간을 넣으면 데이트 코스 5개를 짜주는 앱.
카카오맵으로 장소를 모으고, 블로그·인스타그램 글을 조사해 분위기·가격·주차 힌트를 뽑고, Gemini 가 후보 안에서 코스를 조합한다.
코스마다 대중교통·자동차 경로(버스 번호·정거장·소요 시간), 주차장, 도착 시각이 붙는다.

AI 가 어떤 순서로 무엇을 판단하는지는 [docs/how-the-ai-analyzes.md](docs/how-the-ai-analyzes.md) 에 정리했다.
화면 디자인 원본은 `design/` 의 아트보드다.

- `apps/mobile` — Expo (React Native) 앱
- `apps/server` — NestJS 서버. 카카오 로컬로 장소를 모으고, LLM 웹검색(기본 Gemini, 선택 OpenAI)으로 코스 추천 글의 힌트를 뽑고, LLM 으로 코스를 짠다
- `packages/shared` — 요청·응답 타입 (zod)

## 쓰는 외부 서비스 (전부 카드 없이 무료 등급)

| 서비스 | 용도 | 한도 |
| --- | --- | --- |
| 카카오 로컬·경로 API | 장소 검색, 대중교통·도보·자동차 경로, 주차장 | 검색 10만/일, 대중교통·도보 각 1천/일 |
| Tavily | 블로그·인스타그램·웹 검색 | 1천/월 |
| Gemini (Google AI Studio) | 글에서 장소 추출, 코스 조합 | 무료 등급 |

네이버 검색 API 는 쓰지 않는다. 2026년 7월 신규 등록이 끝났고, 개정 약관이 검색 결과의 AI 입력·저장을 금지한다. 인스타그램은 직접 긁지 않고 검색엔진에 색인된 공개 게시글만 읽는다.
## 처음 한 번

```bash
npm install
```

PostgreSQL role 이 없다면 (한 번만):

```bash
sudo -u postgres createuser -s taehwan && createdb oneureodi
```

서버 환경변수:

```bash
cp apps/server/.env.example apps/server/.env
```

`.env` 에 카카오 REST API 키, Gemini API 키, Tavily API 키를 채운다. 셋 다 카드 없이 발급된다. Gemini 는 Google AI Studio 에서 카드 없이 발급되고 무료 등급으로 돈다. OpenAI 를 쓰려면 `LLM_PROVIDER=openai` 로 바꾸고 OpenAI 키·모델을 채운다.

네이버 검색 API 는 쓰지 않는다. 2026년 7월 31일부로 개발자센터 신규 등록이 끝났고, 9월 개정 약관이 검색 결과의 AI 입력과 저장을 금지한다.

```bash
npm run db:migrate
```

## 실행

```bash
npm run dev:server
```

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

`EXPO_PUBLIC_API_URL` 을 PC 의 와이파이 IP 로 바꾼 뒤:

```bash
npm run dev:mobile
```

폰의 Expo Go 앱으로 QR 을 찍는다.

## 검사

```bash
npm run typecheck && npm test
```

## 추천이 도는 순서

1. 입력한 지역·역을 카카오 로컬 키워드 검색으로 좌표로 바꾼다.
2. 같은 좌표·반경으로 일주일 안에 모아둔 게 있으면 그걸 쓴다. 없으면 3을 한다.
3. 동시에: 카카오 로컬 카테고리 검색(카페·음식점·문화시설·명소, 각 최대 45건), 그리고 Tavily 로 "{지역} 데이트 코스" 등 3질의를 검색해(각 10건) 본문을 모은 뒤, LLM 호출로 상호·힌트·1인 가격·주차·출처를 JSON 으로 뽑는다(최대 60건).
4. 뽑은 상호를 이름으로 지도 장소와 맞추고, 못 맞춘 상호는 카카오에서 추가로 찾는다(상한 20).
5. 코드가 거른다: 차 있으면 주차 불가 제외(정보 없음은 통과).
6. 언급 많은 순 70% + 무작위 30% 로 후보를 60개까지 줄여 중간 모델에 넘기고 코스를 JSON 으로 받는다.
7. 코드가 검증한다: 모르는 장소 제거, 알려진 가격 합 × 2 가 예산을 넘는 코스 탈락, 이동 방법 산출(차 / 1km 안 도보 / 대중교통).
# Oneureodi
