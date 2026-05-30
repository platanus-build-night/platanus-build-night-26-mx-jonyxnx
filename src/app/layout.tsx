import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "kitdoc - GitHub repo to Notion-ready docs",
  description: "Turn a GitHub repository into focused, Notion-ready documentation.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased bg-[#fffdf7] text-stone-900">{children}</body>
    </html>
  );
}
