import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trans",
  description: "A refined translation management workspace."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
