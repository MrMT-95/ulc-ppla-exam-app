import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import Link from "next/link";
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
        <header
          style={{
            background: "var(--bg-cockpit)",
            borderBottom: "1px solid var(--border-color)",
            padding: "16px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "sticky",
            top: 0,
            zIndex: 100,
            backdropFilter: "blur(12px)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                backgroundColor: "var(--glow-green)",
                boxShadow: "0 0 10px var(--glow-green)",
              }}
              className="indicator-pulse"
            />
            <Link href="/" style={{ textDecoration: "none" }}>
              <span
                style={{
                  fontFamily: "var(--font-outfit), sans-serif",
                  fontSize: "1.25rem",
                  fontWeight: 700,
                  letterSpacing: "1px",
                  color: "var(--text-primary)",
                }}
              >
                PPLA <span className="glow-text-green">FLIGHT DECK</span>
              </span>
            </Link>
          </div>

          <nav style={{ display: "flex", gap: "16px" }}>
            <Link href="/" className="btn-cockpit">
              Pulpit
            </Link>
            <Link href="/study" className="btn-cockpit btn-cockpit-green">
              Trening
            </Link>
            <Link href="/exam" className="btn-cockpit btn-cockpit-amber">
              Symulator Egzaminu
            </Link>
          </nav>

          {/* Simulated HUD Flight Indicators */}
          <div
            style={{
              display: "flex",
              gap: "16px",
              fontSize: "0.75rem",
              fontFamily: "var(--font-mono)",
              color: "var(--text-muted)",
            }}
            className="desktop-only"
          >
            <div>
              SYS: <span style={{ color: "var(--glow-green)" }}>OK</span>
            </div>
            <div>
              ALT DATA: <span style={{ color: "var(--glow-green)" }}>LOADED</span>
            </div>
            <div>
              PWR: <span style={{ color: "var(--glow-amber)" }}>STABLE</span>
            </div>
          </div>
        </header>

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
      </body>
    </html>
  );
}
