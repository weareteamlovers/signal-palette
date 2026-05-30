import { ActiveEditProvider } from "@/components/ActiveEditContext";
import { ActiveIssueProvider } from "@/components/ActiveIssueContext";
import { ActiveStockProvider } from "@/components/ActiveStockContext";
import { ActiveTooltipProvider } from "@/components/ActiveTooltipContext";
import { AnalysisProvider } from "@/components/AnalysisProvider";
import { AuthHeader } from "@/components/AuthHeader";
import { CentralIssue } from "@/components/CentralIssue";
import { EditPortfolioModal } from "@/components/EditPortfolioModal";
import { NicknameGate } from "@/components/NicknameGate";
import { PortfolioSection } from "@/components/PortfolioSection";
import { StockModal } from "@/components/StockModal";
import { TopTicker } from "@/components/TopTicker";
import { CURRENT_STOCK_NAMES, SPARE_STOCK_NAMES } from "@/data/default-portfolio";
import { FOOTER } from "@/lib/design-tokens";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import styles from "./page.module.css";

export default async function Page() {
  // Server-side user fetch (4a-4). null when env is missing or user is logged
  // out. Per-user portfolio loading lands in 4a-7; for now the default fixture
  // is used regardless.
  const supabase = await createServerSupabase();
  const userResult = supabase ? await supabase.auth.getUser() : null;
  const sbUser = userResult?.data.user ?? null;

  // Two separate sources:
  //  * explicitNickname — set by NicknameModal save (user_metadata.nickname).
  //    NicknameGate is shown until this is filled, so closing the tab without
  //    finishing the modal reopens it on next login.
  //  * providerNickname — whatever the OAuth provider gave us (Kakao
  //    profile_nickname / Google name). Used to (a) pre-fill the modal input
  //    and (b) fall back in the header when the user hasn't finished yet.
  const meta = (sbUser?.user_metadata ?? {}) as Record<string, unknown>;
  const explicitNickname =
    typeof meta.nickname === "string" && meta.nickname.trim() !== ""
      ? meta.nickname
      : null;
  const providerNickname =
    [meta.name, meta.full_name, meta.user_name, meta.preferred_username].find(
      (v): v is string => typeof v === "string" && v.trim() !== "",
    ) ?? null;

  const showNicknameGate = !!sbUser && !explicitNickname;
  const displayNickname = explicitNickname ?? providerNickname;

  // Kakao without 비즈앱 review doesn't expose email — accept the user object
  // anyway so the logged-in header still renders. AuthHeader falls back to
  // the nickname for the top-right slot when email is empty.
  const user = sbUser
    ? { email: sbUser.email ?? "", nickname: displayNickname }
    : null;
  // 4a-6-1: edit modal is only reachable once the user has explicitly set a
  // nickname via the NicknameModal. Provider-supplied nicknames don't count
  // (the gate is still active until [확인] is clicked).
  const canEdit = !!user && !!explicitNickname;

  return (
    <AnalysisProvider current={CURRENT_STOCK_NAMES} spare={SPARE_STOCK_NAMES}>
      <ActiveIssueProvider>
        <ActiveTooltipProvider>
          <ActiveStockProvider>
          <ActiveEditProvider>
          <main className={styles.main}>
            {/* Sticky top ticker — tablet/mobile only (TopTicker returns null
                on desktop). Stays glued to the viewport top while scrolling. */}
            <TopTicker />

            {/* Full-bleed gradient bands sit on <main> so they follow the content
                width (no horizontal scrollbar). Y/height vary per viewport. */}
            <div className={`${styles.sectionBg} ${styles.sectionBgCurrent}`} />
            <div className={`${styles.sectionBg} ${styles.sectionBgSpare}`} />

            <div className={styles.frame}>
              {/* Logged-out: §14-2 OAuth entry point. Logged-in: §14-3 user
                  email (temporary, replaced by nickname in 4a-5) + logout. */}
              <AuthHeader user={user} />

              <PortfolioSection
                variant="current"
                label="현재 포트폴리오"
                canEdit={canEdit}
              />
              <PortfolioSection
                variant="spare"
                label="예비 포트폴리오"
                canEdit={canEdit}
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

              {/* 4a-6-1: portfolio edit modal — renders null until [수정] is
                  pressed by a logged-in user with a nickname. Names are
                  read from AnalysisProvider's mutable state (4a-6-3). */}
              <EditPortfolioModal />

              {/* 4a-5: first-login nickname modal. Mounted only when the user
                  is logged in but has no explicit nickname yet. */}
              {showNicknameGate && <NicknameGate />}
            </div>
          </main>
          </ActiveEditProvider>
          </ActiveStockProvider>
        </ActiveTooltipProvider>
      </ActiveIssueProvider>
    </AnalysisProvider>
  );
}
