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

- **Framework**: Next.js 15 (App Router) + React 19 + TypeScript
- **Styling**: 순수 CSS Modules + CSS variables (Tailwind 사용 안 함)
- **Fonts**: Roboto → Pretendard → Noto Sans KR (이 순서로 fallback)
- **AI**: OpenAI Responses API + `web_search` tool (Step 3에서 추가)
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
- **참고 스크린샷**: `docs/design/figma-frame-18-8.png`
- **모든 픽셀 수치 기록**: `docs/design/design-tokens.md` 와 `src/lib/design-tokens.ts`

> 디자인 작업 시 **임의의 수치를 추가하지 말 것**. 새로운 수치가 필요하면 반드시
> Figma MCP (`get_metadata`, `get_design_context`, `get_screenshot`, `get_variable_defs`)
> 로 정확한 값을 확인하고, `src/lib/design-tokens.ts` 와 `docs/design/design-tokens.md`
> 에 기록한 뒤 사용한다.

### Stocks (1차 MVP, 사용자 지정 한글 명칭 그대로 사용 — 티커 사용 금지)

- **현재 포트폴리오**: 마이크론 테크놀로지 / ASML 홀딩(ADR) / 엔비디아 / 블룸에너지 / 비스트라 에너지 / TSMC(ADR) / 브로드컴 / 버티브 홀딩스
- **예비 포트폴리오**: 삼성전자 / SK하이닉스 / 아마존 / 팔란티어 / 일라이 릴리 / 아스트라 랩스 / 콴타 서비시스 / 크라우드스트라이크 홀딩스

### Decisions log (사용자 확정 사항)

| 결정 항목 | 값 |
|---|---|
| 시장 범위 | 한국 + 미국 혼합 |
| API 호출 위치 | 백엔드 (Next.js API route, `OPENAI_API_KEY` 서버에서만) |
| 이슈 검색 방식 | OpenAI Responses API + `web_search` tool |
| 종합 컬러 산출 | GPT가 직접 도출 (단순 다수결 아님) |
| 1차 MVP 데이터 저장 | 없음 — 매 접속 시 default 사용. 추후 DB+로그인 예정 |
| 분석 시점 | 첫 접속 시 1회. 추후 주기 분석 + 캐싱 예정 |
| 푸시 브랜치 | `main` (사용자 명시 승인) |
| 종목 표기 | 한글 명칭 그대로 (티커 사용 금지) |
| 시그널 컬러 (Step 1) | 아래 "Color tokens" 참고. 추후 green/red 5단계로 확장 예정 |
| 종합 박스 크기 | 현재 포트폴리오와 예비 포트폴리오 의도적으로 다름 (현재=강조, 예비=축소) |

### Color tokens (MVP — `src/app/globals.css` 와 동기화)

```css
--bg-page: #282b32;          /* 페이지 배경 (그라데이션 영역 위/아래) */
--bg-card: #31343f;          /* 카드 배경 */
--bg-gradient-start: rgb(40, 43, 50);  /* 섹션 그라데이션 0%/100% */
--bg-gradient-mid:   rgb(22, 25, 33);  /* 섹션 그라데이션 5%/95% */

--signal-positive-strong: #22C77F;
--signal-positive-mid:    #5DD9A0;
--signal-positive-mild:   #9FE8C5;
--signal-neutral:         #F5C84C;
--signal-negative-strong: #F0506E;
--signal-negative-mid:    #F47C95;
--signal-negative-mild:   #F8A8B8;
--signal-empty:           rgba(255, 255, 255, 0.06);

--btn-bg-primary:    #FFFFFF;  /* 현재 포트폴리오 변경 버튼 */
--btn-border-primary:#DDDDDD;
--btn-bg-secondary:    #EFEFEF; /* 예비 포트폴리오 변경 버튼 */
--btn-border-secondary:#C2C2C2;
```

### Status by step

- **Step 1 (이번 푸시)**: ✅ 프로젝트 init + 디자인 토큰 + 정적 레이아웃 (mock 이슈 데이터 사용)
- **Step 2**: ⏳ 중앙 이슈 텍스트 3초 슬라이드 애니메이션 + 컬러박스 hover 툴팁
- **Step 3**: ⏳ `/api/analyze` route + OpenAI Responses API + `web_search` tool 연동, 실제 데이터 적용
- **Step 4 (Future)**: 수동 업데이트 버튼, 캐싱, DB+로그인, 자동 재분석

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
4. **모르는 디자인 수치는 Figma MCP로 다시 조회** — 절대 추측 금지.
5. 작업 후 이 파일의 "Status by step" 또는 "Decisions log" 갱신, 새로 추가된 디자인 수치는 `docs/design/design-tokens.md` 에도 추가.
