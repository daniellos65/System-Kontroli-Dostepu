import qrcode
import uuid
import os
from database import get_db_connection

# Ścieżka, gdzie będziemy zapisywać obrazki
# (Wychodzimy z 'src' do folderu 'qr_codes' w backendzie)
QR_FOLDER = os.path.join(os.path.dirname(__file__), '..', 'qr_codes')

def generate_qr_for_employee(employee_id, first_name, last_name, qr_code_uuid):
    """
    Generuje kod QR dla JEDNEGO pracownika.
    Używana podczas dodawania nowego pracownika.
    
    Args:
        employee_id: ID pracownika z bazy
        first_name: Imię pracownika
        last_name: Nazwisko pracownika
        qr_code_uuid: UUID/kod do osadzenia w QR
    """
    try:
        if not os.path.exists(QR_FOLDER):
            os.makedirs(QR_FOLDER)
            print(f"Utworzono folder na kody: {QR_FOLDER}")
        
        # Generujemy obrazek QR
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(qr_code_uuid)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")
        
        # Zapisujemy plik na dysku
        name = f"{first_name}_{last_name}"
        filename = f"{employee_id}_{name}_qr.png"
        file_path = os.path.join(QR_FOLDER, filename)
        img.save(file_path)

        print(f"[QR] Wygenerowano kod QR dla {name} (ID: {employee_id}) -> {filename}")
        return True
    
    except Exception as e:
        print(f"[QR ERROR] Błąd podczas generowania QR dla pracownika {employee_id}: {e}")
        return False


def delete_qr_for_employee(employee_id, first_name, last_name):
    """
    Usuwa plik QR dla pracownika.
    Używana podczas usuwania pracownika.
    
    Args:
        employee_id: ID pracownika
        first_name: Imię pracownika
        last_name: Nazwisko pracownika
    """
    try:
        name = f"{first_name}_{last_name}"
        filename = f"{employee_id}_{name}_qr.png"
        file_path = os.path.join(QR_FOLDER, filename)
        
        if os.path.exists(file_path):
            os.remove(file_path)
            print(f"[QR] Usunięto kod QR dla {name}: {file_path}")
            return True
        else:
            print(f"[QR] Plik QR nie istnieje: {file_path}")
            return False
    
    except Exception as e:
        print(f"[QR ERROR] Błąd podczas usuwania QR dla pracownika {employee_id}: {e}")
        return False


def generate_qr_codes_for_all():
    """
    Generuje kody QR dla WSZYSTKICH pracowników.
    Użyteczna przy inicjalizacji systemu, ale NIE powinna być używana 
    za każdym razem - zamiast tego używaj generate_qr_for_employee().
    """
    conn = get_db_connection()
    if not conn:
        print("Brak połączenia z bazą.")
        return

    try:
        cur = conn.cursor()
        
        # 1. Pobieramy wszystkich pracowników
        cur.execute("SELECT employee_id, first_name, last_name, qr_code_uuid FROM Employees;")
        employees = cur.fetchall()

        if not os.path.exists(QR_FOLDER):
            os.makedirs(QR_FOLDER)
            print(f"Utworzono folder na kody: {QR_FOLDER}")

        print(f"Rozpoczynam generowanie kodów dla {len(employees)} pracowników...")

        for emp in employees:
            # Obsługa różnicy między słownikiem a krotką (zależnie od ustawień database.py)
            if isinstance(emp, dict):
                emp_id = emp['employee_id']
                first_name = emp['first_name']
                last_name = emp['last_name']
                qr_code = emp.get('qr_code_uuid')
            else:
                emp_id = emp[0]
                first_name = emp[1]
                last_name = emp[2]
                qr_code = emp[3] if len(emp) > 3 else None

            # Jeśli brak kodu QR, generujemy nowy
            if not qr_code:
                qr_code = str(uuid.uuid4())
                cur.execute("""
                    UPDATE Employees 
                    SET qr_code_uuid = %s 
                    WHERE employee_id = %s;
                """, (qr_code, emp_id))
                print(f" Wygenerowano nowy UUID dla: {first_name}_{last_name}")

            # Generujemy obrazek QR
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=4,
            )
            qr.add_data(qr_code)
            qr.make(fit=True)

            img = qr.make_image(fill_color="black", back_color="white")
            
            # Zapisujemy plik na dysku
            name = f"{first_name}_{last_name}"
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
    # 1. WAŻNE: Zakomentuj tę linię, aby NIE generować wszystkiego od nowa
    generate_qr_codes_for_all()

    # 2. Logika do wygenerowania kodu TYLKO dla Jana Nieaktywnego
    # Szukamy go po UUID, który ustaliliśmy w SQL ('expired-test-uuid')
    # target_uuid = 'expired-test-uuid'
    
    # conn = get_db_connection()
    # if conn:
    #     try:
    #         cur = conn.cursor()
    #         cur.execute("SELECT employee_id, first_name, last_name FROM Employees WHERE qr_code_uuid = %s", (target_uuid,))
    #         result = cur.fetchone()
            
    #         if result:
    #             # Rozpakowanie danych (obsługa słownika lub krotki)
    #             if isinstance(result, dict):
    #                 emp_id = result['employee_id']
    #                 f_name = result['first_name']
    #                 l_name = result['last_name']
    #             else:
    #                 emp_id = result[0]
    #                 f_name = result[1]
    #                 l_name = result[2]

    #             print(f"Znaleziono pracownika: {f_name} {l_name} (ID: {emp_id})")
                
    #             # Wywołujemy funkcję generującą pojedynczy kod
    #             generate_qr_for_employee(emp_id, f_name, l_name, target_uuid)
                
    #         else:
    #             print(f"BŁĄD: Nie znaleziono pracownika z UUID '{target_uuid}'. Upewnij się, że wykonałeś INSERT w bazie.")
        
    #     except Exception as e:
    #         print(f"Wystąpił błąd: {e}")
    #     finally:
    #         conn.close()
   