from src.database import get_db_connection
import datetime
from werkzeug.security import generate_password_hash


def add_test_employee():
    connection = get_db_connection()
    if connection is None:
        return
    
    users = [
        ("1","Wiktor", "Banek", "wiktor.jpg", "WB_qr"),
        ("2","Daniel", "Kubiela", "daniel.jpg", "DK_qr"),
        ("3","Bartosz", "Lyczak", "bartosz.jpg", "BL_qr"),
    ]

    try:
        cursor = connection.cursor()

        # Data wazsnosci na rok
        valid_until = (datetime.datetime.now() + datetime.timedelta(days=365)).date()

        for id, first_name, last_name, photo, qr_code in users:
            cursor.execute(
                """
                INSERT INTO Employees (employee_id, first_name, last_name, photo_ref, qr_code_uuid, qr_valid_until)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (employee_id) DO NOTHING;
                """,
                (id, first_name, last_name, photo, qr_code, valid_until)
            )
        connection.commit()
        print("Dodano pracowników testowych.")

        # Sprawdzenie czy pracownicy zostali dodani
        cursor.execute("SELECT COUNT(*) FROM Employees;")
        count = cursor.fetchone()
        print(f"Liczba pracowników w bazie: {count['count']}")

        cursor.close()

    except Exception as e:
        print(f"Błąd podczas dodawania pracowników testowych: {e}")
    finally:
        connection.close()


def add_test_admin():
    """Dodaje administratora testowego do bazy danych"""
    connection = get_db_connection()
    if connection is None:
        print("Błąd: nie można nawiązać połączenia z bazą danych")
        return
    
    try:
        cursor = connection.cursor()
        
        # Tworzymy hasło dla administratora test/test123
        password_hash = generate_password_hash("test123")
        
        cursor.execute(
            """
            INSERT INTO Administrators (login, password_hash)
            VALUES (%s, %s)
            ON CONFLICT (login) DO NOTHING;
            """,
            ("test", password_hash)
        )
        connection.commit()
        print("Dodano administratora testowego: login='test', hasło='test123'")
        
        cursor.close()
    except Exception as e:
        print(f"Błąd podczas dodawania administratora testowego: {e}")
    finally:
        connection.close()


if __name__ == "__main__":
    add_test_employee()
    add_test_admin()
 