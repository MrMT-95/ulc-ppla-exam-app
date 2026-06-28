"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Award, CheckCircle2, Bookmark, BarChart3, RotateCcw, AlertTriangle } from "lucide-react";

interface CategoryInfo {
  code: string;
  name: string;
  count: number;
}

const CATEGORIES: CategoryInfo[] = [
  { code: "PL010", name: "Prawo lotnicze", count: 551 },
  { code: "PL020", name: "Ogólna wiedza o statku powietrznym", count: 230 },
  { code: "PL030", name: "Osiągi i planowanie lotu", count: 54 },
  { code: "PL040", name: "Człowiek – możliwości i ograniczenia", count: 304 },
  { code: "PL050", name: "Meteorologia", count: 135 },
  { code: "PL060", name: "Nawigacja", count: 182 },
  { code: "PL070", name: "Procedury operacyjne", count: 74 },
  { code: "PL080", name: "Zasady lotu", count: 364 },
  { code: "PL090", name: "Łączność", count: 53 },
  { code: "PL099", name: "Ogólne bezpieczeństwo", count: 99 },
  { code: "PL100", name: "Ogólne bezpieczeństwo lotów", count: 7 },
];

const TOTAL_QUESTIONS_COUNT = 2053;

interface ExamAttempt {
  id: string;
  date: string;
  score: number;
  passed: boolean;
  totalQuestions: number;
}

