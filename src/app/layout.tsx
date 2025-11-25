import type { Metadata } from "next";
// 1. Import Manrope and Inter from Google Fonts
import { Manrope, Inter } from "next/font/google"; 
import "./globals.css";
import { ThirdwebProvider } from "thirdweb/react";

// 2. Configure Manrope (For Headings - Bold/Professional)
const manrope = Manrope({ 
  subsets: ["latin"], 
  variable: "--font-heading", 
});

// 3. Configure Inter (For Body/Default Text - Clean/Readable)
const inter = Inter({ 
  subsets: ["latin"], 
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
      {/* 4. Inject both fonts into the Body class */}
      <body 
        className={`${inter.variable} ${manrope.variable}`} 
        suppressHydrationWarning={true}
        style={{ 
          margin: 0,
          padding: 0,
          fontFamily: "var(--font-body)",
          backgroundColor: "#F0F4F8" // Matches the new soft page background
        }} 
      >
        <ThirdwebProvider>
          {children}
        </ThirdwebProvider>
      </body>
    </html>
  );
}