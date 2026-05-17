import { ActiveIssueProvider } from "@/components/ActiveIssueContext";
import { AnalysisProvider } from "@/components/AnalysisProvider";
import { CentralIssue } from "@/components/CentralIssue";
import { PortfolioSection } from "@/components/PortfolioSection";
import { CURRENT_STOCK_NAMES, SPARE_STOCK_NAMES } from "@/data/default-portfolio";
import { FOOTER, FRAME, SECTIONS } from "@/lib/design-tokens";
import styles from "./page.module.css";

export default function Page() {
  return (
    <AnalysisProvider current={CURRENT_STOCK_NAMES} spare={SPARE_STOCK_NAMES}>
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
            <PortfolioSection
              variant="current"
              label="현재 포트폴리오"
              stockNames={CURRENT_STOCK_NAMES}
            />
            <PortfolioSection
              variant="spare"
              label="예비 포트폴리오"
              stockNames={SPARE_STOCK_NAMES}
            />

            {/* Central ticker — sits in the gap between current (y=551) and spare (y=645) sections */}
            <div className={styles.central} style={{ top: 584 }}>
              <CentralIssue />
            </div>

            {/* Footer */}
            <p className={styles.footer} style={{ left: FOOTER.x, top: FOOTER.y }}>
              {FOOTER.text}
            </p>
          </div>
        </main>
      </ActiveIssueProvider>
    </AnalysisProvider>
  );
}
