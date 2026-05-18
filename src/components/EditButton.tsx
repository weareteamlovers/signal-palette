import styles from "./EditButton.module.css";

interface Props {
  onClick?: () => void;
}

/** Portfolio "수정" button. Identical visual style in both portfolios
 *  (current and spare) — no variant prop. */
export function EditButton({ onClick }: Props) {
  return (
    <button type="button" className={styles.btn} onClick={onClick}>
      수정
    </button>
  );
}
