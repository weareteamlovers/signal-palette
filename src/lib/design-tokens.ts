// Design tokens extracted directly from Figma file:
// https://www.figma.com/design/sxsrrNcNXiJno86lqrWSlQ/Signal-Palette?node-id=18-8
//
// Every value here was read from the Figma node metadata. Do NOT edit by hand
// without re-checking the Figma source.

export const FRAME = {
  width: 1280,
  height: 1167,
} as const;

export const COLORS = {
  // Page background (top/bottom areas above and below the gradient sections)
  pageBg: "#282b32",
  // Card background
  cardBg: "#31343F",
  // Section gradient (used inside the two portfolio backgrounds)
  gradientStart: "rgb(40, 43, 50)", // #282b32
  gradientMid: "rgb(22, 25, 33)", // #161921

  // Signal palette (decided by user, MVP step 1).
  // Will be expanded to 5 levels for green/red later.
  positiveStrong: "#22C77F",
  positiveMid: "#5DD9A0",
  positiveMild: "#9FE8C5",
  neutral: "#F8E29A",
  negativeStrong: "#F0506E",
  negativeMid: "#F47C95",
  negativeMild: "#F8A8B8",

  // Empty / placeholder color for unused boxes (per spec: "디자인에 어울리는 투명색 혹은 흰색")
  empty: "rgba(255, 255, 255, 0.06)",

  // Change button
  changeButtonBgPrimary: "#FFFFFF",
  changeButtonBorderPrimary: "#DDDDDD",
  changeButtonBgSecondary: "#EFEFEF",
  changeButtonBorderSecondary: "#C2C2C2",
  changeButtonText: "#000000",

  textPrimary: "#FFFFFF",
} as const;

export const RADIUS = {
  card: 7,
  smallBox: 3,
  // Comp boxes (30/40/19) and central signal box have NO radius (sharp).
  compBox: 0,
} as const;

export const FONT_SIZES = {
  buttonLabel: 12,
  footer: 14,
  body: 16,
  central: 24,
} as const;

export const FONT_FAMILY = {
  // Order requested by user: Roboto > Pretendard > Noto Sans KR
  base: `'Roboto', 'Pretendard', 'Noto Sans KR', sans-serif`,
} as const;

// Card grid layout
export const CARD = {
  width: 290,
  height: 160,
  cols: 4,
  rows: 2, // per portfolio section
  // From Figma: card x positions are 25, 338, 651, 964 → gap = 23
  colGap: 23,
  // From Figma: card y positions row1 vs row2 differ by 198 → vertical gap = 38
  rowGap: 38,
  // Padding inside card from card-left to first 24x24 box
  paddingX: 7,
} as const;

// Small color box grid (the 20 issue boxes inside each card)
export const ISSUE_GRID = {
  size: 24,
  gap: 4,
  cols: 10,
  rows: 2,
  // Total grid size: 10*24 + 9*4 = 276 wide, 2*24 + 4 = 52 tall
} as const;

// Stock comprehensive color box (right of stock name)
export const STOCK_COMP_BOX = {
  current: 30, // current portfolio
  spare: 19, // spare portfolio
  // Gap between stock name and box (from Figma: 186 - 124 - 59 = 3)
  gap: 3,
} as const;

// Portfolio comprehensive color box (right of portfolio title)
export const PORTFOLIO_COMP_BOX = {
  current: 40,
  spare: 19,
} as const;

// Central issue ticker — between current/spare portfolio sections
export const CENTRAL = {
  signalBoxSize: 24,
  fontSize: 24,
  // Vertical y of text top in Figma: 584 (text), 586 (box)
} as const;

// Section background gradient blocks (absolute positions in the 1280×1167 frame)
export const SECTIONS = {
  current: { x: 0, y: 101, width: 1280, height: 450 },
  spare: { x: 0, y: 645, width: 1280, height: 540 },
} as const;

// Header layouts
export const CURRENT_HEADER = {
  // Title "현재 포트폴리오"
  titleY: 78,
  titleHeight: 19,
  // Comp box 40x40 — bottom-aligned with title (both end at y=97)
  compBoxY: 57,
  compBoxSize: 40,
  // 변경 button: 51x19 at x=770, y=78
  buttonX: 770,
  buttonY: 78,
  buttonWidth: 51,
  buttonHeight: 19,
  // Title and button x-positions from Figma
  titleX: 586,
  compBoxX: 696,
} as const;

export const SPARE_HEADER = {
  titleY: 694,
  titleHeight: 19,
  compBoxY: 694, // top-aligned (both 19h)
  compBoxSize: 19,
  buttonX: 770,
  buttonY: 693,
  buttonWidth: 51,
  buttonHeight: 19,
  titleX: 586,
  compBoxX: 696,
} as const;

export const FOOTER = {
  text: "시그널 팔레트 © 2026 팀사랑꾼들. All rights reserved.",
  x: 477,
  y: 1138,
  fontSize: 14,
} as const;
