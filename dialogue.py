import pygame
import textwrap
import os

class DialogueSystem:
    """
    DialogueSystem: harf-harf metin animasyonu (blip sesiyle).
    """

    def __init__(self, screen, width, height):
        self.screen = screen
        self.W = width
        self.H = height

        # Pixel fontları yükle
        self.font = self._load_font(28)
        self.font_big = self._load_font(34)
        self.box_height = 180
        self.margin_x = 60
        self.margin_y = 28

        # state
        self.dialogues = []
        self.index = 0
        self.char_index = 0
        self.active = False
        self.timer = 0

        # konuşmacı hızları
        self.speaker_speed = {
            "tunahan": 28,
            "pink": 20,
            "data": 34,
            "system": 18,
            "effect": 12,
            "dut": 12
        }
        self.default_speed = 30

        # text state
        self.wrapped_lines = []
        self.current_visible = ""
        self.line_char_index = 0
        self.flags = {}

        # ------------------------------------------------------
        # 🔊 SES SİSTEMİ
        # ------------------------------------------------------

        # Mixer güvenli init (zaten açıksa hata vermez)
        try:
            if not pygame.mixer.get_init():
                pygame.mixer.init()
        except Exception as e:
            print("Mixer başlatılamadı:", e)

        self.blip_sound = None
        self.last_sound_time = 0
        self.sound_interval = 90

        # Ses dosyasının doğru yolu
        sound_path = os.path.join("audio", "blip.wav")

        if os.path.exists(sound_path):
            try:
                self.blip_sound = pygame.mixer.Sound(sound_path.replace("\\", "/"))
                self.blip_sound.set_volume(0.3)
                print("Blip sesi yüklendi ->", sound_path)
            except Exception as e:
                print("Blip ses yükleme hatası:", e)
                self.blip_sound = None
        else:
            print("Blip sesi bulunamadı:", sound_path)

    # ------------------------------------------------------
    # FONT
    # ------------------------------------------------------

    def _load_font(self, size):
        font_path = os.path.join(os.path.dirname(__file__), "fonts\\dialogue_pixel_font.ttf")

        if os.path.exists(font_path):
            try:
                return pygame.font.Font(font_path, size)
            except Exception as e:
                print("Font yükleme hatası:", e)

        if os.path.exists("dialogue_pixel_font.ttf"):
            try:
                return pygame.font.Font("dialogue_pixel_font.ttf", size)
            except:
                pass

        print("⚠️ dialogue_pixel_font.ttf bulunamadı, sistem fontu kullanılıyor")
        return pygame.font.Font(None, size)

    # ------------------------------------------------------
    # DİYALOG BAŞLATMA
    # ------------------------------------------------------

    def start(self, dialogues, reset_flags=False):
        if reset_flags:
            self.flags = {}
        self.dialogues = dialogues[:]
        self.index = 0
        self.char_index = 0
        self.timer = 0
        self.active = True
        self._prepare_current()

    # ------------------------------------------------------
    # HIZ
    # ------------------------------------------------------

    def _get_speed_for_current(self):
        if not self.dialogues:
            return self.default_speed
        speaker = self.dialogues[self.index][0]
        return self.speaker_speed.get(speaker, self.default_speed)

    # ------------------------------------------------------
    # SATIR KIRMA
    # ------------------------------------------------------

    def _prepare_current(self):
        if not self.dialogues or self.index >= len(self.dialogues):
            self.wrapped_lines = []
            self.current_visible = ""
            self.line_char_index = 0
            return

        speaker, text = self.dialogues[self.index]
        text = text.strip()

        max_text_width = self.W - 2 * self.margin_x - 20

        test_surf = self.font.render("M" * 50, True, (255, 255, 255))
        char_width = test_surf.get_width() / 50
        max_chars_per_line = max(30, min(int(max_text_width / char_width), 100))

        words = text.split()
        lines = []
        current_line = ""

        for word in words:
            test_line = current_line + " " + word if current_line else word
            test_surf = self.font.render(test_line, True, (255, 255, 255))

            if test_surf.get_width() <= max_text_width:
                current_line = test_line
            else:
                if current_line:
                    lines.append(current_line)
                current_line = word

        if current_line:
            lines.append(current_line)
        if not lines:
            lines = [""]

        self.wrapped_lines = lines
        self.current_visible = "\n".join(self.wrapped_lines)

        self.line_char_index = 0
        self.char_index = 0

    # ------------------------------------------------------
    # UPDATE
    # ------------------------------------------------------

    def update(self, dt, keys):
        if not self.active:
            return

        if not self.dialogues or self.index >= len(self.dialogues):
            self.active = False
            return

        speed = self._get_speed_for_current()
        self.timer += dt

        if self.timer >= speed:
            self.timer = 0

            if self.line_char_index < len(self.current_visible):
                self.line_char_index += 1

                # S E S
                now = pygame.time.get_ticks()
                if self.blip_sound and now - self.last_sound_time > self.sound_interval:
                    self.last_sound_time = now
                    try:
                        self.blip_sound.play()
                    except:
                        pass

            else:
                if keys[pygame.K_RETURN]:
                    self.index += 1
                    if self.index >= len(self.dialogues):
                        self.active = False
                        return
                    else:
                        self._prepare_current()

        if keys[pygame.K_SPACE] and self.active:
            self.line_char_index = len(self.current_visible)

    # ------------------------------------------------------
    # ÇİZİM
    # ------------------------------------------------------

    def draw(self):
        if not self.active:
            return

        box_rect = pygame.Rect(0, 0, self.W, self.box_height)
        pygame.draw.rect(self.screen, (15, 15, 15), box_rect)
        pygame.draw.rect(self.screen, (230, 230, 230), box_rect, 3)

        visible = self.current_visible[: self.line_char_index]
        speaker = self.dialogues[self.index][0]
        speaker_name = speaker.capitalize()

        # isim rengi
        if speaker.lower() in ("pink", "pink-lamb", "pink_lamb"):
            name_color = (140, 220, 255)
        elif speaker.lower() == "tunahan":
            name_color = (255, 255, 240)
        elif speaker.lower() in ("data", "data koleji"):
            name_color = (200, 240, 200)
        else:
            name_color = (230, 230, 230)

        name_surf = self.font_big.render(speaker_name, True, name_color)
        self.screen.blit(name_surf, (self.margin_x, 6))

        lines = visible.split("\n")
        y = 6 + name_surf.get_height() + 8

        for line in lines:
            if speaker.lower() in ("pink", "pink-lamb", "pink_lamb"):
                color = (170, 240, 255)
            elif speaker.lower() == "tunahan":
                color = (255, 255, 255)
            elif speaker.lower() in ("data", "data koleji"):
                color = (180, 255, 180)
            elif speaker.lower() in ("effect", "dut"):
                color = (200, 200, 200)
            else:
                color = (220, 220, 220)

            surf = self.font.render(line, True, color)
            self.screen.blit(surf, (self.margin_x, y))
            y += surf.get_height() + 4

    # ------------------------------------------------------

    def is_active(self):
        return self.active
