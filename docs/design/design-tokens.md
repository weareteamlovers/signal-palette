# Design tokens — 시그널 팔레트

이 문서는 Figma 파일에서 직접 추출한 모든 픽셀/색상/타이포 수치의 원본 기록입니다.
모든 값은 Figma MCP (`get_metadata`, `get_design_context`, `get_variable_defs`) 로
조회한 결과를 그대로 옮겨 적었습니다. 코드(`src/lib/design-tokens.ts`,
`src/app/globals.css`)는 이 문서를 source-of-truth로 삼습니다.

- **Figma URL**: https://www.figma.com/design/sxsrrNcNXiJno86lqrWSlQ/Signal-Palette?node-id=18-8
- **fileKey**: `sxsrrNcNXiJno86lqrWSlQ`
- **메인 프레임 nodeId**: `18:8`
- **프레임 크기**: 1280 × 1167 (이름: "MacBook Air - 2")
- **참고 스크린샷**: `figma-frame-18-8.png` (이 폴더)

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
--signal-neutral:         #F5C84C;
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
| 컬러박스 그리드 | 10열 × 2행, 박스 24×24, 간격 4px |
| 그리드 시작 y (카드 내부 기준) | 86px |

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
