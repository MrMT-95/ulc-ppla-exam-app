"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { Timer, AlertCircle, ArrowLeft, Check, X, Award, ChevronRight, ChevronLeft, Eye, RefreshCw } from "lucide-react";

interface Question {
  id: string;
  number: string;
  category_code: string;
  category_name: string;
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
}

interface ExamConfig {
  id: string;
  name: string;
  code: string;
  questionCount: number;
  timeLimitMinutes: number;
}

const EXAM_CONFIGS: ExamConfig[] = [
  { id: "COMBINED", name: "Pełny Egzamin Łączony (Wszystkie przedmioty)", code: "ALL", questionCount: 120, timeLimitMinutes: 150 },
  { id: "PL010", name: "PL010 - Prawo lotnicze", code: "PL010", questionCount: 20, timeLimitMinutes: 30 },
  { id: "PL020", name: "PL020 - Ogólna wiedza o statku powietrznym", code: "PL020", questionCount: 16, timeLimitMinutes: 25 },
  { id: "PL030", name: "PL030 - Osiągi i planowanie lotu", code: "PL030", questionCount: 12, timeLimitMinutes: 20 },
  { id: "PL040", name: "PL040 - Człowiek – możliwości i ograniczenia", code: "PL040", questionCount: 12, timeLimitMinutes: 20 },
  { id: "PL050", name: "PL050 - Meteorologia", code: "PL050", questionCount: 16, timeLimitMinutes: 25 },
  { id: "PL060", name: "PL060 - Nawigacja", code: "PL060", questionCount: 16, timeLimitMinutes: 25 },
  { id: "PL070", name: "PL070 - Procedury operacyjne", code: "PL070", questionCount: 12, timeLimitMinutes: 20 },
  { id: "PL080", name: "PL080 - Zasady lotu", code: "PL080", questionCount: 16, timeLimitMinutes: 25 },
  { id: "PL090", name: "PL090 - Łączność", code: "PL090", questionCount: 12, timeLimitMinutes: 20 },
  { id: "PL099", name: "PL099 - Ogólne bezpieczeństwo", code: "PL099", questionCount: 15, timeLimitMinutes: 20 },
  { id: "PL100", name: "PL100 - Ogólne bezpieczeństwo lotów", code: "PL100", questionCount: 7, timeLimitMinutes: 10 }
];

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function ExamPage() {
  const [questionsPool, setQuestionsPool] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  // Exam phase: 'SETUP', 'RUNNING', 'FINISHED'
  const [phase, setPhase] = useState<'SETUP' | 'RUNNING' | 'FINISHED'>('SETUP');
  const [selectedConfig, setSelectedConfig] = useState<ExamConfig>(EXAM_CONFIGS[0]);

  // Running Exam State
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({}); // questionId -> selectedOptionText
  const [shuffledOptionsMap, setShuffledOptionsMap] = useState<Record<string, string[]>>({}); // questionId -> options
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Finished Exam State
  const [examResult, setExamResult] = useState({
    score: 0,
    passed: false,
    correctCount: 0,
    totalCount: 0,
    timeTakenSeconds: 0,
    categoryScores: {} as Record<string, { correct: number; total: number }>
  });

  const [reviewFilter, setReviewFilter] = useState<'ALL' | 'INCORRECT'>('ALL');

  // Load questions pool
  useEffect(() => {
    fetch("/data/questions.json")
      .then(res => res.json())
      .then((data: Question[]) => {
        setQuestionsPool(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading questions pool:", err);
        setLoading(false);
      });
  }, []);

  // Timer logic
  useEffect(() => {
    if (phase === 'RUNNING') {
      timerRef.current = setInterval(() => {
        setSecondsRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleSubmitExam(true); // Auto-submit when time runs out
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  // Start Exam handler
  const handleStartExam = () => {
    let selectedQs: Question[] = [];

    if (selectedConfig.id === "COMBINED") {
      // Create a proportional selection of questions from all categories to reach 120
      const categories = Array.from(new Set(questionsPool.map(q => q.category_code)));
      const questionsByCategory: Record<string, Question[]> = {};
      categories.forEach(cat => {
        questionsByCategory[cat] = questionsPool.filter(q => q.category_code === cat);
      });

      // Distribute 120 questions proportionally based on size of category pools
      const targetCount = selectedConfig.questionCount;
      const totalAvailable = questionsPool.length;
      
      let allocatedCount = 0;
      categories.forEach((cat, idx) => {
        const catPool = questionsByCategory[cat];
        let proportion = Math.round((catPool.length / totalAvailable) * targetCount);
        
        // Ensure at least 1 question per category, and round up/down correctly
        if (proportion === 0 && catPool.length > 0) proportion = 1;
        
        // Pick random questions from this category
        const shuffledCat = shuffleArray(catPool).slice(0, proportion);
        selectedQs.push(...shuffledCat);
        allocatedCount += shuffledCat.length;
      });

      // If we are slightly off 120 due to rounding, adjust it
      if (selectedQs.length > targetCount) {
        selectedQs = shuffleArray(selectedQs).slice(0, targetCount);
      } else if (selectedQs.length < targetCount) {
        const remainingTarget = targetCount - selectedQs.length;
        const selectedIds = new Set(selectedQs.map(q => q.id));
        const unselectedQs = questionsPool.filter(q => !selectedIds.has(q.id));
        selectedQs.push(...shuffleArray(unselectedQs).slice(0, remainingTarget));
      }
    } else {
      // Pick random questions from the single selected category
      const catPool = questionsPool.filter(q => q.category_code === selectedConfig.code);
      selectedQs = shuffleArray(catPool).slice(0, selectedConfig.questionCount);
    }

    // Shuffle questions order
    selectedQs = shuffleArray(selectedQs);

    // Build options shuffling map
    const optionsMap: Record<string, string[]> = {};
    selectedQs.forEach(q => {
      optionsMap[q.id] = shuffleArray([q.correct_answer, ...q.incorrect_answers]);
    });

    setExamQuestions(selectedQs);
    setShuffledOptionsMap(optionsMap);
    setUserAnswers({});
    setCurrentIdx(0);
    setSecondsRemaining(selectedConfig.timeLimitMinutes * 60);
    setPhase('RUNNING');
  };

  // Submit Exam handler
  const handleSubmitExam = (force = false) => {
    if (!force && !confirm("Czy na pewno chcesz zakończyć egzamin i wysłać arkusz odpowiedzi?")) {
      return;
    }

    // Compute results
    let correctCount = 0;
    const catScores: Record<string, { correct: number; total: number }> = {};

    examQuestions.forEach(q => {
      const isCorrect = userAnswers[q.id] === q.correct_answer;
      if (isCorrect) correctCount++;

      // Track by category
      if (!catScores[q.category_code]) {
        catScores[q.category_code] = { correct: 0, total: 0 };
      }
      catScores[q.category_code].total++;
      if (isCorrect) {
        catScores[q.category_code].correct++;
      }
    });

    const score = Math.round((correctCount / examQuestions.length) * 1000) / 10; // e.g. 78.5
    const passed = score >= 75.0;
    const timeTaken = (selectedConfig.timeLimitMinutes * 60) - secondsRemaining;

    const result = {
      score,
      passed,
      correctCount,
      totalCount: examQuestions.length,
      timeTakenSeconds: timeTaken,
      categoryScores: catScores
    };

    setExamResult(result);

    // Save to localStorage history
    const history = JSON.parse(localStorage.getItem("ppla_exams_history") || "[]");
    history.push({
      id: `EXAM-${Date.now()}`,
      date: new Date().toLocaleDateString("pl-PL"),
      score,
      passed,
      totalQuestions: examQuestions.length
    });
    localStorage.setItem("ppla_exams_history", JSON.stringify(history));

    // Also update ppla_correct_answers and ppla_incorrect_answers based on exam answers
    // to feed back into user's overall dashboard stats!
    const correctAns = JSON.parse(localStorage.getItem("ppla_correct_answers") || "{}");
    const incorrectAns = JSON.parse(localStorage.getItem("ppla_incorrect_answers") || "{}");

    examQuestions.forEach(q => {
      const selected = userAnswers[q.id];
      if (selected) {
        const isCorrect = selected === q.correct_answer;
        if (isCorrect) {
          correctAns[q.id] = true;
          delete incorrectAns[q.id];
        } else {
          incorrectAns[q.id] = true;
          delete correctAns[q.id];
        }
      }
    });
    localStorage.setItem("ppla_correct_answers", JSON.stringify(correctAns));
    localStorage.setItem("ppla_incorrect_answers", JSON.stringify(incorrectAns));

    setPhase('FINISHED');
  };

  const handleSelectAnswer = (option: string) => {
    const q = examQuestions[currentIdx];
    setUserAnswers(prev => ({
      ...prev,
      [q.id]: option
    }));
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
    }
  };

  const handleNext = () => {
    if (currentIdx < examQuestions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    }
  };

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (num: number) => String(num).padStart(2, '0');

    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  const currentQuestion = examQuestions[currentIdx];
  const answeredCount = Object.keys(userAnswers).length;

  // Filtered list of questions for review phase
  const reviewQuestions = useMemo(() => {
    if (phase !== 'FINISHED') return [];
    return examQuestions.filter(q => {
      if (reviewFilter === 'INCORRECT') {
        return userAnswers[q.id] !== q.correct_answer;
      }
      return true;
    });
  }, [phase, examQuestions, userAnswers, reviewFilter]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh", flexDirection: "column", gap: "16px" }}>
        <div style={{ width: "40px", height: "40px", borderRadius: "50%", border: "3px solid rgba(16, 185, 129, 0.15)", borderTopColor: "var(--glow-green)", animation: "spin 1s linear infinite" }} />
        <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>INICJOWANIE BAZY DANYCH...</span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      
      {/* PHASE 1: SETUP SCREEN */}
      {phase === 'SETUP' && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }}>
          <div className="glass-panel" style={{ padding: "32px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <h1 style={{ fontFamily: "var(--font-outfit), sans-serif", fontSize: "1.75rem", display: "flex", alignItems: "center", gap: "12px" }}>
              <Award className="glow-text-amber" /> Centrum Egzaminacyjne ULC
            </h1>
            <p style={{ color: "var(--text-secondary)" }}>
              Wybierz rodzaj egzaminu, który chcesz zasymulować. Pytania zostaną wylosowane z oficjalnego państwowego banku pytań. Zasady odpowiadają kryteriom egzaminacyjnym.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px" }}>
              <label style={{ fontSize: "0.8rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>ARKUSZ EGZAMINACYJNY</label>
              <select
                value={selectedConfig.id}
                onChange={e => {
                  const cfg = EXAM_CONFIGS.find(c => c.id === e.target.value);
                  if (cfg) setSelectedConfig(cfg);
                }}
                className="btn-cockpit"
                style={{ width: "100%", background: "var(--bg-color)", border: "1px solid var(--border-color)", padding: "12px", outline: "none", fontSize: "1.05rem" }}
              >
                {EXAM_CONFIGS.map(cfg => (
                  <option key={cfg.id} value={cfg.id}>
                    {cfg.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Exam Parameters Hud */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "16px",
                padding: "20px",
                background: "rgba(0,0,0,0.2)",
                borderRadius: "8px",
                border: "1px solid var(--border-color)",
                marginTop: "12px",
                textAlign: "center"
              }}
            >
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>LICZBA PYTAŃ</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "4px" }}>
                  {selectedConfig.questionCount}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>LIMIT CZASU</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--glow-amber)", marginTop: "4px" }}>
                  {selectedConfig.timeLimitMinutes} min
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>PROG ZALICZENIA</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--glow-green)", marginTop: "4px" }}>
                  75 %
                </div>
              </div>
            </div>

            {/* Warnings list */}
            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", background: "rgba(245, 158, 11, 0.05)", border: "1px solid rgba(245, 158, 11, 0.15)", borderRadius: "8px", padding: "16px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              <AlertCircle style={{ color: "var(--glow-amber)", flexShrink: 0 }} />
              <div>
                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>Reguły lotu egzaminacyjnego: </span>
                W trakcie symulacji system nie będzie podawał informacji o prawidłowości wybranych odpowiedzi. Wyniki zostaną przeliczone i ujawnione dopiero po zakończeniu całego testu.
              </div>
            </div>

            <button
              onClick={handleStartExam}
              className="btn-cockpit btn-cockpit-green"
              style={{ padding: "16px", fontSize: "1.1rem", marginTop: "12px", fontWeight: 700 }}
            >
              Uruchom Procedurę Egzaminacyjną (Start)
            </button>
          </div>
        </div>
      )}

      {/* PHASE 2: EXAM RUNNING SCREEN */}
      {phase === 'RUNNING' && currentQuestion && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: "24px" }} className="exam-layout">
          
          {/* Main Question Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            
            {/* Top HUD */}
            <div className="glass-panel" style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span className="glow-text-green" style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", marginRight: "12px" }}>
                  {currentQuestion.category_code}
                </span>
                <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                  {currentQuestion.category_name}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontFamily: "var(--font-mono)", fontSize: "1.1rem" }}>
                <Timer style={{ color: secondsRemaining < 300 ? "var(--glow-red)" : "var(--glow-amber)" }} />
                <span className={secondsRemaining < 300 ? "glow-text-red" : "glow-text-amber"} style={{ fontWeight: 700 }}>
                  {formatTime(secondsRemaining)}
                </span>
              </div>
            </div>

            {/* Question Card */}
            <div className="glass-panel glass-panel-active" style={{ padding: "32px", display: "flex", flexDirection: "column", gap: "28px" }}>
              <div style={{ fontSize: "1.25rem", fontWeight: 600, lineHeight: 1.5, color: "var(--text-primary)" }}>
                {currentQuestion.question}
              </div>

              {/* Options list */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {(shuffledOptionsMap[currentQuestion.id] || []).map((option, oIdx) => {
                  const isSelected = userAnswers[currentQuestion.id] === option;
                  return (
                    <button
                      key={oIdx}
                      onClick={() => handleSelectAnswer(option)}
                      style={{
                        padding: "16px 20px",
                        borderRadius: "8px",
                        border: "1px solid " + (isSelected ? "var(--glow-amber)" : "var(--border-color)"),
                        background: isSelected ? "rgba(245, 158, 11, 0.15)" : "rgba(255,255,255,0.02)",
                        color: isSelected ? "var(--glow-amber)" : "var(--text-primary)",
                        textAlign: "left",
                        fontSize: "1rem",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        boxShadow: isSelected ? "0 0 10px rgba(245, 158, 11, 0.15)" : "none",
                        width: "100%"
                      }}
                      className={!isSelected ? "exam-option-btn" : ""}
                    >
                      <div
                        style={{
                          width: "20px",
                          height: "20px",
                          borderRadius: "50%",
                          border: "2px solid " + (isSelected ? "var(--glow-amber)" : "var(--text-muted)"),
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          flexShrink: 0
                        }}
                      >
                        {isSelected && <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "var(--glow-amber)" }} />}
                      </div>
                      <span>{option}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Next/Prev Nav */}
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button 
                onClick={handlePrev} 
                disabled={currentIdx === 0} 
                className="btn-cockpit" 
                style={{ opacity: currentIdx === 0 ? 0.4 : 1 }}
              >
                <ChevronLeft style={{ width: "20px", height: "20px" }} /> Poprzednie
              </button>
              
              <button 
                onClick={handleNext} 
                disabled={currentIdx === examQuestions.length - 1} 
                className="btn-cockpit"
                style={{ opacity: currentIdx === examQuestions.length - 1 ? 0.4 : 1 }}
              >
                Następne <ChevronRight style={{ width: "20px", height: "20px" }} />
              </button>
            </div>
          </div>

          {/* Right Navigator Grid Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div className="glass-panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ fontSize: "0.85rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)", borderBottom: "1px solid var(--border-color)", paddingBottom: "10px" }}>
                NAV RADAR ({answeredCount} / {examQuestions.length})
              </div>
              
              {/* Question buttons grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", maxHeight: "300px", overflowY: "auto", paddingRight: "4px" }}>
                {examQuestions.map((q, idx) => {
                  const isCurrent = idx === currentIdx;
                  const isAnswered = !!userAnswers[q.id];

                  let btnBg = "rgba(255,255,255,0.02)";
                  let border = "var(--border-color)";
                  let color = "var(--text-secondary)";

                  if (isCurrent) {
                    border = "var(--glow-green)";
                    color = "var(--glow-green)";
                    btnBg = "rgba(16, 185, 129, 0.08)";
                  } else if (isAnswered) {
                    border = "rgba(59, 130, 246, 0.4)";
                    btnBg = "rgba(59, 130, 246, 0.1)";
                    color = "var(--text-primary)";
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentIdx(idx)}
                      style={{
                        height: "40px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 600,
                        fontSize: "0.9rem",
                        borderRadius: "6px",
                        cursor: "pointer",
                        background: btnBg,
                        border: "1px solid " + border,
                        color: color,
                        transition: "all 0.15s ease"
                      }}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => handleSubmitExam(false)}
                className="btn-cockpit btn-cockpit-amber"
                style={{ width: "100%", padding: "12px", fontWeight: 700, marginTop: "10px" }}
              >
                Złóż plan (Zakończ test)
              </button>
            </div>
          </div>

          <style jsx global>{`
            .exam-option-btn:hover {
              background: rgba(255, 255, 255, 0.04) !important;
              border-color: var(--text-muted) !important;
            }
            @media (max-width: 900px) {
              .exam-layout {
                grid-template-columns: 1fr !important;
              }
            }
          `}</style>
        </div>
      )}

      {/* PHASE 3: EXAM FINISHED SCREEN */}
      {phase === 'FINISHED' && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "32px" }}>
          
          {/* Header Summary Panel */}
          <div className="glass-panel" style={{ padding: "32px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "28px", alignItems: "center" }}>
            {/* Score Ring Gauge */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
              <div style={{ position: "relative", width: "160px", height: "160px" }}>
                <svg width="160" height="160">
                  <circle cx="80" cy="80" r="70" stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="transparent" />
                  <circle 
                    cx="80" 
                    cy="80" 
                    r="70" 
                    stroke={examResult.passed ? "var(--glow-green)" : "var(--glow-red)"} 
                    strokeWidth="8" 
                    fill="transparent" 
                    strokeDasharray={2 * Math.PI * 70} 
                    strokeDashoffset={2 * Math.PI * 70 * (1 - examResult.score / 100)}
                    style={{
                      transform: "rotate(-90deg)",
                      transformOrigin: "50% 50%",
                      transition: "stroke-dashoffset 1s ease"
                    }}
                  />
                </svg>
                <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
                  <span style={{ fontSize: "2rem", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                    {examResult.score}%
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                    {examResult.correctCount} / {examResult.totalCount} popr.
                  </span>
                </div>
              </div>

              <div 
                style={{ 
                  fontSize: "1.35rem", 
                  fontWeight: 800, 
                  letterSpacing: "1px",
                  color: examResult.passed ? "var(--glow-green)" : "var(--glow-red)",
                  textShadow: "0 0 10px " + (examResult.passed ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)")
                }}
              >
                {examResult.passed ? "EGZAMIN ZALICZONY" : "EGZAMIN NIEZALICZONY"}
              </div>
            </div>

            {/* Technical data table */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <h2 style={{ fontFamily: "var(--font-outfit), sans-serif", fontSize: "1.35rem" }}>Podsumowanie Wyników</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontFamily: "var(--font-mono)", fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "6px" }}>
                  <span>ARKUSZ:</span>
                  <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{selectedConfig.name}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "6px" }}>
                  <span>CZAS LOTU:</span>
                  <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{formatTime(examResult.timeTakenSeconds)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "6px" }}>
                  <span>BŁĘDNE ODPOWIEDZI:</span>
                  <span style={{ color: "var(--glow-red)", fontWeight: 600 }}>{examResult.totalCount - examResult.correctCount}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>STATUS:</span>
                  <span style={{ color: examResult.passed ? "var(--glow-green)" : "var(--glow-red)", fontWeight: 600 }}>
                    {examResult.passed ? "ZDALNE ZALICZENIE" : "BRAK ZALICZENIA"}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "10px" }}>
                <button onClick={() => setPhase('SETUP')} className="btn-cockpit btn-cockpit-green" style={{ flex: 1 }}>
                  <RefreshCw style={{ width: "16px", height: "16px" }} /> Nowy egzamin
                </button>
                <Link href="/" className="btn-cockpit" style={{ flex: 1 }}>
                  Powrót do Pulpitu
                </Link>
              </div>
            </div>
          </div>

          {/* Subject breakdown (only relevant/interesting if combined, but we can show it for all) */}
          {selectedConfig.id === "COMBINED" && (
            <div className="glass-panel" style={{ padding: "24px" }}>
              <h3 style={{ fontFamily: "var(--font-outfit), sans-serif", fontSize: "1.2rem", marginBottom: "16px" }}>Wyniki według sekcji przedmiotowych</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
                {Object.entries(examResult.categoryScores).map(([catCode, score]) => {
                  const percent = Math.round((score.correct / score.total) * 100);
                  const isPassed = percent >= 75;
                  return (
                    <div 
                      key={catCode} 
                      style={{ 
                        padding: "16px", 
                        background: "rgba(255,255,255,0.01)", 
                        border: "1px solid " + (isPassed ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)"), 
                        borderRadius: "8px" 
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", fontWeight: 600, marginBottom: "8px" }}>
                        <span style={{ fontFamily: "var(--font-mono)" }}>{catCode}</span>
                        <span style={{ color: isPassed ? "var(--glow-green)" : "var(--glow-red)" }}>{percent}%</span>
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "8px" }}>
                        {EXAM_CONFIGS.find(cfg => cfg.code === catCode)?.name.replace(/PL\d+\s*-\s*/, '') || catCode}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                        <span>Pytania:</span>
                        <span>{score.correct} / {score.total}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Flight Review Section (Debriefing Card List) */}
          <div className="glass-panel" style={{ padding: "24px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "12px", borderBottom: "1px solid var(--border-color)", paddingBottom: "16px", marginBottom: "20px" }}>
              <h3 style={{ fontFamily: "var(--font-outfit), sans-serif", fontSize: "1.25rem", display: "flex", alignItems: "center", gap: "8px" }}>
                <Eye /> Debriefing - Analiza Pytań
              </h3>
              
              <div style={{ display: "flex", gap: "8px" }}>
                <button 
                  onClick={() => setReviewFilter('ALL')} 
                  className={"btn-cockpit " + (reviewFilter === 'ALL' ? 'btn-cockpit-green' : '')}
                  style={{ padding: "6px 12px", fontSize: "0.85rem" }}
                >
                  Wszystkie ({examQuestions.length})
                </button>
                <button 
                  onClick={() => setReviewFilter('INCORRECT')} 
                  className={"btn-cockpit " + (reviewFilter === 'INCORRECT' ? 'btn-cockpit-red' : '')}
                  style={{ padding: "6px 12px", fontSize: "0.85rem" }}
                >
                  Tylko błędne ({examQuestions.length - examResult.correctCount})
                </button>
              </div>
            </div>

            {/* List of review questions */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {reviewQuestions.map((q, rIdx) => {
                const userAns = userAnswers[q.id];
                const isCorrect = userAns === q.correct_answer;
                
                return (
                  <div 
                    key={q.id} 
                    style={{ 
                      padding: "20px", 
                      background: "rgba(255,255,255,0.01)", 
                      border: "1px solid " + (isCorrect ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.2)"), 
                      borderRadius: "8px" 
                    }}
                  >
                    {/* Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "8px", fontFamily: "var(--font-mono)" }}>
                      <span>#{rIdx + 1} | ID: {q.id} ({q.category_code})</span>
                      <span style={{ color: isCorrect ? "var(--glow-green)" : "var(--glow-red)", fontWeight: 600 }}>
                        {isCorrect ? "POPRAWNA" : "BŁĘDNA"}
                      </span>
                    </div>

                    {/* Question text */}
                    <div style={{ fontSize: "1.05rem", fontWeight: 600, marginBottom: "12px" }}>
                      {q.question}
                    </div>

                    {/* Answers report */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.95rem" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", color: isCorrect ? "var(--glow-green)" : "var(--glow-red)" }}>
                        {isCorrect ? <Check style={{ flexShrink: 0, marginTop: "2px" }} /> : <X style={{ flexShrink: 0, marginTop: "2px" }} />}
                        <div>
                          <strong>Twoja odpowiedź:</strong> {userAns || <span style={{ fontStyle: "italic", color: "var(--text-muted)" }}>[Brak odpowiedzi]</span>}
                        </div>
                      </div>
                      
                      {!isCorrect && (
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", color: "var(--glow-green)" }}>
                          <Check style={{ flexShrink: 0, marginTop: "2px" }} />
                          <div>
                            <strong>Prawidłowa odpowiedź:</strong> {q.correct_answer}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {reviewQuestions.length === 0 && (
                <div style={{ textAlign: "center", padding: "20px", color: "var(--text-secondary)" }}>
                  Brak pytań do wyświetlenia.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
