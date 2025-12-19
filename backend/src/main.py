import cv2
import time
import os
import unicodedata
from datetime import datetime

# Import modułów bazy danych i logiki
from database import get_db_connection, log_entry_to_db
import face_check
import qr_check_live

# --- KONFIGURACJA ŚCIEŻEK ---
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(CURRENT_DIR) # Wychodzimy z src do backend
UPLOADS_DIR = os.path.join(BACKEND_DIR, 'uploads', 'references')

# Folder na zdjęcia z logów
LOGS_DIR = os.path.join(BACKEND_DIR, 'uploads', 'logs')
if not os.path.exists(LOGS_DIR):
    os.makedirs(LOGS_DIR)

# --- KONFIGURACJA PARAMETRÓW ---
TIMEOUT_FACE_CHECK = 10   # Czas na rozpoznanie twarzy (sekundy)
TRANSITION_DELAY = 3.0    # Czas na przygotowanie się po QR (sekundy)
RESULT_DISPLAY_TIME = 3.0 # Czas wyświetlania komunikatu końcowego (sekundy)

def remove_accents(input_str):
    if not input_str:
        return ""
    nfkd_form = unicodedata.normalize('NFKD', input_str)
    return "".join([c for c in nfkd_form if not unicodedata.combining(c)])

def run_system():
    video_capture = cv2.VideoCapture(0)
    qr_detector = cv2.QRCodeDetector()

    app_state = 'SCAN QR'  
    
    current_employee = None          
    current_employee_encoding = None 
    state_start_time = 0             
    
    # --- FLAGA ZABEZPIECZAJĄCA PRZED DUBLOWANIEM ---
    data_logged = False 

    feedback_message = "Zeskanuj kod QR"
    feedback_color = (255, 255, 255)

    print("System uruchomiony. Oczekiwanie na QR...")

    while True:
        ret, frame = video_capture.read()
        if not ret:
            print("Błąd kamery")
            break

        current_time = time.time()

        # ==========================================
        # 1. STAN: OCZEKIWANIE NA KOD QR
        # ==========================================
        if app_state == 'SCAN QR':
            feedback_message = "Zeskanuj kod QR"
            feedback_color = (255, 255, 255)

            value, points, _ = qr_detector.detectAndDecode(frame)

            if value:
                if points is not None:
                    points = points[0].astype(int)
                    cv2.polylines(frame, [points], True, (0, 255, 0), 3)

                print(f"[QR] Zeskanowano: {value}")
                
                employee_data, status = qr_check_live.check_qr_in_db(value)

                if employee_data:
                    print(f"[DB] Znaleziono: {employee_data['name']}")
                    photo_path = os.path.join(UPLOADS_DIR, employee_data['photo_ref'])
                    
                    try:
                        encoding = face_check.load_reference_encoding(photo_path)
                        
                        if encoding is not None:
                            current_employee = employee_data
                            current_employee_encoding = encoding
                            app_state = 'PREPARING'
                            state_start_time = current_time
                        else:
                            feedback_message = "Blad zdjecia ref w bazie"
                            feedback_color = (0, 0, 255)
                    except Exception as e:
                        print(f"[ERROR] {e}")
                        feedback_message = "Blad systemu"
                else:
                    feedback_message = f"Blad: {remove_accents(status)}"
                    feedback_color = (0, 0, 255)

        # ==========================================
        # 2. STAN: PRZYGOTOWANIE
        # ==========================================
        elif app_state == 'PREPARING':
            elapsed = current_time - state_start_time
            time_left = TRANSITION_DELAY - elapsed
            feedback_message = f"KOD QR poprawny! Spojrz w kamere za {int(time_left)+1}..."
            feedback_color = (255, 255, 0)

            if time_left <= 0:
                app_state = 'SCAN FACE'
                state_start_time = current_time
                print("[SYSTEM] Rozpoczynam skanowanie twarzy...")

        # ==========================================
        # 3. STAN: SKANOWANIE TWARZY
        # ==========================================
        elif app_state == 'SCAN FACE':
            time_left = TIMEOUT_FACE_CHECK - (current_time - state_start_time)
            feedback_message = f"Weryfikacja... ({int(time_left)}s)"
            feedback_color = (0, 255, 255)

            is_match = face_check.check_face(frame, current_employee_encoding)
            
            if is_match:
                app_state = 'ACCESS GRANTED'
                state_start_time = current_time
                print("[FACE] Twarz rozpoznana!")
            
            elif time_left <= 0:
                app_state = 'ACCESS DENIED'
                state_start_time = current_time
                print("[FACE] Timeout/Brak zgodności.")

        # ==========================================
        # 4. STAN: DOSTĘP PRZYZNANY
        # ==========================================
        elif app_state == 'ACCESS GRANTED':
            feedback_message = f"Witaj {remove_accents(current_employee['name'])}"
            feedback_color = (0, 255, 0)

            # --- ZAPIS JEDNOKROTNY ---
            if not data_logged:
                try:
                    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
                    filename = f"ok_{current_employee['id']}_{timestamp_str}.jpg"
                    save_path = os.path.join(LOGS_DIR, filename)
                    
                    cv2.imwrite(save_path, frame)
                    log_entry_to_db(current_employee['id'], 'SUCCESSFUL', filename, None)
                    
                    # Blokujemy ponowny zapis
                    data_logged = True 
                    print("[SYSTEM] Log sukcesu zapisany.")
                except Exception as e:
                    print(f"[LOG ERROR] {e}")

            if current_time - state_start_time > RESULT_DISPLAY_TIME:
                app_state = 'SCAN QR'
                current_employee = None
                current_employee_encoding = None
                data_logged = False # Reset flagi

        # ==========================================
        # 5. STAN: DOSTĘP ODRZUCONY
        # ==========================================
        elif app_state == 'ACCESS DENIED':
            feedback_message = "ODMOWA: Twarz niezgodna!"
            feedback_color = (0, 0, 255)

            # --- ZAPIS JEDNOKROTNY ---
            if not data_logged:
                try:
                    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
                    filename = f"denied_{current_employee['id']}_{timestamp_str}.jpg"
                    save_path = os.path.join(LOGS_DIR, filename)
                    
                    cv2.imwrite(save_path, frame)
                    log_entry_to_db(current_employee['id'], 'DENIED', filename, "Face verification failed")
                    
                    # Blokujemy ponowny zapis
                    data_logged = True
                    print("[SYSTEM] Log odmowy zapisany.")
                except Exception as e:
                    print(f"[LOG ERROR] {e}")

            if current_time - state_start_time > RESULT_DISPLAY_TIME:
                app_state = 'SCAN QR'
                current_employee = None
                current_employee_encoding = None
                data_logged = False # Reset flagi

        # ==========================================
        # RYSOWANIE I WYJŚCIE
        # ==========================================
        cv2.rectangle(frame, (0, 0), (frame.shape[1], 50), (0, 0, 0), -1)
        cv2.putText(frame, feedback_message, (10, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.8, feedback_color, 2)
        
        cv2.imshow('System Kontroli Dostepu', frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    video_capture.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    run_system()