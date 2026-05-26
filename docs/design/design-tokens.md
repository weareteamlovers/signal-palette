# Design tokens — 시그널 팔레트

이 문서는 Figma 파일에서 직접 추출한 모든 픽셀/색상/타이포 수치의 원본 기록입니다.
모든 값은 Figma MCP (`get_metadata`, `get_design_context`, `get_variable_defs`) 로
조회한 결과를 그대로 옮겨 적었습니다. 코드(`src/lib/design-tokens.ts`,
`src/app/globals.css`)는 이 문서를 source-of-truth로 삼습니다.

- **Figma URL**: https://www.figma.com/design/sxsrrNcNXiJno86lqrWSlQ/Signal-Palette?node-id=18-8
- **fileKey**: `sxsrrNcNXiJno86lqrWSlQ`
- **메인 프레임 nodeId**: `18:8`
- **프레임 크기**: 1280 × 1167 (이름: "MacBook Air - 2")
- **참고 스크린샷**: Figma URL을 직접 열거나, MCP `get_screenshot` 으로 재생성. (이 환경의 네트워크 allowlist가 figma.com 직접 다운로드를 차단하므로 PNG 사본은 저장하지 않음)

---

## 1. Page background

| 항목 | 값 |
|---|---|
| 페이지 기본 배경 | `#282b32` |

상하단(헤더/푸터 영역)은 위 색이 그대로 보이고, 가운데 두 개의 포트폴리오 영역은 아래 그라데이션이 덮입니다.

### Section background gradients

```
linear-gradient(
  180deg,
  rgb(40, 43, 50)  0%,   /* #282b32 */
  rgb(22, 25, 33)  5%,   /* #161921 */
  rgb(22, 25, 33)  95%,
  rgb(40, 43, 50)  100%
);
```

| 섹션 | x | y | width | height |
|---|---|---|---|---|
| 현재 포트폴리오 배경 | 0 | 101 | 1280 | 450 |
| 예비 포트폴리오 배경 | 0 | 645 | 1280 | 540 |

> 참고: Figma에는 현재 포트폴리오 배경 사각형이 두 개(`18:9`, `18:446`) 겹쳐 있습니다 — 가시 효과는 동일하므로 하나로 구현합니다.

---

## 2. Typography

| Style | Family | Weight | Size | Line height (실측) |
|---|---|---|---|---|
| 종목명 / 포트폴리오 타이틀 | Roboto SemiBold + Noto Sans KR Bold | 600 | 16px | 19px |
| 변경 버튼 | Roboto Medium + Noto Sans KR Regular | 500 | 12px | 14px |
| 푸터 | Roboto SemiBold + Noto Sans KR Bold | 600 | 14px | 16px |
| 중앙 이슈 텍스트 | Roboto SemiBold + Noto Sans KR Bold | 600 | 24px | 28px |

> 사용자 요구: 폰트 폴백 순서는 **Roboto → Pretendard → Noto Sans KR** 로 통일.

---

## 3. Colors

### 카드 배경
- `#31343f` (모든 종목 카드)

### 수정 버튼 (Figma nodes `59:18` / `64:810`)
두 포트폴리오 동일 스타일 (variant 분기 없음).

| 항목 | 값 |
|---|---|
| 배경 | `#444857` |
| 텍스트 | `#E5E5E5` |
| 테두리 | 없음 |
| 크기 | 45 × 34 |
| 모서리 | radius 12px |
| 폰트 | weight 600, 16px (종목명과 동일 크기) |

### 시그널 팔레트 (사용자 결정, MVP)

```css
--signal-positive-strong: #22C77F;
--signal-positive-mid:    #5DD9A0;
--signal-positive-mild:   #9FE8C5;
--signal-neutral:         #F8E29A;
--signal-negative-strong: #F0506E;
--signal-negative-mid:    #F47C95;
--signal-negative-mild:   #F8A8B8;
--signal-empty:           rgba(255, 255, 255, 0.06);
```

> Figma 시안에는 그린 5종 / 옥로 5종 / 레드 2종 / 빈칸 1종이 쓰였으나, 1차 MVP는 위 7종 + empty로 단순화. 추후 5단계 강도로 확장 예정.

---

## 4. Border radius

| 항목 | radius |
|---|---|
| 카드 (290×160) | **7px** |
| 작은 컬러박스 (24×24, 20개 그리드) | **3px** |
| 종목 종합 컬러박스 (30×30, 19×19) | **0** (sharp) |
| 포트폴리오 종합 컬러박스 (40×40, 19×19) | **0** (sharp) |
| 중앙 시그널 박스 (24×24) | **0** (sharp) |
| 수정 버튼 (45×34) | **12px** |

> Figma 변수 `Liquid Glass/Frost - Regular` = `7` 가 카드/버튼에 사용됨.

---

## 5. Layout — 카드 그리드

각 포트폴리오는 4열 × 2행 = 8개 카드.

| 항목 | 값 |
|---|---|
| 카드 크기 | 290 × 160 |
| 카드 가로 위치 (x) | 25, 338, 651, 964 (가로 간격 23) |
| 현재 포트폴리오 행 y | 147, 345 (세로 간격 38) |
| 예비 포트폴리오 행 y | 736, 934 (세로 간격 38) |

---

## 6. Layout — 카드 내부

```
┌───────────────────────────────┐  ← card top (y_card)
│                               │
│        [stockName] [box]      │  ← y_card + 15  (헤더, 상단 일치 정렬)
│                               │
│                               │
│  ▢▢▢▢▢▢▢▢▢▢                 │  ← y_card + 86 (1행 컬러박스)
│  ▢▢▢▢▢▢▢▢▢▢                 │  ← y_card +114 (2행 컬러박스, 28 간격)
│                               │
└───────────────────────────────┘  ← card top + 160
```

