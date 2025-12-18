import cv2
import face_recognition
import os

tolerance = 0.6

def load_reference_encoding(image_path):
    """
    Wczytuje zdjęcie z dysku i zwraca cyfrowy opis twarzy
    """
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Plik {image_path} nie istnieje.")
    
    try:
        image = face_recognition.load_image_file(image_path)
        encodings = face_recognition.face_encodings(image)

        if len(encodings) == 0:
            raise ValueError("Nie znaleziono twarzy na zdjęciu referencyjnym.")
        return encodings[0]
    except Exception as e:
        raise RuntimeError(f"Błąd podczas przetwarzania zdjęcia referencyjnego: {e}")
    
def check_face(frame, known_encoding):
    """
    Sprawdza, czy twarz na podanej klatce pasuje do znanego opisu twarzy
    Zwraca True, jeśli to ta sama osoba
    """
    if known_encoding is None:
        return False

    try:
        small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
        rgb_small_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)

        # Szukaj twarzy na klatce
        face_locations = face_recognition.face_locations(rgb_small_frame)
        face_encodings = face_recognition.face_encodings(rgb_small_frame, face_locations)

        for face_encoding in face_encodings:
            matches = face_recognition.compare_faces([known_encoding], face_encoding, tolerance)
            if True in matches:
                return True
        return False
    except Exception as e:
        raise RuntimeError(f"Błąd podczas sprawdzania twarzy: {e}")
    
