"""
API Server dla systemu kontroli dostępu
Obsługuje logowanie administratorów i weryfikację tożsamości
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.security import check_password_hash
from database import get_db_connection, log_entry_to_db
import qr_check_live
import face_check
import qr_generator
import os
import sys
import base64
import cv2
import numpy as np
from datetime import datetime, timedelta
from werkzeug.utils import secure_filename
import uuid

# Dodaj katalog parent do path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

app = Flask(__name__)

# Eksplicita konfiguracja CORS - zezwal na DELETE i images!
CORS(app, 
     resources={
         r"/api/*": {
             "origins": "*",
             "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
             "allow_headers": ["Content-Type", "Authorization"]
         },
         r"/uploads/*": {
             "origins": "*",
             "methods": ["GET", "OPTIONS"],
             "allow_headers": ["Content-Type"]
         }
     })

# Log all incoming requests
@app.before_request
def log_request():
    print(f"\n[REQUEST] {request.method} {request.path}")

# --- KONFIGURACJA ŚCIEŻEK ---
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(CURRENT_DIR)
UPLOADS_DIR = os.path.join(BACKEND_DIR, 'uploads', 'references')
LOGS_DIR = os.path.join(BACKEND_DIR, 'uploads', 'logs')
QR_CODES_DIR = os.path.join(BACKEND_DIR, 'qr_codes')

if not os.path.exists(LOGS_DIR):
    os.makedirs(LOGS_DIR)
if not os.path.exists(UPLOADS_DIR):
    os.makedirs(UPLOADS_DIR)
if not os.path.exists(QR_CODES_DIR):
    os.makedirs(QR_CODES_DIR)

# Dozwolone rozszerzenia plików
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    """
    Endpoint do logowania administratora
    Oczekuje JSON z polami: login, password
    """
    try:
        data = request.get_json()
        
        if not data or not data.get('login') or not data.get('password'):
            return jsonify({'message': 'Login i hasło są wymagane'}), 400
        
        login = data.get('login')
        password = data.get('password')
        
        # Pobranie administratora z bazy
        connection = get_db_connection()
        if not connection:
            return jsonify({'message': 'Błąd połączenia z bazą danych'}), 500
        
        try:
            with connection.cursor() as cursor:
                query = "SELECT admin_id, login, password_hash FROM Administrators WHERE login = %s"
                cursor.execute(query, (login,))
                admin = cursor.fetchone()
            
            if not admin:
                return jsonify({'message': 'Nieprawidłowe dane logowania'}), 401
            
            # Sprawdzenie hasła
            if not check_password_hash(admin['password_hash'], password):
                return jsonify({'message': 'Nieprawidłowe dane logowania'}), 401
            
            # Logowanie udane
            return jsonify({
                'message': 'Logowanie udane',
                'admin_id': admin['admin_id'],
                'login': admin['login'],
                'token': f"admin_{admin['admin_id']}"  # Prosty token, można go rozszerzyć
            }), 200
            
        finally:
            connection.close()
    
    except Exception as e:
        print(f"[ERROR] {e}")
        return jsonify({'message': 'Błąd serwera'}), 500


@app.route('/api/verify/qr', methods=['POST'])
def verify_qr():
    """
    Endpoint do weryfikacji kodu QR
    Oczekuje JSON z polem: qr_code
    Zwraca dane pracownika jeśli QR jest prawidłowy
    """
    try:
        data = request.get_json()
        
        if not data or not data.get('qr_code'):
            return jsonify({'message': 'Kod QR jest wymagany'}), 400
        
        qr_code = data.get('qr_code')
        
        # Sprawdzenie kodu QR w bazie
        employee_data, status = qr_check_live.check_qr_in_db(qr_code)
        
        if employee_data:
            return jsonify({
                'success': True,
                'message': 'Kod QR prawidłowy',
                'employee_id': employee_data['id'],
                'employee_name': employee_data['name'],
                'photo_ref': employee_data['photo_ref']
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': status
            }), 401
    
    except Exception as e:
        print(f"[ERROR] {e}")
        return jsonify({'message': 'Błąd serwera'}), 500


@app.route('/api/verify/face', methods=['POST'])
def verify_face():
    """
    Endpoint do weryfikacji twarzy
    Oczekuje: image_base64, employee_id, photo_ref
    """
    try:
        data = request.get_json()
        
        if not data or not data.get('image_base64') or not data.get('photo_ref'):
            return jsonify({'message': 'Brakuje wymaganych pól'}), 400
        
        image_base64 = data.get('image_base64')
        employee_id = data.get('employee_id')
        employee_name = data.get('employee_name', 'Unknown')
        photo_ref = data.get('photo_ref')
        
        # Dekodowanie obrazu
        image_data = base64.b64decode(image_base64.split(',')[1] if ',' in image_base64 else image_base64)
        np_arr = np.frombuffer(image_data, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        
        if frame is None:
            return jsonify({'message': 'Błąd dekodowania obrazu'}), 400
        
        # Wczytanie referencyjnego kodowania twarzy
        photo_path = os.path.join(UPLOADS_DIR, photo_ref)
        
        print(f"[FACE_CHECK] Szukam zdjęcia w: {photo_path}")
        
        try:
            if not os.path.exists(photo_path):
                print(f"[FACE_CHECK ERROR] Plik nie istnieje: {photo_path}")
                return jsonify({'message': f'Plik zdjęcia nie znaleziony: {photo_ref}'}), 400
            
            reference_encoding = face_check.load_reference_encoding(photo_path)
            
            # Sprawdzenie twarzy na przesłanym obrazie
            is_match = face_check.check_face(frame, reference_encoding)
            
            if is_match:
                # Zapisanie logu do bazy
                timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"ok_{employee_id}_{timestamp_str}.jpg"
                save_path = os.path.join(LOGS_DIR, filename)
                
                cv2.imwrite(save_path, frame)
                log_entry_to_db(employee_id, 'SUCCESSFUL', filename, None)
                
                return jsonify({
                    'success': True,
                    'message': f'Witaj {employee_name}! Dostęp przyznany.',
                    'access': 'GRANTED'
                }), 200
            else:
                # Zapisanie logu odmowy
                timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"denied_{employee_id}_{timestamp_str}.jpg"
                save_path = os.path.join(LOGS_DIR, filename)
                
                cv2.imwrite(save_path, frame)
                log_entry_to_db(employee_id, 'DENIED', filename, "Face verification failed")
                
                return jsonify({
                    'success': False,
                    'message': 'Twarz niezgodna! Dostęp odmówiony.',
                    'access': 'DENIED'
                }), 401
        
        except Exception as e:
            print(f"[FACE CHECK ERROR] {str(e)}")
            error_msg = str(e)
            
            # Lepsze komunikaty błędów
            if "nie znaleziono twarzy" in error_msg.lower() or "face_encodings" in error_msg.lower():
                return jsonify({
                    'success': False,
                    'message': 'Nie znaleziono twarzy na zdjęciu referencyjnym. Spróbuj ponownie z lepszą oświetleniem.',
                    'access': 'DENIED'
                }), 401
            
            return jsonify({'message': f'Błąd weryfikacji twarzy: {error_msg}'}), 500
    
    except Exception as e:
        print(f"[ERROR] {e}")
        return jsonify({'message': 'Błąd serwera'}), 500


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'ok'}), 200


@app.route('/api/admin/logs', methods=['GET'])
def get_logs():
    """
    Endpoint do pobierania wszystkich logów wejść z bazy danych
    Zwraca listę logów posortowaną od najnowszych
    Includes: log_id, entry_status, employee_id, employee_name, photo_snapshot, rejection_reason, access_time
    """
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({'message': 'Błąd połączenia z bazą danych'}), 500
        
        with connection.cursor() as cursor:
            # Pobierz wszystkie logi wraz z danymi pracowników
            query = """
                SELECT 
                    l.log_id,
                    l.entry_status,
                    l.employee_id_fk,
                    COALESCE(e.first_name || ' ' || e.last_name, 'Unknown') as employee_name,
                    e.photo_ref,
                    l.photo_snapshot,
                    l.rejection_reason,
                    l.access_time
                FROM EntryLogs l
                LEFT JOIN Employees e ON l.employee_id_fk = e.employee_id
                ORDER BY l.access_time DESC
            """
            cursor.execute(query)
            db_logs = cursor.fetchall()
        
        connection.close()
        
        # Konwertuj na listę słowników dla JSON
        logs = []
        for log in db_logs:
            logs.append({
                'log_id': log['log_id'],
                'status': 'ok' if log['entry_status'] == 'SUCCESSFUL' else 'denied',
                'user_id': log['employee_id_fk'],
                'employee_name': log['employee_name'],
                'photo_ref': log['photo_ref'],
                'filename': log['photo_snapshot'],
                'timestamp': log['access_time'].strftime('%Y%m%d_%H%M%S') if log['access_time'] else None,
                'rejection_reason': log['rejection_reason']
            })
        
        return jsonify({'logs': logs}), 200
    
    except Exception as e:
        print(f"[ERROR] {e}")
        return jsonify({'message': 'Błąd serwera'}), 500


@app.route('/uploads/logs/<filename>', methods=['GET'])
def serve_log_photo(filename):
    """
    Serwuje zdjęcie z logów
    """
    try:
        # Walidacja nazwy pliku (bezpieczeństwo)
        if '..' in filename or '/' in filename:
            return jsonify({'message': 'Nieprawidłowa nazwa pliku'}), 400
        
        file_path = os.path.join(LOGS_DIR, filename)
        
        if not os.path.exists(file_path):
            return jsonify({'message': 'Plik nie znaleziony'}), 404
        
        return send_file(file_path, mimetype='image/jpeg')
    
    except Exception as e:
        print(f"[ERROR] {e}")
        return jsonify({'message': 'Błąd serwera'}), 500


@app.route('/uploads/references/<filename>', methods=['GET'])
def serve_employee_photo(filename):
    """
    Serwuje zdjęcie pracownika
    """
    try:
        # Walidacja nazwy pliku (bezpieczeństwo)
        if '..' in filename or '/' in filename:
            return jsonify({'message': 'Nieprawidłowa nazwa pliku'}), 400
        
        file_path = os.path.join(UPLOADS_DIR, filename)
        
        if not os.path.exists(file_path):
            return jsonify({'message': 'Plik nie znaleziony'}), 404
        
        return send_file(file_path, mimetype='image/jpeg')
    
    except Exception as e:
        print(f"[ERROR] {e}")
        return jsonify({'message': 'Błąd serwera'}), 500


@app.route('/api/admin/employees/<int:employee_id>/qr', methods=['GET'])
def download_employee_qr(employee_id):
    """
    Pobiera kod QR dla pracownika
    Zwraca plik PNG z kodem QR
    """
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({'message': 'Błąd połączenia z bazą danych'}), 500
        
        try:
            with connection.cursor() as cursor:
                # Pobranie danych pracownika
                query = "SELECT first_name, last_name FROM Employees WHERE employee_id = %s"
                cursor.execute(query, (employee_id,))
                employee = cursor.fetchone()
                
                if not employee:
                    return jsonify({'message': 'Pracownik nie znaleziony'}), 404
            
            # Szukanie pliku QR
            first_name = employee['first_name']
            last_name = employee['last_name']
            filename = f"{employee_id}_{first_name}_{last_name}_qr.png"
            file_path = os.path.join(QR_CODES_DIR, filename)
            
            if not os.path.exists(file_path):
                return jsonify({'message': 'Kod QR nie znaleziony'}), 404
            
            # Zwrócenie pliku do pobrania
            return send_file(
                file_path,
                mimetype='image/png',
                as_attachment=True,
                download_name=filename
            )
        
        finally:
            connection.close()
    
    except Exception as e:
        print(f"[ERROR] Błąd podczas pobierania QR: {e}")
        return jsonify({'message': 'Błąd serwera'}), 500


# --- ENDPOINTS DO ZARZĄDZANIA PRACOWNIKAMI (ADMIN) ---

@app.route('/api/admin/employees', methods=['GET'])
def get_employees():
    """
    Pobiera listę wszystkich pracowników (wymagany token admina)
    """
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({'message': 'Błąd połączenia z bazą danych'}), 500
        
        try:
            with connection.cursor() as cursor:
                query = "SELECT employee_id, first_name, last_name, photo_ref, qr_code_uuid FROM Employees ORDER BY first_name, last_name"
                cursor.execute(query)
                employees = cursor.fetchall()
            
            return jsonify({
                'success': True,
                'employees': employees
            }), 200
        finally:
            connection.close()
    
    except Exception as e:
        print(f"[ERROR] {e}")
        return jsonify({'message': 'Błąd serwera'}), 500


@app.route('/api/admin/employees', methods=['POST'])
def add_employee():
    """
    Dodaje nowego pracownika z zdjęciem i generuje kod QR
    Oczekuje: first_name, last_name, photo (plik)
    """
    try:
        # Sprawdzenie wymaganych pól
        if 'first_name' not in request.form or 'last_name' not in request.form:
            return jsonify({'message': 'Imię i nazwisko są wymagane'}), 400
        
        if 'photo' not in request.files:
            return jsonify({'message': 'Zdjęcie jest wymagane'}), 400
        
        first_name = request.form.get('first_name').strip()
        last_name = request.form.get('last_name').strip()
        photo = request.files.get('photo')
        
        if not first_name or not last_name:
            return jsonify({'message': 'Imię i nazwisko nie mogą być puste'}), 400
        
        if photo.filename == '':
            return jsonify({'message': 'Nie wybrano pliku'}), 400
        
        if not allowed_file(photo.filename):
            return jsonify({'message': 'Niedozwolony format pliku. Dozwolone: png, jpg, jpeg, gif'}), 400
        
        # Generowanie unikalnego kodu UUID
        qr_code_uuid = str(uuid.uuid4())
        qr_valid_until = datetime.now() + timedelta(days=365)  # QR ważny przez rok
        
        connection = get_db_connection()
        if not connection:
            return jsonify({'message': 'Błąd połączenia z bazą danych'}), 500
        
        try:
            with connection.cursor() as cursor:
                # 1. Dodanie pracownika do bazy
                # Najpierw tworzymy nazwę pliku foto
                ext = photo.filename.rsplit('.', 1)[1].lower()
                
                # Pobieramy employee_id jaki będzie dla tego pracownika
                # W tym celu najpierw musimy wstawić rekord
                qr_code_uuid = str(uuid.uuid4())
                qr_valid_until = datetime.now() + timedelta(days=365)  # QR ważny przez rok
                
                query = """
                    INSERT INTO Employees (first_name, last_name, photo_ref, qr_code_uuid, qr_valid_until)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING employee_id
                """
                cursor.execute(query, (first_name, last_name, 'temp', qr_code_uuid, qr_valid_until))
                employee_id = cursor.fetchone()['employee_id']
                
                # Teraz generujemy właściwą nazwę pliku
                photo_filename = f"{employee_id}_{last_name}.{ext}"
                
                # Aktualizujemy photo_ref w bazie
                update_query = "UPDATE Employees SET photo_ref = %s WHERE employee_id = %s"
                cursor.execute(update_query, (photo_filename, employee_id))
                connection.commit()
                
                # 2. Zapis zdjęcia do folderu
                photo_path = os.path.join(UPLOADS_DIR, photo_filename)
                photo.save(photo_path)
                print(f"[UPLOAD] Zdjęcie pracownika {employee_id} ({first_name} {last_name}) zapisane jako: {photo_filename}")
                
                # Zmniejsz zdjęcie jeśli jest za duże (OptimizUj dla face_recognition)
                try:
                    img = cv2.imread(photo_path)
                    if img is not None:
                        height, width = img.shape[:2]
                        if height > 1200 or width > 1200:
                            print(f"[UPLOAD] Zdjęcie za duże ({height}x{width}), zmniejszam...")
                            scale = 1200 / max(height, width)
                            new_width = int(width * scale)
                            new_height = int(height * scale)
                            img_resized = cv2.resize(img, (new_width, new_height), interpolation=cv2.INTER_AREA)
                            cv2.imwrite(photo_path, img_resized, [cv2.IMWRITE_JPEG_QUALITY, 90])
                            print(f"[UPLOAD] Zdjęcie zmniejszone do {new_height}x{new_width}")
                except Exception as e:
                    print(f"[UPLOAD WARNING] Nie udało się zmniejszyć zdjęcia: {e}")
                
                # 3. Generowanie kodu QR dla nowego pracownika
                qr_generator.generate_qr_for_employee(employee_id, first_name, last_name, qr_code_uuid)
                
                return jsonify({
                    'success': True,
                    'message': f'Pracownik {first_name} {last_name} został dodany',
                    'employee_id': employee_id,
                    'qr_code_uuid': qr_code_uuid,
                    'photo_ref': photo_filename
                }), 201
        
        except Exception as e:
            connection.rollback()
            print(f"[ERROR] Błąd podczas dodawania pracownika: {e}")
            return jsonify({'message': f'Błąd podczas dodawania pracownika: {str(e)}'}), 500
        finally:
            connection.close()
    
    except Exception as e:
        print(f"[ERROR] {e}")
        return jsonify({'message': 'Błąd serwera'}), 500


@app.route('/api/admin/employees/<int:employee_id>', methods=['DELETE'])
def delete_employee(employee_id):
    """
    Usuwa pracownika i jego kod QR
    """
    print(f"\n[DELETE REQUEST] Deleting employee_id={employee_id}")
    
    try:
        connection = get_db_connection()
        if not connection:
            print(f"[DELETE ERROR] Cannot connect to database")
            return jsonify({'message': 'Błąd połączenia z bazą danych'}), 500
        
        try:
            with connection.cursor() as cursor:
                # 1. Pobranie informacji o pracowniku
                query = "SELECT photo_ref, first_name, last_name FROM Employees WHERE employee_id = %s"
                print(f"[DELETE] Executing SELECT query")
                cursor.execute(query, (employee_id,))
                employee = cursor.fetchone()
                
                if not employee:
                    print(f"[DELETE ERROR] Employee {employee_id} not found")
                    return jsonify({'message': 'Pracownik nie znaleziony'}), 404
                
                print(f"[DELETE] Found employee: {employee['first_name']} {employee['last_name']}")
                
                # 2. Usuwanie pracownika z bazy
                delete_query = "DELETE FROM Employees WHERE employee_id = %s"
                print(f"[DELETE] Executing DELETE query")
                cursor.execute(delete_query, (employee_id,))
                connection.commit()
                print(f"[DELETE] Employee removed from database")
                
                # 3. Usuwanie zdjęcia
                if employee['photo_ref']:
                    photo_path = os.path.join(UPLOADS_DIR, employee['photo_ref'])
                    print(f"[DELETE] Checking photo at: {photo_path}")
                    if os.path.exists(photo_path):
                        os.remove(photo_path)
                        print(f"[DELETE] Photo deleted")
                    else:
                        print(f"[DELETE WARNING] Photo not found")
                
                # 4. Usuwanie kodu QR
                print(f"[DELETE] Deleting QR code")
                qr_generator.delete_qr_for_employee(employee_id, employee['first_name'], employee['last_name'])
                
                print(f"[DELETE SUCCESS] Employee completely deleted")
                return jsonify({
                    'success': True,
                    'message': f'Pracownik {employee["first_name"]} {employee["last_name"]} został usunięty'
                }), 200
        
        except Exception as e:
            connection.rollback()
            print(f"[DELETE ERROR] Exception: {e}", exc_info=True)
            return jsonify({'message': f'Błąd podczas usuwania pracownika: {str(e)}'}), 500
        finally:
            connection.close()
    
    except Exception as e:
        print(f"[ERROR] {e}")
        return jsonify({'message': 'Błąd serwera'}), 500


@app.route('/api/admin/employees/<int:employee_id>', methods=['PUT'])
def update_employee(employee_id):
    """
    Aktualizuje dane pracownika (imię, nazwisko, zdjęcie)
    Jeśli zmienia się zdjęcie, usuwany jest stary QR i generowany nowy
    """
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({'message': 'Błąd połączenia z bazą danych'}), 500
        
        try:
            with connection.cursor() as cursor:
                # Sprawdzenie czy pracownik istnieje
                query = "SELECT photo_ref, first_name, last_name, qr_code_uuid FROM Employees WHERE employee_id = %s"
                cursor.execute(query, (employee_id,))
                employee = cursor.fetchone()
                
                if not employee:
                    return jsonify({'message': 'Pracownik nie znaleziony'}), 404
                
                # Przygotowanie do aktualizacji
                update_fields = []
                update_values = []
                photo_changed = False
                
                if 'first_name' in request.form and request.form.get('first_name'):
                    update_fields.append('first_name = %s')
                    update_values.append(request.form.get('first_name'))
                
                if 'last_name' in request.form and request.form.get('last_name'):
                    update_fields.append('last_name = %s')
                    update_values.append(request.form.get('last_name'))
                
                # Obsługa nowego zdjęcia
                if 'photo' in request.files:
                    photo = request.files.get('photo')
                    if photo and photo.filename != '':
                        if not allowed_file(photo.filename):
                            return jsonify({'message': 'Niedozwolony format pliku'}), 400
                        
                        # Usunięcie starego zdjęcia
                        if employee['photo_ref']:
                            old_photo_path = os.path.join(UPLOADS_DIR, employee['photo_ref'])
                            if os.path.exists(old_photo_path):
                                os.remove(old_photo_path)
                        
                        # Zapis nowego zdjęcia
                        ext = photo.filename.rsplit('.', 1)[1].lower()
                        last_name = request.form.get('last_name', '')
                        if not last_name:
                            # Jeśli nie zmieniamy nazwiska, pobierz stare
                            current_query = "SELECT last_name FROM Employees WHERE employee_id = %s"
                            cursor.execute(current_query, (employee_id,))
                            current = cursor.fetchone()
                            last_name = current['last_name'] if current else 'unknown'
                        
                        new_photo_filename = f"{employee_id}_{last_name}.{ext}"
                        new_photo_path = os.path.join(UPLOADS_DIR, new_photo_filename)
                        photo.save(new_photo_path)
                        
                        update_fields.append('photo_ref = %s')
                        update_values.append(new_photo_filename)
                        photo_changed = True
                
                if not update_fields:
                    return jsonify({'message': 'Brak danych do aktualizacji'}), 400
                
                # Wygenerowanie nowego QR jeśli zmieniono zdjęcie
                if photo_changed:
                    # Usuń stary QR
                    qr_generator.delete_qr_for_employee(employee_id, employee['first_name'], employee['last_name'])
                    
                    # Wygeneruj nowy UUID dla QR
                    new_qr_uuid = str(uuid.uuid4())
                    update_fields.append('qr_code_uuid = %s')
                    update_values.append(new_qr_uuid)
                    
                    # Przygotuj nazwy do wygenerowania nowego QR
                    first_name = request.form.get('first_name', employee['first_name'])
                    last_name = request.form.get('last_name', employee['last_name'])
                
                # Wykonanie aktualizacji
                update_values.append(employee_id)
                update_query = f"UPDATE Employees SET {', '.join(update_fields)} WHERE employee_id = %s"
                cursor.execute(update_query, update_values)
                connection.commit()
                
                # Wygeneruj nowy QR jeśli zmieniono zdjęcie
                if photo_changed:
                    first_name = request.form.get('first_name', employee['first_name'])
                    last_name = request.form.get('last_name', employee['last_name'])
                    qr_generator.generate_qr_for_employee(employee_id, first_name, last_name, new_qr_uuid)
                
                return jsonify({
                    'success': True,
                    'message': 'Dane pracownika zostały zaktualizowane'
                }), 200
        
        except Exception as e:
            connection.rollback()
            print(f"[ERROR] Błąd podczas aktualizacji pracownika: {e}")
            return jsonify({'message': f'Błąd: {str(e)}'}), 500
        finally:
            connection.close()
    
    except Exception as e:
        print(f"[ERROR] {e}")
        return jsonify({'message': 'Błąd serwera'}), 500


if __name__ == '__main__':
    # Uruchamianie serwera na porcie 5001
    app.run(debug=True, host='0.0.0.0', port=5001)
