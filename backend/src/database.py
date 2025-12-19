import psycopg2
from psycopg2.extras import RealDictCursor
import os

# Konfiguracja bazy (na razie na sztywno, docelowo w pliku .env)
DB_CONFIG = {
    "dbname": "system_kontroli_dostepu",    # Nazwa bazy danych
    "user": "postgres",      # <--- ZMIEŃ NA SWÓJ LOGIN (wynik komendy `whoami`)
    "password": "",            
    "host": "localhost",
    "port": "5432"
}

def get_db_connection():
    """
    Nawiązuje połączenie z bazą danych PostgreSQL i zwraca obiekt połączenia.
    Używa RealDictCursor, aby wyniki zapytań były zwracane jako słowniki.
    """
    try:
        connection = psycopg2.connect(**DB_CONFIG, cursor_factory=RealDictCursor)
        return connection
    except Exception as e:
        print(f"Błąd podczas łączenia z bazą danych: {e}")
        return None
    

# Funkcja pomocnicza do pobierania prancownika po kodzie QR
def find_employee_by_qr_code(qr_code):
    """
    Wyszukuje pracownika w bazie danych na podstawie kodu QR.
    Zwraca słownik z danymi pracownika lub None, jeśli nie znaleziono.
    """
    connection = get_db_connection()
    if connection is None:
        return None

    try:
        with connection.cursor() as cursor:
            query = "SELECT * FROM employees WHERE qr_code = %s"
            cursor.execute(query, (qr_code,))
            employee = cursor.fetchone() # Zwraca słownik lub None
            return employee
    except Exception as e:
        print(f"Błąd podczas wyszukiwania pracownika: {e}")
        return None
    finally:
        connection.close()


def log_entry_to_db(employee_id, status, snapshot_filename, reason=None):
    """
    Zapisuje zdarzenie wejścia do bazy danych.
    status: 'SUCCESSFUL' lub 'DENIED'
    """
    conn = get_db_connection()
    if not conn:
        print("Nie udalo sie zapisac logu - brak polaczenia.")
        return

    try:
        cur = conn.cursor()
        query = """
            INSERT INTO EntryLogs (entry_status, employee_id_fk, photo_snapshot, rejection_reason)
            VALUES (%s, %s, %s, %s)
        """
        cur.execute(query, (status, employee_id, snapshot_filename, reason))
        conn.commit()
        cur.close()
        print(f"[DB LOG] Zapisano log: {status} dla pracownika ID={employee_id}")
    except Exception as e:
        print(f"[DB ERROR] Blad zapisu logu: {e}")
        conn.rollback()
    finally:
        conn.close()