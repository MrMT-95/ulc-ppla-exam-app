"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Settings, Cloud, CloudOff, RefreshCw, LogOut, Check, X, AlertTriangle } from "lucide-react";
import { 
  requestGoogleToken, 
  fetchGoogleUserInfo, 
  findProgressFile, 
  downloadProgressFile, 
  createProgressFile, 
  updateProgressFile, 
  mergeProgress,
  SyncData
} from "@/utils/googleDriveSync";

export default function Header() {
  const [clientId, setClientId] = useState<string>("");
  const [customClientId, setCustomClientId] = useState<string>("");
  const [token, setToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  
  // Sync states
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "success" | "error">("idle");
  const [syncMessage, setSyncMessage] = useState("");
  
  // UI states
  const [showSettings, setShowSettings] = useState(false);
  const [envHasClientId, setEnvHasClientId] = useState(false);

  // Load Client ID on mount
  useEffect(() => {
    const envId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (envId) {
      setClientId(envId);
      setEnvHasClientId(true);
    } else {
      const savedId = localStorage.getItem("ppla_google_client_id") || "";
      setClientId(savedId);
      setCustomClientId(savedId);
    }

    // Check if token was saved in sessionStorage
    const savedToken = sessionStorage.getItem("ppla_google_token");
    const savedEmail = sessionStorage.getItem("ppla_google_email");
    if (savedToken && savedEmail) {
      setToken(savedToken);
      setUserEmail(savedEmail);
    }
  }, []);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!envHasClientId) {
      localStorage.setItem("ppla_google_client_id", customClientId);
      setClientId(customClientId);
    }
    setShowSettings(false);
  };

  const handleLogin = () => {
    if (!clientId) {
      setShowSettings(true);
      alert("Proszę najpierw skonfigurować Google Client ID w ustawieniach.");
      return;
    }

    setSyncStatus("idle");
    setSyncMessage("Uwierzytelnianie...");

    // Safety timeout: reset state if Google callback is never received (e.g. on blocked domains)
    const loginTimeout = setTimeout(() => {
      setSyncStatus("error");
      setSyncMessage("Przekroczono limit czasu. Sprawdź F12/Origin.");
    }, 15000);

    requestGoogleToken(
      clientId,
      async (accessToken) => {
        clearTimeout(loginTimeout);
        setToken(accessToken);
        sessionStorage.setItem("ppla_google_token", accessToken);
        
        // Fetch User Info
        const userInfo = await fetchGoogleUserInfo(accessToken);
        if (userInfo) {
          setUserEmail(userInfo.email);
          sessionStorage.setItem("ppla_google_email", userInfo.email);
          // Trigger initial sync automatically on login
          triggerSync(accessToken);
        } else {
          setSyncStatus("error");
          setSyncMessage("Błąd pobierania danych użytkownika.");
        }
      },
      (err) => {
        clearTimeout(loginTimeout);
        console.error("Google Auth Error:", err);
        setSyncStatus("error");
        setSyncMessage(`Logowanie nieudane: ${err}`);
      }
    );
  };

  const handleLogout = () => {
    setToken(null);
    setUserEmail(null);
    sessionStorage.removeItem("ppla_google_token");
    sessionStorage.removeItem("ppla_google_email");
    setSyncStatus("idle");
    setSyncMessage("");
  };

  const triggerSync = async (accessToken: string | null = token) => {
    if (!accessToken) return;
    
    setIsSyncing(true);
    setSyncStatus("idle");
    setSyncMessage("Synchronizacja...");

    try {
      // 1. Gather local data
      const localData: SyncData = {
        correct_answers: JSON.parse(localStorage.getItem("ppla_correct_answers") || "{}"),
        incorrect_answers: JSON.parse(localStorage.getItem("ppla_incorrect_answers") || "{}"),
        bookmarks: JSON.parse(localStorage.getItem("ppla_bookmarks") || "{}"),
        exams_history: JSON.parse(localStorage.getItem("ppla_exams_history") || "[]"),
        last_updated: Date.now()
      };

      // 2. Search for progress file in Drive appDataFolder
      const fileId = await findProgressFile(accessToken);

      if (fileId) {
        // 3. Download cloud file
        const cloudData = await downloadProgressFile(accessToken, fileId);
        
        if (cloudData) {
          // 4. Merge local & cloud data
          const mergedData = mergeProgress(localData, cloudData);

          // 5. Save merged data back to localStorage
          localStorage.setItem("ppla_correct_answers", JSON.stringify(mergedData.correct_answers));
          localStorage.setItem("ppla_incorrect_answers", JSON.stringify(mergedData.incorrect_answers));
          localStorage.setItem("ppla_bookmarks", JSON.stringify(mergedData.bookmarks));
          localStorage.setItem("ppla_exams_history", JSON.stringify(mergedData.exams_history));

          // 6. Update cloud file
          const success = await updateProgressFile(accessToken, fileId, mergedData);
          if (success) {
            setSyncStatus("success");
            setSyncMessage("Pomyślnie zsynchronizowano z chmurą!");
            
            // Dispatch custom storage event to refresh stats on active pages
            window.dispatchEvent(new Event("storage"));
          } else {
            throw new Error("Nie udało się zaktualizować pliku w chmurze.");
          }
        } else {
          throw new Error("Nie udało się pobrać pliku z chmury.");
        }
      } else {
        // File doesn't exist, create it in Google Drive AppData folder
        const newFileId = await createProgressFile(accessToken, localData);
        if (newFileId) {
          setSyncStatus("success");
          setSyncMessage("Utworzono plik kopii w chmurze!");
        } else {
          throw new Error("Nie udało się utworzyć pliku w chmurze.");
        }
      }
    } catch (err: any) {
      console.error("Sync Error:", err);
      setSyncStatus("error");
      setSyncMessage(err?.message || "Błąd podczas synchronizacji.");
    } finally {
      setIsSyncing(false);
      // Clear status message after 3 seconds if successful
      setTimeout(() => {
        setSyncMessage("");
      }, 3000);
    }
  };

  return (
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
        gap: "16px",
        flexWrap: "wrap"
      }}
    >
      {/* Brand Logo */}
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

      {/* Navigation Links */}
      <nav style={{ display: "flex", gap: "16px", alignItems: "center" }}>
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

      {/* Cloud Sync Status & Settings Area */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {/* Sync Status Text (if syncing or completed recently) */}
        {syncMessage && (
          <span 
            style={{ 
              fontSize: "0.75rem", 
              fontFamily: "var(--font-mono)", 
              color: syncStatus === "success" ? "var(--glow-green)" : syncStatus === "error" ? "var(--glow-red)" : "var(--glow-amber)"
            }}
          >
            {syncMessage}
          </span>
        )}

        {/* Google Sync Panels */}
        {token ? (
          <div className="glass-panel" style={{ display: "flex", alignItems: "center", gap: "10px", padding: "4px 8px", borderRadius: "6px", fontSize: "0.85rem" }}>
            <Cloud style={{ width: "16px", height: "16px", color: "var(--glow-green)" }} />
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
              {userEmail}
            </span>
            <button 
              onClick={() => triggerSync()} 
              disabled={isSyncing} 
              className="btn-cockpit" 
              style={{ padding: "4px 8px", border: "none", background: "transparent" }}
              title="Synchronizuj teraz"
            >
              <RefreshCw style={{ width: "14px", height: "14px", animation: isSyncing ? "spin 1.5s linear infinite" : "none" }} />
            </button>
            <button 
              onClick={handleLogout} 
              className="btn-cockpit btn-cockpit-red" 
              style={{ padding: "4px 8px", border: "none", background: "transparent" }}
              title="Wyloguj się"
            >
              <LogOut style={{ width: "14px", height: "14px" }} />
            </button>
          </div>
        ) : (
          <button 
            onClick={handleLogin} 
            className="btn-cockpit btn-cockpit-green"
            style={{ padding: "8px 12px", fontSize: "0.85rem" }}
          >
            <CloudOff style={{ width: "14px", height: "14px", marginRight: "4px" }} />
            Chmura: Zaloguj
          </button>
        )}

        {/* Settings Cog */}
        {!envHasClientId && (
          <button 
            onClick={() => setShowSettings(true)} 
            className="btn-cockpit" 
            style={{ padding: "8px" }}
            title="Ustawienia chmury"
          >
            <Settings style={{ width: "18px", height: "18px" }} />
          </button>
        )}
      </div>

      {/* Settings Modal Overlay */}
      {showSettings && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            zIndex: 999,
            display: "flex",
            justifyContent: "center",
            alignItems: "center"
          }}
        >
          <div 
            className="glass-panel" 
            style={{ 
              width: "90%", 
              maxWidth: "500px", 
              padding: "24px", 
              display: "flex", 
              flexDirection: "column", 
              gap: "18px" 
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontFamily: "var(--font-outfit), sans-serif", fontSize: "1.25rem" }}>
                Ustawienia Synchronizacji Chmury
              </h3>
              <button 
                onClick={() => setShowSettings(false)} 
                className="btn-cockpit" 
                style={{ padding: "4px 8px", border: "none" }}
              >
                <X style={{ width: "18px", height: "18px" }} />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                  GOOGLE OAUTH CLIENT ID
                </label>
                {envHasClientId ? (
                  <div 
                    style={{ 
                      padding: "10px", 
                      background: "rgba(16, 185, 129, 0.05)", 
                      border: "1px solid rgba(16, 185, 129, 0.2)", 
                      borderRadius: "6px", 
                      fontSize: "0.85rem",
                      color: "var(--glow-green)",
                      fontStyle: "italic"
                    }}
                  >
                    Zarządzane przez administratora systemu (zdefiniowane w środowisku)
                  </div>
                ) : (
                  <input
                    type="text"
                    value={customClientId}
                    onChange={e => setCustomClientId(e.target.value)}
                    placeholder="Wklej swój Client ID z Google Cloud..."
                    style={{
                      background: "var(--bg-color)",
                      border: "1px solid var(--border-color)",
                      color: "var(--text-primary)",
                      padding: "10px",
                      borderRadius: "6px",
                      fontSize: "0.85rem",
                      outline: "none",
                      width: "100%"
                    }}
                  />
                )}
              </div>

              {!envHasClientId && (
                <div 
                  style={{ 
                    display: "flex", 
                    gap: "10px", 
                    background: "rgba(59, 130, 246, 0.05)", 
                    border: "1px solid rgba(59, 130, 246, 0.15)", 
                    borderRadius: "6px", 
                    padding: "12px", 
                    fontSize: "0.8rem", 
                    color: "var(--text-secondary)",
                    lineHeight: 1.4
                  }}
                >
                  <AlertTriangle style={{ color: "var(--glow-blue)", flexShrink: 0, width: "16px", height: "16px" }} />
                  <div>
                    <strong>Jak uzyskać Client ID?</strong> Zaloguj się w Google Cloud Console, utwórz projekt, stwórz identyfikator klienta OAuth 2.0 (typ: <em>Aplikacja internetowa</em>), dodaj adres swojej strony w sekcji <em>"Autoryzowane pochodzenie JavaScript"</em> i wklej wygenerowany klucz tutaj.
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                <button type="submit" className="btn-cockpit btn-cockpit-green" style={{ flex: 1 }}>
                  Zapisz
                </button>
                <button type="button" className="btn-cockpit" style={{ flex: 1 }} onClick={() => setShowSettings(false)}>
                  Anuluj
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </header>
  );
}