| 항목 | 값 |
|---|---|
| 카드 좌우 패딩 | 7px (양쪽 동일) |
| 헤더 그룹 | 종목명 + 종합 박스, 가로 중앙정렬, **상단 일치(top-align)** |
| 종목명-종합박스 간격 | 3px |
| 종목 종합 박스 크기 (현재) | 30 × 30 |
| 종목 종합 박스 크기 (예비) | 19 × 19 |
| 헤더 영역 높이 (양 variant 동일) | **30px** (현재 variant의 종합박스 크기에 맞춰 고정. 예비 variant는 19h 요소들이 30 영역 안에서 top-align) |
| 컬러박스 그리드 | 10열 × 2행, 박스 24×24, 간격 4px |
| 그리드 시작 y (카드 내부 기준) | **86px (현재/예비 동일)** |

---

## 7. Header — 포트폴리오 타이틀 영역

### 현재 포트폴리오 (y=57~97)

| 요소 | x | y | size |
|---|---|---|---|
| 종합 컬러박스 (`18:20`) | 696 | 57 | 40 × 40 |
| 타이틀 "현재 포트폴리오" | 586 | 78 | 108 × 19 |
| 수정 버튼 (`59:18`) | 812 | 63 | 45 × 34 |

> 정렬: **세 요소 모두 하단 일치 (bottom-align at y=97)** — 종합 박스(57+40), 타이틀(78+19), 수정 버튼(63+34) 모두 y=97에서 끝.

### 예비 포트폴리오 (y=687~721)

| 요소 | x | y | size |
|---|---|---|---|
| 종합 컬러박스 (`18:227`) | 696 | 694 | 19 × 19 |
| 타이틀 "예비 포트폴리오" | 586 | 694 | 108 × 19 |
| 수정 버튼 (`64:810`) | 812 | 687 | 45 × 34 |

> 정렬: **타이틀·종합 박스는 상단 일치**(둘 다 19h, y=694~713). **수정 버튼은 vertical-center 정렬** (center y=704 ≈ 타이틀/박스 center y=703.5). 즉 헤더 영역이 수정 버튼 때문에 y=687~721로 확장됨. 이 비대칭은 의도된 디자인.

---

## 8. 중앙 이슈 텍스트

| 요소 | x | y | size |
|---|---|---|---|
| 텍스트 (`18:388`) | 432 | 584 | 416 × 28 |
| 중앙 시그널 박스 (`18:185`) | 523 | 586 | 24 × 24 |

레이아웃: `[종목명] [signal box 24×24] "[이슈 텍스트]"` — 종목명과 이슈 텍스트 사이에 박스가 위치.

> Step 1은 정적, Step 2에서 3초 슬라이드 애니메이션 추가.

---

## 9. Footer

| 요소 | x | y | size |
|---|---|---|---|
| 푸터 (`18:389` / `83:899`) | 477 | **1145** | 325 × 16 |

텍스트: `시그널 팔레트 © 2026 팀사랑꾼들. All rights reserved.`

> Figma 직접 검증 (2026-05-26): 이전 표기 y=1138 은 7px off. spare 모달
> (§14-6, bottom=1139) 와 footer 사이 의도된 6px gap 을 만들려면 footer
> y=1145 가 맞다. `src/lib/design-tokens.ts` 와 `src/app/page.module.css`
> 둘 다 1145 로 동기화.

---

## 10. Step 2 인터랙션

> Figma에 별도 시안이 없어 사용자와 직접 결정한 수치. 다음 디자인이 들어오면 이 섹션을 우선 갱신할 것.

### 10-1. 중앙 이슈 ticker

| 항목 | 값 |
|---|---|
| 순회 범위 | 현재 포트폴리오 → 예비 포트폴리오 순. 종목 순서대로, 종목당 모든 이슈를 평탄화 (최대 320개) |
| 이슈 머무는 시간 | **3000ms** (페이드 슬라이드 시간 포함) |
| 슬라이드 방향 | 상→하 페이드 슬라이드 |
| 슬라이드 길이 | 0.4s, `ease-out` |
| 슬라이드 시작/끝 | `opacity 0 → 1`, `transform: translateY(-12px) → translateY(0)` |
| 호버 일시정지 영역 | ticker row 전체 (종목명 + 박스 + 이슈 텍스트) |
| 호버 시각 효과 | `transform: scale(1.05)`, `transition: transform 0.2s ease-out` |
| 끝 도달 시 | 0번 인덱스로 loop |

### 10-2. 현재 이슈 트레이서 (IssueGrid 컬러박스)

| 항목 | 값 |
|---|---|
| stroke 색상 | `#FFFFFF` |
| stroke 두께 | **4px** |
| stroke 위치 | outside — CSS `outline: 4px solid #FFFFFF` + `outline-offset: 0` |
| 활성 박스 z-index | 2 (인접 박스 위로 그려지도록) |
| 전환 동작 | 즉시 이동 (애니메이션 없음) |
| 상태 공유 방식 | `ActiveIssueContext` (client). ticker가 `setActiveIssue(issue)` 호출 → 각 `ColorBox`가 자기 `issue` prop과 참조 비교 |

### 10-3. IssueGrid 컬러박스 hover 툴팁

