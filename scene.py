import pygame
import os
from dialogue import DialogueSystem

class SceneManager:
    def __init__(self, screen, width, height, default_foot_offset=0):
        self.screen = screen
        self.width = width
        self.height = height
        self.default_foot_offset = default_foot_offset

        # --- Sahne tanımları ---
        # Intro sahneleri
        self.scenes = {
            "intro1": {"file": "INTRO1.PNG", "char_scale": 4, "foot_offset": 0, "no_player": True},
            "intro2": {"file": "INTRO2.PNG", "char_scale": 4, "foot_offset": 0, "no_player": True},
            "intro3": {"file": "INTRO3.PNG", "char_scale": 4, "foot_offset": 0, "no_player": True},
            "scene_phone": {"file": "background10.png", "char_scale": 4, "foot_offset": 0, "no_player": True},
            "game": {"file": "background6.png", "char_scale": 11, "foot_offset": -230, "enemy_foot_offset": -115, "enemy_scale": 3}
        }

        for key, data in self.scenes.items():
            data["bg"] = self.load_background(data["file"])

        # Scene sırası
        self.scene_order = ["intro1", "intro2", "intro3", "scene_phone", "game"]
        self.current_scene = "intro1"
        self.current_bg = self.scenes[self.current_scene]["bg"]
        self.char_scale = self.scenes[self.current_scene]["char_scale"]
        self.foot_offset = self.scenes[self.current_scene]["foot_offset"]
        self.transition_done = False

        # --- Diyalog sistemi ---
        self.dialogue = DialogueSystem(screen, width, height)
        self.scene_dialogues = self.define_scene_dialogues()
        self.dialogue_triggered = set()

        # --- Intro sahne durumları ---
        self.intro2_second_dialogue_timer = 0
        self.intro2_waiting_for_second = False
        self.intro3_first_dialogue_timer = 0
        self.intro3_second_dialogue_timer = 0
        self.intro3_waiting_for_first = True
        self.intro3_waiting_for_second = False

        # --- Scene phone durumları ---
        self.scene_phone_delay_timer = 0
        self.scene_phone_waiting = True
        self.scene_phone_dialogue_shown = False
        self.phone_sound = None

        # --- Intro cinematic ---
        self.intro_cinematic_active = True
        self.intro_cinematic_phase = 0  # 0: black, 1: fade in, 2: show, 3: fade out, 4: black, 5: done
        self.intro_cinematic_timer = 0
        self.date_text_alpha = 0

        # Pixel font yükle - fonts klasöründen
        self.pixel_font = None
        font_path = os.path.join("fonts", "pixel_font.ttf")
        if os.path.exists(font_path):
            try:
                self.pixel_font = pygame.font.Font(font_path, 120)
            except Exception as e:
                print(f"Pixel font yüklenemedi: {e}")
                self.pixel_font = pygame.font.Font(None, 120)
        else:
            print("pixel_font.ttf bulunamadı, varsayılan font kullanılacak")
            self.pixel_font = pygame.font.Font(None, 120)

        # --- Müzik - audio klasöründen ---
        try:
            pygame.mixer.init()
        except Exception:
            pass
        self.intro_music = os.path.join("audio", "Ambians_doga.wav")
        self.normal_music = os.path.join("audio", "bgm_normal.mp3")
        self.phone_sound_path = os.path.join("audio", "Phone.wav")
        self.current_music = None
        self.play_music(self.intro_music)

    def play_music(self, music_file):
        if not os.path.exists(music_file):
            return
        if self.current_music != music_file:
            try:
                pygame.mixer.music.load(music_file)
                pygame.mixer.music.play(-1)
                self.current_music = music_file
            except Exception:
                pass

    def play_sound_effect(self, sound_file):
        """Tek seferlik ses efekti çal"""
        if os.path.exists(sound_file):
            try:
                sound = pygame.mixer.Sound(sound_file)
                sound.play()
            except Exception as e:
                print(f"Ses efekti çalınamadı: {e}")

    def load_background(self, filename):
        """Arka plan yükle - backgrounds klasöründen"""
        bg_path = os.path.join("backgrounds", filename)
        if not os.path.exists(bg_path):
            surf = pygame.Surface((self.width, self.height))
            surf.fill((30, 30, 30))
            return surf
        img = pygame.image.load(bg_path).convert()
        return pygame.transform.scale(img, (self.width, self.height))

    def draw(self, player_rect=None, player_image=None):
        self.screen.blit(self.current_bg, (0, 0))

        # no_player bayrağı kontrolü
        no_player = self.scenes.get(self.current_scene, {}).get("no_player", False)

        if player_rect and not no_player:
            if player_image:
                try:
                    rect = player_image.get_rect(midbottom=(player_rect.centerx, player_rect.bottom))
                    self.screen.blit(player_image, rect)
                except Exception:
                    pygame.draw.rect(self.screen, (255, 100, 100), player_rect)
            else:
                pygame.draw.rect(self.screen, (255, 100, 100), player_rect)

        # Intro cinematic overlay
        if self.intro_cinematic_active:
            # Siyah ekran
            black_surface = pygame.Surface((self.width, self.height))
            black_surface.fill((0, 0, 0))
            self.screen.blit(black_surface, (0, 0))

            # Tarih yazısı
            if self.date_text_alpha > 0:
                text_surface = self.pixel_font.render("22.09.2018", True, (255, 255, 255))
                text_surface.set_alpha(self.date_text_alpha)
                text_rect = text_surface.get_rect(center=(self.width // 2, self.height // 2))
                self.screen.blit(text_surface, text_rect)

    def update_dialogue(self, keys):
        self.dialogue.update(pygame.time.get_ticks() % 100, keys)
        if keys and keys[pygame.K_RETURN]:
            self.dialogue.update(0, keys)

    def draw_dialogue(self):
        self.dialogue.draw()

    def define_scene_dialogues(self):
        return {
            "intro1": [
                ("system", "Bunlarda ne buluyorsunuz anlamıyorum")
            ],
            "intro2": [
                ("system", "Evet yani internet kafelerde bayağı oynardık Ama...")
            ],
            "intro2_second": [
                ("system", "Parka gelincede parkta vakit geçirirdik")
            ],
            "intro3_first": [
                ("system", "Baba bi oyun oynuyorum çok abartın ya")
            ],
            "intro3_second": [
                ("system", "Kalk hadi gidiyoruz Akşam oldu Annen merak etmesin")
            ],
            "scene_phone": [
                ("tunahan", "Alo?"),
                ("bilinmeyen", "Merhaba Tunahan Kuzu ile mi konuşuyorum?"),
                ("tunahan", "E-evet..."),
                ("data koleji", "Merhaba Tunahan Kuzu. Data Kolejine yazıldığın için gerçekten teşekkür ederiz. Biz bir soru için aradık."),
                ("tunahan", "Okulda diyebilirdiniz ama..."),
                ("data koleji", "Evet, ancak telefondan konuşmak daha rahat. Ayrıca sizin güvenliğiniz için daha iyi."),
                ("tunahan", "Ne güvenliği?"),
                ("data koleji", "Size bir görev vermek istiyoruz. Tabii kabul ederseniz."),
                ("tunahan", "Neymiş o?"),
                ("data koleji", "Data Agents olmak istiyorsanız Uçak atölyesini incelemenizi tavsiye ederiz."),
                ("telefon", "Din Din Din")
            ],
            "game": [
                ("tunahan", "Allah Allah… çattık ya sabah sabah."),
                ("Anne", "Oğlum, uyandın mı?"),
                ("tunahan", "Uyandım anne!"),
                ("Anne", "Kapının yanında anahtar var, biraz da para bıraktım. Çıkarken alırsın.")
            ]
        }

    def update(self, player_rect=None, keys=None):
        if not player_rect:
            return

        dt = pygame.time.get_ticks()

        # Intro cinematic
        if self.intro_cinematic_active:
            self.update_intro_cinematic(dt)
            return

        # Diyalog aktifse
        if self.dialogue.is_active():
            was_active = True
            self.update_dialogue(keys)
            self.draw_dialogue()
            
            # Diyalog BİTTİ Mİ kontrolü (update'ten SONRA kontrol et)
            if was_active and not self.dialogue.is_active():
                # INTRO1 tamamlandı -> INTRO2'ye geç
                if self.current_scene == "intro1" and "intro1" in self.dialogue_triggered:
                    self.change_scene("intro2", player_rect)
                
                # INTRO2 ilk diyalog tamamlandı -> 2 saniye bekle
                elif self.current_scene == "intro2" and "intro2" in self.dialogue_triggered and not self.intro2_waiting_for_second:
                    self.intro2_waiting_for_second = True
                    self.intro2_second_dialogue_timer = dt + 2000  # 2 saniye
                
                # INTRO2 ikinci diyalog tamamlandı -> INTRO3'e geç
                elif self.current_scene == "intro2" and "intro2_second" in self.dialogue_triggered:
                    self.change_scene("intro3", player_rect)
                
                # INTRO3 ilk diyalog tamamlandı -> 3 saniye bekle
                elif self.current_scene == "intro3" and "intro3_first" in self.dialogue_triggered and not self.intro3_waiting_for_second:
                    self.intro3_waiting_for_second = True
                    self.intro3_second_dialogue_timer = dt + 3000  # 3 saniye
                
                # INTRO3 ikinci diyalog tamamlandı -> scene_phone'a geç
                elif self.current_scene == "intro3" and "intro3_second" in self.dialogue_triggered:
                    self.change_scene("scene_phone", player_rect)
                    # Stop intro music and play Phone.wav
                    pygame.mixer.music.stop()
                    self.play_sound_effect(self.phone_sound_path)
                
                # SCENE_PHONE tamamlandı -> Oyuna geç
                elif self.current_scene == "scene_phone":
                    self.change_scene("game", player_rect)
                    # Stop phone sound and play normal music
                    pygame.mixer.stop()  # Stop all sounds
                    self.play_music(self.normal_music)
            
            return

        # INTRO2: 2 saniye sonra ikinci diyalogu göster
        if self.current_scene == "intro2" and self.intro2_waiting_for_second and "intro2_second" not in self.dialogue_triggered:
            if dt >= self.intro2_second_dialogue_timer:
                self.intro2_waiting_for_second = False
                self.dialogue.start(self.scene_dialogues["intro2_second"])
                self.dialogue_triggered.add("intro2_second")



        # INTRO3: 1 saniye sonra ilk diyalogu göster
        if self.current_scene == "intro3" and self.intro3_waiting_for_first and "intro3_first" not in self.dialogue_triggered:
            if not hasattr(self, 'intro3_start_time'):
                self.intro3_start_time = dt
            if dt >= self.intro3_start_time + 1000:  # 1 saniye
                self.intro3_waiting_for_first = False
                self.dialogue.start(self.scene_dialogues["intro3_first"])
                self.dialogue_triggered.add("intro3_first")


        # INTRO3: 3 saniye sonra ikinci diyalogu göster
        if self.current_scene == "intro3" and self.intro3_waiting_for_second and "intro3_second" not in self.dialogue_triggered:
            if dt >= self.intro3_second_dialogue_timer:
                self.intro3_waiting_for_second = False
                self.dialogue.start(self.scene_dialogues["intro3_second"])
                self.dialogue_triggered.add("intro3_second")


        # Başlangıç diyalogları
        if self.current_scene == "intro1" and self.current_scene not in self.dialogue_triggered:
            self.dialogue.start(self.scene_dialogues["intro1"])
            self.dialogue_triggered.add("intro1")

        if self.current_scene == "intro2" and self.current_scene not in self.dialogue_triggered:
            self.dialogue.start(self.scene_dialogues["intro2"])
            self.dialogue_triggered.add("intro2")

        # SCENE_PHONE: 2 saniye sonra diyalogu göster
        if self.current_scene == "scene_phone" and self.scene_phone_waiting and not self.scene_phone_dialogue_shown:
            if self.scene_phone_delay_timer == 0:
                self.scene_phone_delay_timer = dt
            if dt >= self.scene_phone_delay_timer + 2000:  # 2 saniye
                self.scene_phone_waiting = False
                self.scene_phone_dialogue_shown = True
                self.dialogue.start(self.scene_dialogues["scene_phone"])
                self.dialogue_triggered.add("scene_phone")

        if self.current_scene == "game" and self.current_scene not in self.dialogue_triggered:
            self.dialogue.start(self.scene_dialogues["game"])
            self.dialogue_triggered.add("game")

    def update_intro_cinematic(self, dt):
        """Intro cinematic güncelleme"""
        if self.intro_cinematic_phase == 0:
            # Phase 0: 3 saniye siyah ekran
            if self.intro_cinematic_timer == 0:
                self.intro_cinematic_timer = dt
            if dt - self.intro_cinematic_timer >= 3000:
                self.intro_cinematic_phase = 1
                self.intro_cinematic_timer = dt
                self.date_text_alpha = 255  # Show text instantly
        elif self.intro_cinematic_phase == 1:
            # Phase 1: Yazıyı 2 saniye göster
            self.date_text_alpha = 255
            elapsed = dt - self.intro_cinematic_timer
            if elapsed >= 2000:
                self.intro_cinematic_phase = 2
                self.intro_cinematic_timer = dt
                self.date_text_alpha = 0  # Hide text instantly
        elif self.intro_cinematic_phase == 2:
            # Phase 2: 1 saniye siyah ekran
            self.date_text_alpha = 0
            elapsed = dt - self.intro_cinematic_timer
            if elapsed >= 1000:
                self.intro_cinematic_phase = 3
                self.intro_cinematic_active = False
                print("🎬 Intro cinematic tamamlandı!")

    def change_scene(self, scene_name, player_rect=None, going_right=False, spawn_side=None):
        if scene_name not in self.scenes:
            return
        scene_data = self.scenes[scene_name]
        self.current_scene = scene_name
        self.current_bg = scene_data["bg"]
        self.char_scale = scene_data["char_scale"]
        self.foot_offset = scene_data["foot_offset"]
        if player_rect:
            if spawn_side == "left":
                player_rect.left = 50
            elif spawn_side == "center":
                player_rect.centerx = self.width // 2
            elif going_right:
                player_rect.left = 10
            else:
                player_rect.left = self.width - player_rect.width - 10
            player_rect.bottom = self.height - self.foot_offset
        self.transition_done = True
        
        # INTRO3'e geçerken timer'ı başlat
        if scene_name == "intro3":
            self.intro3_start_time = pygame.time.get_ticks()

    def get_char_scale(self):
        return self.char_scale

    def get_foot_offset(self):
        return self.foot_offset