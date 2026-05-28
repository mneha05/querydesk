import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QueryDesk — Self-Service BI & Reporting",
  description: "Bring your own data, build reports without code, and ask questions in plain English.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Albert+Sans:wght@400;500;600;700&family=Darker+Grotesque:wght@500;600;700;800;900&family=Spline+Sans+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <style>{`:root{--font-display:'Darker Grotesque',system-ui,sans-serif;--font-body:'Albert Sans',system-ui,sans-serif;--font-mono:'Spline Sans Mono',ui-monospace,monospace;}`}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
