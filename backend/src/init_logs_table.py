from database import get_db_connection

def create_logs_table():
    conn = get_db_connection()
    if conn is None:
        print("Błąd: Nie można połączyć się z bazą.")
        return

    try:
        cur = conn.cursor()
        
        # --- ZMIANA: Zmieniono INT na VARCHAR(50) w employee_id_fk ---
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS EntryLogs (
            log_id SERIAL PRIMARY KEY,
            access_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            entry_status VARCHAR(10) CHECK (entry_status IN ('SUCCESSFUL', 'DENIED')) NOT NULL,
            employee_id_fk VARCHAR(50) REFERENCES Employees(employee_id) ON DELETE SET NULL,
            photo_snapshot TEXT,
            rejection_reason VARCHAR(255)
        );
        """
        
        create_index_sql = """
        CREATE INDEX IF NOT EXISTS idx_logi_data ON EntryLogs(access_time);
        """

        cur.execute(create_table_sql)
        cur.execute(create_index_sql)
        
        conn.commit()
        print("SUKCES: Tabela 'EntryLogs' została utworzona poprawnie (z ID typu VARCHAR)!")
        
        cur.close()
    except Exception as e:
        print(f"Błąd podczas tworzenia tabeli: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    create_logs_table()