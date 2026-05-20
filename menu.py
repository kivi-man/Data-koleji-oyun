import pygame
import os
import json


class MainMenu:
    def __init__(self, screen, width, height):
        self.screen = screen
        self.width = width
        self.height = height
        
        # Render surface - ekran boyutunda (direkt çizim)
        self.render_surface = self.screen
        self.RENDER_WIDTH = width
        self.RENDER_HEIGHT = height
        
        # Menü seçenekleri
        self.options = ["Devam Et", "Yeni Oyun", "Ayarlar", "Çıkış"]
        self.selected = 0
        
        # Pixel Fontlar - fonts klasöründen
        pixel_font_file = os.path.join("fonts", "pixel_font.ttf")
        if os.path.exists(pixel_font_file):
            try:
                self.title_font = pygame.font.Font(pixel_font_file, int(120 * height / 1024))
                self.option_font = pygame.font.Font(pixel_font_file, int(60 * height / 1024))
                self.subtitle_font = pygame.font.Font(pixel_font_file, int(40 * height / 1024))
            except Exception as e:
                print(f"Pixel font yüklenemedi: {e}")
                self.title_font = pygame.font.SysFont("courier", int(120 * height / 1024))
                self.option_font = pygame.font.SysFont("courier", int(60 * height / 1024))
                self.subtitle_font = pygame.font.SysFont("courier", int(40 * height / 1024))
        else:
            self.title_font = pygame.font.SysFont("courier", int(120 * height / 1024))
            self.option_font = pygame.font.SysFont("courier", int(60 * height / 1024))
            self.subtitle_font = pygame.font.SysFont("courier", int(40 * height / 1024))
        
        # Renkler
        self.title_color = (255, 255, 100)
        self.selected_color = (255, 200, 50)
        self.normal_color = (200, 200, 200)
        self.bg_color = (20, 20, 40)
        
        # Arka plan - backgrounds klasöründen
        self.bg_image = None
        bg_path = os.path.join("backgrounds", "background_menu.png")
        if os.path.exists(bg_path):
            try:
                bg = pygame.image.load(bg_path).convert()
                self.bg_image = pygame.transform.scale(bg, (width, height))
            except Exception as e:
                print(f"Arka plan yüklenemedi: {e}")
        
        # Müzik - audio klasöründen
        self.load_music()
        
        # Kayıt dosyası kontrolü
        self.has_save = os.path.exists("game_save.json")
        
        # Animasyon
        self.pulse = 0
        self.pulse_speed = 0.05
        
    def load_music(self):
        """Arka plan müziğini yükle - audio klasöründen"""
        music_path = os.path.join("audio", "bgm_battle.mp3")
        if os.path.exists(music_path):
            try:
                pygame.mixer.music.load(music_path)
                pygame.mixer.music.set_volume(0.5)
                pygame.mixer.music.play(-1)
            except Exception as e:
                print(f"Müzik yüklenirken hata: {e}")
    
    def draw(self):
        """Menüyü çiz"""
        surface = self.render_surface
        
        # Arka plan
        if self.bg_image:
            surface.blit(self.bg_image, (0, 0))
        else:
            surface.fill(self.bg_color)
            # Gradient efekti
            for i in range(self.RENDER_HEIGHT):
                alpha = int(100 * (i / self.RENDER_HEIGHT))
                color = (self.bg_color[0], self.bg_color[1], self.bg_color[2] + alpha)
                pygame.draw.line(surface, color, (0, i), (self.RENDER_WIDTH, i))
        
        # Başlık
        title_text = self.title_font.render("DATA AGENTS", True, self.title_color)
        title_rect = title_text.get_rect(center=(self.RENDER_WIDTH // 2, int(150 * self.RENDER_HEIGHT / 1024)))
        
        # Pulse efekti
        self.pulse += self.pulse_speed
        if self.pulse > 1 or self.pulse < 0:
            self.pulse_speed *= -1
        
        scale = 1.0 + (self.pulse * 0.1)
        scaled_width = int(title_text.get_width() * scale)
        scaled_height = int(title_text.get_height() * scale)
        if scaled_width > 0 and scaled_height > 0:
            scaled_title = pygame.transform.scale(title_text, (scaled_width, scaled_height))
            scaled_rect = scaled_title.get_rect(center=(self.RENDER_WIDTH // 2, int(150 * self.RENDER_HEIGHT / 1024)))
            surface.blit(scaled_title, scaled_rect)
        
        # Alt başlık
        subtitle = self.subtitle_font.render("The Truth Behind the System", True, (180, 180, 180))
        subtitle_rect = subtitle.get_rect(center=(self.RENDER_WIDTH // 2, int(220 * self.RENDER_HEIGHT / 1024)))
        surface.blit(subtitle, subtitle_rect)
        
        # Menü seçenekleri
        start_y = int(350 * self.RENDER_HEIGHT / 1024)
        spacing = int(80 * self.RENDER_HEIGHT / 1024)
        
        for i, option in enumerate(self.options):
            # "Devam Et" yoksa devre dışı göster
            if i == 0 and not self.has_save:
                color = (100, 100, 100)
                text = self.option_font.render(option + " (Kayit Yok)", True, color)
            elif i == self.selected:
                color = self.selected_color
                text = self.option_font.render("> " + option + " <", True, color)
            else:
                color = self.normal_color
                text = self.option_font.render(option, True, color)
            
            text_rect = text.get_rect(center=(self.RENDER_WIDTH // 2, start_y + i * spacing))
            
            # Seçili öğe için arka plan
            if i == self.selected and (i != 0 or self.has_save):
                bg_rect = pygame.Rect(
                    text_rect.left - 20,
                    text_rect.top - 10,
                    text_rect.width + 40,
                    text_rect.height + 20
                )
                pygame.draw.rect(surface, (80, 80, 100), bg_rect, border_radius=10)
                pygame.draw.rect(surface, self.selected_color, bg_rect, 3, border_radius=10)
            
            surface.blit(text, text_rect)
        
        # Kontroller bilgisi
        controls_text = self.subtitle_font.render(
            "Yukari/Asagi: Sec  |  Enter: Onayla  |  ESC: Cik",
            True, (150, 150, 150)
        )
        controls_rect = controls_text.get_rect(center=(self.RENDER_WIDTH // 2, self.RENDER_HEIGHT - int(50 * self.RENDER_HEIGHT / 1024)))
        surface.blit(controls_text, controls_rect)
    
    def handle_input(self, event):
        """Klavye girişlerini işle"""
        if event.type == pygame.KEYDOWN:
            if event.key == pygame.K_UP:
                self.selected = (self.selected - 1) % len(self.options)
                # Kayıt yoksa "Devam Et"i atla
                if self.selected == 0 and not self.has_save:
                    self.selected = len(self.options) - 1
                    
            elif event.key == pygame.K_DOWN:
                self.selected = (self.selected + 1) % len(self.options)
                # Kayıt yoksa "Devam Et"i atla
                if self.selected == 0 and not self.has_save:
                    self.selected = 1
                    
            elif event.key == pygame.K_RETURN:
                return self.get_selection()
                
            elif event.key == pygame.K_ESCAPE:
                return "exit"
        
        return None
    
    def get_selection(self):
        """Seçilen menü öğesini döndür"""
        if self.selected == 0 and self.has_save:
            return "continue"
        elif self.selected == 0 and not self.has_save:
            return None
        elif self.selected == 1:
            return "new_game"
        elif self.selected == 2:
            return "settings"
        elif self.selected == 3:
            return "exit"
        return None


def show_menu(screen, width, height):
    """Menüyü göster ve oyuncu seçimini döndür"""
    menu = MainMenu(screen, width, height)
    clock = pygame.time.Clock()
    
    while True:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                return "exit"
            
            result = menu.handle_input(event)
            if result:
                return result
        
        menu.draw()
        pygame.display.flip()
        clock.tick(60)


class SettingsMenu:
    def __init__(self, screen, width, height):
        self.screen = screen
        self.width = width
        self.height = height
        
        # Direkt ekrana çiz
        self.render_surface = self.screen
        self.RENDER_WIDTH = width
        self.RENDER_HEIGHT = height
        
        # Pixel Fontlar - fonts klasöründen
        pixel_font_file = os.path.join("fonts", "pixel_font.ttf")
        if os.path.exists(pixel_font_file):
            try:
                self.font = pygame.font.Font(pixel_font_file, int(50 * height / 1024))
                self.title_font = pygame.font.Font(pixel_font_file, int(80 * height / 1024))
                self.small_font = pygame.font.Font(pixel_font_file, int(35 * height / 1024))
            except Exception as e:
                print(f"Pixel font yüklenemedi: {e}")
                self.font = pygame.font.SysFont("courier", int(50 * height / 1024))
                self.title_font = pygame.font.SysFont("courier", int(80 * height / 1024))
                self.small_font = pygame.font.SysFont("courier", int(35 * height / 1024))
        else:
            self.font = pygame.font.SysFont("courier", int(50 * height / 1024))
            self.title_font = pygame.font.SysFont("courier", int(80 * height / 1024))
            self.small_font = pygame.font.SysFont("courier", int(35 * height / 1024))
        
        # Ayarları yükle veya varsayılan değerler
        self.load_settings()
        
        # Monitör bilgisi ve çözünürlükler
        self.get_monitor_info()
        self.generate_resolutions()
        
        self.options = ["Muzik Seviyesi", "Ses Efektleri", "Tam Ekran", "Geri Don"]
        self.selected = 0
        self.needs_restart = False
        
    def get_monitor_info(self):
        """Monitör çözünürlüğünü al"""
        try:
            info = pygame.display.Info()
            self.monitor_width = info.current_w
            self.monitor_height = info.current_h
        except Exception as e:
            print(f"Monitör bilgisi alınamadı: {e}")
            self.monitor_width = 1920
            self.monitor_height = 1080
    
    def generate_resolutions(self):
        """Oyunun aspect ratio'suna (3:2) uygun tam ekran çözünürlüğü hesapla"""
        # Oyunun orijinal aspect ratio'su
        GAME_ASPECT = 1536 / 1024  # = 1.5 (3:2)
        
        # Monitör aspect ratio'su
        monitor_aspect = self.monitor_width / self.monitor_height
        
        # En uygun çözünürlüğü hesapla
        if monitor_aspect >= GAME_ASPECT:
            # Monitör daha geniş - yüksekliğe göre hesapla
            height = self.monitor_height
            width = int(height * GAME_ASPECT)
        else:
            # Monitör daha dar - genişliğe göre hesapla
            width = self.monitor_width
            height = int(width / GAME_ASPECT)
        
        self.fullscreen_resolution = (width, height)
        
        print(f"🖥️ Monitör: {self.monitor_width}x{self.monitor_height}")
        print(f"🎮 Oyun tam ekran: {width}x{height}")
        
    def load_settings(self):
        """Ayarları dosyadan yükle"""
        if os.path.exists("settings.json"):
            try:
                with open("settings.json", "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.settings = {
                        "Muzik Seviyesi": data.get("music_volume", 50),
                        "Ses Efektleri": data.get("sfx_volume", 50),
                        "Tam Ekran": data.get("fullscreen", False)
                    }
            except Exception as e:
                print(f"Ayarlar yüklenemedi: {e}")
                self.set_default_settings()
        else:
            self.set_default_settings()
    
    def set_default_settings(self):
        """Varsayılan ayarlar"""
        self.settings = {
            "Muzik Seviyesi": 50,
            "Ses Efektleri": 50,
            "Tam Ekran": False
        }
    
    def save_settings(self):
        """Ayarları dosyaya kaydet"""
        try:
            # Tam ekran veya pencere moduna göre çözünürlük
            if self.settings["Tam Ekran"]:
                resolution = list(self.fullscreen_resolution)
            else:
                resolution = [1536, 1024]  # Pencere modu varsayılan
            
            data = {
                "music_volume": self.settings["Muzik Seviyesi"],
                "sfx_volume": self.settings["Ses Efektleri"],
                "resolution": resolution,
                "fullscreen": self.settings["Tam Ekran"]
            }
            with open("settings.json", "w", encoding="utf-8") as f:
                json.dump(data, f, indent=4, ensure_ascii=False)
        except Exception as e:
            print(f"Ayarlar kaydedilemedi: {e}")
    
    def get_fullscreen_text(self):
        """Tam ekran metnini al"""
        return "Acik" if self.settings["Tam Ekran"] else "Kapali"
        
    def draw(self):
        surface = self.render_surface
        surface.fill((20, 20, 40))
        
        # Başlık
        title = self.title_font.render("AYARLAR", True, (255, 255, 100))
        title_rect = title.get_rect(center=(self.RENDER_WIDTH // 2, int(100 * self.RENDER_HEIGHT / 1024)))
        surface.blit(title, title_rect)
        
        # Monitör bilgisi
        monitor_text = self.small_font.render(
            f"Monitor: {self.monitor_width}x{self.monitor_height}",
            True, (150, 150, 150)
        )
        monitor_rect = monitor_text.get_rect(center=(self.RENDER_WIDTH // 2, int(160 * self.RENDER_HEIGHT / 1024)))
        surface.blit(monitor_text, monitor_rect)
        
        # Tam ekran çözünürlük bilgisi
        fs_width, fs_height = self.fullscreen_resolution
        fs_text = self.small_font.render(
            f"Tam Ekran Oyun: {fs_width}x{fs_height} (3:2 Oran)",
            True, (100, 200, 100)
        )
        fs_rect = fs_text.get_rect(center=(self.RENDER_WIDTH // 2, int(195 * self.RENDER_HEIGHT / 1024)))
        surface.blit(fs_text, fs_rect)
        
        start_y = int(270 * self.RENDER_HEIGHT / 1024)
        spacing = int(90 * self.RENDER_HEIGHT / 1024)
        
        for i, option in enumerate(self.options):
            if i == self.selected:
                color = (255, 200, 50)
                text_str = f"> {option}"
                
                if option == "Tam Ekran":
                    text_str += f": {self.get_fullscreen_text()} <"
                elif option in self.settings:
                    text_str += f": {self.settings[option]} <"
                else:
                    text_str += " <"
            else:
                color = (200, 200, 200)
                text_str = option
                
                if option == "Tam Ekran":
                    text_str += f": {self.get_fullscreen_text()}"
                elif option in self.settings:
                    text_str += f": {self.settings[option]}"
            
            text = self.font.render(text_str, True, color)
            text_rect = text.get_rect(center=(self.RENDER_WIDTH // 2, start_y + i * spacing))
            
            # Seçili öğe için arka plan
            if i == self.selected and option != "Geri Don":
                bg_rect = pygame.Rect(
                    text_rect.left - 20,
                    text_rect.top - 10,
                    text_rect.width + 40,
                    text_rect.height + 20
                )
                pygame.draw.rect(surface, (80, 80, 100), bg_rect, border_radius=10)
                pygame.draw.rect(surface, color, bg_rect, 3, border_radius=10)
            
            surface.blit(text, text_rect)
        
        # Uyarı mesajı
        if self.needs_restart:
            warning = self.small_font.render(
                "Degisiklikler icin oyunu yeniden baslatin!",
                True, (255, 100, 100)
            )
            warning_rect = warning.get_rect(center=(self.RENDER_WIDTH // 2, self.RENDER_HEIGHT - int(100 * self.RENDER_HEIGHT / 1024)))
            surface.blit(warning, warning_rect)
        
        # Bilgi
        info = self.small_font.render("Sol/Sag: Degistir  |  Enter: Onayla", True, (150, 150, 150))
        info_rect = info.get_rect(center=(self.RENDER_WIDTH // 2, self.RENDER_HEIGHT - int(50 * self.RENDER_HEIGHT / 1024)))
        surface.blit(info, info_rect)
    
    def handle_input(self, event):
        if event.type == pygame.KEYDOWN:
            if event.key == pygame.K_UP:
                self.selected = (self.selected - 1) % len(self.options)
            elif event.key == pygame.K_DOWN:
                self.selected = (self.selected + 1) % len(self.options)
            elif event.key == pygame.K_RETURN:
                if self.options[self.selected] == "Geri Don":
                    self.save_settings()
                    return "back"
            elif event.key == pygame.K_LEFT or event.key == pygame.K_RIGHT:
                option = self.options[self.selected]
                
                if option == "Muzik Seviyesi":
                    change = 10 if event.key == pygame.K_RIGHT else -10
                    self.settings[option] = max(0, min(100, self.settings[option] + change))
                    try:
                        pygame.mixer.music.set_volume(self.settings[option] / 100)
                    except:
                        pass
                    
                elif option == "Ses Efektleri":
                    change = 10 if event.key == pygame.K_RIGHT else -10
                    self.settings[option] = max(0, min(100, self.settings[option] + change))
                    
                elif option == "Tam Ekran":
                    self.settings["Tam Ekran"] = not self.settings["Tam Ekran"]
                    self.needs_restart = True
                    
        return None


def show_settings(screen, width, height):
    """Ayarlar menüsünü göster"""
    settings = SettingsMenu(screen, width, height)
    clock = pygame.time.Clock()
    
    while True:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                return
            
            result = settings.handle_input(event)
            if result == "back":
                return
        
        settings.draw()
        pygame.display.flip()
        clock.tick(60)