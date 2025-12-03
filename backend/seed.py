from src.database import get_db_connection
import datetime

def add_test_employee():
    connection = get_db_connection()
    if connection is None:
        return
    
    users = [
        ("1","Wiktor", "Banek", "wiktor.jpg", "WB_qr"),
        ("2","Daniel", "Kubiela", "daniel.jpg", "DK_qr"),
        ("3","Bartosz", "Łyczak", "bartosz.jpg", "BL_qr"),
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

if __name__ == "__main__":
    add_test_employee() 