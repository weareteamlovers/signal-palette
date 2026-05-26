import { ActiveIssueProvider } from "@/components/ActiveIssueContext";
import { ActiveStockProvider } from "@/components/ActiveStockContext";
import { ActiveTooltipProvider } from "@/components/ActiveTooltipContext";
import { AnalysisProvider } from "@/components/AnalysisProvider";
import { AuthHeader } from "@/components/AuthHeader";
import { CentralIssue } from "@/components/CentralIssue";
import { PortfolioSection } from "@/components/PortfolioSection";
import { StockModal } from "@/components/StockModal";
import { TopTicker } from "@/components/TopTicker";
import { CURRENT_STOCK_NAMES, SPARE_STOCK_NAMES } from "@/data/default-portfolio";
import { FOOTER } from "@/lib/design-tokens";
import styles from "./page.module.css";

export default function Page() {
  return (
    <AnalysisProvider current={CURRENT_STOCK_NAMES} spare={SPARE_STOCK_NAMES}>
      <ActiveIssueProvider>
        <ActiveTooltipProvider>
          <ActiveStockProvider>
          <main className={styles.main}>
            {/* Sticky top ticker — tablet/mobile only (TopTicker returns null
                on desktop). Stays glued to the viewport top while scrolling. */}
            <TopTicker />

            {/* Full-bleed gradient bands sit on <main> so they follow the content
                width (no horizontal scrollbar). Y/height vary per viewport. */}
            <div className={`${styles.sectionBg} ${styles.sectionBgCurrent}`} />
            <div className={`${styles.sectionBg} ${styles.sectionBgSpare}`} />

            <div className={styles.frame}>
              {/* Logged-out OAuth entry point — desktop-only, absolute position
                  per §14-2. Logged-in header takes over in 4a-4. */}
              <AuthHeader />

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

              {/* Stock detail modal — desktop only (CSS hides below 1280).
                  Renders null when no card is active. */}
              <StockModal />
            </div>
          </main>
          </ActiveStockProvider>
        </ActiveTooltipProvider>
      </ActiveIssueProvider>
    </AnalysisProvider>
  );
}
