import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import Script from "next/script";
import Header from "@/components/Header";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PPLA Flight Prep | Urząd Lotnictwa Cywilnego",
  description: "High-fidelity exam preparation app for the Polish Private Pilot License - Aeroplane (PPLA) theoretical exams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" className={`${outfit.variable} ${inter.variable}`}>
      <body style={{ fontFamily: "var(--font-inter), sans-serif" }}>
        <Header />
        
        <main style={{ flex: 1, padding: "24px", maxWidth: "1200px", width: "100%", margin: "0 auto" }}>
          {children}
        </main>

        <footer
          style={{
            textAlign: "center",
            padding: "24px",
            color: "var(--text-muted)",
            fontSize: "0.8rem",
            borderTop: "1px solid var(--border-color)",
            marginTop: "auto",
          }}
        >
          <p>© {new Date().getFullYear()} PPLA Flight Deck. Baza pytań Urzędu Lotnictwa Cywilnego (ULC).</p>
        </footer>
        
        {/* Load Google OAuth SDK */}
        <Script src="https://accounts.google.com/gsi/client" strategy="lazyOnload" />
      </body>
    </html>
  );
}
