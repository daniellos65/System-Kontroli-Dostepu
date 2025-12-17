import qrcode
import uuid
import os
from database import get_db_connection

# Ścieżka, gdzie będziemy zapisywać obrazki
# (Wychodzimy z 'src' do folderu 'qr_codes' w backendzie)
QR_FOLDER = os.path.join(os.path.dirname(__file__), '..', 'qr_codes')

def generate_qr_codes_for_all():
    conn = get_db_connection()
    if not conn:
        print("Brak połączenia z bazą.")
        return

    try:
        cur = conn.cursor()
        
        # 1. Pobieramy wszystkich pracowników
        cur.execute("SELECT employee_id, first_name, last_name FROM Employees;")
        employees = cur.fetchall()

        if not os.path.exists(QR_FOLDER):
            os.makedirs(QR_FOLDER)
            print(f"Utworzono folder na kody: {QR_FOLDER}")

        print(f"Rozpoczynam generowanie kodów dla {len(employees)} pracowników...")

        for emp in employees:
            # Obsługa różnicy między słownikiem a krotką (zależnie od ustawień database.py)
            if isinstance(emp, dict):
                emp_id = emp['employee_id']
                name = f"{emp['first_name']}_{emp['last_name']}"
            else:
                emp_id = emp[0]
                name = f"{emp[1]}_{emp[2]}"

            # 2. Generujemy unikalny ciąg UUID dla pracownika
            unique_code = str(uuid.uuid4())

            # 3. Aktualizujemy bazę danych
            # Zapisujemy ten kod w tabeli, żeby system wiedział, że ten kod = ten pracownik
            cur.execute("""
                UPDATE Employees 
                SET qr_code_uuid = %s 
                WHERE employee_id = %s;
            """, (unique_code, emp_id))

            # 4. Generujemy obrazek QR
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=4,
            )
            qr.add_data(unique_code)
            qr.make(fit=True)

            img = qr.make_image(fill_color="black", back_color="white")
            
            # 5. Zapisujemy plik na dysku
            filename = f"{emp_id}_{name}_qr.png"
            file_path = os.path.join(QR_FOLDER, filename)
            img.save(file_path)

            print(f" Wygenerowano QR dla: {name} -> {filename}")

        conn.commit()
        cur.close()
        print("Zakończono! Wszystkie kody są w folderze backend/qr_codes/")

    except Exception as e:
        print(f"Błąd: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    generate_qr_codes_for_all()