import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stall Talk | QR Restroom Media",
  description: "Mobile-first QR restroom media platform with persistent ads and local venue issue publishing."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
