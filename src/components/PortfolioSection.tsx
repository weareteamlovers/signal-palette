"use client";

import { useActiveEdit } from "./ActiveEditContext";
import { useAnalysis, type ViewportMode } from "./AnalysisProvider";
import { ColorBox } from "./ColorBox";
import { EditButton } from "./EditButton";
import { StockCard } from "./StockCard";
import styles from "./PortfolioSection.module.css";

interface Props {
  variant: "current" | "spare";
  label: string;
  /** True only when a logged-in user has a nickname (4a-5+). Drives whether
   *  the [수정] button opens the edit modal or shows the login-tooltip. */
  canEdit?: boolean;
}

/** Portfolio overall comp box size per viewport / variant (Figma):
 *    desktop/tablet  current=40, spare=19
 *    mobile          current=30, spare=19  */
function portfolioCompSize(
  variant: "current" | "spare",
  viewport: ViewportMode,
): number {
  if (variant === "spare") return 19;
  return viewport === "mobile" ? 30 : 40;
}

export function PortfolioSection({ variant, label, canEdit = false }: Props) {
  const { overalls, viewport, currentNames, spareNames } = useAnalysis();
  const { openEdit } = useActiveEdit();
  const overallState = overalls[variant];
  const compSize = portfolioCompSize(variant, viewport);
  const names = variant === "current" ? currentNames : spareNames;

  return (
    <>
      {/* Header — title, portfolio overall comp box, edit button.
          Each element's absolute (left, top) varies per viewport, so positioning
          comes from CSS that switches on data-variant + media query. */}
      <p className={styles.title} data-variant={variant}>
        {label}
      </p>
      <div className={styles.compBox} data-variant={variant}>
        {overallState.status === "ready" ? (
          <ColorBox
            signal={overallState.overall.signal}
            intensity={overallState.overall.intensity}
            size={compSize}
          />
        ) : overallState.status === "empty" ? (
          // §14-10 all-empty portfolio → comp box uses --signal-empty
          <ColorBox signal="empty" size={compSize} />
        ) : (
          <ColorBox size={compSize} loading />
        )}
      </div>
      <div className={styles.button} data-variant={variant}>
        {canEdit ? (
          <EditButton onClick={() => openEdit(variant)} />
        ) : (
          <EditButton tooltip="로그인 후 바로 이용 가능해요" />
        )}
      </div>

      {/* Card grid — absolutely positioned wrapper, inside it CSS grid lays out
          the 8 cards. Desktop: 4×2; tablet/mobile: 2×4. Empty slots ("") are
          handled by StockCard per §14-10. Key uses index so multiple empty
          slots stay stable. */}
      <div className={styles.cardsGrid} data-variant={variant}>
        {names.map((name, i) => (
          <StockCard
            key={`${variant}-${i}`}
            name={name}
            variant={variant}
            slotIndex={i}
          />
        ))}
      </div>
    </>
  );
}
