import { ReactNode } from "react";

export function HighlightUnderline({ children }: { children: ReactNode }) {
  return <span className="highlight-mark">{children}</span>;
}
