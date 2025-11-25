import type { Metadata } from "next";
// 1. Import Font dari Google
import { Montserrat, Lato } from "next/font/google"; 
import "./globals.css";
import { ThirdwebProvider } from "thirdweb/react";

// 2. Konfigurasi Font Montserrat (Untuk Judul)
const montserrat = Montserrat({ 
  subsets: ["latin"], 
  weight: ["700"], // Bold only
  variable: "--font-heading", // Kita kasih nama variabel
});

// 3. Konfigurasi Font Lato (Untuk Body/Teks Biasa)
const lato = Lato({ 
  subsets: ["latin"], 
  weight: ["400", "700"], // Regular & Bold
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Waste Tracker by Terra Horizon",
  description: "Blockchain Waste Management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* 4. Masukkan kedua font ke dalam Body */}
      <body 
        className={`${lato.variable} ${montserrat.variable}`} 
        suppressHydrationWarning={true}
        // Set default font ke Lato
        style={{ fontFamily: "var(--font-body)" }} 
      >
        <ThirdwebProvider>
          {children}
        </ThirdwebProvider>
      </body>
    </html>
  );
}