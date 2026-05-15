import { CentralIssue } from "@/components/CentralIssue";
import { PortfolioSection } from "@/components/PortfolioSection";
import { DEFAULT_PORTFOLIOS } from "@/data/default-portfolio";
import { FOOTER, FRAME } from "@/lib/design-tokens";
import styles from "./page.module.css";

export default function Page() {
  const [current, spare] = DEFAULT_PORTFOLIOS;

  // Step 1: pick the first issue from the current portfolio's first stock as the central display.
  const featuredStock = current.stocks[0];
  const featuredIssue = featuredStock.issues[0];

  return (
    <main className={styles.main}>
      <div className={styles.frame} style={{ width: FRAME.width, height: FRAME.height }}>
        <PortfolioSection portfolio={current} />
        <PortfolioSection portfolio={spare} />

        {/* Central ticker — sits in the gap between current (y=551) and spare (y=645) sections */}
        <div className={styles.central} style={{ top: 584 }}>
          <CentralIssue stockName={featuredStock.name} issue={featuredIssue} />
        </div>

        {/* Footer */}
        <p className={styles.footer} style={{ left: FOOTER.x, top: FOOTER.y }}>
          {FOOTER.text}
        </p>
      </div>
    </main>
  );
}
