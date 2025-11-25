# 🏭 System Kontroli Wejść (IO 2025)

> **SecureAccess AI** – System Dwuetapowej Kontroli Dostępu z Wykorzystaniem Biometrii Twarzy i Kodów QR.

## 📋 O Projekcie

Celem projektu jest stworzenie systemu kontroli dostępu do fabryki, który skutecznie eliminuje nadużycia polegające na przekazywaniu kart dostępowych między pracownikami (tzw. *buddy punching*). System integruje dwa mechanizmy weryfikacji:

1. **Skanowanie kodu QR** (przepustka pracownicza).
2. **Biometryczna analiza twarzy** (weryfikacja tożsamości).

System rejestruje próby wejścia, zarządza bazą pracowników i generuje raporty dla działu kadr.

### Kluczowe Wymagania (KPI)

* ⏱️ **Czas weryfikacji:** < 5 sekund.
* 🎯 **Trafność rozpoznawania:** > 90%.
* 📹 **Sprzęt:** Obsługa standardowych kamer USB.
* 👥 **Skala:** Min. 20 pracowników w bazie.

## 🛠️ Technologie

| Obszar | Technologia | Uzasadnienie |
| :--- | :--- | :--- |
| **Backend / AI** | Python 3.x | Biblioteki `OpenCV`, `face_recognition` do szybkiego prototypowania CV. |
| **Frontend** | React.js | Nowoczesny panel administratora (SPA). |
| **Baza Danych** | PostgreSQL | Bezpieczeństwo danych relacyjnych i logów. |
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

(wstępna struktura, do zmiany)
System opiera się na 3 głównych encjach:
1. **Pracownik:** `id`, `imie`, `nazwisko`, `zdjecie_ref`, `qr_uuid`, `termin_waznosci`.
2. **LogWejscia:** `id`, `timestamp`, `status`, `zdjecie_proby`, `powod_odrzucenia`.
3. **Administrator:** `login`, `hash_hasla`.

## 👥 Zespół Projektowy

| Imię i Nazwisko | Rola Główna | Kompetencje Kluczowe |
| :--- | :--- | :--- |
| **Bartosz Łyczak** | Database Architect / Fullstack | PostgreSQL, React, Python |
| **Wiktor Banek** | Backend / Hardware Integration | Python, Integracja sprzętowa |
| **Daniel Kubiela** | Computer Vision / Frontend Support | OpenCV, React, Python |

## 📄 Licencja

Projekt realizowany w ramach przedmiotu Inżynieria Oprogramowania 2025.
