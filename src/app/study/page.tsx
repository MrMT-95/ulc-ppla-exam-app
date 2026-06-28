"use client";

import { useEffect, useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Bookmark, RotateCcw, Filter, Search, Award, Check, X } from "lucide-react";

interface Question {
  id: string;
  number: string;
  category_code: string;
  category_name: string;
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
}

const CATEGORY_NAMES: Record<string, string> = {
  "ALL": "Wszystkie przedmioty",
  "PL010": "Prawo lotnicze",
  "PL020": "Ogólna wiedza o statku powietrznym",
  "PL030": "Osiągi i planowanie lotu",
  "PL040": "Człowiek – możliwości i ograniczenia",
  "PL050": "Meteorologia",
  "PL060": "Nawigacja",
  "PL070": "Procedury operacyjne",
  "PL080": "Zasady lotu",
  "PL090": "Łączność",
  "PL099": "Ogólne bezpieczeństwo",
  "PL100": "Ogólne bezpieczeństwo lotów"
};

// Simple shuffle function
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function StudyPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("UNRESOLVED"); // ALL, BOOKMARKED, INCORRECT, UNRESOLVED
  const [jumpInput, setJumpInput] = useState("");

  // Navigation / Question State
  const [currentIdx, setCurrentIdx] = useState(0);
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);

  // User LocalStorage states
  const [correctList, setCorrectList] = useState<Record<string, boolean>>({});
  const [incorrectList, setIncorrectList] = useState<Record<string, boolean>>({});
  const [bookmarks, setBookmarks] = useState<Record<string, boolean>>({});

  // Fetch all questions
  useEffect(() => {
    fetch("/data/questions.json")
      .then(res => res.json())
      .then((data: Question[]) => {
        setQuestions(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading questions data:", err);
        setLoading(false);
      });

    const loadLocalData = () => {
      setCorrectList(JSON.parse(localStorage.getItem("ppla_correct_answers") || "{}"));
      setIncorrectList(JSON.parse(localStorage.getItem("ppla_incorrect_answers") || "{}"));
      setBookmarks(JSON.parse(localStorage.getItem("ppla_bookmarks") || "{}"));
    };

    loadLocalData();

    window.addEventListener("storage", loadLocalData);
    return () => {
      window.removeEventListener("storage", loadLocalData);
    };
  }, []);

  // Filtered list of questions
  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      // Category filter
      if (selectedCategory !== "ALL" && q.category_code !== selectedCategory) {
        return false;
      }
      // Status filter
      if (statusFilter === "BOOKMARKED" && !bookmarks[q.id]) {
        return false;
      }
      if (statusFilter === "INCORRECT" && !incorrectList[q.id]) {
        return false;
      }
      if (statusFilter === "UNRESOLVED" && (correctList[q.id] || incorrectList[q.id])) {
        return false;
      }
      return true;
    });
  }, [questions, selectedCategory, statusFilter, bookmarks, correctList, incorrectList]);

  // Current Question object
  const currentQuestion = useMemo(() => {
    if (filteredQuestions.length === 0 || currentIdx >= filteredQuestions.length) {
      return null;
    }
    return filteredQuestions[currentIdx];
  }, [filteredQuestions, currentIdx]);

  // Reset index when filters change
  useEffect(() => {
    setCurrentIdx(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
  }, [selectedCategory, statusFilter]);

  // Shuffle options when current question changes
  useEffect(() => {
    if (currentQuestion) {
      const allOpts = [currentQuestion.correct_answer, ...currentQuestion.incorrect_answers];
      setShuffledOptions(shuffleArray(allOpts));
      setSelectedAnswer(null);
      setIsAnswered(false);
    }
  }, [currentQuestion]);

  const handleSelectOption = (option: string) => {
    if (isAnswered || !currentQuestion) return;

    setSelectedAnswer(option);
    setIsAnswered(true);

    const isCorrect = option === currentQuestion.correct_answer;
    
    // Update local storage and component states
    if (isCorrect) {
      const newCorrect = { ...correctList, [currentQuestion.id]: true };
      const newIncorrect = { ...incorrectList };
      delete newIncorrect[currentQuestion.id];

      setCorrectList(newCorrect);
      setIncorrectList(newIncorrect);

      localStorage.setItem("ppla_correct_answers", JSON.stringify(newCorrect));
      localStorage.setItem("ppla_incorrect_answers", JSON.stringify(newIncorrect));
    } else {
      const newIncorrect = { ...incorrectList, [currentQuestion.id]: true };
      const newCorrect = { ...correctList };
      delete newCorrect[currentQuestion.id];

      setCorrectList(newCorrect);
      setIncorrectList(newIncorrect);

      localStorage.setItem("ppla_correct_answers", JSON.stringify(newCorrect));
      localStorage.setItem("ppla_incorrect_answers", JSON.stringify(newIncorrect));
    }
  };

  const toggleBookmark = () => {
    if (!currentQuestion) return;

    const isBookmarked = !bookmarks[currentQuestion.id];
    const newBookmarks = { ...bookmarks, [currentQuestion.id]: isBookmarked };
    setBookmarks(newBookmarks);
    localStorage.setItem("ppla_bookmarks", JSON.stringify(newBookmarks));
  };

  const handleNext = () => {
    if (currentIdx < filteredQuestions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
    }
  };

  const handleJumpToQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(jumpInput);
    if (!isNaN(num) && num >= 1 && num <= filteredQuestions.length) {
      setCurrentIdx(num - 1);
      setJumpInput("");
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh", flexDirection: "column", gap: "16px" }}>
        <div style={{ width: "40px", height: "40px", borderRadius: "50%", border: "3px solid rgba(16, 185, 129, 0.15)", borderTopColor: "var(--glow-green)", animation: "spin 1s linear infinite" }} />
        <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>INICJOWANIE BAZY DANYCH...</span>
        <style jsx global>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header controls panel */}
      <section className="glass-panel" style={{ padding: "20px", display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "center" }}>
          {/* Category selection */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>PRZEDMIOT</label>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="btn-cockpit"
              style={{ background: "var(--bg-color)", border: "1px solid var(--border-color)", padding: "8px 12px", outline: "none" }}
            >
              {Object.entries(CATEGORY_NAMES).map(([code, name]) => (
                <option key={code} value={code}>
                  {code === "ALL" ? "" : `${code} - `}{name}
                </option>
              ))}
            </select>
          </div>

          {/* Status selection */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>FILTR STATUSU</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="btn-cockpit"
              style={{ background: "var(--bg-color)", border: "1px solid var(--border-color)", padding: "8px 12px", outline: "none" }}
            >
              <option value="ALL">Wszystkie pytania</option>
              <option value="BOOKMARKED">Tylko zakładki</option>
              <option value="INCORRECT">Tylko błędne odpowiedzi</option>
              <option value="UNRESOLVED">Tylko nierozwiązane</option>
            </select>
          </div>
        </div>

        {/* Jump to question form */}
        {filteredQuestions.length > 0 && (
          <form onSubmit={handleJumpToQuestion} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
              SKOCZ DO PYTANIA (1 - {filteredQuestions.length})
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="number"
                min="1"
                max={filteredQuestions.length}
                value={jumpInput}
                onChange={e => setJumpInput(e.target.value)}
                placeholder="Nr..."
                style={{
                  width: "80px",
                  background: "var(--bg-color)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-primary)",
                  padding: "8px",
                  borderRadius: "6px",
                  outline: "none",
                  textAlign: "center"
                }}
              />
              <button type="submit" className="btn-cockpit">OK</button>
            </div>
          </form>
        )}
      </section>

      {/* Main Study Arena */}
      {currentQuestion ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* Question HUD */}
          <div className="glass-panel" style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span className="glow-text-green" style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", marginRight: "12px" }}>
                {currentQuestion.category_code}
              </span>
              <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                {currentQuestion.category_name}
              </span>
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <span style={{ fontSize: "0.9rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                Pytanie {currentIdx + 1} z {filteredQuestions.length}
              </span>
              <button 
                onClick={toggleBookmark} 
                className="btn-cockpit"
                style={{ 
                  padding: "6px 12px", 
                  borderColor: bookmarks[currentQuestion.id] ? "rgba(245, 158, 11, 0.4)" : "var(--border-color)",
                  background: bookmarks[currentQuestion.id] ? "rgba(245, 158, 11, 0.08)" : "transparent"
                }}
              >
                <Bookmark 
                  style={{ 
                    width: "18px", 
                    height: "18px", 
                    color: bookmarks[currentQuestion.id] ? "var(--glow-amber)" : "var(--text-secondary)",
                    fill: bookmarks[currentQuestion.id] ? "var(--glow-amber)" : "none"
                  }} 
                />
              </button>
            </div>
          </div>

          {/* Question Card */}
          <div className="glass-panel glass-panel-active" style={{ padding: "32px", display: "flex", flexDirection: "column", gap: "28px" }}>
            {/* Question Text */}
            <div style={{ fontSize: "1.25rem", fontWeight: 600, lineHeight: 1.5, color: "var(--text-primary)" }}>
              {currentQuestion.question}
            </div>

            {/* Options list */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {shuffledOptions.map((option, oIdx) => {
                const isSelected = selectedAnswer === option;
                const isCorrect = option === currentQuestion.correct_answer;
                
                let optionStyle: React.CSSProperties = {
                  padding: "16px 20px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color)",
                  background: "rgba(255,255,255,0.02)",
                  color: "var(--text-primary)",
                  textAlign: "left",
                  fontSize: "1rem",
                  cursor: isAnswered ? "default" : "pointer",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  width: "100%",
                };

                if (!isAnswered) {
                  // Hover effects handled inline via state/event hooks in component below
                } else {
                  if (isCorrect) {
                    optionStyle.borderColor = "var(--glow-green)";
                    optionStyle.background = "rgba(16, 185, 129, 0.15)";
                    optionStyle.color = "var(--glow-green)";
                    optionStyle.boxShadow = "0 0 10px rgba(16, 185, 129, 0.15)";
                  } else if (isSelected) {
                    optionStyle.borderColor = "var(--glow-red)";
                    optionStyle.background = "rgba(239, 68, 68, 0.15)";
                    optionStyle.color = "var(--glow-red)";
                    optionStyle.boxShadow = "0 0 10px rgba(239, 68, 68, 0.15)";
                  } else {
                    optionStyle.opacity = 0.4;
                  }
                }

                return (
                  <button
                    key={oIdx}
                    onClick={() => handleSelectOption(option)}
                    disabled={isAnswered}
                    style={optionStyle}
                    className={!isAnswered ? "study-option-btn" : ""}
                  >
                    <span>{option}</span>
                    {isAnswered && (
                      <span style={{ flexShrink: 0 }}>
                        {isCorrect ? (
                          <Check style={{ color: "var(--glow-green)", width: "20px", height: "20px" }} />
                        ) : isSelected ? (
                          <X style={{ color: "var(--glow-red)", width: "20px", height: "20px" }} />
                        ) : null}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation Controls */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button onClick={handlePrev} disabled={currentIdx === 0} className="btn-cockpit" style={{ opacity: currentIdx === 0 ? 0.4 : 1 }}>
              <ChevronLeft style={{ width: "20px", height: "20px" }} /> Poprzednie
            </button>
            
            {isAnswered && (
              <button 
                onClick={() => {
                  setSelectedAnswer(null);
                  setIsAnswered(false);
                  setShuffledOptions(shuffleArray([currentQuestion.correct_answer, ...currentQuestion.incorrect_answers]));
                }} 
                className="btn-cockpit"
              >
                <RotateCcw style={{ width: "16px", height: "16px" }} /> Spróbuj Ponownie
              </button>
            )}

            <button 
              onClick={handleNext} 
              disabled={currentIdx === filteredQuestions.length - 1} 
              className="btn-cockpit"
              style={{ opacity: currentIdx === filteredQuestions.length - 1 ? 0.4 : 1 }}
            >
              Następne <ChevronRight style={{ width: "20px", height: "20px" }} />
            </button>
          </div>

          <style jsx global>{`
            .study-option-btn:hover {
              background: rgba(255, 255, 255, 0.05) !important;
              border-color: rgba(16, 185, 129, 0.4) !important;
              transform: translateX(4px);
              box-shadow: 0 0 10px rgba(16, 185, 129, 0.1);
            }
          `}</style>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: "40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
          <Award style={{ width: "48px", height: "48px", color: "var(--glow-amber)" }} />
          <div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: "8px" }}>Brak pytań do wyświetlenia</h3>
            <p style={{ color: "var(--text-secondary)" }}>
              Nie znaleźliśmy pytań spełniających wybrane kryteria przedmiotu i statusu.
            </p>
          </div>
          <button 
            className="btn-cockpit btn-cockpit-green"
            onClick={() => {
              setSelectedCategory("ALL");
              setStatusFilter("UNRESOLVED");
            }}
          >
            Resetuj filtry wyszukiwania
          </button>
        </div>
      )}
    </div>
  );
}