export default function Home() {
  const [stats, setStats] = useState({
    correctAnsweredCount: 0,
    seenCount: 0,
    bookmarkCount: 0,
    examAttempts: [] as ExamAttempt[],
    categoryCorrect: {} as Record<string, number>,
  });

  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    const loadStats = () => {
      const correctAns = JSON.parse(localStorage.getItem("ppla_correct_answers") || "{}");
      const incorrectAns = JSON.parse(localStorage.getItem("ppla_incorrect_answers") || "{}");
      const bookmarks = JSON.parse(localStorage.getItem("ppla_bookmarks") || "{}");
      const exams = JSON.parse(localStorage.getItem("ppla_exams_history") || "[]");

      const correctIds = Object.keys(correctAns);
      const incorrectIds = Object.keys(incorrectAns);
      const seenIds = Array.from(new Set([...correctIds, ...incorrectIds]));

      // Calculate category correctness
      const catCorrect: Record<string, number> = {};
      CATEGORIES.forEach(cat => {
        catCorrect[cat.code] = 0;
      });

      correctIds.forEach(id => {
        const codeMatch = id.match(/^(PL\d+)/);
        if (codeMatch && catCorrect[codeMatch[1]] !== undefined) {
          catCorrect[codeMatch[1]]++;
        }
      });

      setStats({
        correctAnsweredCount: correctIds.length,
        seenCount: seenIds.length,
        bookmarkCount: Object.keys(bookmarks).filter(id => bookmarks[id]).length,
        examAttempts: exams,
        categoryCorrect: catCorrect,
      });
    };

    loadStats();
    
    window.addEventListener("storage", loadStats);
    return () => {
      window.removeEventListener("storage", loadStats);
    };
  }, []);

  const resetAllProgress = () => {
    localStorage.removeItem("ppla_correct_answers");
    localStorage.removeItem("ppla_incorrect_answers");
    localStorage.removeItem("ppla_bookmarks");
    localStorage.removeItem("ppla_exams_history");
    
    setStats({
      correctAnsweredCount: 0,
      seenCount: 0,
      bookmarkCount: 0,
      examAttempts: [],
      categoryCorrect: {} as Record<string, number>,
    });
    setConfirmReset(false);
  };

  const masteryPercent = TOTAL_QUESTIONS_COUNT > 0 
    ? Math.round((stats.correctAnsweredCount / TOTAL_QUESTIONS_COUNT) * 100) 
    : 0;

  const examsPassed = stats.examAttempts.filter(e => e.passed).length;
  const averageExamScore = stats.examAttempts.length > 0
    ? Math.round(stats.examAttempts.reduce((acc, curr) => acc + curr.score, 0) / stats.examAttempts.length)
    : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* Flight Deck Title */}
      <div>
        <h1 style={{ fontFamily: "var(--font-outfit), sans-serif", fontSize: "2rem", marginBottom: "8px" }}>
          Pulpit Pilota <span className="glow-text-green">(Flight Deck)</span>
        </h1>
        <p style={{ color: "var(--text-secondary)" }}>
          Twój zintegrowany panel przygotowania do egzaminu teoretycznego PPL(A).
        </p>
      </div>

      {/* Stats HUD Panel */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "20px",
        }}
      >
        <div className="glass-panel" style={{ padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ background: "rgba(16, 185, 129, 0.1)", padding: "12px", borderRadius: "8px" }}>
            <CheckCircle2 style={{ color: "var(--glow-green)", width: "28px", height: "28px" }} />
          </div>
          <div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>OPANOWANE PYTANIA</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700 }}>
              {stats.correctAnsweredCount} <span style={{ fontSize: "1rem", color: "var(--text-muted)", fontWeight: 400 }}>/ {TOTAL_QUESTIONS_COUNT}</span>
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              Opanowanie bazy: <span className="glow-text-green">{masteryPercent}%</span>
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ background: "rgba(59, 130, 246, 0.1)", padding: "12px", borderRadius: "8px" }}>
            <BookOpen style={{ color: "var(--glow-blue)", width: "28px", height: "28px" }} />
          </div>
          <div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>PRZEJRZANE PYTANIA</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700 }}>
              {stats.seenCount} <span style={{ fontSize: "1rem", color: "var(--text-muted)", fontWeight: 400 }}>/ {TOTAL_QUESTIONS_COUNT}</span>
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              Przejrzano {Math.round((stats.seenCount / TOTAL_QUESTIONS_COUNT) * 100)}% bazy
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ background: "rgba(245, 158, 11, 0.1)", padding: "12px", borderRadius: "8px" }}>
            <Award style={{ color: "var(--glow-amber)", width: "28px", height: "28px" }} />
          </div>
          <div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>PRÓBY EGZAMINÓW</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700 }}>
              {stats.examAttempts.length} <span style={{ fontSize: "1rem", color: "var(--text-muted)", fontWeight: 400 }}>({examsPassed} ZAL)</span>
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              Średni wynik: <span className="glow-text-amber">{averageExamScore}%</span> (ZAL &gt;= 75%)
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ background: "rgba(239, 68, 68, 0.1)", padding: "12px", borderRadius: "8px" }}>
            <Bookmark style={{ color: "var(--glow-red)", width: "28px", height: "28px" }} />
          </div>
          <div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>ZAKŁADKI (TRUDNE)</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700 }}>{stats.bookmarkCount}</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Pytania oznaczone do powtórki</div>
          </div>
        </div>
      </section>

      {/* Main Panel Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "32px" }}>
        
        {/* Left Column: Category Progress List */}
        <div className="glass-panel" style={{ padding: "24px" }}>
          <h2 style={{ fontFamily: "var(--font-outfit), sans-serif", fontSize: "1.35rem", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
            <BarChart3 style={{ color: "var(--glow-green)" }} /> Statystyki przedmiotów ULC
          </h2>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {CATEGORIES.map(cat => {
              const correct = stats.categoryCorrect[cat.code] || 0;
              const percent = Math.round((correct / cat.count) * 100);
              return (
                <div key={cat.code} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                    <span style={{ fontWeight: 500 }}>
                      <span style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)", marginRight: "8px" }}>
                        {cat.code}
                      </span>
                      {cat.name}
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                      {correct} / {cat.count} ({percent}%)
                    </span>
                  </div>
                  {/* Progress bar container */}
                  <div style={{ height: "6px", background: "rgba(255,255,255,0.03)", borderRadius: "3px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${percent}%`,
                        background: percent >= 75 
                          ? "linear-gradient(90deg, var(--glow-green) 0%, #059669 100%)"
                          : percent > 30 
                            ? "linear-gradient(90deg, var(--glow-amber) 0%, #d97706 100%)"
                            : "linear-gradient(90deg, var(--glow-blue) 0%, #2563eb 100%)",
                        boxShadow: percent >= 75
                          ? "0 0 8px rgba(16, 185, 129, 0.4)"
                          : percent > 30 
                            ? "0 0 8px rgba(245, 158, 11, 0.4)"
                            : "none",
                        transition: "width 0.8s ease-out",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Flight Actions & Reset Options */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div className="glass-panel" style={{ padding: "24px" }}>
            <h2 style={{ fontFamily: "var(--font-outfit), sans-serif", fontSize: "1.35rem", marginBottom: "16px" }}>
              Panel Nawigacyjny
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <Link href="/study" className="btn-cockpit btn-cockpit-green" style={{ height: "60px", fontSize: "1.1rem" }}>
                Rozpocznij Trening
              </Link>
              <Link href="/exam" className="btn-cockpit btn-cockpit-amber" style={{ height: "60px", fontSize: "1.1rem" }}>
                Symuluj Egzamin ULC
              </Link>
            </div>
          </div>

          {/* Reset progress */}
          <div className="glass-panel" style={{ padding: "24px", borderColor: confirmReset ? "var(--glow-red)" : "var(--border-color)" }}>
            {!confirmReset ? (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
                <div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "4px" }}>Zresetuj Dziennik Pokładowy</h3>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Wyzeruj wszystkie statystyki, historię egzaminów i zapisane zakładki.</p>
                </div>
                <button className="btn-cockpit btn-cockpit-red" onClick={() => setConfirmReset(true)}>
                  <RotateCcw style={{ width: "16px", height: "16px" }} /> Resetuj
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", gap: "12px", alignItems: "center", color: "var(--glow-red)" }}>
                  <AlertTriangle />
                  <span style={{ fontWeight: 600 }}>UWAGA: Operacja jest nieodwracalna!</span>
                </div>
                <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>Czy na pewno chcesz usunąć wszystkie swoje statystyki nauki oraz historię zaliczonych egzaminów?</p>
                <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                  <button className="btn-cockpit btn-cockpit-red" style={{ flex: 1 }} onClick={resetAllProgress}>
                    Tak, Usuń Wszystko
                  </button>
                  <button className="btn-cockpit" style={{ flex: 1 }} onClick={() => setConfirmReset(false)}>
                    Anuluj
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
