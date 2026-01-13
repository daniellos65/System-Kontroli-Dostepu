"""
API Server dla systemu kontroli dostępu
Obsługuje logowanie administratorów
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.security import check_password_hash
from database import get_db_connection
import os
import sys

# Dodaj katalog parent do path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

app = Flask(__name__)
CORS(app)


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


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'ok'}), 200


if __name__ == '__main__':
    # Uruchamianie serwera na porcie 5000
    app.run(debug=True, host='0.0.0.0', port=5000)
