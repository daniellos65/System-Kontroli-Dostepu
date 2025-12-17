import cv2
import time
import unicodedata
from database import get_db_connection
from datetime import datetime, date, time as dt_time

# Funkcja pomocnicza do usuwania polskich znaków (OpenCV ich nie wyświetla)
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
            SELECT first_name, last_name, qr_valid_until
            FROM Employees
            WHERE qr_code_uuid = %s
        """, (qr_uuid,))
        
        result = cur.fetchone()
        
        if not result:
            return None, "Kod QR nieznany."

        # Rozpakowanie wyniku
        if isinstance(result, dict):
            name = f"{result['first_name']} {result['last_name']}"
            valid_until = result['qr_valid_until']
        else:
            name = f"{result[0]} {result[1]}"
            valid_until = result[2]

        # Logika daty
        if isinstance(valid_until, str):
            try:
                valid_until = datetime.strptime(valid_until, "%Y-%m-%d %H:%M:%S")
            except ValueError:
                # Fallback, jeśli string jest samą datą bez czasu
                try:
                    valid_until = datetime.strptime(valid_until, "%Y-%m-%d").date()
                except ValueError:
                    return name, "Blad formatu daty"

        # Jeśli mamy samą datę (bez godziny), ustawiamy ważność do końca tego dnia
        if isinstance(valid_until, date) and not isinstance(valid_until, datetime):
            valid_until = datetime.combine(valid_until, dt_time.max)

        if valid_until < datetime.now():
            return name, "Kod QR wygasl." # Bez polskich znaków
        
        return name, "Dostep przyznany" # Bez polskich znaków
    
    except Exception as e:
        print(f"DEBUG Error: {e}") # Logowanie błędu do konsoli
        return None, "Blad systemu."
    
    finally:
        # Zawsze zamykamy połączenie, nawet przy błędzie
        if cur: cur.close()
        if conn: conn.close()

def start_scanner():
    cap = cv2.VideoCapture(0)
    detector = cv2.QRCodeDetector() 

    print("Skaner uruchomiony. Naciśnij 'q', aby zakończyć.")

    # Zmienne stanu
    last_db_check_time = 0
    message_display_start_time = 0
    message_duration = 3.0  # Ile sekund wyświetlać komunikat po zeskanowaniu
    
    current_message = "Zeskanuj kod QR"
    message_color = (255, 255, 255) # Biały

    while True:
        ret, frame = cap.read()
        if not ret:
            print("Błąd kamery.")
            break

        value, points, _ = detector.detectAndDecode(frame)

        # Rysowanie ramki wokół kodu QR
        if value and points is not None:
            points = points[0].astype(int)
            # Użycie polylines jest wydajniejsze i czystsze niż pętla z liniami
            cv2.polylines(frame, [points], isClosed=True, color=(0, 255, 0), thickness=3)

            # Sprawdzanie w bazie (nie częściej niż co 2 sekundy)
            if time.time() - last_db_check_time > 2.0:
                last_db_check_time = time.time()
                
                # Pobranie danych
                name, status = check_qr_in_db(value)
                
                # Ustawienie komunikatu
                if name:
                    # Sukces (lub wygasły, ale znaleziony)
                    if "Dostep" in status:
                        current_message = f"Witaj {remove_accents(name)}"
                        message_color = (0, 255, 0) # Zielony
                    else:
                        current_message = f"{status} ({remove_accents(name)})"
                        message_color = (0, 0, 255) # Czerwony
                else:
                    # Kod nie istnieje lub błąd bazy
                    current_message = f"BLAD: {remove_accents(status)}"
                    message_color = (0, 0, 255)

                # Resetujemy czas wyświetlania komunikatu
                message_display_start_time = time.time()
                print(f"Log: {current_message}")

        # Logika wygaszania komunikatu
        # Jeśli minęło więcej niż X sekund od ostatniego komunikatu, przywróć stan domyślny
        if time.time() - message_display_start_time > message_duration:
            current_message = "Zeskanuj kod QR"
            message_color = (255, 255, 255)

        # Rysowanie interfejsu
        cv2.rectangle(frame, (0, 0), (frame.shape[1], 60), (0, 0, 0), -1)
        cv2.putText(frame, current_message, (10, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.8, message_color, 2)

        cv2.imshow('Skaner QR', frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
    
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    start_scanner()