"""
Çözünürlük Ölçekleme Yöneticisi
Oyun içindeki tüm pozisyon, boyut ve offset değerlerini
mevcut çözünürlüğe göre otomatik ölçeklendirir.
"""

class ScaleManager:
    # Referans çözünürlük (oyunun tasarlandığı çözünürlük)
    BASE_WIDTH = 1536
    BASE_HEIGHT = 1024
    
    def __init__(self, current_width, current_height):
        """
        Ölçekleme yöneticisini başlat
        
        Args:
            current_width: Mevcut ekran genişliği
            current_height: Mevcut ekran yüksekliği
        """
        self.current_width = current_width
        self.current_height = current_height
        
        # Ölçekleme oranlarını hesapla
        self.scale_x = current_width / self.BASE_WIDTH
        self.scale_y = current_height / self.BASE_HEIGHT
        
        # Genel ölçekleme (her iki eksende de kullanılabilir)
        self.scale = min(self.scale_x, self.scale_y)
    
    def scale_width(self, width):
        """Genişlik değerini ölçeklendir"""
        return int(width * self.scale_x)
    
    def scale_height(self, height):
        """Yükseklik değerini ölçeklendir"""
        return int(height * self.scale_y)
    
    def scale_pos(self, x, y):
        """Pozisyon koordinatlarını ölçeklendir"""
        return (int(x * self.scale_x), int(y * self.scale_y))
    
    def scale_size(self, width, height):
        """Boyut değerlerini ölçeklendir (tuple döner)"""
        return (int(width * self.scale_x), int(height * self.scale_y))
    
    def scale_rect(self, x, y, width, height):
        """Pygame Rect için tüm değerleri ölçeklendir"""
        import pygame
        return pygame.Rect(
            int(x * self.scale_x),
            int(y * self.scale_y),
            int(width * self.scale_x),
            int(height * self.scale_y)
        )
    
    def scale_value(self, value):
        """Tek bir değeri genel ölçekleme ile ölçeklendir"""
        return int(value * self.scale)
    
    def scale_font_size(self, size):
        """Font boyutunu ölçeklendir"""
        return max(1, int(size * self.scale))
    
    def scale_offset(self, offset_x, offset_y):
        """Offset değerlerini ölçeklendir (foot_offset gibi)"""
        return (int(offset_x * self.scale_x), int(offset_y * self.scale_y))
    
    def scale_speed(self, speed):
        """Hız değerini ölçeklendir"""
        return speed * self.scale
    
    def get_scale_ratio(self):
        """Ölçekleme oranını döndür (debug için)"""
        return {
            'scale_x': self.scale_x,
            'scale_y': self.scale_y,
            'scale': self.scale,
            'current': f"{self.current_width}x{self.current_height}",
            'base': f"{self.BASE_WIDTH}x{self.BASE_HEIGHT}"
        }
    
    def update_resolution(self, new_width, new_height):
        """Çözünürlük değiştiğinde ölçeklemeyi güncelle"""
        self.current_width = new_width
        self.current_height = new_height
        self.scale_x = new_width / self.BASE_WIDTH
        self.scale_y = new_height / self.BASE_HEIGHT
        self.scale = min(self.scale_x, self.scale_y)


# Global ölçekleme yöneticisi (oyunun her yerinden erişilebilir)
_scale_manager = None

def init_scale_manager(width, height):
    """Ölçekleme yöneticisini başlat"""
    global _scale_manager
    _scale_manager = ScaleManager(width, height)
    return _scale_manager

def get_scale_manager():
    """Global ölçekleme yöneticisini al"""
    global _scale_manager
    if _scale_manager is None:
        # Eğer başlatılmamışsa varsayılan çözünürlükle başlat
        _scale_manager = ScaleManager(1536, 1024)
    return _scale_manager

def update_scale_manager(width, height):
    """Ölçekleme yöneticisini güncelle"""
    global _scale_manager
    if _scale_manager is None:
        _scale_manager = ScaleManager(width, height)
    else:
        _scale_manager.update_resolution(width, height)
    return _scale_manager


# Kısayol fonksiyonlar (daha kolay kullanım için)
def scale_x(value):
    """X ekseninde ölçeklendir"""
    return get_scale_manager().scale_width(value)

def scale_y(value):
    """Y ekseninde ölçeklendir"""
    return get_scale_manager().scale_height(value)

def scale_pos(x, y):
    """Pozisyon ölçeklendir"""
    return get_scale_manager().scale_pos(x, y)

def scale_size(width, height):
    """Boyut ölçeklendir"""
    return get_scale_manager().scale_size(width, height)

def scale_value(value):
    """Genel ölçekleme"""
    return get_scale_manager().scale_value(value)

def scale_font(size):
    """Font boyutu ölçeklendir"""
    return get_scale_manager().scale_font_size(size)


# Örnek kullanım ve test
if __name__ == "__main__":
    # Test için
    print("=== Ölçekleme Yöneticisi Test ===\n")
    
    # Farklı çözünürlüklerde test
    test_resolutions = [
        (960, 640),
        (1536, 1024),  # Base
        (1920, 1280),
        (2880, 1920),
    ]
    
    for width, height in test_resolutions:
        sm = ScaleManager(width, height)
        print(f"Çözünürlük: {width}x{height}")
        print(f"  Ölçekleme: {sm.scale:.2f}x")
        print(f"  100px genişlik → {sm.scale_width(100)}px")
        print(f"  100px yükseklik → {sm.scale_height(100)}px")
        print(f"  Pozisyon (100,100) → {sm.scale_pos(100, 100)}")
        print(f"  Font 32 → {sm.scale_font_size(32)}")
        print(f"  Foot offset (0,-30) → {sm.scale_offset(0, -30)}")
        print()