# CLAUDE.md

> 이 파일은 Claude Code가 새 세션을 시작할 때 가장 먼저 읽는 컨텍스트 문서입니다.
> 위쪽 절반은 일반 코딩 가이드라인(Andrej Karpathy 스타일), 아래쪽 절반은 본 프로젝트
> 전용 컨텍스트입니다. 작업 후에는 반드시 "Decisions" 또는 "Design records" 섹션을
> 갱신해 다음 세션이 끊김 없이 이어가도록 합니다.

---

## Part 1 · General coding guidelines (verbatim from `multica-ai/andrej-karpathy-skills`)

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

## Part 2 · Project context: 시그널 팔레트 (Signal Palette)

### What this product is

내 주식 포트폴리오를 구성하는 종목들의 긍정/부정/관망 이슈를 **색깔**로 한눈에 보여주는 웹 서비스. OpenAI Responses API + `web_search` tool 로 종목별 최신 이슈를 수집하고, GPT가 그것을 키워드(또는 한 문장)로 정리한 뒤 green / yellow / red 시그널로 분류합니다. 종목별 종합 컬러와 포트폴리오 종합 컬러는 GPT가 직접 도출합니다. 한 화면에 "현재 포트폴리오"와 "예비 포트폴리오" 두 개를 동시에 보여줍니다.

### Tech stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **Styling**: 순수 CSS Modules + CSS variables (Tailwind 사용 안 함)
- **Fonts**: Roboto → Pretendard → Noto Sans KR (이 순서로 fallback)
- **AI**: OpenAI Responses API + `web_search` tool, 모델 `gpt-4o-mini` (Step 3 에서 `gpt-4o` 로 추가 → Step 4b 에서 `gpt-4o-mini` 로 전환)
- **Auth/DB**: Supabase (서울 리전) + `@supabase/ssr` (Step 4a 부터)
- **Drag & Drop**: `@dnd-kit/core` + `@dnd-kit/sortable` (Step 4a 의 포트폴리오 수정 모달)
- **개발 환경**: GitHub Codespaces, Figma MCP (유료 구독)

### Branch & deployment policy

- **Push 대상**: `main` (사용자 승인). PR 없이 직접 푸시.
- **사용자 워크플로**: 매 단계 푸시 후 Codespaces에서 `git pull && npm install && npm run dev` 로 확인.
- **API 키**: `.env.local` (gitignored). 로컬에서는 사용자가 채워서 사용. Codespaces 에서는 Secrets로 등록 권장.
- **NEVER**: API 키, 토큰을 코드/커밋 메시지/PR에 포함하지 말 것.

### Design source-of-truth

- **Figma file**: https://www.figma.com/design/sxsrrNcNXiJno86lqrWSlQ/Signal-Palette?node-id=18-8
- **fileKey**: `sxsrrNcNXiJno86lqrWSlQ`
- **메인 프레임 nodeId**: `18:8` (1280 × 1167, "MacBook Air - 2")
- **모든 픽셀 수치 기록**: `docs/design/design-tokens.md` 와 `src/lib/design-tokens.ts`

> 디자인 작업 시 **임의의 수치를 추가하지 말 것**. 새로운 수치가 필요하면 반드시
> Figma MCP (`get_metadata`, `get_design_context`, `get_screenshot`, `get_variable_defs`)
> 로 정확한 값을 확인하고, `src/lib/design-tokens.ts` 와 `docs/design/design-tokens.md`
> 에 기록한 뒤 사용한다.

### Stocks (default — 로그인 전 demo + 로그아웃 시 fallback)

아래 16종목은 **default 포트폴리오** 입니다. 로그인 전 익명 사용자가 보는 화면 + 로그아웃 시 돌아가는 상태에서 사용. 신규 가입자의 초기 포트폴리오는 **빈 8슬롯** 이며 default 16종목과 무관합니다 (Step 4a 부터 적용).

- **현재 포트폴리오 (default)**: 마이크론 테크놀로지 / ASML 홀딩(ADR) / 엔비디아 / 블룸에너지 / 비스트라 에너지 / TSMC(ADR) / 브로드컴 / 버티브 홀딩스
- **예비 포트폴리오 (default)**: 삼성전자 / SK하이닉스 / 아마존 / 팔란티어 / 일라이 릴리 / 아스테라 랩스 / 콴타 서비시스 / 크라우드스트라이크 홀딩스

종목 한글 명칭 그대로 사용 — 티커 사용 금지. 가입한 사용자가 검색으로 추가할 수 있는 종목 후보는 별도 마스터 풀 (`src/data/stock-master.ts`, 4a 에선 fixture, 4e 에서 실제 API).

### Decisions log (사용자 확정 사항)

| 결정 항목 | 값 |
|---|---|
| 시장 범위 | 한국 + 미국 혼합 |
| API 호출 위치 | 백엔드 (Next.js API route, `OPENAI_API_KEY` 서버에서만) |
| 이슈 검색 방식 | OpenAI Responses API + `web_search` tool, 모델 `gpt-4o-mini` (4b 전환). 새 기사 검색은 최근 7일, 해소된 이슈 제외 (프롬프트 + 서버 `filterRecent`/`dedupeIssues`). **4d 부터 저장 이슈는 누적 — 21일 보관**(`ISSUE_RETENTION_DAYS`) + GPT resolved 플래그로 제거 |
| 분석 호출 분할 | 종목당 1회 (×16, 클라이언트에서 병렬 fetch). **포트폴리오 overall 은 4c-9 부터 GPT 호출 없이 클라에서 종목 overall 집계** (`src/lib/overall.ts`). 4c 캐시/Realtime 적용 시 로드당 OpenAI per-stock 0콜 |
| 분석 호출 시점 | 페이지 첫 로드 시 클라이언트가 자동 fetch. 캐싱 없음 (새로고침 = 재호출). 추후 Step 4에서 캐싱 예정 |
| 진행 상태 UX | 카드는 즉시 placeholder + shimmer로 렌더, 응답 도착 종목부터 좌상→우하 staggered fade-in으로 채워짐 (50ms 간격, 박스당 0.2s) |
| 실패 시 fallback | 해당 종목/포트폴리오 단위로만 mock 데이터 대체. 콘솔 경고 로그 |
| 종합 컬러 산출 | **둘 다 점수 집계** (`src/lib/overall.ts`, GPT 호출 0). 이슈 점수 pos_strong+3…neg_strong−3, neutral 0. **종목 overall** = 그 종목 이슈 평균(4d, `stockOverallFromIssues`). **포트폴리오 overall** = 8종목 overall 평균(4c-9, `aggregateOverall`). 평균→밴드(`|s|<0.5 중립/<1.5 약/<2.5 중/≥2.5 강`). intensity 가 가중 역할 |
| 이슈 텍스트 | 한 문장, 최대 30자, **한국어 강제** (영문 기사 참고했어도 한국어로 번역/요약). `AI`/`TSMC` 같은 외래어 표기는 허용 |
| 신호 강도 | GPT가 strong/mid/mild 산출. neutral은 항상 mid. UI는 7색 매핑 (positive_strong → … → negative_strong) |
| 이슈 정렬 | 7-bucket 순서: `pos_strong → pos_mid → pos_mild → neutral → neg_mild → neg_mid → neg_strong`. GPT가 prompt 룰을 못 지킬 수 있어 서버 `sortByBucket`로 안정 정렬 보장 |
| 1차 MVP 데이터 저장 | 없음 — 매 접속 시 default 사용. 추후 DB+로그인 예정 |
| 푸시 브랜치 | `main` (사용자 명시 승인) |
| 종목 표기 | 한글 명칭 그대로 (티커 사용 금지) |
| 시그널 컬러 | 아래 "Color tokens" 참고. positive/negative 각 3단계 + neutral 1단계 + empty = 8 |
| 종합 박스 크기 | 현재 포트폴리오와 예비 포트폴리오 의도적으로 다름 (현재=강조, 예비=축소) |
| 반응형 breakpoint | `<768` mobile, `768–1279` tablet, `≥1280` desktop. CSS 미디어 쿼리 + `AnalysisProvider`의 `viewport` state 양쪽에 동기화 |
| 모바일 이슈 트림 (4b 변경) | ~~viewport flip 시 재 fetch~~ **폐기**. 분석은 마운트 시 1회만 (`FETCH_MAX_ISSUES=20`), viewport 전환 시 **재분석 안 함**. 모바일은 렌더 시점에 `topByPop(issues, 10)` 로 pop score(최신성 가중 importance, 4d) 상위 10개만 표시 (버킷 순서 유지). 카드 그리드(`StockCard`) + 모바일 ticker(`TopTicker`) 공통. 헬퍼는 `src/lib/issues.ts` |
| 모바일 종목명 처리 | 카드 폭 150에서 종목명이 overflow하면 우→좌 marquee (`StockNameMarquee`, 50px/s + 0.6s 시작 대기). 짧으면 정적 |
| 터치 툴팁 | 터치 입력(`pointerType === "touch"`)에서 컬러박스 탭 = 3초 툴팁 표시. 같은 박스 재탭 = 닫기, 다른 박스 탭 = 즉시 전환. 마우스 hover는 기존 그대로 |

### Step 4a Decisions log

| 결정 항목 | 값 |
|---|---|
| OAuth provider | Google + Kakao (Supabase Auth, Kakao 는 custom OAuth provider 로 등록) |
| 환경 변수 | `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SECRET_KEY` (`.env.example` 에 슬롯 이미 있음) |
| Supabase 리전 | 서울 (`ap-northeast-2`) |
| 로그인 전 [수정] 버튼 | hover/click 시 "로그인 후 바로 이용 가능해요" 툴팁 (다크 툴팁 `#1a1d24` 재사용) |
| 신규 가입자 초기 포트폴리오 | **빈 8슬롯** (default 16종목 X). 닉네임 설정 후 자동으로 수정 모달 + 1행 변경 dropdown 활성 |
| 신규 가입자가 [취소] 선택 시 | 빈 포트폴리오로 메인 진입. 헤더 [수정] 으로 언제든 채울 수 있음 |
| 로그아웃 동작 | default 16종목으로 돌아감. 페이지 새로고침 + default 데이터로 analyze 재호출 |
| 닉네임 검증 | 2~16자, 한영숫자 + `_`, 공백/특수문자 불허 |
| 닉네임 중복 체크 (4a) | mock (항상 성공). 실 DB 연동은 4a 후반 sub-task |
| 닉네임 표시 위치 | 헤더 우측 16px + 포트폴리오 라벨 위 12px (동일 닉네임 두 곳) |
| 종목 카드 클릭 영역 | 카드의 ANY 영역 클릭 = 모달 열기 (이슈 컬러박스 포함). 컬러박스 hover 시에도 기존 다크 툴팁 유지 |
| 종목 모달 표시 이슈 개수 | 최대 20개 시간순(최신 first). 20개 미만이면 그만큼만 표시 |
| 종목 모달 createdAt | 4a 에선 fixture 에만 mock timestamp 포함. live mode 시 빈칸 또는 "-". 실제 GPT 응답에 필드 추가는 4b |
| 차트랑 같이 보기 버튼 | 클릭 비활성, hover 시 "Comming Soon!" 툴팁 |
| 종목 검색 풀 | **4e 부터 실제 API**: `/api/stock-search` → Naver 자동완성(`ac.stock.naver.com/ac`, 한글명+시장+티커, 한·영 쿼리 모두). 빈 쿼리는 정적 `STOCK_MASTER` 브라우즈, 입력 시 API(디바운스 250ms). Naver 실패 시 카탈로그 fallback |
| 종목 검색 후보 필터 | 같은 포트폴리오 내 이미 사용 중인 종목은 후보에서 숨김. 현재 ↔ 예비 간 중복은 허용 |
| 수정 모달 검증 | 8슬롯 부분 비움/전체 비움 허용. 같은 포트폴리오 내 중복 불허. 현재 ↔ 예비 간 중복 허용 |
| 수정 완료 시 analyze 재호출 | **변경된 종목만** 재 fetch. 빈 슬롯은 호출 없음. fixture mode 면 fixture 에서 즉시 반영 |
| 변경 dropdown 위치 | 어느 행을 눌러도 (511, 151) **고정**. 뒤에 수정 모달이 펼쳐져 있어 시각적으로 안정 |
| 모달 backdrop overlay | **없음**. 수정 중에도 카드 그리드의 색을 확인할 수 있도록 의도된 디자인 |
| 모달 닫기 방법 | ESC / 모달 외부 클릭 / [닫기] 버튼 모두 동작. **닉네임 모달은 예외 — 닫기 불가** |
| 빈 슬롯 — 수정 모달 안 | 종목명 영역 빈칸 (placeholder 없음), 번호 + 변경 버튼 + 핸들은 정상 |
| 빈 슬롯 — 카드 그리드 | 카드 정상 크기, 종목명 빈칸, 헤더 컬러박스 + 20 그리드 모두 `--signal-empty`. 클릭 시 수정 모달 자동 오픈 |
| 드래그 앤 드롭 | `@dnd-kit/core` + `@dnd-kit/sortable`. `PointerSensor` + `activationConstraint: { distance: 4 }`. **행 전체 이동**, 번호는 슬롯 인덱스에서 자동 재할당. 드래그 중 변경 버튼 비활성화 |
| DnD 핸들 hit area | 3선 그래픽 영역 정확히 (약 20×11px). 정밀 영역, padding 없음. cursor: grab/grabbing |
| DnD 키보드 접근성 | **4a 미지원** (후속 step) |
| Timestamp 포맷 | `26.05.21 오후 3:58` (KST 고정). SSR hydration 회피를 위해 `useEffect` 안에서 클라이언트 포맷팅 |
| OAuth 자산 보관 | Figma asset URL 직접 import 금지 (7일 만료). `public/icons/google.svg` / `public/icons/kakao.svg` 정적 import |

> 상세 dimensions/colors 는 `docs/design/design-tokens.md` §14 참고.

### Step 4a sub-tasks (작업 순서)

> Top-down 으로 진행. 각 sub-task 시작 직전에 해당 항목을 다시 읽고, 모르는 디자인 수치는 즉시 `docs/design/design-tokens.md` §14 와 Figma MCP 로 재확인. 임의 추측 금지.

#### 4a-1. 디자인 토큰 + globals.css 확장
- `docs/design/design-tokens.md` §14 를 source-of-truth 로 삼아 신규 컬러 토큰을 `src/app/globals.css` 에 추가.
- `src/lib/design-tokens.ts` 에도 type-safe 미러 추가.
- 빈 슬롯 처리에 필요한 타입 변경 검토 (`src/types/index.ts` 의 `Stock` 에 빈 슬롯 표현 추가 — 예: `Stock | null`, 또는 `Stock & { isEmpty?: boolean }`).
- **검증**: `npm run build` 통과. 기존 카드 그리드 시각적 변화 없어야 함.

#### 4a-2. 로그인 전 헤더 (OAuth 진입 버튼)
- `src/components/Header.tsx` (또는 기존 page.tsx 의 헤더 영역) 에 G/Talk 로고 + "로그인 with" 라벨 추가.
- 로고는 `public/icons/google.svg` / `public/icons/kakao.svg` 에 사전 배치 (Figma asset URL 직접 사용 금지).
- 클릭 핸들러는 일단 `console.log('TODO: oauth')` 만. 실제 OAuth 연동은 4a-4.
- 수정 버튼에 hover/click 시 "로그인 후 바로 이용 가능해요" 툴팁 (다크 툴팁 `#1a1d24` 재사용).
- **검증**: 디자인 §14-2 와 픽셀 단위 일치. 툴팁이 다른 hover 와 충돌 없이 표시.

