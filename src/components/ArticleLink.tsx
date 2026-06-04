import type { ReactNode } from "react";
import styles from "./ArticleLink.module.css";

/** Renders issue text as a link to its source article (opens a new tab) when a
 *  URL is available, otherwise a plain span. Shared by the central/top tickers
 *  and the stock detail modal. The source URL comes from issue.source.url
 *  (populated by the news adapters, Step 4c). */
export function ArticleLink({
  url,
  className,
  children,
}: {
  url?: string;
  className?: string;
  children: ReactNode;
}) {
  if (!url) return <span className={className}>{children}</span>;
  return (
    <a
      className={className ? `${className} ${styles.link}` : styles.link}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </a>
  );
}
