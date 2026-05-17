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

### 변경 버튼
| 변형 | 배경 | 테두리 | 텍스트 |
|---|---|---|---|
| 현재 포트폴리오 (primary) | `#FFFFFF` | `#DDDDDD` | `#000000` |
| 예비 포트폴리오 (secondary) | `#EFEFEF` | `#C2C2C2` | `#000000` |

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
| 변경 버튼 (51×19) | **7px** |

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
| 변경 버튼 | 770 | 78 | 51 × 19 |

> 정렬: 타이틀(h=19, ends y=97)과 종합 박스(h=40, ends y=97) — **하단 일치 (bottom-align)**

### 예비 포트폴리오 (y=694~713)

| 요소 | x | y | size |
|---|---|---|---|
| 종합 컬러박스 (`18:227`) | 696 | 694 | 19 × 19 |
| 타이틀 "예비 포트폴리오" | 586 | 694 | 108 × 19 |
| 변경 버튼 | 770 | 693 | 51 × 19 |

> 정렬: 둘 다 19h이므로 **상단 일치**.

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
| 푸터 (`18:389`) | 477 | 1138 | 325 × 16 |

텍스트: `시그널 팔레트 © 2026 팀사랑꾼들. All rights reserved.`

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