#### 4a-3. 종목 카드 모달 (이슈 파이프라인) — 로그인 전에도 동작
- 카드 클릭 시 모달 열림. 카드의 ANY 영역 클릭 가능 (이슈 컬러박스 포함).
- 이슈 컬러박스 클릭 시 모달 열리지만, hover 시에는 여전히 기존 다크 툴팁 표시 (이벤트 전파 제어).
- 이슈는 최대 20개 시간순. fixture 의 `createdAt` 사용 (live mode 면 "-").
- 차트랑 같이 보기 버튼은 hover 시 "Comming Soon!" 툴팁 + 클릭 비활성.
- ESC / 외부 클릭 / [닫기] 로 닫기.
- Timestamp 포맷팅은 `useEffect` 안에서 (SSR hydration 회피).
- **fixture 업데이트**: `src/data/analysis-fixture.ts` 의 각 issue 에 `createdAt: string` 필드 추가 (mock ISO 8601, KST 의미 있는 값).
- **검증**: 디자인 §14-6 픽셀 일치. 데스크탑 hover 툴팁 회귀 없음.

#### 4a-4. OAuth 인증 (Supabase + Google + Kakao)
- Supabase 프로젝트 생성 (서울 리전). Auth provider 에서 Google 활성화, Kakao 는 custom OAuth provider 로 등록 (`kauth.kakao.com/oauth/authorize`, `kauth.kakao.com/oauth/token`).
- `@supabase/ssr` 설치. `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`, `middleware.ts` 작성.
- 4a-2 의 G/Talk 버튼에 실제 `signInWithOAuth({ provider: 'google' | 'kakao' })` 연결.
- 콜백 라우트 `src/app/auth/callback/route.ts` 작성.
- 로그아웃: `signOut()` + 페이지 새로고침 + default 16종목으로 analyze 재호출.
- **DB 스키마는 아직 안 만듦** (4a-7 에서). 이 단계는 OAuth 흐름만.
- **검증**: 로그인 → callback → 메인 페이지 진입 → 우상단 닉네임 자리에 임시로 user email 표시 (닉네임 모달은 4a-5 에서).

#### 4a-5. 닉네임 설정 모달
- 신규 가입 직후 1회성 표시. 닫기 불가 (확인 버튼만 동작).
- 검증 로직: 2~16자, 한영숫자 + `_`, 공백/특수문자 불허.
- 중복 체크는 **mock — 항상 성공** (실 DB 연동은 4a-7).
- 성공 시: 성공 메시지 (`--text-success`, "닉네임 설정이 완료됐어요") 2초 표시 → 자동으로 포트폴리오 수정 모달 열림 + 1행 변경 dropdown 활성.
- **검증**: 디자인 §14-8 픽셀 일치. 성공 메시지 색상/지속시간 정확.

#### 4a-6. 수정 모달 + 변경 dropdown + DnD
이 sub-task 는 큰 덩어리. 다음 순서로 분할:

**4a-6-1. 수정 모달 정적 UI**
- `src/components/EditPortfolioModal.tsx` 생성.
- 8행 레이아웃 (번호 + 종목명 + 변경 + 핸들) + 취소/완료 푸터.
- props 로 받은 portfolio 데이터를 표시만 함 (수정 동작은 아직).
- 헤더 [수정] 버튼 클릭 시 열림. ESC / 외부 클릭 / [취소] 로 닫힘.
- **검증**: 디자인 §14-4 픽셀 일치.

**4a-6-2. 변경 dropdown UI**
- `src/components/StockSearchDropdown.tsx` 생성.
- `src/data/stock-master.ts` 신규 작성 (한미 혼합 30~50종목 한글명 정적 리스트).
- 검색 input + includes() 필터 + 최대 6행 표시 + 세로 스크롤.
- [선택] 클릭 시 콜백으로 상위 모달에 종목명 전달, dropdown 닫힘.
- 같은 포트폴리오 내 이미 사용 중인 종목은 후보에서 숨김.
- 위치는 (511, 151) 고정.
- **검증**: 디자인 §14-5 픽셀 일치. 검색 필터 정상.

**4a-6-3. 수정 모달의 편집 로직 + analyze 재호출**
- 변경 버튼 클릭 → dropdown 열림 → 선택 → 슬롯 교체.
- 완료 클릭 시: 변경된 종목만 식별 → `AnalysisProvider` 에 변경 dispatch → 변경된 종목들에 대해서만 `/api/analyze` 재호출 (fixture mode 면 fixture 에서).
- 빈 슬롯은 analyze 호출 없음.
- 빈 슬롯 표시 룰 (§14-10) 적용.
- **검증**: 종목 변경 → 카드 갱신 (shimmer → fade-in). 비용 검증: 변경 안 한 종목은 재호출 없음.

**4a-6-4. 드래그 앤 드롭 순서 변경**
- `@dnd-kit/core` + `@dnd-kit/sortable` 설치.
- `SortableContext` + `useSortable` 표준 패턴. 핸들에만 `listeners` 부착.
- `PointerSensor` + `activationConstraint: { distance: 4 }`.
- 행 전체 이동 + 번호 자동 재할당 (slot index 기반).
- 드래그 중 변경 버튼 비활성화.
- 시각 피드백: 잡은 행 opacity 0.9 + box-shadow, 다른 행 transition 200ms.
- 키보드 미지원 (sensor 등록 안 함).
- **검증**: 디자인 §14-7. 회귀: 드래그 안 할 때 변경 버튼 정상 동작.

#### 4a-7. Supabase 스키마 + 영속화 + 닉네임 중복 체크 실연동
- `profiles` 테이블: `id (uuid, auth.users 참조)`, `nickname (text, unique)`, `created_at`, `updated_at`. RLS: 본인 행만 select/update.
- `portfolios` 테이블: `id (uuid)`, `user_id`, `variant (text: 'current' | 'spare')`, `stocks (text[])`, `updated_at`. RLS: 본인 행만 CRUD.
- 4a-5 의 닉네임 모달의 mock 중복 체크를 실제 DB query 로 교체.
- 4a-6 의 완료 버튼이 portfolios 테이블에 upsert 하도록 연결.
- 로그인 시 본인 portfolio 로드 → 없으면 빈 8슬롯, 있으면 그대로.
- **검증**: 두 다른 계정으로 로그인 시 각자의 포트폴리오 보임. 닉네임 중복 실제 차단.

#### 4a-8. 폴리시 + 회귀 테스트
- 모든 모달의 z-index 정리 (헤더 < 카드 < 수정 모달 < 변경 dropdown).
- 모달 외부 클릭 / ESC 일관성 검증.
- 빈 포트폴리오 상태에서 페이지 로드 시 analyze 호출 0회 검증.
- Tablet/Mobile breakpoint 에선 일단 모달 UI 깨지지 않게만 (정식 대응은 후속 step).
- CLAUDE.md 의 "Status by step" 갱신 + 결정사항 변경 시 "Step 4a Decisions log" 갱신.

### Color tokens (MVP — `src/app/globals.css` 와 동기화)

```css
--bg-page: #282b32;          /* 페이지 배경 (그라데이션 영역 위/아래) */
--bg-card: #31343f;          /* 카드 배경 */
--bg-gradient-start: rgb(40, 43, 50);  /* 섹션 그라데이션 0%/100% */
--bg-gradient-mid:   rgb(22, 25, 33);  /* 섹션 그라데이션 5%/95% */

--signal-positive-strong: #22C77F;
--signal-positive-mid:    #5DD9A0;
--signal-positive-mild:   #9FE8C5;
--signal-neutral:         #F8E29A;
--signal-negative-strong: #F0506E;
--signal-negative-mid:    #F47C95;
--signal-negative-mild:   #F8A8B8;
--signal-empty:           rgba(255, 255, 255, 0.06);

--btn-bg:   #444857;  /* 수정 버튼 — 두 포트폴리오 동일 */
--btn-text: #E5E5E5;

/* Step 4a — Auth & Modal tokens (자세한 설계는 docs/design/design-tokens.md §14 참고) */
--modal-bg-elevated: #444857;   /* 수정/종목/닉네임 모달 (= --btn-bg) */
--dropdown-bg:       #31343f;   /* 변경 dropdown (= --bg-card) */
--input-bg:          #e5e5e5;   /* 검색창, 닉네임 input */
--btn-secondary-bg:  #858a9e;   /* 취소, 차트랑 같이 보기 (밝은 회색) */
--btn-action-bg:     #31343f;   /* 완료, 닫기, 변경 (= --bg-card) */
--text-error:        #e9eabc;   /* 닉네임 중복 에러 */
--text-success:      #c6e4c7;   /* 닉네임 설정 완료 (2초) */
```

### Status by step

