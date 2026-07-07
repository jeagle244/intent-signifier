import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const labGrotesque = localFont({
  variable: "--font-lab-grotesque",
  src: [
    { path: "./fonts/LabGrotesque-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/LabGrotesque-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/LabGrotesque-Bold.woff2", weight: "700", style: "normal" },
  ],
});

export const metadata: Metadata = {
  title: "LemFi Candidate Intent Platform",
  description: "Which companies should TA be sourcing from this week.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${labGrotesque.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
