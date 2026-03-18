import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Dashboard — E-Commerce BI",
  description: "Conversational AI for Instant Business Intelligence Dashboards",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
