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
import { fetchOwnPortfolios } from "@/lib/supabase/portfolios";
import { fetchOwnProfile } from "@/lib/supabase/profiles";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import styles from "./page.module.css";

function padTo8(arr: readonly string[]): string[] {
  const out = [...arr];
  while (out.length < 8) out.push("");
  return out.slice(0, 8);
}

export default async function Page() {
  const supabase = await createServerSupabase();
  const userResult = supabase ? await supabase.auth.getUser() : null;
  const sbUser = userResult?.data.user ?? null;

  // 4a-7: nickname is now sourced from `profiles.nickname` (single source of
  // truth). Falls back to whatever the OAuth provider gave us so the header
  // can show a friendly label while the gate is still pending.
  let explicitNickname: string | null = null;
  let currentNames: readonly string[] = CURRENT_STOCK_NAMES;
  let spareNames: readonly string[] = SPARE_STOCK_NAMES;

  if (supabase && sbUser) {
    const profile = await fetchOwnProfile(supabase, sbUser.id);
    explicitNickname = profile?.nickname ?? null;

    // Logged-in users see THEIR portfolios. Missing rows ⇒ 8 empty slots
    // (signed up but never edited anything). Default 16 stocks stay reserved
    // for the logged-out anonymous view.
    const ports = await fetchOwnPortfolios(supabase, sbUser.id);
    currentNames = padTo8(ports?.current ?? []);
    spareNames = padTo8(ports?.spare ?? []);
  }

  const meta = (sbUser?.user_metadata ?? {}) as Record<string, unknown>;
  const providerNickname =
    [meta.name, meta.full_name, meta.user_name, meta.preferred_username].find(
      (v): v is string => typeof v === "string" && v.trim() !== "",
    ) ?? null;

  const showNicknameGate = !!sbUser && !explicitNickname;
  const displayNickname = explicitNickname ?? providerNickname;

  const user = sbUser
    ? { email: sbUser.email ?? "", nickname: displayNickname }
    : null;
  const canEdit = !!user && !!explicitNickname;

  // 4a-5 / 139:* onboarding: a user who just set a nickname but has no
  // stocks yet (both portfolios empty) gets the "포트폴리오를 채워주세요"
  // modal automatically, with row 1's search dropdown pre-opened. They can
  // hit [취소] to dismiss; that leaves portfolios empty so it appears again
  // on the next reload — they finish properly by saving at least one slot.
  const isPortfolioEmpty =
    currentNames.every((n) => n === "") && spareNames.every((n) => n === "");
  const showOnboarding = !!user && !!explicitNickname && isPortfolioEmpty;

  return (
    <AnalysisProvider current={currentNames} spare={spareNames} userId={sbUser?.id ?? null}>
      <ActiveIssueProvider>
        <ActiveTooltipProvider>
          <ActiveStockProvider>
          <ActiveEditProvider
            initialActive={showOnboarding ? "current" : null}
            initialAutoOpenRow={showOnboarding ? 0 : null}
            initialMode={showOnboarding ? "onboarding" : "edit"}
          >
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
                  (nickname from profiles) + logout. */}
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

              <p className={styles.footer}>
                {FOOTER.text.split("팀사랑꾼들.")[0]}
                <span className={styles.footerAccent}>팀사랑꾼들.</span>
                {FOOTER.text.split("팀사랑꾼들.")[1]}
              </p>

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
