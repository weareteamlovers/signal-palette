"use client";

import { useAnalysis, type ViewportMode } from "./AnalysisProvider";
import { ColorBox } from "./ColorBox";
import { EditButton } from "./EditButton";
import { StockCard } from "./StockCard";
import styles from "./PortfolioSection.module.css";

interface Props {
  variant: "current" | "spare";
  label: string;
  stockNames: readonly string[];
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

export function PortfolioSection({ variant, label, stockNames }: Props) {
  const { overalls, viewport } = useAnalysis();
  const overallState = overalls[variant];
  const compSize = portfolioCompSize(variant, viewport);

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
        ) : (
          <ColorBox size={compSize} loading />
        )}
      </div>
      <div className={styles.button} data-variant={variant}>
        <EditButton />
      </div>

      {/* Card grid — absolutely positioned wrapper, inside it CSS grid lays out
          the 8 cards. Desktop: 4×2; tablet/mobile: 2×4. */}
      <div className={styles.cardsGrid} data-variant={variant}>
        {stockNames.map((name) => (
          <StockCard key={name} name={name} variant={variant} />
        ))}
      </div>
    </>
  );
}
