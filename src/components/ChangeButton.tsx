import styles from "./ChangeButton.module.css";

interface Props {
  /** "primary" = current portfolio (white bg), "secondary" = spare (gray bg). */
  variant: "primary" | "secondary";
  onClick?: () => void;
}

export function ChangeButton({ variant, onClick }: Props) {
  return (
    <button
      type="button"
      className={`${styles.btn} ${styles[variant]}`}
      onClick={onClick}
    >
      변경
    </button>
  );
}
