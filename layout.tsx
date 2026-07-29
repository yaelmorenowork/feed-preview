import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Feed Preview",
  description: "A Notion-connected content feed preview widget.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "Inter, sans-serif" }}>{children}</body>
    </html>
  );
}
