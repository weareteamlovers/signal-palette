import {
  CARD,
  CURRENT_HEADER,
  PORTFOLIO_COMP_BOX,
  SPARE_HEADER,
} from "@/lib/design-tokens";
import type { Portfolio } from "@/types";
import { ChangeButton } from "./ChangeButton";
import { ColorBox } from "./ColorBox";
import { StockCard } from "./StockCard";
import styles from "./PortfolioSection.module.css";

interface Props {
  portfolio: Portfolio;
}

export function PortfolioSection({ portfolio }: Props) {
  const isCurrent = portfolio.variant === "current";
  const header = isCurrent ? CURRENT_HEADER : SPARE_HEADER;
  const compSize = isCurrent ? PORTFOLIO_COMP_BOX.current : PORTFOLIO_COMP_BOX.spare;

  // Compute card grid positions (relative to the frame, absolute-positioned).
  const cardXs = Array.from({ length: CARD.cols }, (_, i) =>
    25 + i * (CARD.width + CARD.colGap),
  );
  const baseRowY = isCurrent ? 147 : 736;
  const cardYs = [baseRowY, baseRowY + CARD.height + CARD.rowGap];

  return (
    <>
      {/* Header: title + portfolio comp box + change button */}
      <p
        className={styles.title}
        style={{ left: header.titleX, top: header.titleY }}
      >
        {portfolio.label}
      </p>
      <div
        className={styles.compBox}
        style={{ left: header.compBoxX, top: header.compBoxY }}
      >
        <ColorBox signal={portfolio.overall} size={compSize} />
      </div>
      <div
        className={styles.button}
        style={{ left: header.buttonX, top: header.buttonY }}
      >
        <ChangeButton variant={isCurrent ? "primary" : "secondary"} />
      </div>

      {/* 4×2 stock cards */}
      {portfolio.stocks.map((stock, i) => {
        const col = i % CARD.cols;
        const row = Math.floor(i / CARD.cols);
        return (
          <div
            key={stock.name}
            className={styles.card}
            style={{ left: cardXs[col], top: cardYs[row] }}
          >
            <StockCard stock={stock} variant={portfolio.variant} />
          </div>
        );
      })}
    </>
  );
}
