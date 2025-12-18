import cv2
import time
import unicodedata
from database import get_db_connection
from datetime import datetime, date, time as dt_time

# Funkcja pomocnicza do usuwania polskich znaków 
def remove_accents(input_str):
    if not input_str:
        return ""
    nfkd_form = unicodedata.normalize('NFKD', input_str)
    return "".join([c for c in nfkd_form if not unicodedata.combining(c)])

def check_qr_in_db(qr_uuid):
    conn = get_db_connection()
    if not conn:
        return None, "Brak polaczenia z baza." # Bez polskich znaków

    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT first_name, last_name, qr_valid_until, photo_ref
            FROM Employees
            WHERE qr_code_uuid = %s
        """, (qr_uuid,))
        
        result = cur.fetchone()
        
        if not result:
            return None, "Kod QR nieznany."

        # Rozpakowanie wyniku
        if isinstance(result, dict):
            first_name = result['first_name']
            last_name = result['last_name']
            valid_until = result['qr_valid_until']
            photo_ref = result['photo_ref']
        else:
            first_name = result[0]
            last_name = result[1]
            valid_until = result[2]
            photo_ref = result[3]

        # Logika daty
        if isinstance(valid_until, str):
            try: valid_until = datetime.strptime(valid_until, "%Y-%m-%d %H:%M:%S")
            except: pass 

        if isinstance(valid_until, date) and not isinstance(valid_until, datetime):
            valid_until = datetime.combine(valid_until, dt_time.max)

        if valid_until < datetime.now():
            return None, "Kod QR wygasl"
        
        employee_data = {
            "name": f"{first_name} {last_name}",
            "photo_ref": photo_ref
        }

        return employee_data, "Dostep przyznany" # Bez polskich znaków
    
    except Exception as e:
        print(f"DEBUG Error: {e}") # Logowanie błędu do konsoli
        return None, "Blad systemu."
    
    finally:
        # Zawsze zamykamy połączenie, nawet przy błędzie
        if cur: cur.close()
        if conn: conn.close()