| 항목 | 값 |
|---|---|
| 적용 범위 | IssueGrid의 10×2 컬러박스만. 빈 박스(`signal=empty`)는 `data-tooltip` 미부여로 자동 제외 |
| 배경 | `#1a1d24` |
| 글자 | `#FFFFFF`, 16px / 19px line-height, weight 600 (종목명과 동일 스타일) |
| 패딩 | 6px 12px |
| 모서리 | radius 4px |
| 위치 | 박스 위, 가운데 정렬 (`bottom: calc(100% + 6px)`, `left: 50%`, `transform: translateX(-50%)`) |
| pointer-events | none |
| z-index | 10 |
| 내용 | 이슈 텍스트 (HTML 기본 `title` 속성 대신 `data-tooltip` + CSS `::after`) |

---

## 11. Step 3 분석 흐름

> 1차 MVP의 데이터 수집·표시 흐름. 변경 시 `src/lib/openai.ts`, `src/components/AnalysisProvider.tsx`, `src/app/api/analyze/route.ts`, `src/components/ColorBox.module.css`와 동기화.

### 11-1. 호출 구조

| 항목 | 값 |
|---|---|
| 모델 | `gpt-4o` |
| 검색 도구 | OpenAI Responses API + `tools: [{ type: "web_search" }]` |
| 종목 분석 호출 | 종목당 1회 × 16 (현재 8 + 예비 8), 클라이언트에서 페이지 로드 시 병렬 fetch |
| 포트폴리오 overall 호출 | 포트폴리오당 1회 × 2. 해당 포트폴리오의 8종목이 모두 ready 상태가 되면 `AnalysisProvider`가 자동 dispatch. web_search 없이 종목 8개 결과를 입력으로 종합 판단 |
| 페이지 로드당 총 호출 | 약 18회 |
| 캐싱 | 없음 (Step 4에서 추가 예정) |
| API endpoint | `POST /api/analyze`, body `{ type: "stock", stockName }` 또는 `{ type: "portfolio-overall", label, stocks }` |
| OPENAI_API_KEY | 서버 환경 변수에서만 읽음. Codespaces Secret 또는 `.env.local` |

### 11-2. Prompt 룰 (종목 분석)

| 항목 | 룰 |
|---|---|
| 검색 시간 범위 | 최근 7일 |
| 이슈 텍스트 | 한 문장, 최대 30자, **한국어 강제**. 영문 기사 참고해도 한국어로 번역/요약. `AI`/`TSMC` 등 외래어 표기는 허용 |
| 이슈 개수 | 최대 20개 (의미 있는 것만, 적으면 적은 대로) |
| signal | `positive` / `neutral` / `negative` |
| intensity | `strong` / `mid` / `mild`. neutral의 intensity는 항상 `mid` |
| 중복 제거 | 같은 사건의 다른 측면을 별개 이슈로 나열 금지. 한 사건 = 한 줄. prompt에 나쁜 예/좋은 예 명시 |
| 정렬 순서 | 7-bucket: `pos_strong → pos_mid → pos_mild → neutral → neg_mild → neg_mid → neg_strong`. 버킷 내에서는 중요도 순 |
| overall | 단순 다수결 금지. 이슈의 중요도/시장 맥락을 종합한 GPT의 단일 판단 |

### 11-3. 서버 보강 (safety net)

| 항목 | 동작 |
|---|---|
| `sortByBucket` | GPT 응답을 받은 직후 코드에서 7-bucket 순서로 재정렬. `Array.prototype.sort`는 안정 정렬이므로 GPT의 버킷 내 중요도 순은 유지 |
| `normalizeIssue` / `normalizeOverall` | signal/intensity 타입 가드, neutral은 intensity를 `mid`로 강제 |
| 최대 20개 cap | `slice(0, 20)`로 그리드 초과 분 절단 |

### 11-4. 클라이언트 상태 (AnalysisProvider)

| 상태 | 형식 |
|---|---|
| `stocks` | `Record<stockName, { status: "loading" } \| { status: "ready", stock, source: "live" \| "mock" }>` |
| `overalls` | `Record<"current" \| "spare", { status: "loading" } \| { status: "ready", overall, source: "live" \| "mock" }>` |
| Fetch 실패 fallback | 종목: `getMockStock(name)`로 대체 / 포트폴리오 overall: `{ signal: "neutral", intensity: "mid" }` |
| 자동 dispatch | 한 포트폴리오의 8종목이 모두 ready 시 portfolio-overall 호출 1회 (중복 방지: `overallDispatched` ref) |

### 11-5. 로딩 / 완료 애니메이션

| 항목 | 값 |
|---|---|
| 로딩 시 박스 | `.box.shimmer` — 배경 `var(--signal-empty)` 위로 좌→우 하이라이트(white 16%) 흐름 |
| Shimmer keyframe | `shimmer` 1.5s ease-in-out infinite, `background-position 200% 0 → -200% 0` |
| 완료 시 박스 등장 | `.box.fadeIn` — `boxFadeIn 0.2s ease-out backwards`. `backwards`로 delay 동안 invisible 유지 |
| Stagger | 박스 인덱스 × 50ms = `animation-delay`. 20개 박스 채움에 약 1.0s 소요 |
| 적용 범위 | 이슈 그리드 박스, 종목 종합 박스, 포트폴리오 종합 박스 모두 동일 패턴 (`loading` prop) |
| Ticker placeholder | flat issues 0개일 때 ("분석 중…" 한 줄 표시, ticker 애니메이션 비활성) |

---

## 12. Tablet 레이아웃 (Figma node `61:2`)

