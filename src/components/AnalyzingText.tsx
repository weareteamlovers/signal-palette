import styles from "./AnalyzingText.module.css";

/** "Analyzing…" placeholder shown by the central ticker (desktop), top ticker
 *  (tablet/mobile), and the prediction block (Step 5) while a pipeline is in
 *  flight. Inherits the parent's font/color; adds a gentle pulse + dots. */
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
