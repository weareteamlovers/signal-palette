import { ActiveIssueProvider } from "@/components/ActiveIssueContext";
import { CentralIssue } from "@/components/CentralIssue";
import { PortfolioSection } from "@/components/PortfolioSection";
import { DEFAULT_PORTFOLIOS } from "@/data/default-portfolio";
import { FOOTER, FRAME, SECTIONS } from "@/lib/design-tokens";
import styles from "./page.module.css";

export default function Page() {
  const [current, spare] = DEFAULT_PORTFOLIOS;

  return (
    <ActiveIssueProvider>
      <main className={styles.main}>
        {/* Full-bleed gradient bands sit on <main> so they follow the content width
            (no horizontal scrollbar). Y/height come from the Figma spec. */}
        <div
          className={styles.sectionBg}
          style={{ top: SECTIONS.current.y, height: SECTIONS.current.height }}
        />
        <div
          className={styles.sectionBg}
          style={{ top: SECTIONS.spare.y, height: SECTIONS.spare.height }}
        />

        <div className={styles.frame} style={{ width: FRAME.width, height: FRAME.height }}>
          <PortfolioSection portfolio={current} />
          <PortfolioSection portfolio={spare} />

          {/* Central ticker — sits in the gap between current (y=551) and spare (y=645) sections */}
          <div className={styles.central} style={{ top: 584 }}>
            <CentralIssue portfolios={DEFAULT_PORTFOLIOS} />
          </div>

          {/* Footer */}
          <p className={styles.footer} style={{ left: FOOTER.x, top: FOOTER.y }}>
            {FOOTER.text}
          </p>
        </div>
      </main>
    </ActiveIssueProvider>
  );
}
