"""
API Server dla systemu kontroli dostępu
Obsługuje logowanie administratorów i weryfikację tożsamości
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.security import check_password_hash
from database import get_db_connection, log_entry_to_db
import qr_check_live
import face_check
import os
import sys
import base64
import cv2
import numpy as np
from datetime import datetime

# Dodaj katalog parent do path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

app = Flask(__name__)
CORS(app)

# --- KONFIGURACJA ŚCIEŻEK ---
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(CURRENT_DIR)
UPLOADS_DIR = os.path.join(BACKEND_DIR, 'uploads', 'references')
LOGS_DIR = os.path.join(BACKEND_DIR, 'uploads', 'logs')

if not os.path.exists(LOGS_DIR):
    os.makedirs(LOGS_DIR)


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
        
        try:
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
            print(f"[FACE CHECK ERROR] {e}")
            return jsonify({'message': f'Błąd weryfikacji twarzy: {str(e)}'}), 500
    
    except Exception as e:
        print(f"[ERROR] {e}")
        return jsonify({'message': 'Błąd serwera'}), 500


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'ok'}), 200


if __name__ == '__main__':
    # Uruchamianie serwera na porcie 5000
    app.run(debug=True, host='0.0.0.0', port=5000)
