#!/usr/bin/env python3
"""
Skrypt do optymalizacji zdjęć pracowników
Zmniejsza duże zdjęcia aby były kompatybilne z face_recognition
"""
import cv2
import os
import sys

def optimize_photo(photo_path):
    """Zmniejsza zdjęcie jeśli jest za duże"""
    if not os.path.exists(photo_path):
        print(f"❌ Plik nie istnieje: {photo_path}")
        return False
    
    img = cv2.imread(photo_path)
    if img is None:
        print(f"❌ Nie udało się wczytać zdjęcia: {photo_path}")
        return False
    
    height, width = img.shape[:2]
    original_size_mb = os.path.getsize(photo_path) / (1024*1024)
    print(f"📷 Oryginalny rozmiar: {height}x{width} ({original_size_mb:.1f} MB)")
    
    if height > 1200 or width > 1200:
        print(f"⚙️  Zmniejszam...")
        scale = 1200 / max(height, width)
        new_width = int(width * scale)
        new_height = int(height * scale)
        
        img_resized = cv2.resize(img, (new_width, new_height), interpolation=cv2.INTER_AREA)
        cv2.imwrite(photo_path, img_resized, [cv2.IMWRITE_JPEG_QUALITY, 90])
        
        new_size_mb = os.path.getsize(photo_path) / (1024*1024)
        print(f"✅ Zdjęcie zmniejszone do: {new_height}x{new_width} ({new_size_mb:.1f} MB)")
        return True
    else:
        print(f"✅ Zdjęcie już ma odpowiedni rozmiar")
        return False

if __name__ == '__main__':
    uploads_dir = '/Users/wiktorbanek/System-Kontroli-Dostepu/backend/uploads/references'
    
    print("Optymalizacja zdjęć pracowników...")
    print(f"Katalog: {uploads_dir}\n")
    
    for filename in os.listdir(uploads_dir):
        if filename.endswith(('.jpg', '.jpeg', '.png', '.gif')):
            photo_path = os.path.join(uploads_dir, filename)
            print(f"\n📁 {filename}")
            optimize_photo(photo_path)
    
    print("\n✅ Gotowe!")
