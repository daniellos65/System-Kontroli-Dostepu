-- Opis: Struktura bazy danych dla systemu kontroli wejść

-- 1. Tabela administratorów
CREATE TABLE Administrators (
    admin_id SERIAL PRIMARY KEY,
    login VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela użytkowników
CREATE TABLE Employees (  
    employee_id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    
    -- dane do weryfikacji
    photo_ref TEXT,  -- nazwa pliku ze zdjęciem
    qr_code_uuid VARCHAR(100) UNIQUE NOT NULL, -- UUID kodu QR   
    qr_expiry TIMESTAMP NOT NULL -- data wygaśnięcia kodu QR
);

-- 3. Tabela rejestracji wejść
CREATE TABLE EntryLogs (
    log_id SERIAL PRIMARY KEY,
    access_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    entry_status VARCHAR(10) CHECK (entry_status IN ('SUCCESSFUL', 'DENIED')) NOT NULL,
    employee_id_fk INT REFERENCES Employees(employee_id) ON DELETE SET NULL
    photo_snapshot TEXT, -- nazwa pliku ze zdjęciem z wejścia
    rejection_reason VARCHAR(255) -- powdód odrzucenia wejścia
);


-- Indeksy dla szybszego wyszukiwania w panelu admina
CREATE INDEX idx_qr_kod ON pracownicy(qr_kod_uuid);
CREATE INDEX idx_logi_data ON logi_wejsc(data_czas);