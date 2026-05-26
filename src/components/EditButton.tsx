import styles from "./EditButton.module.css";

interface Props {
  onClick?: () => void;
  /** When set, shows a dark hover tooltip with this text (matches ColorBox style).
   *  Used pre-login to surface "로그인 후 바로 이용 가능해요" per §14-2. */
  tooltip?: string;
}

/** Portfolio "수정" button. Identical visual style in both portfolios
 *  (current and spare) — no variant prop. */
export function EditButton({ onClick, tooltip }: Props) {
  return (
    <button
      type="button"
      className={styles.btn}
      onClick={onClick}
      data-tooltip={tooltip}
    >
      수정
    </button>
  );
}
