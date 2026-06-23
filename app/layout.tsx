import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://pottyfavor.com"),
  title: "Potty Favor | QR Restroom Media",
  description: "Mobile-first QR restroom media platform with persistent ads and local venue issue publishing.",
  alternates: { canonical: "https://pottyfavor.com" }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
