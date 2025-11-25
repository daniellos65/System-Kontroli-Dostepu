# 🏭 System Kontroli Wejść (IO 2025)

> **SecureAccess AI** – System Dwuetapowej Kontroli Dostępu z Wykorzystaniem Biometrii Twarzy i Kodów QR.

## 📋 O Projekcie

Celem projektu jest stworzenie systemu kontroli dostępu do fabryki, który skutecznie eliminuje nadużycia polegające na przekazywaniu kart dostępowych między pracownikami (tzw. *buddy punching*). System integruje dwa mechanizmy weryfikacji:

1. **Skanowanie kodu QR** (przepustka pracownicza).
2. **Biometryczna analiza twarzy** (weryfikacja tożsamości).

[cite_start]System rejestruje próby wejścia, zarządza bazą pracowników i generuje raporty dla działu kadr[cite: 9].

### Kluczowe Wymagania (KPI)

* [cite_start]⏱️ **Czas weryfikacji:** < 5 sekund[cite: 4, 9].
* [cite_start]🎯 **Trafność rozpoznawania:** > 90%[cite: 4, 9].
* [cite_start]📹 **Sprzęt:** Obsługa standardowych kamer USB[cite: 4, 9].
* 👥 **Skala:** Min. [cite_start]20 pracowników w bazie[cite: 4].

## 🛠️ Technologie

| Obszar | Technologia | Uzasadnienie |
| :--- | :--- | :--- |
| **Backend / AI** | Python 3.x | [cite_start]Biblioteki `OpenCV`, `face_recognition` do szybkiego prototypowania CV[cite: 2, 15]. |
| **Frontend** | React.js | [cite_start]Nowoczesny panel administratora (SPA)[cite: 2, 19]. |
| **Baza Danych** | PostgreSQL | [cite_start]Bezpieczeństwo danych relacyjnych i logów[cite: 2, 17]. |
| **Konteneryzacja** | Docker | Łatwe uruchomienie środowiska (opcjonalnie). |



## ⚙️ Instalacja i Uruchomienie

### Wymagania wstępne

* Python 3.8+
* Node.js & npm
* PostgreSQL

### 1. Backend (Python)

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

### 2. Frontend (React)

```bash
cd frontend
npm install
npm start
```

### 3. Baza Danych

*(Tutaj dodać instrukcję importu schematu bazy danych lub polecenie docker-compose)*

## 📂 Struktura Bazy Danych

[cite_start]System opiera się na 3 głównych encjach[cite: 6]:
1. **Pracownik:** `id`, `imie`, `nazwisko`, `zdjecie_ref`, `qr_uuid`, `termin_waznosci`.
2. **LogWejscia:** `id`, `timestamp`, `status`, `zdjecie_proby`, `powod_odrzucenia`.
3. **Administrator:** `login`, `hash_hasla`.

## 👥 Zespół Projektowy

| Imię i Nazwisko | Rola Główna | Kompetencje Kluczowe |
| :--- | :--- | :--- |
| **Bartosz Łyczak** | Database Architect / Fullstack | [cite_start]PostgreSQL, React, Python [cite: 2] |
| **Wiktor Banek** | Backend / Hardware Integration | [cite_start]Python, Integracja sprzętowa [cite: 2] |
| **Daniel Kubiela** | Computer Vision / Frontend Support | [cite_start]OpenCV, React, Python [cite: 2] |

## 📄 Licencja

Projekt realizowany w ramach przedmiotu Inżynieria Oprogramowania 2025.
