import cv2

def test_camera(camera_index=0):
    cap = cv2.VideoCapture(camera_index)
    if not cap.isOpened():
        print(f"Nie można otworzyć kamery")
        return

    print(f"Kamera została pomyślnie otwarta.")

    while True:
        ret, frame = cap.read()

        if not ret:
            print("Nie można odczytać klatki z kamery.")
            break

        cv2.imshow('Kamera Test', frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    test_camera()