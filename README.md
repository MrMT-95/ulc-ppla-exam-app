# ULC PPLA Flight Deck | Aplikacja do Nauki PPL(A)

A modern, high-fidelity web application designed to help aspiring pilots study for and pass the **Private Pilot License - Aeroplane (PPLA)** theoretical examinations administered by the Polish **Civil Aviation Authority (Urząd Lotnictwa Cywilnego - ULC)**.

---

## 🎯 Główne Funkcje (Core Features)

*   **Pulpit Pilota (Flight Deck Dashboard)**: Zintegrowany panel prezentujący ogólny postęp nauki, statystyki opanowania pytań, wskaźnik zakładek (trudnych pytań) oraz szczegółowe wykresy opanowania 11 przedmiotów egzaminacyjnych ULC.
*   **Tryb Treningu (Study Mode)**:
    *   Filtrowanie pytań według przedmiotu ULC.
    *   Możliwość nauki wyłącznie pytań niepoprawnie rozwiązanych (*Tylko błędne*), dodanych do zakładek (*Tylko zakładki*) lub jeszcze nierozwiązanych (*Nierozwiązane*).
    *   **Dynamiczne mieszanie odpowiedzi**: Ponieważ w bazach ULC poprawna odpowiedź jest zawsze pierwszą opcją, aplikacja automatycznie i losowo miesza warianty (A, B, C, D) przy każdym wyświetleniu pytania.
    *   Natychmiastowa weryfikacja odpowiedzi z neonowym podświetleniem (zielony dla poprawnej, czerwony dla błędnej).
*   **Symulator Egzaminu ULC (Exam Simulator)**:
    *   Symulacja pojedynczych przedmiotów z zachowaniem oficjalnych limitów pytań i czasu LKE/EASA.
    *   **Pełny Egzamin Łączony**: 120 losowych pytań (proporcjonalna mieszanka ze wszystkich przedmiotów) z limitem 150 minut.
    *   HUD z zegarem odliczającym czas, radar nawigacyjny (siatka pytań 1-N).
    *   Brak natychmiastowej weryfikacji – odpowiedzi są blokowane i oceniane dopiero po złożeniu arkusza.
    *   **Debriefing (Analiza Lotu)**: Wykresy zaliczenia (próg 75%), wyniki sekcji i pełny przegląd pytań z oznaczeniem błędów.

---

## 🛠️ Architektura Aplikacji (Zero-Overhead Tech Stack)

*   **Framework**: Next.js 16 (React 19, TypeScript)
*   **Stylizacja**: Custom Vanilla CSS (zmienne CSS, motyw instrumentalny "Cockpit Dark", szklany design/glassmorphism, animacje neonowe).
*   **Baza Danych**: **Statyczny JSON + localStorage**. Baza 2,053 pytań (`questions.json`) jest pobierana jednorazowo przy uruchomieniu aplikacji (rozmiar ~1MB), co gwarantuje 0ms opóźnienia i brak kosztów utrzymania baz danych. Wszystkie statystyki i historia egzaminów są zapisywane w przeglądarce użytkownika.
*   **Ikony**: Lucide React

---

## 📂 Wykaz Przedmiotów ULC (Subject Database)

Baza danych zawiera **2,053 pytania** rozpisane na oficjalne działy ULC:
*   **`PL010`**: Prawo lotnicze (*Air Law*) — 551 pytań
*   **`PL020`**: Ogólna wiedza o statku powietrznym (*Aircraft General Knowledge*) — 230 pytań
*   **`PL030`**: Osiągi i planowanie lotu (*Flight Performance & Planning*) — 54 pytania
*   **`PL040`**: Człowiek – możliwości i ograniczenia (*Human Performance & Limitations*) — 304 pytania
*   **`PL050`**: Meteorologia (*Meteorology*) — 135 pytań
*   **`PL060`**: Nawigacja (*Navigation*) — 182 pytania
*   **`PL070`**: Procedury operacyjne (*Operational Procedures*) — 74 pytania
*   **`PL080`**: Zasady lotu (*Principles of Flight*) — 364 pytania
*   **`PL090`**: Łączność (*Communications*) — 53 pytania
*   **`PL099`**: Ogólne bezpieczeństwo (*General Safety*) — 99 pytań
*   **`PL100`**: Ogólne bezpieczeństwo lotów (*General Flight Safety*) — 7 pytań

---

## 🚀 Uruchomienie Lokalne (Local Setup)

Aby uruchomić aplikację na swoim komputerze:

1.  Upewnij się, że masz zainstalowany **Node.js** (wersja 18 lub nowsza).
2.  Zainstaluj zależności projektu:
    ```bash
    npm install
    ```
3.  Uruchom lokalny serwer deweloperski:
    ```bash
    npm run dev
    ```
4.  Otwórz przeglądarkę i wejdź na: **`http://localhost:3000`**

---

## ⚡ Wdrażanie (Production Deployment)

Aplikacja jest w pełni zoptymalizowana pod wdrożenie na platformie **Vercel** (lub Netlify/GitHub Pages jako statyczny eksport).

Aby przygotować produkcyjną, zoptymalizowaną paczkę, uruchom:
```bash
npm run build
```
Z powodu statycznej natury kodu, wdrożenie na Vercel zajmuje mniej niż minutę i działa na darmowym planie (Hobby) bez żadnych limitów transferu bazodanowego.

---

*Tyle teorii. Powodzenia na egzaminach LKE i tylu lądowań, ile startów! ✈️*
