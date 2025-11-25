🏭 System Kontroli Wejść (IO 2025)

SecureAccess AI – System dwuetapowej weryfikacji tożsamości dla obiektów przemysłowych.

📋 O Projekcie

Celem projektu jest stworzenie systemu kontroli dostępu do fabryki, który skutecznie eliminuje nadużycia polegające na przekazywaniu kart dostępowych między pracownikami. System integruje dwa mechanizmy weryfikacji:

Skanowanie kodu QR (przepustka pracownicza).

Biometryczna analiza twarzy (weryfikacja tożsamości).

System rejestruje próby wejścia, zarządza bazą pracowników i generuje raporty dla działu kadr.

Kluczowe Wymagania (KPI)

⏱️ Czas weryfikacji: < 5 sekund.

🎯 Trafność rozpoznawania: > 90%.

📹 Sprzęt: Obsługa standardowych kamer USB.

👥 Skala: Min. 20 pracowników w bazie.

🛠️ Technologie

Obszar

Technologia

Uzasadnienie

Backend / AI

Python 3.x

Biblioteki OpenCV, face_recognition do szybkiego prototypowania CV.

Frontend

React.js

Nowoczesny panel administratora (SPA).

Baza Danych

PostgreSQL

Bezpieczeństwo danych relacyjnych i logów.

Konteneryzacja

Docker (Opcjonalnie)

Łatwe uruchomienie środowiska.



⚙️ Instalacja i Uruchomienie

Wymagania wstępne

Python 3.8+

Node.js & npm

PostgreSQL

1. Backend (Python)

cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py



2. Frontend (React)

cd frontend
npm install
npm start



3. Baza Danych

(Tutaj dodać instrukcję importu schematu bazy danych lub polecenie docker-compose)

📂 Struktura Bazy Danych

(do uzupełnienia)

👥 Zespół Projektowy

Imię i Nazwisko

Rola Główna

Kompetencje Kluczowe

Bartosz Łyczak

Database Architect / Fullstack

PostgreSQL, React, Python

Wiktor Banek

Backend / Hardware Integration

Python, Integracja sprzętowa

Daniel Kubiela

Computer Vision / Frontend Support

OpenCV, React, Python

📄 Licencja

Projekt realizowany w ramach przedmiotu Inżynieria Oprogramowania 2025.