- **Step 1**: ✅ 프로젝트 init + 디자인 토큰 + 정적 레이아웃 (mock 이슈 데이터 사용)
- **Step 2**: ✅ 중앙 이슈 ticker — 현재→예비 모든 이슈를 종목 순서대로 순회, 3초 머무름 + 상→하 페이드 슬라이드(0.4s), 호버 시 `scale(1.05)` + 자동 전환 일시정지, `ActiveIssueContext`로 현재 이슈를 IssueGrid에 발행해 4px `#FFFFFF` outline 트레이서 표시, 컬러박스 hover 시 다크 툴팁(`#1a1d24`). 모든 수치는 `docs/design/design-tokens.md` §10 참고.
- **Step 3**: ✅ `/api/analyze` route + `lib/openai.ts` (gpt-4o + `web_search`). `AnalysisProvider`(client)가 종목 16개를 병렬 fetch, 각 카드는 shimmer 후 staggered fade-in으로 채워지고, 한 포트폴리오 8종목 완료 시 portfolio-overall 호출이 자동 dispatch됨. 실패 시 종목 단위 mock fallback. GPT가 7-bucket 순서로 응답하지만 서버에서 `sortByBucket`로 보강. 이슈 텍스트는 한국어 강제 + 중복 통합 prompt. 모든 수치/룰은 `docs/design/design-tokens.md` §11 참고.
- **반응형**: ✅ 세 breakpoint(<768 mobile / 768–1279 tablet / ≥1280 desktop). `AnalysisProvider`가 viewport tier를 노출. **(4b 변경)** 분석은 마운트 시 1회만(`FETCH_MAX_ISSUES=20`), viewport 경계 진입/이탈 시 **재 fetch 안 함** — 모바일은 `topByPop(issues,10)` 로 렌더 시점에 pop score(최신성 가중, 4d) 상위 10개만 표시. 태블릿/모바일은 화면 상단에 sticky `TopTicker`(그라데이션 35px bar)가 데스크탑의 중앙 ticker를 대체. 모바일 카드는 150×160 + radius 13 + 5×2 그리드, 긴 종목명은 `StockNameMarquee`로 50px/s 우→좌 슬라이딩. 터치 디바이스에서는 컬러박스 탭 시 `ActiveTooltipContext`가 3초간 툴팁 표시(같은 박스 재탭 = 닫기, 다른 박스 탭 = 전환). 모든 수치는 `docs/design/design-tokens.md` §12 (Tablet) / §13 (Mobile) 참고.
- **Step 4a ✅ (2026-05-26)**: 인증 (Google + Kakao OAuth) + 닉네임 + 사용자별 포트폴리오 편집/저장 (수정/검색/이슈/온보딩 모달, 드래그 정렬, DB 영속화). 종목 검색은 fixture (실제 API 는 4e), 그 외는 모두 실 동작. Supabase 서울 리전 + `@supabase/ssr` + profiles/portfolios 테이블 (RLS) + `check_nickname` RPC. 8개 sub-task (4a-1 ~ 4a-8) 모두 완료. 자세한 내역은 아래 "Step 4a sub-tasks" 섹션 참고.
  - **4a-1 ✅ (2026-05-26)**: §14-1 의 7개 컬러 토큰을 `src/app/globals.css` `:root` 와 `src/lib/design-tokens.ts` `COLORS` 양쪽에 추가 (기존 hex alias 4개 + 신규 3개: `--btn-secondary-bg #858a9e` / `--text-error #e9eabc` / `--text-success #c6e4c7`). `Stock` 타입에 `isEmpty?: boolean` 옵셔널 필드 추가 (§14-10 빈 슬롯용 — 아직 사용처 없음). `npm run build` 통과, 카드 그리드 시각 변화 없음.
  - **4a-2 ✅ (2026-05-26)**: 로그인 전 OAuth 진입 헤더 추가. 신규 `AuthHeader` 컴포넌트가 §14-2 픽셀 좌표대로 "로그인 with" 라벨 + Google(40×40, x=1184/y=60) + Kakao(30×30, x=1224/y=64) 로고를 absolute 로 렌더, `<1280` 에서는 `display: none` (Tablet/Mobile 회귀 0). 로고는 `public/icons/{google,kakao}.svg` 정적 import. 클릭 핸들러는 `console.log('TODO: oauth google|kakao')` stub — 실 Supabase 연동은 4a-4. `EditButton` 에 `tooltip?: string` 옵셔널 prop 추가 + ColorBox 와 동일한 다크 툴팁(`#1a1d24`/16px SemiBold) `:hover::after` CSS 미러. `PortfolioSection` 의 두 EditButton 에 `tooltip="로그인 후 바로 이용 가능해요"` 전달 (현재 항상 로그인 전 상태). 작업 후 사용자 지적으로 §14-2 문서값(폰트 SemiBold 16px / 로고 round) 이 부정확함이 밝혀져 Figma MCP 로 노드 76:117/76:118/76:119 재검증 → "로그인" Bold 10px + 공백 16px + "with" Bold 8px (3-segment) + 로고는 rectangular fill 로 정정.
  - **4a-3 ✅ (2026-05-26)**: 종목 카드 클릭 시 열리는 이슈 파이프라인 모달 추가. Figma 노드 83:909~84:1002 12개 + 114:402(spare variant 페이지) 검증, §14-6 문서의 "이슈 파이프라인" 라벨 14px → **12px** 정정. 신규 컴포넌트: `ActiveStockContext`(activeStockName + activeVariant page-level 상태), `StockModal`(§14-6 픽셀 좌표). `Issue.createdAt?: string` 옵셔널 + `analysis-fixture.ts` 끝 IIFE 로 102개 issue 에 deterministic mock createdAt enrichment (base 2026-05-26 15:00 KST, 종목당 -4h, 이슈당 -31m).
    - **수정사항 (2026-05-26 사용자 피드백)**:
      - **Variant 별 모달 좌표**: current `top: 114px` / spare `top: 343px` (Figma 노드 114:788 검증).
      - **absolute 포지셔닝 (2차 수정)**: 초기엔 `position: fixed; left: calc(50vw - 311px)` 로 갔으나 viewport 가 작은 환경에서 spare 모달(bottom 1139) 하단이 잘려 보이는 문제 발견 → `position: absolute; left: 329px` (frame 안) 으로 변경. 페이지 스크롤 시 모달도 함께 이동. 1280 외부 클릭 close 는 `document mousedown` + `modalRef.contains()` 로 그대로 동작.
      - **`.modal { overflow: visible }`**: chartBtn "Comming Soon!" 툴팁(modal top 위 ~11px) 이 잘리던 문제. 스크롤 clipping 은 `.timeline` 만 책임 (`overflow-y: auto`).
      - **Footer y 정정 (1138 → 1145)**: Figma 노드 18:389 / 83:899 직접 검증. 이전 1138 은 7px off 로 spare 모달 bottom(1139) 과 1px 겹침. 1145 로 정정해서 Figma 의도된 6px gap 보장. `src/lib/design-tokens.ts` FOOTER.y + `src/app/page.module.css` `.footer top` 동기화.
      - **Modal radius 12 복원**: `.header` 의 `background: var(--modal-bg-elevated)` 자식이 모달 상단 corner radius 를 직사각형으로 덮어서 12px 라운드가 가려져 보였음. `.header` background 제거 → modal 자체 background+radius 가 그대로 표시.
      - **Spare section bg gradient 정정 (footer 영역 어둠 유지)**: Figma 노드 114:404 검증 — current bg 는 0/100% 둘 다 밝지만 **spare bg 는 100% 가 어두운 mid 그대로 유지** (페이지 맨하단이 다시 밝아지지 않음). 코드 `.sectionBg` 공통 gradient 는 둘 다 100% start (밝음) 라 spare 페이지 하단에 밝은 띠가 생기고 footer 가 그 위에 보였음. `.sectionBgSpare` 에 별도 gradient override (`100% mid`) 추가. current bg 는 그대로.
  - **4a-4 ✅ (2026-05-26)**: Supabase + Google/Kakao OAuth 실연동. `@supabase/ssr@0.10.3` + `@supabase/supabase-js@2.106.2` 설치. 신규 `src/lib/supabase/{env,client,server,middleware}.ts` — env 누락 시 모두 null/no-op 반환 (graceful degradation, `.env.local` 없어도 페이지 정상 동작). 루트 `middleware.ts` 가 `updateSession()` 으로 매 요청 cookie refresh (matcher 는 `_next/static`/`_next/image`/이미지 파일 제외). 신규 `src/app/auth/callback/route.ts` 가 `?code` → `exchangeCodeForSession` → `/` 로 redirect (실패 시 `/?auth_error=1`). `AuthHeader` 가 `user` prop 받아서 분기: 로그인 전 = §14-2 OAuth 로고 + 실 `signInWithOAuth({ provider, options: { redirectTo: ${origin}/auth/callback } })`, 로그인 후 = §14-3 우상단 user.email (max-width 96px + ellipsis) + 로그아웃 버튼 (Figma 검증된 좌표 x=1179/y=63, 75×34, bg #444857, radius 12). 로그아웃은 `signOut() → window.location.reload()` 로 fixture 재 fetch. `page.tsx` async 화 + server-side `createClient()`/`auth.getUser()` 로 user 전달. §14-3 의 Figma 노드 83:902/903/906/907 직접 MCP 재검증 — 좌표/폰트/색 표 기존값 일치 + 노드 ID 컬럼 추가. **Codespaces fix**: callback route 가 `x-forwarded-host` header trust (없으면 `request.url` origin fallback) — reverse-proxy 환경에서 internal localhost URL 로 redirect 되어 무한 hang 되던 문제 해결. `try/catch` 로 unhandled throw 도 방어. **사용자 작업 필요**: `.env.local` 에 `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SECRET_KEY` 채우고 Supabase 대시보드의 Redirect URLs 에 `<origin>/auth/callback` (Codespaces 와 localhost:3000 둘 다) 등록. 닉네임 모달은 4a-5, 사용자별 portfolio 는 4a-7. `npm run build` ✅, OAuth flow 정상 동작 확인.
  - **4a-5 ✅ (2026-05-26)**: 신규 가입자 닉네임 설정 모달. Figma 노드 95:388/390/392/393/395/396/398/400 직접 MCP 검증 — §14-8 문서값 **4개 폰트 사이즈 정정**: 메인 타이틀 19px → **16px**, subtitle Regular 12px → **SemiBold 10px**, 확인 텍스트 9px → **8px**, input placeholder 12px → **10px**. 신규 컴포넌트: `NicknameModal` (검증 로직 + mock 중복 체크 + Supabase `auth.updateUser({ data: { nickname } })` 로 user_metadata 저장 + 성공 메시지 2초 표시), `NicknameGate` (page-server → client 핸드오프, onComplete=`window.location.reload()`). 검증: 2~16자, `/^[\p{L}\p{N}_]+$/u` (한글/영문/숫자/`_`, 공백/특수문자 불허). 모달 자체는 `position: absolute; z-index: 200`, **닫기 불가** (§14-9 룰 — ESC/외부 클릭 listener 없음, 확인 버튼만 동작). `AuthHeader` 에 `user.nickname?` prop 추가 — 우상단은 `nickname ?? email`, 중앙 닉네임(`§14-3` x=606/y=60, 12px, current 라벨 위)은 nickname 있을 때만 렌더. `page.tsx` 가 `user.user_metadata.nickname` 추출 + `showNicknameGate = !!user && !nickname` 조건으로 mount. profiles 테이블 + 실 중복 체크는 4a-7. `npm run build` ✅, dev SSR `GET / 200`.
  - **4a-6-1 ✅ (2026-05-26)**: 수정 모달 정적 UI. Figma 노드 77:389/78:391/78:402/78:405/78:407/78:433/78:434/78:436/78:439 직접 MCP 검증 — §14-4 문서값 **2개 정정**: 변경 버튼 radius 8 → **12**, text 15px → **13px** + 노드 ID 컬럼 추가. 신규 컴포넌트: `ActiveEditContext` (activeVariant 추적), `EditPortfolioModal` (§14-4 좌표대로 8행 + 7개 separator + 취소/완료 footer). 행마다 번호(1~8) + 종목명 + 변경 버튼 + 드래그 핸들(3선) 모두 absolute. `EditButton` 에 `onMouseDown stopPropagation` 추가 — 다른 variant 의 [수정] 클릭 시 document mousedown listener 안 발사되어 close→reopen 깜빡임 없이 swap. `PortfolioSection` 에 `canEdit?: boolean` prop — true 면 `openEdit(variant)` onClick, false 면 기존 "로그인 후 바로 이용 가능해요" 툴팁. `page.tsx` 가 `canEdit = !!user && !!nickname` 계산 후 PortfolioSection 에 전달. 외부 클릭/ESC 모두 closeEdit (취소와 동일, §14-4 룰). 4a-6-1 단계는 정적 UI 만 — 변경 버튼 클릭/DnD/analyze 재호출은 4a-6-2~4. backdrop 없음 (§14-9). Tablet/Mobile 은 `display: none`. **사용자 결정 (2026-05-26)**: spare variant 의 수정 모달은 Figma 노드 없음 → 카드 그리드 중앙 정렬 시도 후 다시 [수정] 버튼 bottom (y=721) 과 카드 1행 top (y=736) 의 가운데 = **top 729px** 으로 확정. footer 와 9px gap. current variant 는 Figma 그대로 top=117. `data-variant` 분기. `npm run build` ✅, dev SSR `GET / 200`.
  - **4a-6-2 ✅ (2026-05-26)**: 변경 dropdown UI + stock-master 카탈로그. Figma 노드 81:478/480/481/491/493/494/496/497 직접 MCP 검증 후 작업 → 사용자 피드백 "글자가 너무 작음" 으로 Figma 에서 폰트/버튼 크기 모두 키움 → MCP 로 **재검증** 후 코드 동기화. **최종 §14-5 값**: dropdown 외곽 (510, 149) **260×292** (8행 표시), input height **28**, placeholder Regular **13px**, 후보 로고 **24×24** (x=517), 후보 이름 SemiBold **15px** (y=195), [선택] bg **35×24** radius **12** (x=728), [선택] text SemiBold **12px** (x=734), 행 간격 **31**. placeholder 텍스트 `"종목명을 입력해주세요"`. **2차 재검증 (사용자 추가 요청)**: dropdown 이 수정 모달 **오른쪽 옆**으로 이동 (frame x=510→**882**, modal-rel left=109→**481**) + width 260→**266** (선택 btn 우측 여백 확장, scrollbar 와 3px gap). 위치 동적: frame y = `124 + 43×i` (modal-rel top = `7 + 43×i`), x 고정. spare variant 의 행 4~8 클릭 시 행 3 위치로 clamp (footer 침범 방지). 신규 파일: `src/data/stock-master.ts` (40종목, 한미 혼합 한글명 — 한국 15 + 미국 25 (default 14 + 추가 11)), `src/components/StockSearchDropdown.tsx` + `.module.css`. 검색 input + inline SVG 검색 아이콘 (Figma asset URL 만료 회피, Lucide Search 패턴), `STOCK_MASTER.filter(name => !used.has(name) && name.includes(query))` 클라이언트 필터. **가로 스크롤 방지**: dropdown `overflow: hidden` + list `overflow-x: hidden`. **긴 종목명**: `mask-image: linear-gradient` 로 `#31343f` 배경에 fade-out (사용자 요청, ellipsis 아님). **스크롤바 디자인**: track `#31343f`, thumb + 화살표 (SVG) `#e5e5e5`. EditPortfolioModal 에 `openRow: number | null` state 추가 — `[변경]` 클릭 시 setOpenRow(i) → dropdown mount. dropdown 의 `[선택]` 클릭 시 `onSelect(name)` 콜백 (4a-6-2 단계에선 `console.log` stub, 슬롯 swap + analyze 재호출은 4a-6-3). `excludeNames` 로 같은 portfolio 내 이미 사용 중인 종목 후보에서 숨김 (현재 ↔ 예비 간 중복 허용). `changeBtn` 에 `onMouseDown stopPropagation` — 다른 행 변경 클릭 시 dropdown close→reopen 깜빡임 방지. ESC / 외부 클릭은 dropdown 만 닫힘 (모달 유지). `npm run build` ✅, dev SSR `GET / 200`.
  - **4a-6-3 ✅ (2026-05-26)**: 수정 모달의 편집 로직 + analyze 재호출. **AnalysisProvider** 큰 폭 재구성 — 종목 names 가 props 가 아닌 **mutable state** (`currentNames`/`spareNames`). 신규 `updatePortfolio(variant, newNames)` action — diff 처리: 추가된 종목만 fetch (`fetchOneReal` / `revealOneFixture` helper), 제거된 종목은 stocks 에서 drop (단 다른 variant 에 여전히 있으면 유지 — current ↔ spare overlap 허용), 빈 슬롯("")은 stocks 에 안 추가. portfolio overall 도 reset → 다음 useEffect 가 자동 재 fetch. **첫 useEffect dep 변경**: `[isMobile, allNames]` → `[isMobile]` (names 변경 시 전체 reset 안 함, updatePortfolio 가 incremental). **portfolio overall 로직** — 빈 슬롯 제외 ready 종목만으로 산출 (filtered ready count 일치 시 fire), 전체 빈 슬롯이면 `status: "empty"` (사용자 결정). `OverallState` 타입에 `"empty"` 추가. **EditPortfolioModal**: props 제거 (currentNames/spareNames/updatePortfolio 모두 useAnalysis), `pendingNames` state — 모달 열릴 때 `padTo8(source)` 복사 + variant 변경 시 자동 reseed, dropdown onSelect 로 슬롯 swap (`p.with(i, name)`), [완료] 시 `updatePortfolio(variant, pendingNames) + closeEdit`, [취소]/ESC/외부 클릭은 pending 폐기. `excludeNames` 도 pendingNames 기반. **StockCard**: `name === ""` 분기 (§14-10) — 헤더 ColorBox `signal="empty"`, 종목명 빈칸, IssueGrid `issues={[]}` (20개 모두 empty 박스), 클릭 시 `openEdit(variant)` (StockModal 안 열고). **PortfolioSection**: `stockNames` prop 제거 → `useAnalysis().currentNames/spareNames`. portfolio overall ColorBox 가 status="empty" 시 `signal="empty"` 렌더. card key 가 `${variant}-${i}` 로 변경 (빈 슬롯 중복 방지). **page.tsx**: PortfolioSection / EditPortfolioModal 의 names prop 제거. `npm run build` ✅, dev SSR `GET / 200`.
  - **4a-6-4 ✅ (2026-05-26)**: 드래그 앤 드롭 순서 변경. `@dnd-kit/core@6.3.1` + `@dnd-kit/sortable@10.0.0` + `@dnd-kit/utilities@3.2.2` 설치. **EditPortfolioModal 재구성**: 각 행을 신규 `SortableRow` 컴포넌트로 분리 (wrapper div + 안에 number/name/btn/handle absolute children). `useSortable` 의 `listeners` 는 **handle 에만** spread (행 본체는 클릭 가능 유지), `attributes` 는 wrapper. `setNodeRef` + inline `style.transform = CSS.Transform.toString(transform)` + `style.transition` 으로 dnd-kit transform 적용. `DndContext` 의 `PointerSensor activationConstraint: { distance: 4 }` (KeyboardSensor 미등록, 4a 미지원). `closestCenter` collision + `verticalListSortingStrategy`. sortable ids 는 `[0..7]` (slot 고정) — drag end 시 `arrayMove(pendingNames, from, to)` 호출. **드래그 중 시각**: 잡은 행 `opacity: 0.9` + `box-shadow: 0 4px 12px rgba(0,0,0,0.3)` + `zIndex: 10` (inline). 다른 행들은 dnd-kit 가 자동 transform + transition. **드래그 중 변경 btn**: `draggingId !== null` → 모든 SortableRow 에 `anyDragging` prop 전파 → `disabled` (CSS `:disabled` 가 opacity 0.5 + pointer-events none + cursor not-allowed). **핸들 CSS**: `cursor: grab`, `:active { cursor: grabbing }`, `touch-action: none` (PointerSensor 가 터치 이벤트 정상 수신). 드래그 시작 시 열려있는 dropdown 자동 close (시각 충돌 방지). 사용자 후속 요청으로 슬롯 번호(1~8) 는 SortableRow 밖으로 분리 — 드래그 시에도 번호는 고정. `npm run build` ✅, dev SSR `GET / 200`.
  - **4a-7 ✅ (2026-05-26)**: Supabase 스키마 + 영속화 + nickname 실 dedup + 신규 가입자 onboarding 모달. 신규 SQL `supabase/migrations/001_profiles_portfolios.sql` — `profiles` (id FK auth.users / nickname unique / created_at / updated_at), `portfolios` (id / user_id FK / variant check / stocks text[] / unique (user_id,variant) / updated_at), 두 테이블에 본인 행만 CRUD 가능한 RLS 정책, `set_updated_at` 트리거, **SECURITY DEFINER 함수 `check_nickname(name)`** (RLS 우회로 다른 user 의 nickname 도 dedup 가능). 신규 helpers: `lib/supabase/profiles.ts` (`fetchOwnProfile` / `upsertOwnProfile` — `error.code === '23505'` 으로 unique 위반 처리), `lib/supabase/portfolios.ts` (`fetchOwnPortfolios` / `upsertOwnPortfolio` — `onConflict: "user_id,variant"`). `/api/check-nickname` 이 admin scan → `supabase.rpc("check_nickname", { name })` 로 단순화 (admin client 삭제). `NicknameModal` 의 저장 = `auth.updateUser` 대신 `upsertOwnProfile`. `page.tsx` 가 server-side 에서 `fetchOwnProfile` + `fetchOwnPortfolios` 호출 — explicit nickname = `profile.nickname`, AnalysisProvider 의 initial `current`/`spare` = DB 의 portfolios (없으면 빈 8슬롯). 로그아웃 / 익명은 default 16종목 그대로. `AnalysisProvider` 에 `userId: string \| null` prop 추가 — `updatePortfolio` 에서 logged-in 사용자면 `upsertOwnPortfolio` fire-and-forget. **Onboarding 모달** (Figma 노드 139:388 검증): 신규 가입자 (nickname 있고 portfolios 모두 빈 상태) → `ActiveEditProvider` 의 `initialActive="current"` + `initialAutoOpenRow=0` + `initialMode="onboarding"` 으로 자동 mount. `EditPortfolioModal` 에 mode 분기 — onboarding 시 height 479 + 타이틀 "포트폴리오를 채워주세요" (SemiBold 24px white) + 모든 행/separator/footer modal-rel top +73 shift. `StockSearchDropdown` 에 `additionalTopOffset` prop 추가 (onboarding 시 dropdown 도 +73 shift). 변경 버튼 텍스트가 슬롯 별 분기 — 빈 슬롯 `"추가"` / 종목 있음 `"변경"` (두 mode 공통). **사용자 작업**: Supabase Dashboard → SQL Editor 에서 `supabase/migrations/001_profiles_portfolios.sql` 전체 붙여넣고 실행. `npm run build` ✅.
  - **4a-8 ✅ (2026-05-26)**: 폴리시 + 회귀 검증. **z-index 스택** 정리 — AuthHeader 로고 overlap(1) < ColorBox/EditButton tooltip(10) < TopTicker/StockModal/EditPortfolioModal(100) < StockSearchDropdown(110, 수정 모달 자식이라 위) < NicknameModal(200, 최상위). StockModal 과 EditPortfolioModal 동시 mount 시 page.tsx DOM 순서(편집 모달이 후) 로 편집이 위에 표시. **ESC/외부 클릭 일관성**: StockModal/EditPortfolioModal/StockSearchDropdown 모두 ESC + 외부 클릭 close, NicknameModal 은 listener 자체 없음(닫기 불가, §14-9). **버그 수정**: dropdown 열린 상태에서 ESC 시 window-level keydown listener 두 개(EditPortfolioModal + StockSearchDropdown)가 둘 다 발사해서 dropdown + modal 같이 닫히던 문제 → EditPortfolioModal 의 ESC handler 가 `openRow === null` 인 경우만 closeEdit 호출(§14-5: dropdown 열림 시 ESC = dropdown 만 close). **빈 portfolio 시 analyze 0회 검증** — `allNames = [...current,...spare].filter((n) => n !== "")` 이라 신규 가입자(모든 슬롯 "") 면 빈 array → makeLoading 빈 obj + fetch loop no-op, portfolio overall 도 `filled.length === 0 → status:"empty"` 로 RPC 호출 없음. **Tablet/Mobile 회귀** — 데스크탑 전용 모달(AuthHeader/StockModal/EditPortfolioModal/NicknameModal) 모두 `@media (max-width: 1279px) { display: none }` 가드, StockSearchDropdown 은 부모 모달 자식이라 자동 hidden. PortfolioSection 의 카드 그리드는 tablet/mobile 도 보임(layout reflow). 정식 tablet/mobile 모달 대응은 후속 step. `npm run build` ✅.
      - **이슈 갯수**: 8 고정 → 동적 (`stock.issues.length`, 데스크탑 최대 20). 모달 정렬은 `createdAt desc` (카드는 7-bucket 그대로).
      - **헤더 sticky + timeline scroll**: 모달이 `display: flex; flex-direction: column`. `.header { flex: 0 0 65px }` 고정 + `.timeline { overflow-y: auto }`. timeline 안 inner div 의 height = `55 + (N-1)*81 + 35` 동적.
      - **세로 연결선 동적 갯수**: 8개 고정 → N 개 (첫 박스 위 1 + 박스 사이 N-1). `top: i × 81` (timeline-relative).
      - **timestamp bottom-align**: `.row { align-items: flex-end }` 로 텍스트 baseline/bottom 에 맞춤.
      - **외부 클릭 처리**: backdrop overlay 제거 → `document` 의 `mousedown` listener + `modalRef.contains()` 로 outside 판정.
      - **다른 카드 클릭 시 전환**: `StockCard` 의 `onMouseDown` 에 `stopPropagation()` → document listener 가 발사 안되어 close 안 됨, 카드 onClick 의 `openStock(name, variant)` 로 모달 내용/위치 전환.
    - timestamp 포맷팅(`YY.MM.DD 오전/오후 H:MM`)은 `useEffect` 안 mount 후 — SSR 시점엔 "-" 출력. ESC/외부클릭/[닫기] 닫힘. Tablet/Mobile 은 `display: none` (4a-3 데스크탑 전용, tablet/mobile 모달은 별도 step). 시그널 컬러는 기존 토큰 유지(`#9fe8c5` 등), Figma `#9ee8ae` 와 다름은 별건. `npm run build` ✅, dev SSR `HTTP 200`.
- **Step 4b ✅ (2026-05-31)**: 데이터 레이어 확장. 모델 `gpt-4o` → **`gpt-4o-mini`** (analyzeStock + analyzePortfolioOverall 둘 다, `lib/openai.ts`). `Issue` 타입에 3개 옵셔널 필드 추가 (`src/types/index.ts`): `createdAt?: string` (이미 4a 옵셔널, 이제 live 도 채움), `importance?: number` (종목당 unique 1..N, 1=최중요), `source?: { name: string; url?: string }`. GPT 프롬프트/스키마(`FIELD_RULE` + `STOCK_SCHEMA_HINT`)가 세 필드를 요청. 서버 정규화: `normalizeCreatedAt` (`Date.parse` 실패 시 drop → 모달 "-"), `normalizeSource` (name 필수, url 옵셔널), `normalizeIssue` 가 importance raw 보존 후 `assignUniqueImportance(issues)` 가 slice 이후 kept set 에 대해 raw asc 기준 unique 1..N 재랭킹 (GPT 중복/누락 방어). **정렬은 변화 없음** (사용자 결정): 카드 그리드 7-bucket + GPT 순서, 모달 createdAt desc 그대로. importance 는 Step 4d (모바일 Top-10/pop scoring) 대비 데이터로만 보관. `source` 는 데이터만 — §14-6 모달에 출처 요소 없어 미표시 (실제 출처 표시는 4c 뉴스 어댑터). **fixture 보강**: `analysis-fixture.ts` 의 enrich IIFE 가 ~102개 이슈에 mock `importance`(issueIdx+1) + `source`(8개 매체 풀 순환 + `news.example.com` placeholder url) 추가 → fixture 모드에서도 새 필드 검증 가능. 캡처 dump 는 `s.stock.issues` 를 그대로 직렬화하므로 자동으로 새 필드 포함. UI 컴포넌트 변경 없음 (StockModal createdAt 이미 연결). `npm run build` ✅.
    - **4b 후속 (2026-05-31 사용자 피드백 3건)**:
      1. **모바일 재분석 폐기 → importance top-10 트림**: viewport flip 시 전체 재 fetch 하던 동작 제거. `AnalysisProvider` 초기 useEffect dep `[isMobile]` → `[]` (마운트 1회), fetch 는 항상 `FETCH_MAX_ISSUES=20`. 모바일은 `src/lib/issues.ts` 의 `topByImportance(issues, 10)` 로 렌더 시 트림 (버킷 순서 유지, importance 없으면 head-slice fallback). `StockCard` 카드 그리드 + `TopTicker` 공통 적용. `updatePortfolio` 도 maxIssues 항상 20.
      2. **recency 강화**: 프롬프트가 `최근 ${RECENCY_DAYS}일(${sevenDaysAgo} ~ ${today})` 명시 + `RECENCY_RULE`/`RESOLVED_RULE` (해소·종결된 이슈 제외). 서버 `filterRecent(issues, now)` 가 createdAt 이 7+1일 보다 오래된 이슈를 drop (무날짜/파싱불가는 유지 — 판단 불가).
      3. **dedup 서버 안전망 신설**: 기존엔 프롬프트뿐 → GPT 가 같은 이슈 5개씩 반환. `dedupeIssues` 가 정규화 텍스트 완전일치 + `source.url` 일치 + char-bigram Jaccard ≥ 0.6 (`DUP_SIMILARITY`) 를 모두 중복으로 처리, 첫 등장만 유지. 파이프라인 순서: normalize → `filterRecent` → `dedupeIssues` → `sortByBucket` → slice → `assignUniqueImportance`. `npm run build` ✅, dedup/recency/top-importance 로직 단위 검증 완료.
    - **4b 후속 2 (2026-06-01 사용자 피드백 4건)** — 전부 live 품질/표시 개선:
      1. **createdAt 대표 기사 규칙**: 날짜 누락 줄이기. `FIELD_RULE` 의 createdAt 항목이 "여러 기사를 참고했어도 대표 기사 1개를 정해 그 날짜를 사용, 정말 날짜를 못 찾을 때만 생략" 으로 강화. `source` 도 같은 대표 기사 기준.
      2. **출처 품질 + 요약 규칙**: 무관/홍보성 문장(예: "콴타 서비시스 크루즈 여행") 차단. `SOURCE_QUALITY_RULE` (공신력 있는 증시·경제 뉴스만, 광고/여행/블로그/동명이인 무관 내용 제외) + `SUMMARY_RULE` (헤드라인 그대로 복사 금지, 본문 함축 한국어 요약) 추가. gpt-4o-mini 한계라 프롬프트가 유일한 레버.
      3. **모달 가로 스크롤 제거 + 2줄 줄바꿈**: `StockModal` 행을 `.rowBoxWrap` + `.rowContent`(텍스트+날짜 inline 흐름) 로 재구성. `.row` 를 `left:27 / right:14` 로 modal 폭에 bound, `.rowText` 가 `word-break:keep-all`+`overflow-wrap:anywhere` 로 2줄까지 wrap, 날짜는 inline 이라 **마지막 줄 끝**에 8px gap 으로 trail. `.timeline { overflow: hidden auto }` 로 overflow-y→x:auto gotcha 차단. §14-6 노트 갱신.
      4. **분석 중 placeholder 교체**: "분석 중…" → "팀사랑꾼들 AI가 열심히 분석중이에요". 신규 공유 컴포넌트 `AnalyzingText`(+ `.module.css`) — label 은은한 opacity pulse + 점 3개 sequential blink, `prefers-reduced-motion` 가드. `CentralIssue`(desktop) / `TopTicker`(tablet·mobile) 양쪽 placeholder 에 사용. `npm run build` ✅, dev SSR `GET / 200`.
- **Step 4c ✅ 코드 완료 (2026-06-01)**: 뉴스 어댑터 파이프라인 (Phase 1+2 코드 전부). **활성화 사용자 작업**: ① `.env`(Vercel) `USE_NEWS_ADAPTERS=true` + (선택) `STOCK_CACHE_TTL_MS`/`REFRESH_MODE`/`CRON_SECRET`, ② Supabase SQL Editor 에서 마이그레이션 `002`(캐시 테이블)·`003`(Realtime 발행) 실행, ③ Vercel Pro 배포(cron fire). 미적용 시에도 앱은 graceful degrade (캐시/Realtime no-op, web_search 또는 직접 계산). **배포·동작확인 완료 (2026-06-03, Vercel Pro)** — env(`NEXT_PUBLIC_USE_FIXTURE=false` + 키들), 마이그레이션 002/003, cron 모두 적용됨. **현재 `REFRESH_MODE` 미설정 = `test`(2일마다)** → 시장시간 5분/유휴 30분 원하면 Vercel 에 `REFRESH_MODE=live` 추가 후 redeploy. **핵심 전환**: `web_search` 폐기 → 어댑터가 공신력 있는 API 에서 구조화된 기사를 직접 수집, GPT 는 그 기사만 입력받아 분류·요약 (출처·날짜는 기사 메타데이터 그대로 → 가짜 데이터/무관 문장 차단). **점진적 페이즈** (사용자 결정): Phase 1 = 어댑터 + GPT 분류 + DB 캐시(TTL), Phase 2 = `pg_cron`(`pg_net` 으로 refresh 엔드포인트 호출) + Supabase Realtime 푸시 (로드당 OpenAI 0콜). **소스 4종**: KR=Naver 뉴스 API(1차)+Google RSS, US=Finnhub(1차)+Yahoo+Google RSS. 시장 라우팅은 `src/data/stock-catalog.ts` 의 `market`/`ticker`.
  - **Step 4c Decisions log**:

    | 결정 | 값 |
    |---|---|
    | web_search 처리 | **폐기**. GPT 는 어댑터가 준 실제 기사만 분류/요약 (검색 X) |
    | 페이즈 | 점진적 — Phase 1(어댑터+분류+캐시) → Phase 2(pg_cron+Realtime) |
    | 소스 | Naver(KR 1차) / Finnhub(US 1차) / Google RSS(키 없음, 한·미 보조) / Yahoo(최하 우선, 생략 가능) |
    | 시장 라우팅 | `stock-catalog.ts`: KR→Naver+Google(한글명 쿼리), US→Finnhub+Yahoo(ticker)+Google. 미지 종목은 KR default |
    | US ticker | 4c 는 카탈로그에 직접 부여(부트스트랩). 동적 해석은 4e |
    | DB 캐시 | `stock_analysis` (stock_name PK, issues/overall jsonb, fetched_at). anon select, service-role write (RLS). portfolio overall 은 캐시된 종목으로 재산출 |
    | API 키 | 사용자 미보유 → `.env.example` 슬롯 + 발급 가이드 제공. Google RSS(키 없음)부터 구현 |

  - **4c 서브태스크**: 4c-1 타입·카탈로그·env ✅ / 4c-2 Naver+Google RSS ✅ / 4c-3 Finnhub ✅ (Yahoo 보류) / 4c-4 소스 라우터+병합·dedup ✅ / 4c-5 GPT 분류 + `/api/analyze` 배선 ✅ / 4c-6 `stock_analysis` 마이그레이션+read-through 캐시 ✅ / 4c-7 스케줄 리프레시(Vercel Cron+`/api/refresh`) ✅ / 4c-8 클라 Realtime 구독 ✅
    - **4c-1 ✅ (2026-06-01)**: `src/data/stock-catalog.ts` 신설 (`STOCK_CATALOG` = {name, market, ticker?} 40종목, KR 15 + US 25 with ticker) + `metaOf`/`marketOf`/`tickerOf` 헬퍼. `stock-master.ts` 는 `STOCK_CATALOG.map(name)` 로 파생 (단일 소스, 드롭다운 회귀 0). `src/lib/news/types.ts` (`Article`/`Market`/`AdapterContext`/`NewsAdapter`). `.env.example` 에 `NAVER_CLIENT_ID`/`NAVER_CLIENT_SECRET`/`FINNHUB_API_KEY`/`RAPIDAPI_KEY` 슬롯 + 발급 가이드 주석. `npm run build` ✅.
    - **4c-2 ✅ (2026-06-01)**: Google News RSS + Naver 어댑터. `src/lib/news/html.ts` (공유 `decodeEntities`/`stripTags`/`hostname`). `google-rss.ts` — 키 없는 Google News RSS (`news.google.com/rss/search?q=<한글명> when:Nd&hl=ko&gl=KR`), `<item>` 정규식 파싱(CDATA/엔티티, " - 매체명" 접미사 제거, 무날짜·stale drop). `naver.ts` — `openapi.naver.com/v1/search/news.json?query=<한글명>&sort=date`, `X-Naver-Client-Id/Secret` 헤더(env 없으면 `[]`), title/description `<b>`+엔티티 정리, source=originallink hostname. 둘 다 실패 시 `[]`.
    - **4c-3 ✅ (2026-06-01)**: Finnhub 어댑터 (`finnhub.ts`) — `finnhub.io/api/v1/company-news?symbol=<ticker>&from&to&token`. `FINNHUB_API_KEY`+ticker 없으면 `[]`. 영문 기사(GPT가 한국어로 요약). **Yahoo 보류**: RapidAPI 키 없고 엔드포인트 계약 불확실 → 추측 구현 안 함.
    - **4c-4 ✅ (2026-06-01)**: `src/lib/news/index.ts` `fetchArticles(name, recencyDays)` — `marketOf` 로 어댑터 선택(KR=Naver+Google, US=Finnhub+Google), `Promise.allSettled` 병렬 fetch, URL/정규화 제목으로 `dedupeArticles`, 최신순 정렬 + 40개 cap. 어댑터가 키 없으면 스스로 빠짐.
    - **4c-5 ✅ (2026-06-01)**: `openai.ts` 에 `classifyArticles(stockName, articles, maxIssues)` — web_search **없이** 실제 기사 목록만 입력, createdAt/source 는 기사 메타데이터 그대로 쓰라고 지시. 기사 0개 → 빈 이슈 + neutral overall (가짜 mock 대신). `analyzeStock` 과 공유 파이프라인을 `parseGptObject`/`finalizeStockResult` 로 추출(normalize→filterRecent→dedupe→sort→slice→importance). `RECENCY_DAYS` export. `/api/analyze` 가 `USE_NEWS_ADAPTERS` env(`process.env.USE_NEWS_ADAPTERS === "true"`)로 분기 — 기본 off(web_search 유지), on 이면 `fetchArticles → classifyArticles`. **라이브 검증 완료**: 삼성전자(Naver+Google 40건)/엔비디아(Finnhub 40건) 수집 OK, 1종목 풀 분류 시 6개 이슈 모두 실제 매체명·URL·최근 날짜로 채워짐(web_search 가짜/무관 문장 사라짐). `npm run build` ✅. **알려진 한계**: GPT 가 긴 URL 을 그대로 못 옮길 수 있음(source.name·createdAt 은 정확, url 은 부정확 가능 — 현재 미표시라 무해).
    - **4c Phase 2 설계 확정 (2026-06-01)** — 배포=**Vercel**, cron=**Vercel Cron**, 범위=**사용 중 종목만**(portfolios ∪ 기본 16), 클라=**전면 전환**(DB 직접 읽기 + Realtime).
      - **4c-7 ✅ (2026-06-01)**: 스케줄 리프레시. `vercel.json` 의 cron 이 `/api/refresh`(GET) 를 **5분마다**(`*/5 * * * *`) 호출 — Vercel 이 `Authorization: Bearer ${CRON_SECRET}` 자동 주입, 라우트가 검증(없으면 401, `maxDuration=300` Pro). cron 은 **고정 5분 틱(heartbeat)**일 뿐, 실제 빈도는 `src/lib/refresh-schedule.ts` 가 결정 (cron 표현식으론 시장시간/휴장/DST 불가 → 코드 게이팅). **변경 지점 단일화**: 그 파일 상단 `REFRESH_MODE`/`SCHEDULE`/`MARKETS`/`HOLIDAYS` 만 고치면 빈도 변경 (push → Vercel auto-deploy). `REFRESH_MODE` 는 env 로도 오버라이드. 정책: `test`=2일마다 / `live`=**per-market** (종목의 시장이 열렸을 때만 5분, 닫히면 30분 — 비용 절감). 시장 윈도우: 미국 03:00–20:00 ET, 한국 07:30–18:00 KST, 주말·휴일 제외(DST 는 Intl timeZone). 즉 한국장 시간엔 KR 종목만 5분/US 30분, 미국장 시간엔 그 반대, 겹치는 구간(KST 17~18시) 둘 다 5분, 주말 둘 다 30분. 라우트 흐름: `listInUseStockNames`(portfolios ∪ 기본16, service-role) → `selectStaleStockNames(names, thresholdFor, batchSize)` 가 **종목별** 임계(`desiredIntervalMsFor(marketOf(name), now)`)보다 오래된 것 중 coldest `batchSize`(기본 5)개 → 병렬 `computeStock`+`writeCachedAnalysis`. `computeStock`/`CACHE_MAX_ISSUES`/`USE_NEWS_ADAPTERS` 는 `src/lib/analyze.ts` 로 추출해 analyze·refresh 라우트 공유. **사용자 작업**: Vercel 에 `CRON_SECRET` env + 배포(Pro). 배포 후 cron 이 fire. 빈도 바꾸려면 `refresh-schedule.ts` 편집. **검증**: 스케줄 로직(test/active/idle/주말) 단위 검증 + 401 auth + `npm run build` ✅.
      - **4c-8 ✅ (2026-06-01)**: Realtime 클라 전면 전환. 마이그레이션 `003_stock_analysis_realtime.sql` — `replica identity full` + `supabase_realtime` publication 에 `stock_analysis` 추가(idempotent DO 블록). `AnalysisProvider`: 브라우저 supabase 클라 1개 `useMemo`(reads/Realtime/upsert 공유). 신규 `loadRealStocks(names)` — `stock_analysis` 에서 `.in('stock_name', names)` 일괄 warm-read → ready(source `"cache"`), cold(행 없음)만 `fetchOneReal`(/api/analyze 계산). 초기 effect(live) 가 `loadRealStocks(allNames)` + `channel('stock_analysis_changes').on('postgres_changes', table:stock_analysis)` 구독(cron 갱신 시 현재 표시 중 종목만 패치) + cleanup `removeChannel`. `updatePortfolio` 추가 종목도 `loadRealStocks` 경유. `StockState.source` 에 `"cache"` 추가. fixture 모드 불변, supabase env 없으면 전부 graceful(직접 계산). **검증**: `npm run build` + dev SSR `GET / 200` ✅.
      - **4c-9 ✅ (2026-06-01)**: 포트폴리오 overall 을 GPT 호출 → **클라 집계**로 전환 (사용자 결정, 잔존 2콜 제거 → 로드당 OpenAI per-stock 0콜 완성). 신규 `src/lib/overall.ts` `aggregateOverall(stocks)` — 종목 overall 을 점수화(pos_strong+3/mid+2/mild+1, neutral 0, neg 대칭) → 평균 → 밴드(`|s|<0.5 중립·<1.5 약·<2.5 중·≥2.5 강`). intensity 가 가중 역할(strong ±3 이 mild ±1 보다 평균을 더 끌어당김), importance 가중은 종목 단위 집계라 미적용. **AnalysisProvider**: `runOverallReal`(fetch)/`overallDispatched`/`LABELS` 제거, overall effect 가 `aggregateOverall(ready)` 로 동기 계산 + **stocks 변경마다 재산출**(값 동일 시 setState 스킵) → Realtime 종목 갱신이 overall 에 자동 반영(이전 갭 해소). fixture·live 동일 경로(`ANALYSIS_FIXTURE.overalls` 더는 안 읽음). dead code 제거: `analyzePortfolioOverall`(openai.ts) + `/api/analyze` 의 `portfolio-overall` 분기/`PortfolioRequest`. 사용자 결정 변경(GPT 종합 판단 → 결정적 집계). 단위 검증(all-mild→mild/all-mid→mid/균형→중립) + build + dev SSR 200 ✅.
      - **4c-8 (Realtime 클라)**: 마이그레이션 `003` 으로 `stock_analysis` 를 `supabase_realtime` publication 에 추가. `AnalysisProvider` 가 live 모드 마운트 시 `stock_analysis` 를 `.in('stock_name', names)` 로 일괄 읽어 즉시 렌더, **cold(행 없음) 종목만** `/api/analyze` 계산. `supabase.channel().on('postgres_changes', table:stock_analysis)` 구독으로 cron 갱신 시 카드 패치. fixture 모드는 불변. **알려진 갭**: portfolio-overall 은 유저별 종목셋 의존이라 캐시 안 함 → 로드당 2콜은 남음(per-stock 16콜 제거가 주 이득). 추후 종목셋 해시 캐시 검토.
    - **4c-6 ✅ (2026-06-01)**: read-through 캐시. 신규 마이그레이션 `supabase/migrations/002_stock_analysis.sql` — `stock_analysis` (stock_name PK / issues·overall jsonb / fetched_at), RLS on + public SELECT 정책만(쓰기는 service role bypass). `src/lib/supabase/analysis-cache.ts` — `SUPABASE_SECRET_KEY` 로 service-role 클라이언트(`@supabase/supabase-js` createClient, persistSession:false), `readCachedAnalysis(name, ttlMs)` (fetched_at age ≤ ttl 이면 반환, 에러/미존재/만료 → null) + `writeCachedAnalysis` (upsert onConflict stock_name, 실패는 warn). env 없으면 둘 다 no-op → 마이그레이션 전에도 앱 정상(매번 recompute). `/api/analyze` 의 `analyzeOneStock` 이 read-through: 캐시 신선하면 OpenAI 스킵, 아니면 `computeStock`(어댑터/web_search)으로 풀 20개 산출 후 캐시 write + maxIssues slice 반환. TTL 은 `STOCK_CACHE_TTL_MS` env (기본 3h, 0 이면 read 캐시 사실상 비활성). portfolio-overall 은 캐시 안 함(유저별 종목셋 의존). `npm run build` ✅. **사용자 작업**: Supabase SQL Editor 에서 `002_stock_analysis.sql` 실행 → 그때부터 캐시 활성.
- **Step 4d ✅ (2026-06-03)**: 이슈 누적 저장(accumulation) — 소형주 빈 카드 해소. cron refresh 가 기존 캐시 이슈를 덮어쓰지 않고 **누적**. 신규 `refreshStock`(`src/lib/analyze.ts`): 기존 이슈 read → `fetchArticles` → `classifyAndMerge`(`openai.ts`). `classifyAndMerge` 가 GPT 에 [현재 저장된 이슈]+[최근 기사] 전달 → GPT 가 (1) 중복 없는 **새 이슈**만 도출 + (2) 저장된 이슈 중 **해소된 것 번호**(`resolvedExisting`) 반환. 서버 병합: resolved 제거(v2) → `dedupeIssues`(기존 우선, 메타데이터 보존) → **21일 보관**(`ISSUE_RETENTION_DAYS`, `filterRecent` 일수 파라미터화)으로 오래된 것 제거(v1) → createdAt desc → 20개 cap → `sortByBucket` → importance 재부여. **종목 overall 도 이슈 집계로 전환**(`stockOverallFromIssues`) — 누적 store 에선 GPT 가 새 배치만 보므로 GPT overall 부적합 → `finalizeStockResult`/cold path/merge 모두 이슈 점수 평균 사용 (GPT `overall` 필드 무시, `normalizeOverall` 제거). 기사 0개면 GPT 호출 없이 기존 set 에 보관기간만 적용. on-demand(`computeStock`, 신규 종목 첫 로드)는 누적 없이 fresh 분류. **결정(사용자)**: 보관 21일 + 종목 overall 집계 + v1·v2 병행. 모바일 Top-10 은 4b 완료, `createdAt` pop scoring 은 별도 후속. 단위검증(resolved 제거/21일 만료/dedup/overall) + build + dev SSR 200 ✅.
- **Step 4d 잔여 ✅ (2026-06-04)**: `createdAt` 기반 pop scoring. `src/lib/issues.ts` 의 `topByImportance` → **`topByPop(issues, n, now)`** — GPT importance(rank, 1=최중요)와 recency(createdAt, 3일 half-life 지수감쇠)를 0.5:0.5 블렌드한 pop score 상위 n개 선정(버킷 표시순 유지). **렌더 시점 `now` 기준**이라 캐시 이슈가 시간 지나며 자연히 식음. 모바일 Top-10 선정에 적용(`StockCard`/`TopTicker`). 무날짜 createdAt 은 recency 0.5(중립). 카드 7-bucket 표시순·모달 createdAt desc 는 불변. 단위검증 + build + dev SSR 200 ✅.
- **이슈→기사 링크 ✅ (2026-06-04)**: 중앙 ticker(`CentralIssue`) / 상단 ticker(`TopTicker`) / 종목 상세 모달(`StockModal`)의 이슈 텍스트 클릭 시 `issue.source.url` 을 새 탭으로 오픈. 공용 `ArticleLink` (url 없으면 일반 span, 있으면 `<a target=_blank rel=noopener noreferrer>` + hover 밑줄, onClick stopPropagation). IssueGrid 컬러박스는 텍스트가 없고 클릭=모달 오픈이라 제외. **참고**: url 정확도는 source.url 품질에 의존(4c 한계 — GPT 가 긴 URL 못 옮기면 부정확 가능), fixture 모드는 mock `news.example.com`. build + dev SSR 200 ✅.
- **툴팁 재디자인 + hover stroke ✅ (2026-06-05)**: Figma node 175:2 — 다크 툴팁(`#1a1d24`/radius 4)을 **블루그레이 pill**(`--tooltip-bg` `#7d85a2`/radius 12)로 변경. 신규 토큰 `--tooltip-bg`/`--hover-stroke`(globals.css + design-tokens.ts COLORS). 이슈 컬러박스 hover 시 **`outline: 4px solid --hover-stroke #99a7da`** 추가(node 175:278, `.box[data-tooltip]:hover`/`.tooltipOpen`, `.active` 흰 트레이서보다 우선). 3개 다크 툴팁(ColorBox 이슈 / EditButton / StockModal chartBtn) 모두 새 색·radius 적용 — 이슈 툴팁만 Figma 패딩 `8px 35px`, 버튼 툴팁은 기존 `6px 12px` 유지. 상세 `docs/design/design-tokens.md` §10-3. `npm run build` ✅.
- **종목 모달 backdrop ✅ (2026-06-07)**: Figma node `83:522` 의 dim overlay(`180:394` — 프레임 전체 `rgba(60,67,81,0.66)` 사각형, 모달 `83:909` 바로 뒤) 를 **StockModal 에만** 추가. `StockModal.tsx` 가 모달 + backdrop(`<div className={styles.backdrop}>`)을 fragment 로 렌더, `.backdrop` = `position: fixed; inset: 0; z-index: 99`(모달 100 아래·카드 위) + `pointer-events: none`. **pointer-events:none 으로 순수 시각 효과만** — 기존 외부 클릭 닫기 / 다른 카드 클릭 시 active 종목 전환(document mousedown listener) 동작 그대로 보존. tablet/mobile(`<1280`) 은 `.modal,.backdrop { display: none }` 가드(카드 탭으로 화면만 dim 되는 것 방지). 수정/닉네임 모달은 backdrop 없음(의도) 유지 — §14-9. `npx tsc --noEmit` ✅ (백필 dev 서버와 `.next` 충돌 회피 위해 `next build` 대신 타입체크로 검증). 상세 `docs/design/design-tokens.md` §14-9.
- **선 색·끝점 round ✅ (2026-06-07)**: Figma node `83:522`/`77:3` — 흰색 각진 선들을 **`#97a0b1` + 끝점 round cap** 으로 변경. 대상 4개 클래스(전부 `background:#ffffff` 사각형 span): StockModal `.predLine`(3px 선행선)·`.line`(1px 커넥터) + EditPortfolioModal `.separator`(가로 구분선 7개)·`.handleLine`(드래그 핸들 3줄). 각 선에 `background:#97a0b1` + `border-radius: 두께/2`(predLine 1.5px, 나머지 0.5px) 추가 — **두께·좌표 불변, 색+끝점만**. CSS-only(클래스명 변경 없음 → 빌드/타입 영향 0). Figma 선들은 image vector export 라 MCP 가 stroke 색/cap 미노출 → 사용자 명시값 적용. 상세 `docs/design/design-tokens.md` §14-4 / §15.
- **Step 4e ✅ (2026-06-03)**: 종목 검색 API + 자동 확장 카탈로그. **Naver 자동완성 하나로 양 시장 커버** — `ac.stock.naver.com/ac?q=&target=stock` 가 한글 표시명 + `nationCode`(KOR/USA→market) + `code`(US=티커)를 반환(한·영 쿼리 모두, 라이브 검증: 삼성→KR, 엔비디아→US NVDA, 쿠팡→US CPNG, apple→애플 AAPL). 계획했던 Finnhub `/search`+KRX 라우팅은 불필요 → Naver 단일, 실패 시 `STOCK_CATALOG` fallback. 신규 `src/lib/stock-search.ts` `searchStocks(q)` (category=stock + KOR/USA 필터 → `StockMeta[]`), `/api/stock-search` 라우트(서버 프록시, CORS 회피). **자동 확장 카탈로그**(사용자 결정 = Option B): 검색 결과를 `stock_meta` 테이블(마이그레이션 `004`, name PK/market/ticker, RLS public read·service write)에 upsert → 뉴스 라우터 `fetchArticles` 의 신규 `resolveMeta(name)` 가 정적 카탈로그(sync) → `stock_meta`(async `readStockMeta`) → KR 기본 순으로 해석. **효과**: 검색·추가한 카탈로그 밖 US 종목도 티커를 알게 돼 Finnhub 사용(예: 쿠팡 CPNG). **cron 캐던스도 동일 해석** — `/api/refresh` 가 `readStockMetaMany`(batch)로 카탈로그 밖 종목 시장을 stock_meta 까지 조회 → 검색추가 US 종목도 US 시간표(밤)로 갱신, KR 캐던스 오해 없음. `marketOf`/`tickerOf` 제거하고 전부 `metaOf` + `resolveMeta`/`readStockMetaMany` 로 통일. `StockSearchDropdown`: `STOCK_MASTER.filter` → 빈 쿼리=정적 브라우즈 / 입력 시 디바운스(250ms) `/api/stock-search` fetch, stale 응답 무시, excludeNames·UI 그대로. **사용자 작업**: Supabase SQL Editor 에서 `004_stock_meta.sql` 실행(미실행 시 검색은 동작하나 meta 저장 no-op → 검색 US 종목은 KR 라우팅). build + 라이브 검색 + dev SSR 200 ✅.
    - **4e 후속 (2026-06-04 사용자 피드백)**: 데이터 소스는 KIS 공식 마스터 검토했으나 **고정폭 시총/플래그 필드 파싱이 불안정**(이름·티커만 신뢰) → **Naver 유지 + 큐레이션** 결정. ① **#2 기본 목록**: `STOCK_CATALOG` 를 40 → ~108 로 확장(주요 KOSPI ~40 + S&P ~60, 티커/코드 큐레이션 → Naver 1회 해석으로 한글명 수집, 기존 40은 명칭 보존). ② **#4 명칭 정확도**: `metaByTicker` 추가, `/api/stock-search` 가 결과 ticker 가 카탈로그에 있으면 카탈로그 한글명 우선(예 PWR Naver "콴타 서비스" → "콴타 서비시스"). ③ **#1 속도**: 드롭다운이 타이핑 즉시 `STOCK_MASTER` 로컬 매치 표시 후 API 결과 병합(체감 즉시), 검색 라우트는 `after()` 로 `writeStockMeta` 비동기(응답 블록 X). ④ **#5 티커검색**: Naver 가 이미 지원(검증). ⑤ **#6**: 카드 `.name` max-width 240 + overflow + mask 그라데이션(긴 종목명이 카드 침범 시 우측 페이드, 드롭다운과 동일). ⑥ **#3 logo.dev**: 드롭다운 후보를 `SearchItem{name,ticker}` 로 바꿔 `StockLogo` 가 `img.logo.dev/ticker/<T>?token=` (US) 렌더, KR·토큰없음·onError 는 흰 원 placeholder fallback, `loading="lazy"`. env `NEXT_PUBLIC_LOGODEV_TOKEN` (publishable). **사용자 작업**: logo.dev 무료 토큰 발급 → Vercel/`.env.local` 에 `NEXT_PUBLIC_LOGODEV_TOKEN` 설정. build + dev SSR 200 ✅.
- **Step 5 (이슈 반응 예측 / Reaction Prediction) — 진행 중**: 이슈→차트 반응의 인과 패턴을 forward 로 축적하고, 새 이슈/종목에 대해 `방향·예상 변동폭 밴드·영향 기간·신뢰도·근거`를 출력하는 예측 레이어. 색깔 시스템(`이슈→종목 overall→포트폴리오 overall`)의 **예측 축 버전**. **핵심 철학(초기 설계)**: 파운데이션 모델(임베딩 검색 + LLM 서술)을 코어로 day-1 동작, **숫자는 실현 초과수익의 결정적 집계에서 나오고 LLM 은 근거 서술만**(환각 예측 방지·보정 가능). event_log 가 쌓일수록 개선. **(2026-06-09 현재)** 기본 엔진은 `gpt` 모드 — gpt-4o-mini 가 숫자까지 직접 출력. 8개 진단(아래)에서 임베딩·가격으로 방향·per-issue 변동폭 예측 신호 없음(NO-GO)이라 결정적 집계도 검증된 엣지가 없었기 때문. 원 철학의 결정적 집계 코어는 `model` 모드(k-NN)로 보존되며 `PREDICTION_MODE` 로 스위치. gpt 숫자는 검증된 예측이 아니라 판단.
  - **Step 5 Decisions log (사용자 확정)**:

    | 결정 항목 | 값 |
    |---|---|
    | 예측 코어 방식 | **2-모드 스위처블** (`PREDICTION_MODE`): 기본 `gpt`(gpt-4o-mini 1콜이 color·영향기간·변동폭·종합서술 직접 출력) / `model`(사례검색 k-NN→실현분포 집계→LLM 서술). 8개 진단상 임베딩·가격으로 방향·per-issue 변동폭 예측 신호 없음 확인 → gpt 숫자는 검증된 예측 아닌 판단, 모드 스위치로 추후 검증 엔진 교체 |
    | 예측 단위 | 종목 단위 우선, 표본 부족 시 **섹터 폴백** |
    | 예측 범위 | **이슈 단위 예측 + 종목 종합 예측 둘 다**. 종목 종합 = 현재 active 이슈들의 예측을 신뢰도×importance 가중 블렌드(단순합 X, 상충 시 밴드 확장) + LLM 종합 서술 |
    | 반응 기준 | **섹터 대비 초과수익**(abnormal return). 종목 수익 − 벤치마크 수익. horizon 1/3/5 거래일 |
    | 가격 데이터 | **Yahoo Finance 단일**(비공식, raw fetch, 무료). US+KR+섹터벤치마크+섹터분류 한 소스. KR 심볼은 Naver AC(한글명→코드)→`{code}.KS/.KQ`, sector 는 Yahoo search by code. Yahoo 한글 search 는 거부됨 |
    | 벤치마크 | US=SPDR 섹터 ETF(반도체는 SMH override), KR=KODEX 반도체(091160.KS)/그 외 KOSPI(^KS11) 폴백. KR 섹터 ETF 커버리지 부분적 → 시장지수 폴백 |
    | 예산 | **월 ₩70,000 한도**(실제론 OpenAI 임베딩·분류 월 몇천 원 → 여유). 과거 데이터 구매 X, **forward 축적** 전략(초기 정확도 낮아도 OK) |
    | 영구 저장 | 21일 이슈 캐시와 별개의 **영구·불변 event_log(pgvector) + event_outcome** 신설 (Phase 1) |
    | "top-down" 의미 | 사용자가 완성된 모델을 보고 AI 학습 — 구현 자유도는 Claude 에게. 학습 방식 제약 아님 |
    | UI | **Figma 디자인 수령 후 작업**. 그 전까지 백엔드 + API + 예측 엔진만 (Phase 4 보류) |

  - **Phase 계획**: Phase 0 데이터레이어 ✅ / Phase 1 이벤트스토어+라벨링 ✅ / Phase 2 이슈단위 예측코어 ✅ / Phase 3 종목 종합 예측 ✅ / Phase 4 UI ✅ / ~~Phase 5 백테스트·신뢰도 보정~~ → **학습/룰 모델 트랙은 8개 진단 후 NO-GO**(아래 ml/ 로그). 현재 기본 엔진 = **GPT 모드**, 학습 엔진은 `model` 모드로 스위치 가능하게 보존.
  - **Phase 0 ✅ (2026-06-04)**: 가격·섹터 데이터 레이어. 신규 `src/lib/prices/` — `yahoo.ts`(저수준 raw-fetch 클라: `fetchDailyCandles` period1/period2 일봉 adjClose, `searchEquity` sector/industry; 브라우저 UA 필수, crumb 불필요한 chart+search 만 사용, graceful []/null), `symbol.ts`(`resolveSymbol`: US=Yahoo search by ticker, KR=Naver AC→`{code}.KS/.KQ`+search by code; 12h in-process 캐시), `benchmark.ts`(`benchmarkFor`: 섹터→ETF 맵 + 반도체 override), `returns.ts`(순수함수 `forwardReturn`/`excessReturn`, adjClose 기준, baseline=t0 당일/직후 첫 거래일), `index.ts`(`resolvePriceContext` 진입점). yahoo-finance2 라이브러리 대신 **raw fetch 채택**(기존 어댑터 컨벤션 일치 + crumb/스키마검증 회피). **라이브 검증**: 삼성전자→`005930.KS`/Technology·Consumer Electronics/벤치 `^KS11`, 엔비디아→`NVDA`/Semiconductors/벤치 `SMH`. 2026-05-01 t0 기준 엔비디아 3일 +4.73% 인데 SMH 대비 초과 −3.11%(섹터 언더퍼폼) 정확 산출. 임시 `/api/pricecheck` 라우트로 엔드투엔드 확인 후 삭제. `npm run build` ✅.
  - **Phase 1 ✅ (2026-06-04)**: 이벤트 스토어 + 라벨링. 21일 이슈 캐시와 별개의 **영구·불변 학습 메모리**. 신규 마이그레이션 `005_event_store.sql` — pgvector(`create extension vector with schema extensions`) + `event_log`(id/stock_name/market/symbol/sector/industry/benchmark/issue_text/signal/intensity/source_url/`t0`/`embedding vector(1536)`/`dedup_key unique`/created_at, 인덱스 stock·sector·t0) + `event_outcome`(event_id PK FK / benchmark / ret·abret 1·3·5d / labeled_at) + RLS(public select, service write) + RPC `due_events(min_age_seconds, lim)`(미라벨·심볼 보유·충분히 오래된 이벤트 oldest-first). **임베딩**: `openai.ts` 에 `embedTexts`(text-embedding-3-small, 1536d, 배치) 추가. **캡처**(`src/lib/events/capture.ts` `captureIssues`): createdAt 있는 이슈만(라벨 가능해야 함) → `dedupKey`(종목+정규화텍스트)로 최초 등장만 → 종목당 1회 meta(catalog→stock_meta→KR)+`resolvePriceContext`(심볼/섹터/벤치) 해석 → 새 이슈 텍스트 배치 임베딩 → `event_log` upsert(onConflict dedup_key ignoreDuplicates). 임베딩은 pgvector 텍스트형 `JSON.stringify(vec)` 로 저장. **라벨링**(`src/lib/events/label.ts` `labelDueEvents`): `due_events`(min age 9일 — 5거래일+주말 여유) → 이벤트에 저장된 symbol·benchmark 로 Yahoo 캔들 fetch(재해석 불필요) → `excessReturn`/`forwardReturn` 1·3·5d → `event_outcome` upsert. 5d 초과수익 null(데이터 부족)이면 skip→다음 틱 재시도(self-correcting). **DB 헬퍼**: `src/lib/supabase/events.ts`(existingDedupKeys/insertEvents/selectDueEvents/insertOutcomes, analysis-cache.ts 패턴 미러, env 없으면 no-op). **배선**: 캡처는 `/api/analyze` cold path 에서 `after()`(응답 후, 무지연) + `/api/refresh` 배치에서 `await`(각 종목 writeCachedAnalysis 직후). 라벨링은 `/api/refresh` 끝에서 `labelDueEvents(30)` — **기존 5분 cron 재사용**(vercel.json 변경 없음). 캡처/라벨 모두 best-effort·graceful(Supabase/OpenAI env 없거나 테이블 없으면 no-op, throw 안 함). **라이브 검증**: 임시 `/api/eventcheck` 로 embedTexts(2개·**dim 1536**)·resolvePriceContext(NVDA/Semiconductors/SMH)·labelDueEvents(마이그레이션 전이라 graceful `{labeled:0,skipped:0}`) 확인 후 삭제. `npm run build` ✅. **사용자 작업**: Supabase SQL Editor 에서 `005_event_store.sql` 실행 → 그때부터 cron 이 event_log 적재 시작, t0+~9일 지난 이벤트부터 event_outcome 라벨 채워짐. (이슈 createdAt 이 최근 7일이라 캡처 후 ~2~9일 내 첫 라벨 발생.)
  - **Phase 2 ✅ (2026-06-04)**: 이슈 단위 예측 코어. 새 이슈 → 임베딩 → 유사 **라벨된** 이벤트 k-NN(pgvector) → 실현 초과수익 분포 **결정적 집계** → 방향/밴드/기간/신뢰도 → LLM 근거 서술. 신규 마이그레이션 `006_match_events.sql` — RPC `match_events(query_embedding, filter_stock, filter_sector, match_count)` (event_log ⨝ event_outcome, `1 - (embedding <=> query)` 유사도, stock/sector 필터, abret_3d not null = 라벨된 것만, 코사인 거리순 limit). HNSW 인덱스는 아직 없음(데이터 작음 → seq scan 즉시, 후속 추가). **집계**(`src/lib/predict/aggregate.ts` `aggregateNeighbors`, 순수함수): horizon 1·3·5d 각각 median/p25/p75/posRate, primaryHorizon=|median| 최대 horizon, direction=primary median 부호(|·|<0.3% 중립), impactPeriod=방향 일치하는 material(|median|≥0.3%) horizon의 min~max, band=primary p25~p75, confidence=표본수+부호일치율+평균유사도+IQR 점수→low/med/high, agreeCount=방향 일치 이웃 수. **검색/폴백**(`src/lib/predict/issue.ts` `predictIssue`): K=30, SIM_FLOOR=0.35, 종목 스코프 유사이웃 ≥5면 stock, 아니면 섹터(이웃[0].sector 또는 `resolvePriceContext`로 해석) ≥3이면 sector, 그도 부족하면 **콜드스타트**(scope "none", neutral/band null/low, "유사 사례 부족(N건)" 정직 메시지). **LLM 서술**(`openai.ts` `narratePrediction`, gpt-4o-mini): 집계 숫자 facts 만 주고 "새 수치 지어내지 말 것" → 1~2문장 한국어, 실패 시 템플릿 폴백. DB 헬퍼 `matchEvents`(events.ts, RPC 래퍼, query_embedding=`JSON.stringify(vec)`). 신규 `/api/predict`(POST {stockName, issueText} → IssuePrediction). **검증**(임시 `/api/predictcheck` 후 삭제): 합성 12건(3d 9건 음수)→ direction down / band -2.8%~-0.9% / impactPeriod 1~5 / confidence high / agreeCount 9, LLM 근거 "12건 중 9건…하락…섹터 대비 -2.8%~-0.9%"(환각 없음), 라이브 빈 store→graceful 콜드스타트(scope none, 0건). `npm run build` ✅. **사용자 작업**: Supabase SQL Editor 에서 `006_match_events.sql` 실행. **현재 한계**: event_outcome 가 쌓이기 전엔 모든 예측이 콜드스타트 — 데이터 축적되며 stock/sector 스코프로 자동 전환. SIM_FLOOR/MIN/confidence 가중치는 Phase 5 보정 대상.
  - **Phase 3 ✅ (2026-06-04)**: 종목 종합 예측. 종목의 현재 active 이슈 각각을 예측 → **신뢰도×importance 가중 블렌드**(단순합 X, 상충 시 밴드 확장) → LLM 종합 서술. 색깔 시스템의 `이슈→종목 overall` 패턴의 예측 축 버전. **효율 리팩터**: Phase 2 `predictIssue` 에서 검색+집계 코어 `predictIssueCore(stockName, embedding)` 분리(LLM 無) → 종목 예측은 이슈 텍스트 **1회 배치 임베딩**(`embedTexts` 배열) + 이슈별 retrieval/aggregate + **LLM 종합 서술 1회**만(이슈별 narrate 안 함 → 비용↓). **블렌드**(`src/lib/predict/stock.ts` `blendIssuePredictions`, 순수함수): 이슈별 weight = `CONF_WEIGHT`(high1/med0.6/low0.3) × `importance`(1/imp, 없으면 0.5), scope "none"=weight 0(콜드 이슈 제외). horizon별 center=가중평균 median, spread=가중평균 halfWidth(p75-p25)/2 **+ 가중표준편차(이슈 간 불일치)** → low/high(상충 시 자동 확장). primaryHorizon=|center| 최대, direction=center 부호(|·|<0.3% 중립), impactPeriod=방향 일치 material horizon min~max, band=primary low~high. confidence=가중평균 신뢰도점수+방향일치율(가중)+기여이슈수 점수. upCount/downCount=기여 이슈 방향별 카운트. **`predictStock(stockName, providedIssues?)`**: providedIssues 없으면 `readCachedAnalysis(name, ∞)` 에서 현재 이슈 로드 → 배치 임베딩 → 이슈별 `predictIssueCore` → 콜드 이슈(scope none/표본<3) 가중0 → blend → 기여이슈 0이면 "유사 사례 부족" empty, 아니면 `narrateStockPrediction`(top4 이슈+상승/하락 카운트+밴드, gpt-4o-mini, 실패 시 템플릿). 신규 타입 `StockPrediction`/`IssuePredictionSummary`/`StockHorizon`. 신규 `/api/predict-stock`(POST {stockName, issues?}). **검증**(임시 `/api/predictstockcheck` 후 삭제): 블렌드 3시나리오 — 상충(밴드 -4.83%~+2.83% 0 횡단=불확실 신호), 정렬down(밴드 -3.44%~-1.33% 좁음·confidence high), 가중(imp1·high down 이 imp5·low up 압도→down); LLM 종합 "하락 압력 우세…일부 상승 압력…1~5거래일 -2.6%~-0.4%"(줄다리기+순효과, 환각 없음); 라이브 빈 store→graceful(기여 0, 이슈별 scope none summary). `npm run build` ✅. **사용자 작업 없음**(005·006 외 신규 마이그레이션 없음). **(2026-06-09 갱신)** 이 k-NN 블렌드는 이제 `predictStockKnn`(= `PREDICTION_MODE=model`); 기본 `predictStock` 은 GPT 모드로 분기 — 아래 '예측 GPT 모드 전환' 참고.
  - **Phase 4 ✅ (2026-06-05)**: UI — 종목 상세 모달(StockModal)에 예측 요약 블록 통합. Figma node `83:522` 직접 검증(스크린샷+metadata+design_context). 헤더(sticky 65px)와 이슈 타임라인 사이에 **고정 예측 섹션** 삽입: ① 세그먼트 칩 2개 `[영향 기간 | 3~5일]` `[예상 변동폭 | -0.4~-2.6%]`(외곽 `#858a9e`/값박스 `#31343f`/radius 12/Roboto SemiBold 16 `#e5e5e5`, 값 박스 pill 우측 flush), ② 예측 서술(Roboto SemiBold 16 white, line-height 19), ③ 파이프라인 연결선(`84:987`)을 예측 블록 좌측까지 연장(`.predLine`, 타임라인 leading line `.lineLead`와 연속). **선 두께/구조(사용자 피드백 2026-06-05, 최종)**: leading 선(`.predLine`)만 **3px**(예측 블록 고정 영역, top13~bottom20 = 첫 이슈 20px 위에서 끝), 이슈 간 connector(`.line`)는 **1px**(스크롤 영역, 이슈 사이만). leading 선+첫이슈 20px 여백을 고정 블록이 소유(예측 섹션 `padding-bottom:37`) → 타임라인(첫 이슈 top=0, connector `top=j*81+19+7`)을 스크롤해도 1px가 3px와 seam 에서 굵기 달라 보이는 문제 없음. (중간에 "전부 3px 통일" 했다가 폐기.) 서술 하단 간격 narrative→첫이슈 **37px**(Figma, 이전 ~69px 축소). 모달 타임라인 `margin-bottom: 14px`로 스크롤바 down-arrow가 우하단 12px radius를 가리지 않게. 상세 수치는 `docs/design/design-tokens.md` §15. **데이터**: 모달 열릴 때 `[activeStockName, ready]` 변경마다 예측 로드 — fixture 모드는 신규 `src/lib/predict/fixture.ts` `mockStockPrediction`(이슈 signal→방향, 방향별 band/기간, 실제 top 이슈로 템플릿 서술 — 종목마다 다르게 읽힘), live 모드는 **캐시된 예측 우선, 없으면 `/api/predict-stock` 폴백**(#4 캐싱 이후 — 아래 참고). 신규 `src/lib/predict/format.ts`(`formatImpactPeriod`/`formatBandPct`: **모든 값에 % + 부호**(양수 +, 음수 −). 동일부호는 0에 가까운 값 먼저("-0.4% ~ -2.6%", "+0.4% ~ +2.6%"); 혼합부호(low<0<high)는 음수 먼저·양수 뒤("-6.4% ~ +2.2%") — 사용자 2026-06-08). **상태**: 로딩=`AnalyzingText`(기본 카피 "팀사랑꾼들 AI가 열심히 분석중이에요…" 재사용), 콜드스타트(`contributingIssues===0`)=칩 "데이터 부족" + "지금은 예측 데이터를 축적중인 시기예요…" 서술(사용자 확정 카피). 모달 타임라인 스크롤바: track `#444857`(모달 bg) + thumb·화살표 `#e5e5e5`(SVG, StockSearchDropdown 패턴 미러). **결정(사용자 2026-06-05)**: 콜드 시 블록 유지+안내 / fixture 목 예측 / 방향은 서술로만(변동폭 값 회색, 색강조 X). Tablet/Mobile 은 모달 자체 `display:none`이라 자동 비표시. `predict/types.ts`·`format.ts`·`fixture.ts`는 클라 안전(서버 import 0). `npm run build` ✅. **시각 검증**: 브라우저 자동화 없어 픽셀 렌더는 사용자가 `npm run dev`로 Figma `83:522`와 대조 필요(좌표·폰트·색은 MCP 직접 확인). **남은 Phase**: Phase 5(백테스트·신뢰도 보정, event_outcome 축적 후).
  - **과거 데이터 백필 ✅ (2026-06-06)**: forward 축적만으론 콜드스타트가 오래가서, **US 종목 과거 1년치를 즉시 백필**. **실현가능성 실측**: 가격(Yahoo)은 과거 무료 → 어떤 t0든 초과수익 즉시 계산. 뉴스는 **Finnhub 무료 = 약 1년치 미국 기사**(13개월 전부터 0, 9개월 240건). KR은 무료 과거 소스 없음(Naver는 활발한 종목이 start=1000=1일 전뿐, Finnhub `.KS` 무료 접근불가, 토스 콘텐츠 API `wts-info-api.tossinvest.com/api/v2/news/{id}` 단건만 공개·목록은 세션인증 + 일반 시황피드라 종목별 열거 불가). **결정(사용자)**: 이슈텍스트=GPT 한국어 요약, 범위=카탈로그 US(~65), KR=콜드스타트(forward). **핵심**: 예측 검색은 임베딩+섹터만 쓰므로(signal 미사용) 과거 기사를 임베딩→이벤트로 적재+Yahoo 라벨만 붙이면 됨. 신규 `src/lib/backfill/finnhub-history.ts`(월 윈도우로 1년치, 60/min throttle, 제목 dedup), `openai.ts` `summarizeToKoreanIssues`(영문 헤드라인→한국어 1줄 배치, 정렬 안전·실패 시 원문 폴백), `src/lib/backfill/run.ts` `backfillStocks(offset,limit)`(종목별 resolvePriceContext→Finnhub→200건 균등샘플→기존 dedup_key(`{name}bf:`+제목) 스킵→GPT요약·배치임베딩→**캔들 1회**(종목+벤치, 벤치는 캐시)→excessReturn 1/3/5d→event_log+event_outcome **클라생성 uuid로 페어링** insert), 청크 라우트 `/api/backfill?offset&limit`(CRON_SECRET 있으면만 인증, maxDuration 300). `EventRow.id?` 추가. **검증**: 마이크론 1종목 → 200건 중 **176 적재**(24건은 최근 5일 forward 없어 skip), 직후 `/api/predict` 마이크론 = **scope stock / 유사 23건 / up / 밴드 -2.5%~+4.7%**(콜드스타트 탈출, 임베딩 pgvector 형식·FK·match_events 전부 실데이터 검증). **전체 백필 완료 (2026-06-08 검증)**: event_log **10,298건** / event_outcome **10,102**(~98% 라벨) / **65종목 전부 커버(0건 종목 없음)**, 종목당 101(인텔)~416(ASML). 후반 청크 종목도 예측 stock-scope 확인(보잉 유사11 down, 인텔 유사19 up). 초기 오프셋 종목은 다중 중단·재실행으로 같은 종목이 여러 번 적재돼 dup 누적(샘플 variance로 정확 중복은 아님 — 검색은 상위 이웃만 써서 무해). **중단 견고성**: Codespaces 유휴 suspend(컨테이너 stop=프로세스·`/tmp` 소멸, DB는 보존) 여러 번 + curl `-m` 타임아웃 + 명령 앞 `pkill -f "next dev"`가 자기 쉘 죽인 버그를 모두 **idempotent 재개**로 메움. `npm run build` ✅. **실행법**: 클린 포트3000 + `for off in $(seq 0 5 64); do curl -m 900 "…/api/backfill?offset=$off&limit=5"; done` (재실행 idempotent — dedup_key로 스킵, 단 Finnhub 응답 variance로 같은 종목 재적재 가능). **교훈**: 장기 백그라운드는 Codespaces idle timeout(기본 30분, Settings에서 최대 240분)에 취약 → 세션 활성 유지 필요. KR 백필 원하면 DevTools 로 토스 목록 API 캡처 필요(콘텐츠 단건 `wts-info-api.tossinvest.com/api/v2/news/{id}`만 공개).
  - **학습 모델 트랙 #1 — 학습 파이프라인 ✅ (2026-06-08)**: 사례기반(k-NN) 예측 코어를 **실제 SGD 학습 모델**로 교체하는 사용자 결정의 첫 단계. **확정 설계(AskUserQuestion 4문항)**: 자체 MLP+SGD / 분위수 회귀(p25·p50·p75 → 기존 '예상 변동폭' 밴드와 1:1) / 하이브리드(데이터 있는 종목만 모델, 없으면 k-NN·섹터 폴백) / refresh 중 예측+서술 1콜 캐시(모달 오픈 0콜). **신규 `ml/`** (학습은 Codespaces CPU, 추론은 TS — torch 앱에 안 들어감): `pull_data.py`(PostgREST service-role 로 `event_outcome ⨝ event_log` 페이지네이션 → `ml/data/events.npz`, gitignored), `train.py`(monotone-softplus quantile MLP + **masked pinball loss** + **lookahead-safe 시간분할**(과거→train, 최신→val) + **무특징 베이스라인(상수=train 분위수) 대비 출력** + 가중치 JSON export), `common.py`(상수·.env.local 파서·float32-base64 인코더), `README.md`(artifact 포맷 명세 — TS 추론 #3 용). v1 피처=**임베딩(1536)+섹터 one-hot**(백필 이벤트는 signal·intensity가 null이라 v1 제외 — 데이터로 확인). artifact=`ml/artifacts/quantile_mlp.json`(가중치 LE-float32 base64, row-major (out,in), head=horizon-major 9값→softplus 누적). **1차 학습 결과(정직 게이트)**: 10,102 라벨 이벤트(전량 US, 사실상 최근 12개월=10,049/10,102, t0 2010~2026 꼬리 극소), train 8,081 / val 2,021(2026-03-30~05-29 forward holdout). **모델이 무특징 베이스라인 pinball 을 0/3 horizon 에서 이김** — default(128,32)는 밴드 과신(coverage 0.23~0.31), 강정규화는 밴드 과대(0.75~0.89), 선형 L2 는 degenerate. **dir_hit ≈ 0.50 (모든 config·horizon)** → 임베딩+섹터가 1~5일 초과수익의 방향/분포에 대해 **일반화되는 신호 없음**(효율적시장 예상대로). **→ 게이트 NO-GO: 현 데이터로는 프로덕션 미배선, k-NN 유지.** 파이프라인·게이트는 정상 동작(설계대로 진실 보고). **남은 선택지(사용자 결정 대기)**: ① forward 로 signal/intensity 있는 이벤트 축적 후 피처 추가, ② 타깃을 방향(예측불가) 대신 **변동성/|초과수익| 크기**(효율시장서도 예측가능)로 전환 + 방향은 이슈 signal 에서, ③ 더 긴 horizon. #2 백테스트·#3 TS추론·#4 캐싱은 게이트 통과 후 진행.
  - **크기(magnitude) 예측 가능성 진단 ✅ (2026-06-08, `ml/diagnose_magnitude.py`)**: 사용자 비전(7단계 예측 컬러 = 방향 초록/빨강 × 진하기 변동폭+영향기간)의 학습 가능성 실측. 타깃을 `|abret|`(부호 없는 이동 크기)로 바꿔 Spearman 순위상관(7단계 버킷팅에 맞는 지표)으로 측정. **결과 (val=최근 2021건)**: 방향과 달리 크기는 ρ≈0.18~0.19 로 **약하지만 양수 신호 존재**. 그러나 **섹터 ablation 에서 반전** — 섹터 one-hot 만(이슈 텍스트 0) ρ≈**0.33**, full 1536-d 임베딩 추가 시 ρ≈0.19 로 **오히려 악화**(과적합), PCA-32 로 차원 줄여도 ρ≈0.33 으로 **섹터와 동급**(임베딩 기여 0). **결론(3각도 확정: k-NN·signed quantile MLP·magnitude+ablation)**: 이슈 임베딩은 개별 이슈의 시장반응(방향이든 크기든)에 대해 **일반화되는 per-issue 신호 없음**. 예측 가능한 건 오직 **"그 종목/섹터가 원래 변동이 큰가"(변동성 클러스터링, ρ0.33)** — 이건 신경망 없이 **각 종목 과거 실현변동성 통계**면 충분. **함의**: 7단계 컬러는 만들 수 있으나 학습모델 아님 → **방향=이슈 signal, 진하기=종목 과거 변동성 버킷**(결정적, ML 불필요, 즉시 가능). 트레이드오프상 임베딩 신경망은 1줄 변동성 통계에 짐. **단 하나 미검증 여지**: 진단은 전부 백필 데이터(GPT 요약 영문헤드라인, signal null)라, forward 의 실제 한국어 이슈+signal 라벨이 쌓이면 다를 가능성(작음). 사용자에게 (A)결정적 컬러 즉시구현 / (B)변동성 모델로 형식화 / (C)학습보류+#4 캐싱 제시.
  - **within-stock 결정 테스트 ✅ (2026-06-08, `ml/diagnose_within_stock.py`)**: 7단계 per-issue 컬러의 핵심 질문 = "**같은 종목 안에서** 이슈 텍스트가 어느 이슈가 더 크게 움직일지 구분하나?"(추론 시 종목은 이미 앎 → 'NVDA가 변동 큼'은 무의미, 'THIS NVDA 이슈가 평균보다 큰가'가 관건). 타깃 = `|abret_h| − 그 종목 train 평균`(종목 통제), 피처 = 임베딩만, val Spearman. **결과: 1d ρ=0.077 / 3d 0.020 / 5d 0.009 ≈ 0** → 종목 통제 후 이슈 텍스트의 per-issue 크기 신호 사실상 없음. **결론 확정**: darkness(변동폭)는 **종목별 상수**(그 종목 변동성)일 뿐 이슈마다 다르게 못 정함. 즉 사용자 제안 파이프라인의 추론부(이슈→k-NN→유사도가중평균)는 **현 k-NN 시스템과 동일**하고 같은 천장 공유(k-NN 유사도도 같은 임베딩 기반). 가치있는 차이점은 ① per-issue 신뢰도+score-0 정직 게이트(대부분 이슈 '신호없음' 표기, 소수만 예측), ② 가격유래 변동성 피처(실재하나 종목수준), ③ signal/intensity 피처(백필 null, forward 축적 후 검증 = per-issue 신호의 유일한 희망), ④ 영향기간/지속(PEAD류, 미검증 다른 타깃). 방향=이슈 signal 은 불변.
  - **이슈 유형(type)→변동폭 테스트 ✅ (2026-06-08, `ml/diagnose_issue_type.py`)** — **반전: per-issue 신호 실재 확인**. raw 임베딩(within-stock ρ0.02)이 실패한 이유는 1536-d 노이즈에 묻혀서지, 신호가 없어서가 아니었음. **저차원·해석가능한 이슈 유형 피처**(키워드 분류: earnings/ma/legal/capital/analyst/product/macro/other, 무료 프록시)로 within-stock 표준화 변동폭 예측: **val ρ = 0.102(1d) / 0.060(3d) / −0.003(5d)** — 1일 기준 임베딩의 5배. **earnings(실적) 이슈가 train·val 모두 최고 변동폭**(train z̄+0.17~+0.20, val z̄+0.75~+0.83, **OOS 검증** — 실적발표=최고 정보이벤트, 가장 견고한 효과), **capital(자사주·배당·분할)은 최저**(루틴). 즉 *이슈 종류*가 "이 이슈가 이 종목을 평소보다 크게 흔드나"를 실제로 가른다. **함의**: per-issue 변동폭 모델은 **임베딩이 아니라 type+intensity 피처**로 가능. 단 신호 **모달**(ρ0.10), **earnings에 집중**(타 유형은 OOS로 덜 분리), **1일에 강하고 5일이면 소멸**(즉시 반응). 방향은 여전히 signal. **다음**: GPT 로 이슈 type+intensity 분류(라이브 분류 콜에 필드 추가, 백필은 배치 분류) → type/intensity 피처 per-issue 변동폭 모델 → darkness = (type/intensity 변동폭) × 종목 변동성. 키워드 60% non-other → GPT 분류면 더 오를 여지. 사용자 결정(2026-06-08): **이 방향으로 진행**.
  - **GPT type+intensity 검증 ✅ (2026-06-08, `ml/gpt_validate_type.py`)** — 사용자 요청으로 풀 빌드 전 GPT 분류가 키워드(ρ0.10)를 넘는지 A/B. 전체 10,105건 gpt-4o-mini 로 type(10종)+intensity(high/mid/low, 방향무관 크기) 분류(JSON 배치, 캐시), within-stock 표준화 변동폭 예측 val ρ(=2021건, SE≈0.022) 비교. **결과: GPT 가 키워드를 못 이김** — 1d: 키워드 type **0.094** > GPT type 0.033 / GPT intensity 0.044 / t×i 0.022. 3d 전부 0.02~0.06, 5d 전부 ≈0. **GPT 의 '이건 고임팩트 뉴스' 판단이 실현 변동폭을 키워드(=어닝 플래그)보다 잘 예측 못 함**(earnings 를 earnings+guidance 로 쪼개 신호 희석된 영향도). **종합 결론(6개 진단)**: per-issue 변동폭 신호는 실재하나 **상한 ρ≈0.09(1d), 사실상 '어닝/가이던스 이벤트냐' 한 가지로 환원, 5d 면 소멸**. GPT 정교화로 안 오름. → "이슈 내용으로 per-issue 변동폭" 은 만들 수 있으나 **부유한 콘텐츠 모델이 아니라 (종목 변동성 + 어닝 플래그) 휴리스틱**에 수렴. 방향=signal 불변. 사용자에게 (A)정직한 휴리스틱 컬러 빌드(signal→방향, 종목변동성+어닝범프→진하기, 신뢰도 게이트) / (B)#4 캐싱 확정이득 / (C)forward 한국어+signal 데이터 축적 후 재검증 제시.
  - **예측 캐싱 (#4) ✅ (2026-06-09)**: 사용자 결정 = 학습모델 보류, **확정이득인 예측 캐싱부터**. 기존엔 live 모드에서 StockModal 열 때마다 `/api/predict-stock`(임베딩+gpt-4o-mini 서술) 호출 — 미캐시. 이제 **scheduled refresh 가 종목당 예측을 미리 구워 캐시 → 모달 오픈은 캐시만 읽어 OpenAI 0콜**. 예측 로직은 당시 k-NN 유지 (**직후 'GPT 모드 전환'에서 기본 엔진이 GPT로 교체** — 캐싱 인프라는 동일 재사용) — 캐싱은 *언제/어디서 계산하나*의 문제라 예측 방식과 독립. 변경: ① 마이그레이션 `007_stock_prediction.sql` (`stock_analysis` 에 `prediction jsonb` nullable 컬럼, Realtime 은 003 의 replica identity full 로 자동 전파). ② `writeCachedAnalysis` 에 optional `prediction` 인자 — 제공 시 함께 upsert, omit 시 payload 에서 빼서 **기존 prediction 보존**(cold `/api/analyze` 쓰기가 안 덮음). 컬럼 없을 때(마이그 전) prediction 포함 upsert 실패하면 **prediction 빼고 재시도**(분석 캐시는 계속 동작 — graceful). ③ `/api/refresh` per-stock 루프가 `refreshStock` 직후 `predictStock(name, issues)` 계산(best-effort try/catch) → `writeCachedAnalysis(…, prediction)` 으로 함께 기록(2일 1회/종목). ④ `AnalysisProvider`: `StockState.ready` 에 `prediction?` 추가, `CacheRow` + `loadRealStocks` select(`…, prediction`) + Realtime 핸들러가 `row.prediction` 매핑. ⑤ `StockModal`: live 모드에서 `state.prediction`(캐시) 있으면 즉시 사용·**fetch 안 함**, 없으면(cold/검색직후 미구운 종목) 기존 `/api/predict-stock` on-demand 폴백. fixture 모드는 `mockStockPrediction` 그대로. `npx tsc --noEmit` ✅(dev 서버 실행 중이라 `.next` 충돌 회피로 build 대신 타입체크). **사용자 작업**: Supabase SQL Editor 에서 `007_stock_prediction.sql` 실행(미실행 시 예측 캐싱만 no-op, 앱·분석캐시 정상).
  - **드리프트 룰 백테스트 (POSITIVE_NEW_WEAK_REACTION) — NO-GO ✅ (2026-06-09)**: 사용자 신규 비전(이슈→당일반응→미래초과수익→색상보정 자가학습)의 첫 검증 가능 가설. **새 데이터 레이어 구축**: `ml/pull_data.py` 에 symbol/benchmark 추가 재풀, `ml/price_features.py`(Yahoo 일봉 종목+벤치 78개 1회 fetch → 이벤트별 `abret_0d`(당일 섹터대비 반응)·`pre_abret_20d`(모멘텀)·`vol_20d`·`future_abret_10d` 계산; **재계산 future_abret_1/3/5d 가 저장 event_outcome 과 corr 0.999·median|Δ|0.000% → 가격수학 검증**), `ml/gpt_sentiment.py`(전체 10k sentiment+category 분류 캐시). `ml/backtest_rule.py`: **event_cluster**(같은 종목+같은 날 = 동일 미래경로라 1개로 병합, 10,111→7,141), **novelty**(동일종목 이전 10일 임베딩 유사도), 룰 조건(positive·category∈{demand/earnings/guidance/order/product/partnership}·abret_0d 약함·pre<+12%·novel) → walk-forward 4분위. **결과: 엣지 없음** — 룰 pos5d=**0.494±0.020**(≈동전), median5d **−0.06%**(음수), 베이스라인 'positive+category'(0.486) 대비 무개선, walk-forward 분위 0.46/0.50/0.55/0.46 으로 **부호 불안정**(Q3만 우연히 양). 성공기준(pos5d≥0.55·median>0·시계열 안정) 전부 미달. **GPT 오분류 원인 배제(`ml/backtest_robust.py`)**: ① 임계값 20개 스윕 전부 미통과(최선 flat밴드도 worstQ 0.455), ② **GPT 완전 제거** — "긍정"을 `abret_0d` 부호(실가격)로 정의해도 모든 그룹 pos5d 0.48~0.50 동일 null. 즉 라벨 노이즈는 0.50으로 희석만 할 뿐(positive 베이스 0.477 자체가 0.50 아래라 보정해도 엣지 없음), walk-forward 부호뒤집힘은 라벨무관, 임베딩 dir_hit 0.50 은 애초 GPT 미사용. **종합(8개 독립 테스트)**: 이슈속성·당일반응 그 무엇으로도 1~5일 미래 초과수익 *방향*은 예측 불가(효율시장). 예측가능한 건 종목 변동성(크기, ρ0.33)+어닝 플래그(ρ0.09)뿐. 사용자 비전의 아키텍처(클러스터·abret라벨·walk-forward·캘리브레이션·앙상블)는 견고하나, **예측 야망(trade_color=미래 드리프트 방향)은 데이터 미지지**. → 정직한 제품: event_color(sentiment 서술)+darkness(종목변동성+어닝)+캘리브레이션이 대부분 '유의신호 없음' 정직 보고. `ml/data/*.npz` gitignored.
  - **예측 GPT 모드 전환 + 모드 스위처 ✅ (2026-06-09)**: 사용자 결정 — 예측 엔진을 **GPT 단일 호출**로 전환(color·영향기간·예상변동폭·종합서술 전부 GPT 출력), 단 **언제든 model 모드로 스위치 가능**하게. 신규 `src/lib/predict/mode.ts` `PREDICTION_MODE`(env, `"gpt"` 기본 | `"model"`). `openai.ts` `requestStockPredictionGpt(stockName, issues)` — gpt-4o-mini 1콜이 JSON{color(7단계)·impact_period·band_low/high_pct·confidence·rationale} 반환(파싱·검증·클램프, band→fraction). `predict/stock.ts`: `predictStock` 를 **디스패처**로(이슈 resolve 후 mode 분기) + `predictStockGpt`(color→signal/intensity/direction 매핑, StockPrediction 조립, 실패 시 emptyStockPrediction graceful) + 기존 k-NN 로직을 `predictStockKnn` 로 분리(model 모드). `StockPrediction` 에 `color?: OverallSignal` 추가(GPT 출력, 모달 렌더는 Figma 스펙 대기로 데이터만). refresh 캐싱(#4) 그대로 재사용 → **종목당 2일 1콜**, 모달 오픈 0콜. GPT 모드는 임베딩·matchEvents 불필요해 k-NN 보다 더 쌈. `.env.example` 에 `PREDICTION_MODE` 슬롯. **주의(정직성)**: GPT 모드 숫자는 검증된 예측이 아니라 GPT 판단 — 8개 진단상 방향/per-issue 변동폭은 데이터에 신호 없음. 모드 스위치로 추후 검증된 엔진으로 교체 가능하게 둔 것. 라이브 스모크(엔비디아 샘플 → positive_mid/1~5일/−1.5~+1.0%/일관 서술) ✅, `npx tsc --noEmit` ✅.
  - **섀도 평가 하네스 + 사전등록 ✅ (2026-06-10)**: 사용자 결정 — 프로덕션은 **GPT-only 유지(아무것도 안 바꿈)**, 서버 오프라인에서 "통계가 GPT를 override할 자격이 되는가"를 **데이터 쌓이는 대로 재검증**하는 champion/challenger 모니터. 신규 `ml/SHADOW_EVAL.md`(사전등록 — 타깃·지표·baseline·세그·walk-forward·승격 게이트를 *반복 peek 전에* 못박아 p-hacking 차단) + `ml/shadow_eval.py`(스크리닝 러너, 결과 1행씩 `ml/shadow_log.jsonl` 적재 = 파생지표만, 커밋 가능 audit trail). 두 가설: **H1 within-stock 변동폭**(타깃=`|abret_h|` 을 **종목 내 train-only μ/σ로 표준화** → 자명한 cross-stock 스케일 제거, "이 이슈가 이 종목 평소보다 크냐"만; feat=임베딩 vs category one-hot; 지표 Spearman ρ+부트스트랩 CI, gate CI-low>0.05) / **H2 방향**(타깃=`sign(abret_h)`; rule=model(emb+sector)·sentiment(호재→up)·earnings; dir_hit vs majority·0.50, gate CI-low>0.53). 세그=market별(`US` 현재 전량 / **`KR`=0 → "awaiting data"**, forward 한국어+실 signal/intensity 가 유일한 미검증 문이라 절대 US와 혼합 안 함). 승격은 단일 split 스크리닝이 아니라 **≥1500건+3-fold walk-forward+BH-FDR q0.10** 통과 시에만(문서 §gate). **1차 실행 결과(2026-06-10, US 10,111건)**: H1 ρ 0.02~0.06(1d emb 0.061 최고, CI-low 0.019<gate), H2 dir_hit 전부 0.48~0.51(<majority·<0.50대). 특히 **earnings sentiment 룰 1d=0.492 < majority 0.562** → "호재/실적 → 다음날 상승"이 *초과수익 방향* 엣지가 아님을 직접 확인(사용자 직관의 정직한 반증). **verdict NO-GO — 프로덕션 GPT-only 유지.** KR 데이터 축적 시 자동 재검증, 십중팔구 NO-GO 유지가 예상 — 정직한 음성결과 추적 자체가 산출물. `data/`·`artifacts/` gitignore라 `.npz` 미커밋, 하네스 3파일은 커밋 가능. `.venv/bin/python ml/shadow_eval.py` ✅. **자동화 (2026-06-10)**: 신규 `.github/workflows/shadow-eval.yml` 이 **월 1회(매월 1일 06:00 UTC) GitHub Actions** 로 전체 파이프라인(pull_data → gpt_sentiment → shadow_eval) 실행 후 `shadow_log.jsonl` 자동 커밋 — **GitHub 클라우드라 Codespace stop/삭제와 무관**(데이터 적재도 Vercel cron→Supabase라 Codespace 독립). CI 안정화로 `shadow_eval.py` 2가지 수정: 미사용 `price_features.npz` 의존 제거(Yahoo fetch 불필요), `gpt_sentcat.npz` 없으면(OpenAI 키 누락/실패 시 `continue-on-error`) H1-emb·H2-model 만 graceful 실행. **사용자 작업**: repo Settings → Secrets(Actions)에 `SUPABASE_SECRET_KEY`·`OPENAI_API_KEY` 추가(`NEXT_PUBLIC_SUPABASE_URL` 은 keepalive 워크플로용으로 이미 등록됨). main 브랜치 보호 시 github-actions 봇 push 허용 필요. 결과 테이블은 Actions run summary 에도 출력.

### How to verify after pulling

```bash
npm install
npm run dev
# → open http://localhost:3000
```

### What to do in a fresh session

1. 먼저 이 CLAUDE.md를 끝까지 읽기.
2. `docs/design/design-tokens.md` 로 디자인 수치 확인.
3. 현재 진행 중인 step ("Status by step" 참고) 이어 작업.
4. **모르는 디자인 수치는 Figma MCP로 다시 조회하거나 사용자에게 질문** — 절대 추측 금지.
5. 작업 후 이 파일의 "Status by step" 또는 "Decisions log" 갱신, 새로 추가된 디자인 수치는 `docs/design/design-tokens.md` 에도 추가.
6. **Step 4a 작업 중이라면**: "Step 4a sub-tasks" 섹션에서 다음 sub-task 를 확인하고, 그 sub-task 의 본문에 적힌 디자인 토큰 / 검증 기준을 정확히 읽은 다음 작업 시작. 모르는 픽셀 수치는 `docs/design/design-tokens.md` §14 또는 Figma MCP 로 재확인.
