import { ActiveIssueProvider } from "@/components/ActiveIssueContext";
import { ActiveTooltipProvider } from "@/components/ActiveTooltipContext";
import { AnalysisProvider } from "@/components/AnalysisProvider";
import { CentralIssue } from "@/components/CentralIssue";
import { PortfolioSection } from "@/components/PortfolioSection";
import { TopTicker } from "@/components/TopTicker";
import { CURRENT_STOCK_NAMES, SPARE_STOCK_NAMES } from "@/data/default-portfolio";
import { FOOTER } from "@/lib/design-tokens";
import styles from "./page.module.css";

export default function Page() {
  return (
    <AnalysisProvider current={CURRENT_STOCK_NAMES} spare={SPARE_STOCK_NAMES}>
      <ActiveIssueProvider>
        <ActiveTooltipProvider>
          <main className={styles.main}>
            {/* Sticky top ticker — tablet/mobile only (TopTicker returns null
                on desktop). Stays glued to the viewport top while scrolling. */}
            <TopTicker />

            {/* Full-bleed gradient bands sit on <main> so they follow the content
                width (no horizontal scrollbar). Y/height vary per viewport. */}
            <div className={`${styles.sectionBg} ${styles.sectionBgCurrent}`} />
            <div className={`${styles.sectionBg} ${styles.sectionBgSpare}`} />

            <div className={styles.frame}>
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

              {/* Central ticker — desktop only (CentralIssue returns null on
                  tablet/mobile). Sits between current (ends y=551) and spare
                  (starts y=645) sections. */}
              <div className={styles.central} style={{ top: 584 }}>
                <CentralIssue />
              </div>

              <p className={styles.footer}>{FOOTER.text}</p>
            </div>
          </main>
        </ActiveTooltipProvider>
      </ActiveIssueProvider>
    </AnalysisProvider>
  );
}
