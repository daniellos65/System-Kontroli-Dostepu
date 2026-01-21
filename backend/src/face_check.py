import cv2
import face_recognition
import os

tolerance = 0.6

def load_reference_encoding(image_path):
    """
    Wczytuje zdjęcie z dysku i zwraca cyfrowy opis twarzy
    Automatycznie skaluje duże obrazy aby uniknąć problemów z pamięcią
    """
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Plik {image_path} nie istnieje.")
    
    try:
        print(f"[FACE_ENCODING] Wczytywanie zdjęcia: {image_path}")
        
        # Wczytaj obraz
        image = face_recognition.load_image_file(image_path)
        original_shape = image.shape
        print(f"[FACE_ENCODING] Rozmiar obrazu: {original_shape}")
        
        # Jeśli obraz jest zbyt duży, zmniejsz go
        max_dimension = 1200
        if image.shape[0] > max_dimension or image.shape[1] > max_dimension:
            print(f"[FACE_ENCODING] Obraz za duży, skalowanie...")
            scale = max_dimension / max(image.shape[0], image.shape[1])
            new_width = int(image.shape[1] * scale)
            new_height = int(image.shape[0] * scale)
            
            # Skalowanie przy użyciu cv2
            image_bgr = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
            image_bgr_resized = cv2.resize(image_bgr, (new_width, new_height), interpolation=cv2.INTER_AREA)
            image = cv2.cvtColor(image_bgr_resized, cv2.COLOR_BGR2RGB)
            print(f"[FACE_ENCODING] Nowy rozmiar: {image.shape}")
        
        # Szukaj twarzy
        encodings = face_recognition.face_encodings(image)

        if len(encodings) == 0:
            raise ValueError("Nie znaleziono twarzy na zdjęciu referencyjnym.")
        
        print(f"[FACE_ENCODING] Znaleziono {len(encodings)} twarz(y), zwracam pierwszą")
        return encodings[0]
        
    except Exception as e:
        print(f"[FACE_ENCODING ERROR] {str(e)}")
        raise RuntimeError(f"Błąd podczas przetwarzania zdjęcia referencyjnego: {e}")
    
def check_face(frame, known_encoding):
    """
    Sprawdza, czy twarz na podanej klatce pasuje do znanego opisu twarzy
    Zwraca True, jeśli to ta sama osoba
    
    Używa modelu 'hog' zamiast 'cnn' dla stabilności na macOS
    """
    if known_encoding is None:
        return False

    try:
        small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
        rgb_small_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)

        # model='hog' - szybszy, bardziej stabilny na macOS, bez multiprocessingu
        face_locations = face_recognition.face_locations(rgb_small_frame, model='hog')
        face_encodings = face_recognition.face_encodings(rgb_small_frame, face_locations)

        for face_encoding in face_encodings:
            matches = face_recognition.compare_faces([known_encoding], face_encoding, tolerance)
            if True in matches:
                return True
        return False
    except Exception as e:
        print(f"[FACE_CHECK ERROR] {str(e)}")
        raise RuntimeError(f"Błąd podczas sprawdzania twarzy: {e}")
    
