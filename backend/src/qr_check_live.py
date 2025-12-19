import cv2
import time
import unicodedata
from database import get_db_connection
from datetime import datetime, date, time as dt_time

def remove_accents(input_str):
    if not input_str:
        return ""
    nfkd_form = unicodedata.normalize('NFKD', input_str)
    return "".join([c for c in nfkd_form if not unicodedata.combining(c)])

def check_qr_in_db(qr_uuid):
    conn = get_db_connection()
    if not conn:
        return None, "Brak polaczenia z baza."

    cur = conn.cursor()

    try:
        # POBIERAMY RÓWNIEŻ employee_id
        cur.execute("""
            SELECT employee_id, first_name, last_name, qr_valid_until, photo_ref
            FROM Employees
            WHERE qr_code_uuid = %s
        """, (qr_uuid,))
        
        result = cur.fetchone()
        
        if not result:
            return None, "Kod QR nieznany."

        # Rozpakowanie wyniku
        if isinstance(result, dict):
            emp_id = result['employee_id']
            first_name = result['first_name']
            last_name = result['last_name']
            valid_until = result['qr_valid_until']
            photo_ref = result['photo_ref']
        else:
            emp_id = result[0]
            first_name = result[1]
            last_name = result[2]
            valid_until = result[3]
            photo_ref = result[4]

        # Logika daty
        if isinstance(valid_until, str):
            try: valid_until = datetime.strptime(valid_until, "%Y-%m-%d %H:%M:%S")
            except: pass 

        if isinstance(valid_until, date) and not isinstance(valid_until, datetime):
            valid_until = datetime.combine(valid_until, dt_time.max)

        if valid_until < datetime.now():
            return None, "Kod QR wygasl"
        
        # ZWRACAMY SŁOWNIK Z ID
        employee_data = {
            "id": emp_id,
            "name": f"{first_name} {last_name}",
            "photo_ref": photo_ref
        }

        return employee_data, "Dostep przyznany"
    
    except Exception as e:
        print(f"DEBUG Error: {e}")
        return None, "Blad systemu."
    
    finally:
        if cur: cur.close()
        if conn: conn.close()