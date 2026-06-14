import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "vizi.ge — Have you seen this man?",
  description: "Tracking a graffiti tag across Washington State.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
