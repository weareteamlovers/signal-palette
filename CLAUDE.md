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
- **AI**: OpenAI Responses API + `web_search` tool, 모델 `gpt-4o` (Step 3에서 추가)
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
- **예비 포트폴리오 (default)**: 삼성전자 / SK하이닉스 / 아마존 / 팔란티어 / 일라이 릴리 / 아스트라 랩스 / 콴타 서비시스 / 크라우드스트라이크 홀딩스

종목 한글 명칭 그대로 사용 — 티커 사용 금지. 가입한 사용자가 검색으로 추가할 수 있는 종목 후보는 별도 마스터 풀 (`src/data/stock-master.ts`, 4a 에선 fixture, 4e 에서 실제 API).

### Decisions log (사용자 확정 사항)

| 결정 항목 | 값 |
|---|---|
| 시장 범위 | 한국 + 미국 혼합 |
| API 호출 위치 | 백엔드 (Next.js API route, `OPENAI_API_KEY` 서버에서만) |
| 이슈 검색 방식 | OpenAI Responses API + `web_search` tool, 모델 `gpt-4o` |
| 분석 호출 분할 | 종목당 1회 (×16, 클라이언트에서 병렬 fetch) + 포트폴리오 overall 1회 (×2, 해당 포트폴리오의 8종목 완료 후 자동 dispatch) = 호출 약 18회 / 페이지 로드 |
| 분석 호출 시점 | 페이지 첫 로드 시 클라이언트가 자동 fetch. 캐싱 없음 (새로고침 = 재호출). 추후 Step 4에서 캐싱 예정 |
| 진행 상태 UX | 카드는 즉시 placeholder + shimmer로 렌더, 응답 도착 종목부터 좌상→우하 staggered fade-in으로 채워짐 (50ms 간격, 박스당 0.2s) |
| 실패 시 fallback | 해당 종목/포트폴리오 단위로만 mock 데이터 대체. 콘솔 경고 로그 |
| 종합 컬러 산출 | GPT가 직접 도출 (단순 다수결 아님). 포트폴리오 overall은 종목 8개 결과를 입력으로 한 별도 GPT 호출 |
| 이슈 텍스트 | 한 문장, 최대 30자, **한국어 강제** (영문 기사 참고했어도 한국어로 번역/요약). `AI`/`TSMC` 같은 외래어 표기는 허용 |
| 신호 강도 | GPT가 strong/mid/mild 산출. neutral은 항상 mid. UI는 7색 매핑 (positive_strong → … → negative_strong) |
| 이슈 정렬 | 7-bucket 순서: `pos_strong → pos_mid → pos_mild → neutral → neg_mild → neg_mid → neg_strong`. GPT가 prompt 룰을 못 지킬 수 있어 서버 `sortByBucket`로 안정 정렬 보장 |
| 1차 MVP 데이터 저장 | 없음 — 매 접속 시 default 사용. 추후 DB+로그인 예정 |
| 푸시 브랜치 | `main` (사용자 명시 승인) |
| 종목 표기 | 한글 명칭 그대로 (티커 사용 금지) |
| 시그널 컬러 | 아래 "Color tokens" 참고. positive/negative 각 3단계 + neutral 1단계 + empty = 8 |
| 종합 박스 크기 | 현재 포트폴리오와 예비 포트폴리오 의도적으로 다름 (현재=강조, 예비=축소) |
| 반응형 breakpoint | `<768` mobile, `768–1279` tablet, `≥1280` desktop. CSS 미디어 쿼리 + `AnalysisProvider`의 `viewport` state 양쪽에 동기화 |
| 모바일 재분석 | viewport가 mobile 경계를 진입/이탈할 때마다 16종목 + 2 overall 자동 재 fetch. mobile은 `maxIssues=10`, 그 외 20 |
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
| 종목 검색 풀 (4a) | `src/data/stock-master.ts` 정적 fixture (한미 혼합 30~50종목 한글명). 4e 에서 실제 API 라우팅 |
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
- **반응형**: ✅ 세 breakpoint(<768 mobile / 768–1279 tablet / ≥1280 desktop). `AnalysisProvider`가 viewport tier를 노출하고, 모바일 경계 진입/이탈 시 16종목 + 2 포트폴리오 overall을 `maxIssues`(모바일 10 / 그 외 20)로 재 fetch. 태블릿/모바일은 화면 상단에 sticky `TopTicker`(그라데이션 35px bar)가 데스크탑의 중앙 ticker를 대체. 모바일 카드는 150×160 + radius 13 + 5×2 그리드, 긴 종목명은 `StockNameMarquee`로 50px/s 우→좌 슬라이딩. 터치 디바이스에서는 컬러박스 탭 시 `ActiveTooltipContext`가 3초간 툴팁 표시(같은 박스 재탭 = 닫기, 다른 박스 탭 = 전환). 모든 수치는 `docs/design/design-tokens.md` §12 (Tablet) / §13 (Mobile) 참고.
- **Step 4a (In progress)**: 인증 (Google + Kakao OAuth) + 닉네임 + 사용자별 포트폴리오 편집 (수정/검색/이슈 모달). 종목 검색은 fixture, 닉네임 중복 체크도 mock. Supabase 서울 리전 + `@supabase/ssr`. 자세한 sub-tasks 는 아래 "Step 4a sub-tasks" 섹션 참고.
- **Step 4b (Planned)**: `gpt-4o-mini` 업그레이드 + 이슈별 `importance` (1~20 unique) + `createdAt` + `source` 필드. 종목 모달의 timestamp 가 이때부터 실 데이터.
- **Step 4c (Planned)**: 뉴스 어댑터 (Naver / Finnhub / Yahoo / Google RSS) + `pg_cron` + Supabase Realtime.
- **Step 4d (Planned)**: 모바일 Top-10 필터 + `createdAt` 기반 pop scoring.
- **Step 4e (Planned, 신설)**: 종목 검색 API (한글 → Naver 자동완성, 영문 → Finnhub `/search` 라우팅 + KRX 정적 fallback). 4a 의 fixture 를 실제 API 로 교체.

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
