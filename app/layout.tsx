import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "catan-clone",
  description: "A Settlers of Catan clone — 3D board rendered with Three.js.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
