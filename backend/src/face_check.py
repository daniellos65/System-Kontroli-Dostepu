import cv2
import face_recognition
import os

photo = "./backend/uploads/wiktor.jpg"

def verify_identity():
    if not os.path.exists(photo):
        print("Plik zdjęcia nie istnieje.")
        return False

    # Załaduj zdjęcie referencyjne pracownika
    try:
        reference_image = face_recognition.load_image_file(photo)

        # encoding to "matematyczny opis twarzy" (lista 128 liczb)
        reference_encoding = face_recognition.face_encodings(reference_image)[0]
    except Exception as e:
        print(f"Nie wykryto twarzy na zdjęciu")
        return False

    # Inicjalizuj kamerę
    video_capture = cv2.VideoCapture(0) # 0 to kamera z lapotopa, 
                                        # 1  to zewnętrzna kamera

    while True:
        ret, frame = video_capture.read()
        if not ret:
            print("Nie można odczytać klatki z kamery.")
            break

        # --- OPTYMALIZACJA ---
        # Zmniejszamy klatkę do 1/4 wielkości dla szybszego działania
        small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)

        # Konwertujemy obraz z BGR (OpenCV) na RGB (face_recognition)
        rgb_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)

        # Znajdź twarze na małej klatce
        face_locations = face_recognition.face_locations(rgb_frame)
        face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)

        for face_encoding, face_location in zip(face_encodings, face_locations):
            # Porównanie wykrytej twarzy z referencyjną
            matches = face_recognition.compare_faces([reference_encoding], face_encoding)
            name = "Nieznany"
            color = (0, 0, 255) # Czerwony dla nieznanej twarzy

            if matches[0]:
                name = "Zweryfikowano"
                color = (0, 255, 0) # Zielony dla zweryfikowanej twarzy

                #print("Tożsamość zweryfikowana.")
                #video_capture.release()
                #cv2.destroyAllWindows()
                #return True

            # Rysowanie prostokąta wokół twarzy
            top, right, bottom, left = face_location
            top *= 4
            right *= 4
            bottom *= 4
            left *= 4
        
            cv2.rectangle(frame, (left, top), (right, bottom), color, 2)
            cv2.rectangle(frame, (left, bottom - 35), (right, bottom), color, cv2.FILLED)
            cv2.putText(frame, name, (left + 6, bottom - 6), cv2.FONT_HERSHEY_DUPLEX, 0.8, (255, 255, 255), 1)

        cv2.imshow('Weryfikacja tozsamosci', frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
    
    video_capture.release()
    cv2.destroyAllWindows()
    return False

if __name__ == "__main__":
    verified = verify_identity()

    