import cv2
import time
import os
import unicodedata
from database import get_db_connection
from datetime import datetime, date, time as dt_time

# Import Twoich modułów
import face_check
import qr_check_live

# Konfiguracja ścieżek
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(CURRENT_DIR)
UPLOADS_DIR = os.path.join(BACKEND_DIR, 'uploads', 'references')

# Konfiguracja parametrów
TIMEOUT_FACE_CHECK = 10  # sekund
TRANSITION_DELAY = 3.0   # Opóźnienie między QR a Twarzą (sekundy)

# Funkcja pomocnicza do usuwania polskich znaków 
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
    face_check_start_time = 0
    feedback_message = "Zeskanuj kod QR"
    feedback_color = (255, 255, 255)

    print("System uruchomiony. Oczekiwanie na QR...")

    while True:
        ret, frame = video_capture.read()
        if not ret:
            print("Błąd kamery")
            break

        # ------------- Obsługa QR -------------
        if app_state == 'SCAN QR':
            feedback_message = "Zeskanuj kod QR"
            feedback_color = (255, 255, 255)

            value, points, _ = qr_detector.detectAndDecode(frame)

            if value:
                # Rysowanie ramki dookoła QR
                if points is not None:
                    points = points[0].astype(int)
                    cv2.polylines(frame, [points], True, (0, 255, 0), 3)

                print(f"Zeskanowano QR: {value}") # Log dla pewności
                
                # Sprawdzenie w bazie
                employee_data, status = qr_check_live.check_qr_in_db(value)

                if employee_data:
                    print(f"Znaleziono pracownika: {employee_data['name']}")
                    photo_path = os.path.join(UPLOADS_DIR, employee_data['photo_ref'])
                    print(f"Szukam zdjęcia: {photo_path}")

                    try:
                        # Wczytywanie twarzy 
                        encoding = face_check.load_reference_encoding(photo_path)
                        
                        if encoding is not None:
                            current_employee = employee_data
                            current_employee_encoding = encoding

                            # Przełączenie stanu
                            app_state = 'PREPARING'
                            face_check_start_time = time.time()
                            print("QR poprawny, przygotowanie do skanu twarzy...")
                        else:
                            feedback_message = "Błąd zdjęcia w systemie"
                            feedback_color = (0, 0, 255)
                        

                    except Exception as e:
                        print(f"Błąd krytyczny: {e}")
                        feedback_message = "Blad systemu"
                        time.sleep(2)
                else:
                    feedback_message = f"Blad: {remove_accents(status)}"
                    feedback_color = (0, 0, 255)
                     

        # ------------- Przygotowanie do skanowania twarzy -------------
        elif app_state == 'PREPARING':
            elapsed = time.time() - face_check_start_time
            time_left = TRANSITION_DELAY - elapsed

            feedback_message = f"KOD QR poprawny! Spojrz w kamere za {int(time_left)+1}..."
            feedback_color = (255, 255, 0) 

            if time_left <= 0:
                app_state = 'SCAN FACE'
                face_check_start_time = time.time()
                print("Rozpoczynam skanowanie twarzy...")

        # ------------- Obsługa Skanowania twarzy -------------
        elif app_state == 'SCAN FACE':
            time_left = TIMEOUT_FACE_CHECK - (time.time() - face_check_start_time)
            feedback_message = f"Spojrz w kamere... ({int(time_left)}s)"
            feedback_color = (0, 255, 255)

            # Sprawdzenie twarzy 
            is_match = face_check.check_face(frame, current_employee_encoding)
            
            if is_match:
                app_state = 'ACCESS GRANTED'
                face_check_start_time = time.time()
                print("Twarz rozpoznana!")
            
            elif time_left <= 0:
                app_state = 'ACCESS DENIED'
                face_check_start_time = time.time()
                print("Błąd weryfikacji: Twarz niezgodna z QR.")
            
        # ------------- Obsługa Wyników -------------
        elif app_state == 'ACCESS GRANTED':
            feedback_message = f"Witaj {remove_accents(current_employee['name'])}"
            feedback_color = (0, 255, 0)

            if time.time() - face_check_start_time > 3:
                app_state = 'SCAN QR'
                current_employee = None
                current_employee_encoding = None

        elif app_state == 'ACCESS DENIED':
            feedback_message = "BLAD: Twarz niezgodna z kodem QR!"
            feedback_color = (0, 0, 255)

            if time.time() - face_check_start_time > 3:
                app_state = 'SCAN QR'
                current_employee = None
                current_employee_encoding = None

        # Rysowanie interfejsu
        cv2.rectangle(frame, (0, 0), (frame.shape[1], 50), (0, 0, 0), -1)
        cv2.putText(frame, feedback_message, (10, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.8, feedback_color, 2)
        cv2.imshow('System Kontroli Dostepu', frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    video_capture.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    run_system()