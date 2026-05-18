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

  // Edit button — single style for both portfolios (no variant).
  editButtonBg: "#444857",
  editButtonText: "#E5E5E5",

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

// Header layouts. Edit button geometry comes from Figma nodes 59:18 / 64:810
// (45 × 34, radius 12, fill #444857, 16px text). The two headers intentionally
// use different vertical alignment rules — see design-tokens.md §7.
export const CURRENT_HEADER = {
  // Title "현재 포트폴리오"
  titleY: 78,
  titleHeight: 19,
  // Comp box 40×40 — bottom-aligned with title and button (all end at y=97)
  compBoxY: 57,
  compBoxSize: 40,
  // Edit button 45×34 — bottom-aligned at y=97
  buttonX: 812,
  buttonY: 63,
  buttonWidth: 45,
  buttonHeight: 34,
  // Title and box x-positions from Figma
  titleX: 586,
  compBoxX: 696,
} as const;

export const SPARE_HEADER = {
  titleY: 694,
  titleHeight: 19,
  compBoxY: 694, // top-aligned with title (both 19h, both end at y=713)
  compBoxSize: 19,
  // Edit button 45×34 — vertical-center aligned with title/comp box
  // (button center y = 704, title/comp center y = 703.5)
  buttonX: 812,
  buttonY: 687,
  buttonWidth: 45,
  buttonHeight: 34,
  titleX: 586,
  compBoxX: 696,
} as const;

export const FOOTER = {
  text: "시그널 팔레트 © 2026 팀사랑꾼들. All rights reserved.",
  x: 477,
  y: 1138,
  fontSize: 14,
} as const;

// ----- Responsive --------------------------------------------------------
//
// Breakpoints decide which layout (and how many issues per stock) to use.
// Matches AnalysisProvider's matchMedia query.
//
//   width <  768                → mobile  (5×2 grid =  10 issues / stock)
//   768  ≤ width < 1280         → tablet  (10×2 grid = 20 issues / stock)
//   width ≥ 1280                → desktop (10×2 grid = 20 issues / stock)
//
// Numbers below come straight from Figma frames 18:8 (desktop), 61:2 (tablet)
// and 58:3 (mobile). Do not edit without rechecking those nodes.

export const BREAKPOINTS = {
  mobileMax: 767, // < 768 → mobile
  tabletMax: 1279, // 768–1279 → tablet
} as const;

/** Tablet layout — frame 768 wide, same 290×160 cards as desktop. */
export const TABLET = {
  frameWidth: 768,
  // Top ticker bar (full width, sticky at top of viewport).
  ticker: { height: 35 },
  // Section gradients (full bleed).
  sections: {
    current: { y: 101, height: 805 },
    spare: { y: 944, height: 881 },
  },
  // Cards: 2 columns × 4 rows. col x = 82, 395; row y = 147, 326, 505, 684.
  card: { cols: 2, rows: 4, colGap: 23, rowGap: 19 },
  // Headers
  currentHeader: {
    titleX: 309,
    titleY: 82,
    compBoxX: 419,
    compBoxY: 61,
    compBoxSize: 40,
    buttonX: 507,
    buttonY: 67,
  },
  spareHeader: {
    titleX: 319,
    titleY: 1018,
    compBoxX: 429,
    compBoxY: 1018,
    compBoxSize: 19,
    buttonX: 507,
    buttonY: 1011,
  },
  // First-card top y per portfolio
  rowStartY: { current: 147, spare: 1066 },
  // Footer
  footer: { x: 268, y: 1808, width: 232, fontSize: 12 },
} as const;

/** Mobile layout — frame 375 wide, smaller 150×160 cards, 5×2 issue grid. */
export const MOBILE = {
  frameWidth: 375,
  ticker: {
    height: 35,
    signalBoxSize: 12,
    fontSize: 12,
  },
  sections: {
    current: { y: 97, height: 775 },
    spare: { y: 931, height: 869 },
  },
  // Cards: 2 columns × 4 rows. col x = 26, 200; row y = 137, 311, 485, 659.
  card: {
    width: 150,
    height: 160,
    radius: 13,
    cols: 2,
    rows: 4,
    colGap: 24,
    rowGap: 14,
  },
  // 5 cols × 2 rows = 10 boxes per card
  issueGrid: { cols: 5, rows: 2 },
  // Header title font is smaller on mobile (12 vs 16 on desktop)
  headerTitleFontSize: 12,
  currentHeader: {
    titleX: 132,
    titleY: 83,
    compBoxX: 213,
    compBoxY: 67,
    compBoxSize: 30,
    buttonX: 275,
    buttonY: 71,
  },
  spareHeader: {
    titleX: 138,
    titleY: 1009,
    compBoxX: 220,
    compBoxY: 1006,
    compBoxSize: 19,
    buttonX: 275,
    buttonY: 1003,
  },
  rowStartY: { current: 137, spare: 1065 },
  // Edit button shrinks on mobile.
  editButton: { width: 34, height: 26, fontSize: 12 },
  // Footer
  footer: { x: 95, y: 1786, width: 186, fontSize: 8 },
  // Top ticker background — image fill in Figma; we re-create as linear-gradient.
  // Spec from user: 180deg, #282B32 0–70%, #161921 100%.
  tickerGradient:
    "linear-gradient(180deg, #282B32 0%, #282B32 70%, #161921 100%)",
} as const;
