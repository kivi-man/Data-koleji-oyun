"""
Data Agents - Ana Başlatıcı
Oyunu başlatır ve menü sistemini yönetir
"""

import pygame
import sys
import os
from menu import show_menu, show_settings


def clear_all_saves():
    """Tüm kayıt dosyalarını temizle"""
    for save_file in ["game_save.json", "banyo_save.json"]:
        if os.path.exists(save_file):
            try:
                os.remove(save_file)
                print(f"🗑️ {save_file} silindi")
            except Exception as e:
                print(f"❌ {save_file} silinemedi: {e}")


def load_settings():
    """Ayarları yükle"""
    import json
    if os.path.exists("settings.json"):
        try:
            with open("settings.json", "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"⚠️ Ayarlar yüklenemedi: {e}")
    
    # Varsayılan ayarlar
    return {
        "resolution": [1536, 1024],
        "fullscreen": False,
        "music_volume": 50,
        "sfx_volume": 50
    }


def calculate_best_resolution(fullscreen_mode):
    """
    Tam ekran veya pencere modu için en iyi çözünürlüğü hesapla
    
    Args:
        fullscreen_mode: Tam ekran modu aktif mi?
    
    Returns:
        tuple: (width, height)
    """
    GAME_ASPECT = 1536 / 1024  # 3:2 oranı
    
    if fullscreen_mode:
        # Monitör bilgisini al
        info = pygame.display.Info()
        monitor_width = info.current_w
        monitor_height = info.current_h
        monitor_aspect = monitor_width / monitor_height
        
        # Oyunun aspect ratio'suna uygun en büyük çözünürlüğü hesapla
        if monitor_aspect >= GAME_ASPECT:
            # Monitör daha geniş - yüksekliğe göre hesapla
            height = monitor_height
            width = int(height * GAME_ASPECT)
        else:
            # Monitör daha dar - genişliğe göre hesapla
            width = monitor_width
            height = int(width / GAME_ASPECT)
        
        return (width, height)
    else:
        # Pencere modu - oyunun orijinal çözünürlüğü
        return (1536, 1024)


def apply_display_settings(settings):
    """
    Ekran ayarlarını uygula - aspect ratio korunarak
    
    Args:
        settings: Ayarlar dict'i
    
    Returns:
        tuple: (screen, WIDTH, HEIGHT)
    """
    fullscreen = settings.get("fullscreen", False)
    WIDTH, HEIGHT = calculate_best_resolution(fullscreen)
    
    if fullscreen:
        # Tam ekran modu
        screen = pygame.display.set_mode((WIDTH, HEIGHT), pygame.FULLSCREEN)
        print(f"🖥️ Tam Ekran Modu: {WIDTH}x{HEIGHT} (Oyun aspect ratio korundu)")
    else:
        # Pencere modu
        screen = pygame.display.set_mode((WIDTH, HEIGHT))
        print(f"🪟 Pencere Modu: {WIDTH}x{HEIGHT}")
    
    pygame.display.set_caption("Data Agents")
    return screen, WIDTH, HEIGHT


def set_music_volume(volume):
    """Müzik sesini ayarla (0-100)"""
    try:
        pygame.mixer.music.set_volume(volume / 100.0)
    except:
        pass


def main():
    """Ana program döngüsü"""
    # Pygame başlat
    pygame.init()
    
    # Ses sistemini başlat
    try:
        pygame.mixer.init()
    except Exception as e:
        print(f"⚠️ Ses sistemi başlatılamadı: {e}")
    
    # Ayarları yükle
    settings = load_settings()
    
    # Ekranı oluştur
    screen, WIDTH, HEIGHT = apply_display_settings(settings)
    
    # Ses seviyelerini ayarla
    set_music_volume(settings["music_volume"])
    
    print("=" * 50)
    print("DATA AGENTS - Oyun Başlatıldı")
    print("=" * 50)
    print(f"Çözünürlük: {WIDTH}x{HEIGHT}")
    print(f"Aspect Ratio: {WIDTH/HEIGHT:.2f} (Hedef: {1536/1024:.2f})")
    print(f"Tam Ekran: {'Evet' if settings['fullscreen'] else 'Hayır'}")
    print(f"Müzik: {settings['music_volume']}%")
    print(f"Ses Efektleri: {settings['sfx_volume']}%")
    print("=" * 50)
    
    # Oyun döngüsü
    while True:
        # Ayarları her döngüde yeniden kontrol et
        new_settings = load_settings()
        
        # Eğer tam ekran modu değiştiyse, ekranı yeniden oluştur
        if new_settings["fullscreen"] != settings["fullscreen"]:
            settings = new_settings
            screen, WIDTH, HEIGHT = apply_display_settings(settings)
            print(f"🔄 Ekran modu değişti: {WIDTH}x{HEIGHT}")
        
        # Ses ayarlarını güncelle
        if new_settings["music_volume"] != settings["music_volume"]:
            settings = new_settings
            set_music_volume(settings["music_volume"])
        
        # Ana menüyü göster
        result = show_menu(screen, WIDTH, HEIGHT)
        
        if result == "exit":
            print("👋 Oyundan çıkılıyor...")
            pygame.quit()
            sys.exit()
        
        elif result == "new_game":
            print("\n" + "=" * 50)
            print("🎮 YENİ OYUN BAŞLATILIYOR")
            print("=" * 50)
            
            # Eski kayıtları temizle
            clear_all_saves()
            
            # Müziği durdur
            try:
                pygame.mixer.music.stop()
            except:
                pass
            
            # Oyunu başlat
            try:
                from game_engine import start_game
                print("✅ Oyun motoru yüklendi")
                
                game_result = start_game(screen, WIDTH, HEIGHT, load_save=False)
                
                # Oyun bittiğinde menü müziğini tekrar başlat
                menu_music_path = os.path.join("audio", "bgm_battle.mp3")
                if os.path.exists(menu_music_path):
                    try:
                        pygame.mixer.music.load(menu_music_path)
                        pygame.mixer.music.set_volume(settings["music_volume"] / 100.0)
                        pygame.mixer.music.play(-1)
                    except:
                        pass
                
                print("=" * 50)
                print("Oyun Bitti - Menüye Dönülüyor")
                print("=" * 50 + "\n")
            
            except ImportError as e:
                print(f"❌ HATA: Oyun motoru yüklenemedi!")
                print(f"   Detay: {e}")
                print(f"   Çözüm: game_engine.py dosyasının var olduğundan emin olun")
                pygame.time.wait(3000)
        
        elif result == "continue":
            print("\n" + "=" * 50)
            print("📂 KAYITLI OYUN YÜKLENİYOR")
            print("=" * 50)
            
            # Müziği durdur
            try:
                pygame.mixer.music.stop()
            except:
                pass
            
            # Kayıtlı oyunu yükle
            try:
                from game_engine import start_game
                print("✅ Oyun motoru yüklendi")
                print("📖 Kayıt dosyası okunuyor...")
                
                game_result = start_game(screen, WIDTH, HEIGHT, load_save=True)
                
                # Oyun bittiğinde menü müziğini tekrar başlat
                menu_music_path = os.path.join("audio", "bgm_battle.mp3")
                if os.path.exists(menu_music_path):
                    try:
                        pygame.mixer.music.load(menu_music_path)
                        pygame.mixer.music.set_volume(settings["music_volume"] / 100.0)
                        pygame.mixer.music.play(-1)
                    except:
                        pass
                
                print("=" * 50)
                print("Oyun Bitti - Menüye Dönülüyor")
                print("=" * 50 + "\n")
            
            except ImportError as e:
                print(f"❌ HATA: Oyun motoru yüklenemedi!")
                print(f"   Detay: {e}")
                pygame.time.wait(3000)
        
        elif result == "settings":
            print("\n⚙️ Ayarlar menüsü açılıyor...")
            
            # Ayarlar menüsünü göster
            show_settings(screen, WIDTH, HEIGHT)
            
            # Ayarları yeniden yükle
            settings = load_settings()
            
            print("✅ Ayarlar güncellendi\n")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n👋 Program kullanıcı tarafından sonlandırıldı")
        pygame.quit()
        sys.exit()
    except Exception as e:
        print("\n" + "=" * 50)
        print("❌ KRİTİK HATA")
        print("=" * 50)
        print(f"Hata: {e}")
        print("\nLütfen aşağıdaki dosyaların var olduğundan emin olun:")
        print("  - game_engine.py")
        print("  - menu.py")
        print("  - scene.py")
        print("  - dialogue.py")
        print("  - enemy_advanced.py")
        print("=" * 50)
        
        import traceback
        traceback.print_exc()
        
        pygame.quit()
        sys.exit(1)