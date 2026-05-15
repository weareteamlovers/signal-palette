import { CARD, STOCK_COMP_BOX } from "@/lib/design-tokens";
import type { Stock } from "@/types";
import { ColorBox } from "./ColorBox";
import { IssueGrid } from "./IssueGrid";
import styles from "./StockCard.module.css";

interface Props {
  stock: Stock;
  variant: "current" | "spare";
}

export function StockCard({ stock, variant }: Props) {
  const compSize = variant === "current" ? STOCK_COMP_BOX.current : STOCK_COMP_BOX.spare;

  return (
    <div className={styles.card} style={{ width: CARD.width, height: CARD.height }}>
      {/* Header: stock name + comprehensive color box, top-aligned and centered horizontally */}
      <div className={styles.header}>
        <span className={styles.name}>{stock.name}</span>
        <div style={{ width: STOCK_COMP_BOX.gap }} aria-hidden />
        <ColorBox signal={stock.overall} size={compSize} />
      </div>

      {/* 20-issue grid */}
      <div className={styles.gridWrap}>
        <IssueGrid issues={stock.issues} />
      </div>
    </div>
  );
}