> **Frame: 768 × 1825** (iPad Pro 11"). 데스크탑과 카드 모양은 100% 동일하고 배치만 2열로 바뀜. 분석 결과는 데스크탑과 같은 20개 그리드를 그대로 사용 (재분석 불필요).

### 12-1. Frame / 섹션

| 항목 | 값 |
|---|---|
| Frame 폭 | 768 |
| 현재 섹션 배경 | y=101, height=805 (그라데이션 — 데스크탑과 동일 룰) |
| 예비 섹션 배경 | y=944, height=881 |
| 푸터 | x=268, y=1808, w=232, **font 12px** (데스크탑 14px보다 작음) |

### 12-2. 상단 ticker (sticky, viewport top)

| 항목 | 값 |
|---|---|
| 위치 | x=0, y=0, **768 × 35** |
| 배경 | linear-gradient (180deg, #282B32 0%, #282B32 70%, #161921 100%) — 모바일과 동일 |
| 텍스트 폰트 | 12px, weight 600, white |
| Signal box | 12 × 12 (데스크탑 24의 절반) — 데스크탑 ticker가 24×24인 것과 다름 |
| 동작 | 스크롤 시 viewport 상단 고정. 데스크탑의 중앙 ticker(y=584)를 대체 |

### 12-3. 헤더 — 현재 포트폴리오 (bottom-align at y=101)

| 요소 | x | y | size |
|---|---|---|---|
| 타이틀 (`62:3`) | 309 | 82 | 108 × 19 |
| 종합 박스 (`62:4`) | 419 | 61 | 40 × 40 |
| 수정 버튼 (`64:813`) | 507 | 67 | 45 × 34 |

> 세 요소 모두 y=101에서 끝나는 bottom-align.

### 12-4. 헤더 — 예비 포트폴리오 (vertical-center)

| 요소 | x | y | size |
|---|---|---|---|
| 타이틀 (`62:799`) | 319 | 1018 | 108 × 19 |
| 종합 박스 (`62:800`) | 429 | 1018 | 19 × 19 |
| 수정 버튼 (`64:816`) | 507 | 1011 | 45 × 34 |

### 12-5. 카드 그리드 (2열 × 4행, 16카드)

| 항목 | 값 |
|---|---|
| 카드 | 290 × 160, radius 7px (데스크탑 동일) |
| 컬럼 x | 82, 395 (gap 23) |
| 현재 카드 행 y | 147, 326, 505, 684 (gap 19) |
| 예비 카드 행 y | 1066, 1245, 1424, 1603 |
| 종목 종합 박스 | **현재/예비 모두 30 × 30** (데스크탑은 예비 19, 태블릿은 통일) |
| 카드 내부 그리드 | 10 × 2 = 20개 (데스크탑 동일) |

---

## 13. Mobile 레이아웃 (Figma node `58:3`)

> **Frame: 375 × 1800** (iPhone 16). 카드 크기/radius/내부 그리드 개수가 바뀌고, viewport 폭이 768 미만이 되는 순간 그리드 10개 분석으로 **재분석 발생**.

### 13-1. Frame / 섹션

| 항목 | 값 |
|---|---|
| Frame 폭 | 375 |
| 현재 섹션 배경 | y=97, height=775 (그라데이션) |
| 예비 섹션 배경 | y=931, height=869 |
| 푸터 | x=95, y=1786, w=186, **font 8px** |

### 13-2. 상단 ticker (sticky, viewport top)

| 항목 | 값 |
|---|---|
| 위치 | x=0, y=0, **375 × 35** |
| 배경 | linear-gradient (180deg, #282B32 0%, #282B32 70%, #161921 100%) — 사용자 명시 |
| 텍스트 폰트 | 12px, weight 600, white |
| Signal box | 12 × 12 |
| 동작 | 태블릿과 동일하게 viewport 상단 고정 |

### 13-3. 헤더 — 현재 포트폴리오 (bottom-align at y=97)

| 요소 | x | y | size |
|---|---|---|---|
| 타이틀 (`59:7`) | 132 | 83 | 81 × **14** (font 12px) |
| 종합 박스 (`59:8`) | 213 | 67 | 30 × 30 |
| 수정 버튼 (`64:819`) | 275 | 71 | **34 × 26** |

> 데스크탑 헤더 폰트 16px → 모바일 12px로 축소.

### 13-4. 헤더 — 예비 포트폴리오 (vertical-center)

| 요소 | x | y | size |
|---|---|---|---|
| 타이틀 (`59:351`) | 138 | 1009 | 81 × 14 |
| 종합 박스 (`59:352`) | 220 | 1006 | 19 × 19 |
| 수정 버튼 (`64:822`) | 275 | 1003 | 34 × 26 |

### 13-5. 카드 그리드 (2열 × 4행, 16카드)

| 항목 | 값 |
|---|---|
| 카드 | **150 × 160**, radius **13px** (데스크탑 7과 다름), bg #31343F |
| 컬럼 x | 26, 200 (gap 24) |
| 현재 카드 행 y | 137, 311, 485, 659 (gap 14) |
| 예비 카드 행 y | 1065, 1239, 1413, 1587 |
| 종목 종합 박스 | 현재/예비 모두 30 × 30 |
| 카드 내부 그리드 | **5 × 2 = 10개** ⚠ (데스크탑/태블릿은 20개) |
| 그리드 박스 | 24 × 24, gap 4 (데스크탑과 동일) |
| 그리드 시작 y (카드 내부) | 86px (데스크탑과 동일) |
| 카드 좌우 padding | 7px (데스크탑과 동일) |

### 13-6. 모바일 한정 동작

| 동작 | 룰 |
|---|---|
| 종목명 슬라이딩 | 카드 헤더 가용 폭(약 100px 내외)을 텍스트가 넘으면 우→좌 marquee. 50px/sec, 끝에서 짧은 대기 후 처음으로 loop. overflow 안 나면 정적 |
| 컬러박스 터치 툴팁 | 터치 디바이스(`(hover: none)` matchMedia) 또는 PointerEvent의 `pointerType === "touch"`에서 박스 탭 → 3초간 툴팁 표시 후 자동 닫힘. 같은 박스 다시 탭 = 닫힘. 다른 박스 탭 = 이전 닫고 새 박스 표시 |
| Hover 툴팁 | 마우스 입력(`(hover: hover)`)에서는 데스크탑과 동일하게 hover 시 즉시 표시 (브라우저에서 모바일 폭으로 줄여도 OK) |
| 재분석 | viewport 폭이 768 미만으로 진입/이탈 시 16종목 + 2 포트폴리오 overall 재 fetch. 모바일은 maxIssues=10, 그 외 20 |





## 14. Step 4a — Auth & Modals (Desktop)

> 이 섹션은 사용자 인증 + 포트폴리오 편집/검색/이슈 상세 모달의 디자인 토큰입니다.
> 모든 수치는 Figma MCP 로 직접 추출했습니다.
> **Desktop 전용** (1280×1167). Tablet/Mobile 은 후속 단계에서 추가.
>
> 참고 Figma 노드:
> - 로그인 전 (`18:8`)
> - 로그인 후 (`76:133`)
> - 수정 모달 (`77:3` — modal at `77:389`)
> - 변경 dropdown (`81:23` — dropdown at `81:478`)
> - 종목 모달 (`83:522` — modal at `83:909`)
> - 닉네임 모달 (`95:2` — modal at `95:388`)

### 14-1. 신규 컬러 토큰

```css
/* Modal & dropdown surfaces (= 기존 토큰 재사용, alias 추가) */
--modal-bg-elevated: #444857;   /* 수정/종목/닉네임 모달 = 기존 --btn-bg */
--dropdown-bg:       #31343f;   /* 변경 dropdown = 기존 --bg-card */
--input-bg:          #e5e5e5;   /* 검색창, 닉네임 input (라이트) */

/* Secondary action button (신규) */
--btn-secondary-bg:  #858a9e;   /* 취소, 차트랑 같이 보기 */

/* Action button (= 기존 토큰 재사용) */
--btn-action-bg:     #31343f;   /* 완료, 닫기, 변경 = 기존 --bg-card */

/* Status text (신규) */
--text-error:        #e9eabc;   /* "이미 사용중인 닉네임이에요 ㅠ.ㅠ" */
--text-success:      #c6e4c7;   /* "닉네임 설정이 완료됐어요" (2초 표시) */
```

> **컬러 시맨틱 정리**: 같은 hex 가 여러 역할로 쓰이므로 alias 로 분리. `#444857` 은 "버튼 배경" 과 "모달 표면" 두 의미를 가짐. `#31343f` 는 "카드 배경" 과 "어두운 액션 버튼" 두 의미를 가짐.

### 14-2. Header — 로그인 전 (OAuth 진입점)

> 직접 Figma MCP 로 노드 76:117 / 76:118 / 76:119 의 design_context 를
> 재확인해 수치를 정정 (2026-05-26). "로그인 with" 라벨은 단일 폰트 사이즈가
> 아니라 **세 segment 가 각기 다른 크기로 한 줄에 흐름** (Figma 원본 그대로).

| 항목 | Figma 노드 | 위치 | 크기 | 스타일 |
|---|---|---|---|---|
| "로그인 with" 라벨 외곽 | `76:119` | x=1191, y=43 | 47 × 19 | (아래 3 segment 의 합) |
| └ "로그인" segment | (76:119 내) | inline | — | Roboto **Bold 10px**, color `#FFFFFF` |
| └ 공백 segment | (76:119 내) | inline | — | **16px** (자간용 빈 공백, 글자 없음) |
| └ "with" segment | (76:119 내) | inline | — | Roboto **Bold 8px**, color `#FFFFFF` |
| Google 로고 | `76:118` | x=1184, y=60 | 40 × 40 | rectangular image fill (radius 강제 X — SVG 자연 모양 그대로) |
| Kakao 로고 | `76:117` | x=1224, y=64 | 30 × 30 | rectangular image fill (radius 강제 X — SVG 자연 모양 그대로). Google 위로 일부 overlap |

> **주의**: 이전 버전 문서에 "round image asset" 이라고 표기돼 있었으나, Figma
> 원본에서는 두 로고 모두 rectangular `image fill` 이고 별도 `cornerRadius`
> 가 0. 둥글게 보이는 건 SVG 안의 그래픽 자체(카카오 톡 로고의 라운디드 사각형,
> 구글 G 로고)가 둥근 모양이라 그런 것. 컨테이너에 `border-radius` 를 강제하면
> 자산을 잘라먹게 되므로 적용 금지.

**자산 보관 룰**: OAuth provider 로고는 Figma asset URL (7일 만료) 을 직접 import 하지 말 것. SVG 또는 PNG 사본을 `public/icons/google.svg` / `public/icons/kakao.svg` 에 저장하고 정적 import.

**수정 버튼 (로그인 전) 동작**:
- hover 또는 click 시 `로그인 후 바로 이용 가능해요` 툴팁 표시
- 툴팁 스타일은 기존 컬러박스 다크 툴팁 (`#1a1d24`) 재사용

### 14-3. Header — 로그인 후

기존 헤더 (포트폴리오 라벨 + 컬러박스 + 수정 버튼) 위에 닉네임 / 로그아웃 추가.

| 항목 | 위치 | 크기 | 폰트/색 |
|---|---|---|---|
| 중앙 닉네임 (포트폴리오 라벨 위) | x=606, y=60 | auto × 14 | Roboto SemiBold 12px, #e5e5e5 |
| 우측 닉네임 | x=1075, y=70 | auto × 19 | Roboto SemiBold 16px, #e5e5e5 |
| 로그아웃 버튼 | x=1179, y=63 | 75 × 34 | bg #444857, radius 12, text #e5e5e5 16px |

> 닉네임은 두 군데 표시됨 — 헤더 우측(16px) + 포트폴리오 라벨 위(12px). 두 곳 모두 동일 닉네임.

### 14-4. 수정 모달 (포트폴리오 편집)

수정 버튼 클릭 시 열림. 두 포트폴리오 동일 UI (현재 ↔ 예비 모달 분리, 다만 디자인은 동일).

| 항목 | 위치 | 크기 | 스타일 |
|---|---|---|---|
| 모달 외곽 | x=401, y=117 | 477 × 407 | bg `--modal-bg-elevated` (#444857), radius 12 |
| 행 separator (Line 1~7) | x=415, width=450 | 0 (line) | y=166, 209, 252, 295, 338, 381, 424 (간격 43px) |
| 행 영역 | y=131~461 | 행당 43px | 8행 고정 |
| 번호 (1~8) | 행마다 x=420 | 10 × 19 | Roboto SemiBold 16px, white |
| 종목명 (편집 가능) | 행마다 x=445 | auto × 19 | Roboto SemiBold 16px, white |
| 변경 버튼 | 행마다 x=792 | 38 × 29 | bg `--btn-action-bg` (#31343f), radius 8, text 15px |
| 드래그 핸들 (≡) | 행마다 x=841 | 20 × 11 | 3선 (y +0/+5/+10), stroke white 1px |
| 취소 버튼 | x=772, y=480 | 45 × 34 | bg `--btn-secondary-bg` (#858a9e), radius 12, text 16px |
| 완료 버튼 | x=824, y=480 | 45 × 34 | bg `--btn-action-bg` (#31343f), radius 12, text 16px |

**행 내부 y 좌표** (텍스트/버튼/핸들 모두 동일 행에 정렬):

| 행 | 텍스트 y | 변경 y | 핸들 y |
|---|---|---|---|
| 1 | 137 | 131 | 140/145/150 |
| 2 | 180 | 174 | 183/188/193 |
| 3 | 223 | 217 | 226/231/236 |
| 4 | 266 | 260 | 269/274/279 |
| 5 | 309 | 303 | 312/317/322 |
| 6 | 352 | 346 | 355/360/365 |
| 7 | 395 | 389 | 398/403/408 |
| 8 | 438 | 432 | 441/446/451 |

**모달 룰**:
- 8 슬롯 고정. 부분 비움 / 전체 비움 모두 허용.
- 같은 포트폴리오 내 종목 중복 불허. 현재 ↔ 예비 사이 중복은 허용.
- 비어있는 슬롯은 종목명 텍스트 영역이 빈 상태로 표시 (placeholder text 없음, 번호만 보임).
- 드래그 앤 드롭으로 순서 변경 가능 — 14-7 참고.
- 취소: 변경사항 폐기. 완료: 변경사항 저장 + analyze 재호출 (변경된 종목만, 빈 슬롯은 호출 없음).
- ESC / 모달 외부 클릭 = 취소와 동일.

### 14-5. 변경 dropdown (종목 검색)

수정 모달 안의 [변경] 버튼 클릭 시 열림.

**위치**: 어느 행의 변경을 눌러도 **x=511, y=151 고정**. 이유는 뒤에 수정 모달이 펼쳐져 있어 위치 안정성 확보.

| 항목 | 위치 | 크기 | 스타일 |
|---|---|---|---|
| 외곽 박스 | x=511, y=151 | 257 × 197 | bg `--dropdown-bg` (#31343f), radius 12 |
| 검색 입력 외곽 | x=516, y=156 | 247 × 24 | bg `--input-bg` (#e5e5e5), radius 8 |
| 🔍 아이콘 | x=521, y=161 | 15 × 15 | Lucide `Search` 또는 SVG icon |
| 검색 placeholder | x=541, y=163 | — | Roboto Regular 12px, #6b7280 (회색) |
| 후보 행 간격 | y=188 부터 | 행당 27 | 최대 6행 표시, 그 이상은 세로 스크롤 |
| 후보 로고 placeholder | 행마다 x=519 | 20 × 20 (원) | round, bg white (종목 로고 미구현 시 빈 원) |
| 후보 이름 | 행마다 x=546 | — | Roboto SemiBold 15px, white |
| [선택] 버튼 | 행마다 x=734 | 29 × 20 | bg `--input-bg` (#e5e5e5), radius 10, text 11px |

**dropdown 룰**:
- 검색은 클라이언트 사이드 includes() 필터 (Step 4a 는 fixture 만 사용 — `src/data/stock-master.ts` 의 정적 16~30개 종목 리스트).
- 한국어 입력 가정, 영문 검색은 추후 4e 에서 지원.
- [선택] 클릭 = 해당 종목으로 슬롯 교체 + dropdown 닫힘.
- 같은 포트폴리오 내 이미 사용 중인 종목은 후보 리스트에서 숨김 (또는 비활성 표시).
- ESC / 외부 클릭 = dropdown 만 닫힘 (수정 모달은 유지).

### 14-6. 종목 카드 모달 (이슈 파이프라인)

종목 카드 클릭 시 열림. **로그인 전에도 동작**.

> Figma MCP 로 두 variant 모두 재확인 (2026-05-26):
> - **현재 포트폴리오** variant (페이지 노드 83:522) — 모달 노드 83:909..84:1002
> - **예비 포트폴리오** variant (페이지 노드 114:402) — 모달 노드 114:788..114:827
>
> 두 variant 의 모달 size/내부 구조는 **완전히 동일**. 다만 모달 외곽 y 가
> current=114 / spare=343 으로 **+229 shift**. 모든 내부 요소도 +229 (헤더,
> 행, 연결선 전부). 아래 표는 **current variant 기준 좌표**, spare 는 y 에 +229.

| 항목 | Figma 노드 (current) | 위치 | 크기 | 스타일 |
|---|---|---|---|---|
| 모달 외곽 | `83:909` / `114:788` | x=329, **y=114 (current) / y=343 (spare)** | 621 × 796 | bg `--modal-bg-elevated` (#444857), radius 12 |
| "이슈 파이프라인" label | `83:912` | x=387, y=140 | 81 × 14 | Roboto SemiBold **12px**, color `#e5e5e5` |
| 종목 컬러박스 (헤더) | `83:914` | x=349, y=140 | 32 × 32 | sharp (radius 0), 종목 overall 시그널 색 |
| 종목명 (헤더) | `83:911` | x=387, y=155 | — | Roboto SemiBold 16px, white |
| 차트랑 같이 보기 (bg) | `84:1001` | x=755, y=140 | 127 × 34 | bg `--btn-secondary-bg` (#858a9e), radius 12 |
| 차트랑 같이 보기 (text) | `84:1002` | x=763, y=147 | — | Roboto SemiBold 16px, color `#e5e5e5` |
| 닫기 (bg) | `84:999` | x=891, y=140 | 45 × 34 | bg `--btn-action-bg` (#31343f), radius 12 |
| 닫기 (text) | `84:1000` | x=899, y=147 | — | Roboto SemiBold 16px, color `#e5e5e5` |

**Positioning / 스크롤 / 정렬 룰** (2026-05-26 사용자 결정):
- 모달은 `position: absolute` (frame 안) + `left: 329px`. 페이지 스크롤 시 모달도 함께 움직임 (Figma 정의된 frame y 에 그대로 anchor). 데스크탑 전용.
- `overflow: visible` — chartBtn 의 "Comming Soon!" 툴팁이 모달 위쪽으로 벗어나는 게 잘리지 않게. 스크롤 clipping 은 `.timeline` 만 책임 (`overflow-y: auto`).
- 헤더는 `flex: 0 0 65px` 로 고정 (스크롤 안 됨), **timeline 영역만 세로 스크롤**.
- spare 모달 bottom (343 + 796 = 1139) 가 footer (§9 y=1145) 위 6px gap. Figma 의도된 spacing.
- 모달 내 이슈 갯수 = `stock.issues.length` (카드 컬러박스 수와 동일, 데스크탑 최대 20개).
- **모달 정렬**: `createdAt desc` (최신 first). 카드 그리드의 7-bucket 정렬과는 별개.
- 외부 클릭 닫기: `document` 의 `mousedown` listener 가 처리 (`modalRef.contains(target)` 으로 판정 → 1280 frame 밖 click 도 close).
- **다른 카드 클릭 시 모달 닫지 않고 내용 전환**: 카드의 `onMouseDown` 에 `stopPropagation()` 으로 document listener 발사 방지.

**타임라인 (이슈 파이프라인)** — current variant 기준 좌표; spare 는 +229:

| 항목 | Figma 노드 (current) | 위치 | 크기 |
|---|---|---|---|
| 이슈 컬러박스 | `84:916` 외 | x=356, y=234 부터 | 19 × 19, sharp (radius 0) |
| 이슈 텍스트 | `84:918` 외 | x=387 | Roboto SemiBold 16px, white |
| 이슈 timestamp | `84:928` 외 | 이슈 텍스트 끝 + gap 8px, 텍스트 **bottom-align** (`align-items: flex-end`) | Roboto SemiBold 12px, color `#e5e5e5` |
| 행 간격 | — | 81px (컬러박스 기준) | y=234, 315, 396, ... (81 step) |
| 세로 연결선 | `84:987` 외 | x=365 (박스 center), height 48 | **N 개 (이슈 N 개 기준)**: 첫 박스 위 1 + 박스 사이 N-1. timeline-relative top = `i × 81` (i=0..N-1). stroke white 1px |

**모달 룰**:
- 이슈는 최대 20개 시간순(최신 first) 표시. 20개 미만이면 그만큼만 표시 (placeholder 없음).
- 카드의 ANY 영역 클릭 = 모달 열기 (이슈 컬러박스 포함). 컬러박스는 hover 시에도 기존 다크 툴팁 유지.
- 차트랑 같이 보기 버튼: 클릭 안 됨. **hover 시 `Comming Soon!` 툴팁 표시**. 후속 step 에서 구현.
- ESC / 모달 외부 클릭 / [닫기] 버튼 = 모달 닫힘.
- Timestamp 포맷: `26.05.21 오후 3:58` (한국 KST 고정). SSR hydration 회피를 위해 `useEffect` 안에서 클라이언트 사이드 포맷팅.
- `createdAt` 필드는 **Step 4b 에서 GPT 응답에 추가됨**. 4a 에선 fixture 에만 mock createdAt 포함 (`USE_FIXTURE=true` 일 때만 의미있는 timestamp 표시, live mode 면 빈칸 또는 "-").

### 14-7. 드래그 앤 드롭 (수정 모달 순서 변경)

| 항목 | 값 |
|---|---|
| 라이브러리 | `@dnd-kit/core` + `@dnd-kit/sortable` |
| 센서 | `PointerSensor`, `activationConstraint: { distance: 4 }` |
| 드래그 핸들 hit area | 3선 그래픽 영역 정확히 (약 20×11px) — 정밀 영역, padding 없음 |
| Cursor | hover 시 `grab`, drag 중 `grabbing` |
| 드래그 방식 | **행 전체가 이동**. 번호 (1~8) 는 슬롯 인덱스(`map((row, i) => i + 1)`) 로 자동 계산되어 행 위치 변경 시 자동 재할당 |
| 드래그 중 변경 버튼 | 비활성화 (`pointer-events: none` + opacity 0.5) |
| 시각 피드백 — 잡은 행 | opacity 0.9, 가벼운 box-shadow (예: `0 4px 12px rgba(0,0,0,0.3)`) |
| 시각 피드백 — 다른 행들 | `transform: translateY` 로 부드럽게 양보 (transition 200ms ease) |
| 키보드 접근성 | **4a 미지원** (후속 step) |

> **구현 메모**: dnd-kit 의 `SortableContext` + `useSortable` 표준 패턴 그대로 사용. 핸들만 드래그 활성화하려면 `useSortable` 의 `listeners` 를 핸들 요소에만 spread (행 전체가 아닌).

### 14-8. 닉네임 설정 모달 (신규 가입 직후)

OAuth 첫 로그인 시 1회성 표시. 다른 모달과 달리 **닫기 불가** (확인 버튼만 동작).

| 항목 | 위치 | 크기 | 스타일 |
|---|---|---|---|
| 모달 외곽 | x=485, y=122 | 309 × 200 | bg `--modal-bg-elevated` (#444857), radius 12 |
| 가입 완료 subtitle | x=571, y=138 | 137 × 12 | Roboto Regular 12px, #e5e5e5 |
| 메인 타이틀 | x=540, y=182 | 200 × 19 | Roboto SemiBold 19px, white — "사용할 닉네임을 입력해주세요" |
| 닉네임 input | x=516, y=217 | 247 × 24 | bg `--input-bg` (#e5e5e5), radius 8, 12px text, placeholder "닉네임" |
| 확인 버튼 (inline) | x=734, y=220 | **24 × 18** | bg `--btn-action-bg` (#31343f) 또는 input 안쪽 inline, 9px text |
| 상태 메시지 영역 | x=570, y=250 | auto × 12 | Roboto Regular 10px |

**상태 메시지 색상**:
- 중복 에러: `--text-error` (#e9eabc) — "이미 사용중인 닉네임이에요 ㅠ.ㅠ"
- 성공: `--text-success` (#c6e4c7) — "닉네임 설정이 완료됐어요" (2초 표시 후 자동으로 다음 단계 진입)

**닉네임 검증 규칙**:
- 길이: 2~16자
- 허용 문자: 한글 + 영문 + 숫자 + `_`
- 공백 불허, 특수문자 불허

**확인 흐름**:
1. 닉네임 입력 + 확인 클릭
2. 중복 체크 (4a 에선 mock — 항상 성공 처리, 실 DB 연동은 4a 후반에)
3. 성공: 성공 메시지 2초 표시 → 자동으로 **포트폴리오 수정 모달 열림** (빈 8슬롯 + 1행의 변경 dropdown 자동 활성)
4. 사용자가 [취소] 누르면 모달 닫힘 + 빈 포트폴리오로 메인 진입 (헤더 [수정] 으로 언제든 채울 수 있음)

### 14-9. 공통 모달 룰

| 항목 | 룰 |
|---|---|
| Backdrop overlay | **없음**. dim/blur 처리하지 않음. 수정 중에도 카드 그리드의 색을 확인할 수 있도록 의도된 디자인 |
| ESC 키 | 모달 닫기 (단 닉네임 모달은 예외 — 닫기 불가) |
| 모달 외부 클릭 | 모달 닫기 (단 닉네임 모달은 예외) |
| z-index | 헤더/푸터/카드 그리드 위. 변경 dropdown 은 수정 모달 위 (한 단계 더 위) |
| 닫기 시 행동 | 수정 모달: 취소와 동일. 종목 모달: 단순 닫힘. 닉네임 모달: 닫기 불가 |

### 14-10. 빈 슬롯 처리

부분 비움 허용에 따른 빈 카드 표시.

**수정 모달 안 (수정 중)**:
- 종목명 텍스트 영역은 그냥 빈칸. placeholder 텍스트 없음.
- 좌측 번호와 핸들/변경 버튼은 그대로 표시.
- 비어있는 슬롯의 [변경] 버튼을 누르면 dropdown 정상 작동.

**카드 그리드 (저장 후)**:
- 카드는 정상 크기로 렌더 (290×160).
- 종목명 자리: 아무 텍스트도 출력하지 않음 (빈 문자열).
- 종목 헤더 컬러박스 (30×30): `--signal-empty` 색.
- 20개 이슈 컬러박스 그리드: 모두 `--signal-empty` 색.
- 클릭 시: **수정 모달 자동 오픈** (해당 포트폴리오 기준).