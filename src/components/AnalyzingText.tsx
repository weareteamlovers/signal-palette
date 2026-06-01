import styles from "./AnalyzingText.module.css";

/** "Analyzing…" placeholder shown by the central ticker (desktop) and top
 *  ticker (tablet/mobile) while the analysis pipeline is in flight. Inherits
 *  the parent's font/color; adds a gentle pulse + sequential dots. */
export function AnalyzingText() {
  return (
    <span className={styles.wrap}>
      <span className={styles.label}>팀사랑꾼들 AI가 열심히 분석중이에요</span>
      <span className={styles.dots} aria-hidden>
        <span className={styles.dot}>.</span>
        <span className={styles.dot}>.</span>
        <span className={styles.dot}>.</span>
      </span>
    </span>
  );
}
