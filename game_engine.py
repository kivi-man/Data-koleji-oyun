"""
Ana Oyun Motoru
Tüm oyun mekaniğini yöneten merkezi sistem
"""

import pygame
import os
import json
import random
from scene import SceneManager
from enemy_advanced import Enemy, AdrenalineInjector


class PerformanceOptimizer:
    """Performans optimizasyonu için yardımcı sınıf"""

    def __init__(self):
        self.last_fps_update = 0
        self.fps_counter = 0
        self.current_fps = 60

    def update_fps(self, clock):
        """FPS hesapla"""
        self.fps_counter += 1
        now = pygame.time.get_ticks()
        if now - self.last_fps_update >= 1000:
            self.current_fps = self.fps_counter
            self.fps_counter = 0
            self.last_fps_update = now
        return self.current_fps


# Surface cache
SURFACE_CACHE = {}


def get_cached_surface(key, create_func):
    """Surface'leri cache'le - aynı görseli tekrar oluşturma"""
    if key not in SURFACE_CACHE:
        SURFACE_CACHE[key] = create_func()
    return SURFACE_CACHE[key]


def load_sound(filename):
    """Ses dosyasını audio klasöründen yükle."""
    path = os.path.join("audio", filename)
    if os.path.exists(path):
        try:
            return pygame.mixer.Sound(path)
        except pygame.error:
            return None
    return None


def save_game(x, y, health, scene, player_combo=0, player_has_adrenaline=False):
    """Oyunu kaydet"""
    try:
        save_data = {
            "x": x,
            "y": y,
            "health": health,
            "scene": scene,
            "player_combo": player_combo,
            "player_has_adrenaline": player_has_adrenaline,
            "timestamp": pygame.time.get_ticks()
        }
        with open("game_save.json", "w", encoding="utf-8") as f:
            json.dump(save_data, f, indent=4)
        return True
    except Exception as e:
        print(f"❌ Kayıt hatası: {e}")
        return False


def load_game_data():
    """Kayıtlı oyun verisini yükle"""
    if not os.path.exists("game_save.json"):
        return None
    try:
        with open("game_save.json", "r", encoding="utf-8") as f:
            data = json.load(f)
            print(f"📂 Kayıt yüklendi: Scene={data.get('scene')}, HP={data.get('health')}")
            return data
    except Exception as e:
        print(f"❌ Kayıt yükleme hatası: {e}")
        return None


class GameEngine:
    """Ana Oyun Motoru Sınıfı"""

    def __init__(self, screen, width, height):
        self.screen = screen
        self.WIDTH = width
        self.HEIGHT = height

        # Sabit render boyutları
        self.RENDER_WIDTH = 1536
        self.RENDER_HEIGHT = 1024
        self.USE_SCALED_RENDER = width != self.RENDER_WIDTH or height != self.RENDER_HEIGHT
        self.TARGET_FPS = 60
        self.MIN_FPS = 30

        # Render surface
        self.render_surface = pygame.Surface((self.RENDER_WIDTH, self.RENDER_HEIGHT)) \
            if self.USE_SCALED_RENDER else screen

        self.clock = pygame.time.Clock()
        self.perf = PerformanceOptimizer()

        # Oyun sabitleri
        self.WALK_SPEED = 6
        self.JUMP_FORCE = 25
        self.GRAVITY = 1
        self.GROUND_Y = self.RENDER_HEIGHT - 100
        self.PUNCH_DAMAGE = 20

        # Ses efektleri
        pygame.mixer.init()
        self.punch_sound = load_sound("punch.wav") or load_sound("punch.mp3")
        self.walk_sound = load_sound("walk.wav") or load_sound("walk.mp3")
        self.injector_sound = load_sound("injector.wav") or load_sound("injector.mp3")
        self.walk_channel = None

        # Font yükleme
        self.fonts = {}
        self.load_fonts()

        # Sahne yöneticisi
        self.FOOT_OFFSET = -130
        self.scene = SceneManager(
            self.render_surface,
            self.RENDER_WIDTH,
            self.RENDER_HEIGHT,
            default_foot_offset=self.FOOT_OFFSET
        )

        # Animasyonlar - İLK SCALE İLE YÜKLE
        self.SCALE = self.scene.get_char_scale()
        self.animations = self.load_animations()

        # Oyuncu durumu
        self.init_player_state()

        # Düşmanlar ve iğneler
        self.enemies = []
        self.injectors = []

        # Animasyon sayaçları
        self.init_animation_counters()

        # UI cache
        self.ui_cache = {}
        self.last_hp = self.player_health
        self.last_combo = 0

        # Otomatik kayıt
        self.auto_save_timer = 0
        self.auto_save_interval = 30000  # 30 saniye

        # Performans tracking
        self.frame_skip_counter = 0

    def load_fonts(self):
        """Font'ları fonts klasöründen cache ile yükle"""

        def load_font(size):
            cache_key = f"font_{size}"
            if cache_key in SURFACE_CACHE:
                return SURFACE_CACHE[cache_key]
            font_path = os.path.join("fonts", "pixel_font.ttf")
            if os.path.exists(font_path):
                try:
                    font = pygame.font.Font(font_path, size)
                    SURFACE_CACHE[cache_key] = font
                    return font
                except:
                    pass
            font = pygame.font.Font(None, size)
            SURFACE_CACHE[cache_key] = font
            return font

        self.fonts['default'] = load_font

    def load_animations(self):
        """Animasyonları cache ile yükle"""

        def load_anim(folder, scale):
            cache_key = f"anim_{folder}_{scale:.2f}"
            if cache_key in SURFACE_CACHE:
                return SURFACE_CACHE[cache_key]

            base_path = os.path.join("player", folder)
            images = []

            if not os.path.exists(base_path):
                print(f"[Anim] Klasör bulunamadı: {base_path}")
                SURFACE_CACHE[cache_key] = images
                return images

            files = sorted(
                os.listdir(base_path),
                key=lambda s: int(os.path.splitext(s)[0]) if os.path.splitext(s)[0].isdigit() else s
            )

            for file in files:
                if file.lower().endswith(".png"):
                    path = os.path.join(base_path, file)
                    image = pygame.image.load(path).convert_alpha()
                    w, h = image.get_size()
                    image = pygame.transform.scale(image, (int(w * scale), int(h * scale)))
                    images.append(image)

            SURFACE_CACHE[cache_key] = images
            return images

        walk_images = load_anim("walk", self.SCALE)
        punch_images = load_anim("punch", self.SCALE)
        jump_images = load_anim("jump", self.SCALE)

        # Idle image
        idle_img_path = "tunahan.png"
        if os.path.exists(idle_img_path):
            idle_img_raw = pygame.image.load(idle_img_path).convert_alpha()
        else:
            idle_img_raw = pygame.Surface((60, 80), pygame.SRCALPHA)
            idle_img_raw.fill((200, 200, 200))

        w, h = idle_img_raw.get_size()
        idle_image = pygame.transform.scale(idle_img_raw, (int(w * self.SCALE), int(h * self.SCALE)))

        if not punch_images:
            punch_images = [idle_image]
        if not walk_images:
            walk_images = [idle_image]
        if not jump_images:
            jump_images = [idle_image]

        return {
            'idle': idle_image,
            'idle_raw': idle_img_raw,
            'walk': walk_images,
            'punch': punch_images,
            'jump': jump_images
        }
    
    def init_player_state(self):
        """Oyuncu başlangıç durumu"""
        self.x = self.RENDER_WIDTH // 2
        self.y = self.RENDER_HEIGHT - 100 - self.scene.get_foot_offset()
        self.vx = 0.0
        self.vy = 0.0
        self.on_ground = True
        self.moving = False
        self.facing_left = False
        self.punching = False
        self.punch_timer = 0
        self.punch_frame = 0
        self.punch_frame_delay = self.TARGET_FPS / 12
        
        # Can ve adrenalin
        self.player_max_health = 100
        self.player_health = 100
        self.player_has_adrenaline = False
        self.player_adrenaline_active = False
        self.player_adrenaline_timer = 0
        self.player_adrenaline_duration = 5000
        self.player_base_speed = self.WALK_SPEED
        self.player_speed_multiplier = 1.0
        self.player_damage_multiplier = 1.0
        
        # Kombo sistemi
        self.player_combo = 0
        self.player_last_hit_time = 0
        self.player_combo_decay = 1500
        
        # Görsel efektler
        self.player_flash_alpha = 0
        self.player_invulnerable = False
        self.player_invuln_timer = 0
    
    def init_animation_counters(self):
        """Animasyon sayaçlarını başlat"""
        self.walk_frame = 0
        self.walk_timer = 0
        self.idle_timer = 0
        self.jump_frame = 0
        self.jump_timer = 0
        self.walk_frame_delay = self.TARGET_FPS / 10
        self.idle_frame_delay = self.TARGET_FPS / 1
        self.jump_frame_delay = self.TARGET_FPS / 8
        
        self.current_image = self.animations['idle']
        self.SCALE_current = self.SCALE
        self.last_walking = False
    
    def load_save_data(self):
        """Kayıtlı oyun verisini yükle"""
        save_data = load_game_data()
        if not save_data:
            return
        
        self.x = save_data.get("x", self.x)
        self.y = save_data.get("y", self.y)
        self.player_health = save_data.get("health", self.player_health)
        self.player_combo = save_data.get("player_combo", 0)
        self.player_has_adrenaline = save_data.get("player_has_adrenaline", False)
        
        loaded_scene = save_data.get("scene", "game")
        if loaded_scene != self.scene.current_scene:
            self.scene.current_scene = loaded_scene
            
            if loaded_scene in self.scene.scenes:
                scene_data = self.scene.scenes[loaded_scene]
                self.scene.current_bg = scene_data["bg"]
                self.scene.char_scale = scene_data["char_scale"]
                self.scene.foot_offset = scene_data["foot_offset"]
                self.y = self.RENDER_HEIGHT - 100 - self.scene.foot_offset
            
            # Animasyonları yeniden yükle - YENİ SCALE İLE
            self.SCALE = self.scene.get_char_scale()
            self.SCALE_current = self.SCALE
            
            # Cache'i temizle
            cache_keys_to_remove = [
                key for key in SURFACE_CACHE.keys() 
                if key.startswith("anim_")
            ]
            for key in cache_keys_to_remove:
                del SURFACE_CACHE[key]
            
            self.animations = self.load_animations()
            self.current_image = self.animations['idle']
    
    def spawn_test_enemy(self):
        """Test düşmanı spawn et"""
        # Sahnenin enemy scale'ini al
        enemy_scale = self.scene.scenes.get(
            self.scene.current_scene, {}
        ).get("enemy_scale", 3)
        
        enemy_foot_offset = self.scene.scenes.get(
            self.scene.current_scene, {}
        ).get("enemy_foot_offset", -50)
        
        enemy = Enemy(
            self.RENDER_WIDTH // 2 + 250, 
            self.RENDER_HEIGHT - 100 - enemy_foot_offset,
            scale=enemy_scale,
            all_enemies=self.enemies
        )
        enemy.current_scene = self.scene.current_scene
        self.enemies.append(enemy)
        print(f"👹 Düşman spawn edildi: scale={enemy_scale}, foot_offset={enemy_foot_offset}")
    
    def handle_events(self):
        """Olayları işle"""
        keys = pygame.key.get_pressed()
        
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                save_game(
                    self.x, self.y, self.player_health, 
                    self.scene.current_scene, self.player_combo, 
                    self.player_has_adrenaline
                )
                return "menu"
            
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    save_game(
                        self.x, self.y, self.player_health, 
                        self.scene.current_scene, self.player_combo, 
                        self.player_has_adrenaline
                    )
                    return "menu"
                
                elif event.key == pygame.K_F5:
                    if save_game(
                        self.x, self.y, self.player_health, 
                        self.scene.current_scene, self.player_combo, 
                        self.player_has_adrenaline
                    ):
                        self.show_save_notification()
                
                elif event.key == pygame.K_e and not self.punching:
                    self.start_punch(facing_left=False)
                
                elif event.key == pygame.K_q and not self.punching:
                    self.start_punch(facing_left=True)
                
                elif event.key == pygame.K_x and self.player_has_adrenaline and not self.player_adrenaline_active:
                    self.use_adrenaline()
        
        return keys
    
    def start_punch(self, facing_left):
        """Yumruk atışı başlat"""
        self.punching = True
        self.facing_left = facing_left
        self.punch_frame = 0
        self.punch_timer = 0
        if self.punch_sound:
            self.punch_sound.play()
    
    def use_adrenaline(self):
        """Adrenalin kullan"""
        self.player_has_adrenaline = False
        self.player_adrenaline_active = True
        self.player_adrenaline_timer = self.player_adrenaline_duration
        self.player_health = min(self.player_max_health, self.player_health + 30)
        self.player_speed_multiplier = 1.5
        self.player_damage_multiplier = 1.5
        if self.injector_sound:
            self.injector_sound.play()
        print("✨ Oyuncu adrenalin kullandı! +30 HP, +50% hız, +50% hasar")
    
    def show_save_notification(self):
        """Kayıt bildirimini göster"""
        if 'save_text' not in self.ui_cache:
            font = self.fonts['default'](36)
            self.ui_cache['save_text'] = font.render("KAYDEDILDI!", True, (0, 255, 0))
        
        self.render_surface.blit(
            self.ui_cache['save_text'], 
            (self.RENDER_WIDTH // 2 - 100, 100)
        )
        
        if self.USE_SCALED_RENDER:
            scaled = pygame.transform.scale(self.render_surface, (self.WIDTH, self.HEIGHT))
            self.screen.blit(scaled, (0, 0))
        
        pygame.display.flip()
        pygame.time.wait(500)
    
    def update_timers(self, dt):
        """Timer'ları güncelle"""
        now = pygame.time.get_ticks()
        
        self.player_invuln_timer = max(0, self.player_invuln_timer - dt)
        if self.player_invuln_timer <= 0:
            self.player_invulnerable = False
        
        if self.player_adrenaline_active:
            self.player_adrenaline_timer -= dt
            if self.player_adrenaline_timer <= 0:
                self.player_adrenaline_active = False
                self.player_speed_multiplier = 1.0
                self.player_damage_multiplier = 1.0
        
        if now - self.player_last_hit_time > self.player_combo_decay:
            self.player_combo = 0
        
        # Otomatik kayıt
        self.auto_save_timer += dt
        if self.auto_save_timer >= self.auto_save_interval:
            self.auto_save_timer = 0
            save_game(
                self.x, self.y, self.player_health, 
                self.scene.current_scene, self.player_combo, 
                self.player_has_adrenaline
            )
    
    def update_movement(self, keys):
        """Hareket güncelleme"""
        current_walk_speed = self.player_base_speed * self.player_speed_multiplier
        
        if not self.punching and not self.scene.dialogue.active:
            is_walking = False
            
            if keys[pygame.K_LEFT]:
                self.x -= current_walk_speed
                self.moving = True
                self.facing_left = True
                is_walking = True
            
            if keys[pygame.K_RIGHT]:
                self.x += current_walk_speed
                self.moving = True
                self.facing_left = False
                is_walking = True
            
            if keys[pygame.K_UP] and self.on_ground and not self.punching:
                self.vy = -self.JUMP_FORCE
                self.on_ground = False
            
            # Yürüme sesi
            if is_walking and self.on_ground and self.walk_sound:
                if not self.last_walking:
                    if self.walk_channel is None or not self.walk_channel.get_busy():
                        self.walk_channel = self.walk_sound.play(-1)
            else:
                if self.walk_channel and self.walk_channel.get_busy():
                    self.walk_channel.stop()
            
            self.last_walking = is_walking
    
    def update_physics(self):
        """Fizik güncelleme"""
        self.vy += self.GRAVITY
        if self.on_ground and self.vy > 0:
            self.vy = 0
        
        self.vx *= 0.98
        self.vy *= 0.999
        self.x += self.vx
        self.y += self.vy
        
        # Zemin kontrolü
        foot_offset = self.scene.get_foot_offset()
        if self.y >= self.RENDER_HEIGHT - 100 - foot_offset:
            self.y = self.RENDER_HEIGHT - 100 - foot_offset
            self.vy = 0
            self.on_ground = True
        else:
            self.on_ground = False
    
    def get_player_rect(self):
        """Oyuncu rect'ini döndür"""
        return pygame.Rect(int(self.x - 40), int(self.y - 100), 80, 100)
    
    def update_injectors(self, player_rect):
        """İğne toplama"""
        for inj in self.injectors[:]:
            if inj.active and player_rect.colliderect(inj.rect):
                inj.active = False
                self.injectors.remove(inj)
                self.player_has_adrenaline = True
                if self.injector_sound:
                    self.injector_sound.play()
                print("💉 Oyuncu adrenalin iğnesi topladı!")
    
    def update_enemies(self, player_rect, dt):
        """Düşman AI ve çarpışma"""
        for enemy in self.enemies[:]:
            if not enemy.alive:
                # Ölü düşman - iğne düşürme
                if random.random() < 0.3:
                    new_inj = AdrenalineInjector(enemy.x, enemy.y - 20)
                    self.injectors.append(new_inj)
                    print(f"💉 Düşman iğne düşürdü: ({enemy.x}, {enemy.y})")
                self.enemies.remove(enemy)
                continue
            
            # Diyalog aktifse düşman AI'ını çalıştırma
            if self.scene.dialogue.is_active():
                enemy.state = "idle"
                continue
            
            ai_result = enemy.ai_update(player_rect, dt, self.injectors)
            
            # Düşman saldırısı
            if ai_result == "attack" and not self.player_invulnerable:
                self.take_damage(enemy.damage)
            
            # Projektil çarpması
            for proj in enemy.projectiles[:]:
                if proj.active and player_rect.colliderect(proj.rect):
                    proj.active = False
                    if not self.player_invulnerable:
                        self.take_damage(proj.damage)
                        print(f"🪨 Taş çarptı: {proj.damage} HP")
    
    def take_damage(self, damage):
        """Hasar al"""
        self.player_health -= damage
        self.player_health = max(self.player_health, 0)
        self.player_flash_alpha = 200
        self.player_invulnerable = True
        self.player_invuln_timer = 500
        print(f"🩸 Oyuncu hasar aldı: {damage} HP")
    
    def update_punch_animation(self, player_rect):
        """Yumruk animasyonu güncelle"""
        if not self.punching:
            return
        
        self.punch_timer += 1
        if self.punch_timer >= self.punch_frame_delay:
            self.punch_timer = 0
            self.punch_frame += 1
        
        punch_range = pygame.Rect(int(self.x), int(self.y - 100), 60, 100)
        if self.facing_left:
            punch_range.x -= 60
        
        # Hasar frame'leri (1-2)
        if 1 <= self.punch_frame <= 2:
            now = pygame.time.get_ticks()
            
            for enemy in self.enemies:
                if enemy.alive and punch_range.colliderect(enemy.rect):
                    # Kombo hesapla
                    if now - self.player_last_hit_time <= self.player_combo_decay:
                        self.player_combo += 1
                    else:
                        self.player_combo = 1
                    self.player_last_hit_time = now
                    
                    # Hasar hesapla
                    combo_mult = 1.0 + (self.player_combo - 1) * 0.3
                    total_damage = int(
                        self.PUNCH_DAMAGE * combo_mult * self.player_damage_multiplier
                    )
                    
                    enemy.take_damage(total_damage)
                    print(f"👊 Oyuncu vurdu! Combo: {self.player_combo}x, Hasar: {total_damage}")
        
        if self.punch_frame >= len(self.animations['punch']):
            self.punching = False
            self.punch_frame = 0
        else:
            self.current_image = self.animations['punch'][self.punch_frame]
    
    def update_character_animation(self):
        """Karakter animasyonu güncelle"""
        if self.punching:
            return
        
        if not self.on_ground:
            self.jump_timer += 1
            if self.jump_timer >= self.jump_frame_delay:
                self.jump_timer = 0
                self.jump_frame = (self.jump_frame + 1) % len(self.animations['jump'])
            self.current_image = self.animations['jump'][self.jump_frame]
        
        elif self.moving and self.on_ground:
            self.walk_timer += 1
            if self.walk_timer >= self.walk_frame_delay:
                self.walk_timer = 0
                self.walk_frame = (self.walk_frame + 1) % len(self.animations['walk'])
            self.current_image = self.animations['walk'][self.walk_frame]
        
        else:
            self.idle_timer += 1
            if self.idle_timer >= self.idle_frame_delay:
                self.idle_timer = 0
            self.current_image = self.animations['idle']
    
    def get_player_image(self):
        """Oyuncu görselini hazırla"""
        img = self.current_image.copy()
        
        # Adrenalin efekti
        if self.player_adrenaline_active:
            red_overlay = pygame.Surface(img.get_size(), pygame.SRCALPHA)
            red_overlay.fill((255, 100, 100, 80))
            img.blit(red_overlay, (0, 0), special_flags=pygame.BLEND_RGBA_ADD)
        
        # Hasar flash
        if self.player_flash_alpha > 0:
            flash_overlay = pygame.Surface(img.get_size(), pygame.SRCALPHA)
            flash_overlay.fill((255, 255, 255, int(self.player_flash_alpha)))
            img.blit(flash_overlay, (0, 0))
            self.player_flash_alpha -= 15
        
        if self.facing_left:
            img = pygame.transform.flip(img, True, False)
        
        return img
    
    def check_scale_change(self):
        """Ölçek değişimi kontrolü"""
        new_scale = self.scene.get_char_scale()
        if abs(new_scale - self.SCALE_current) > 0.1:  # Epsilon kontrolü
            print(f"🔄 Karakter ölçeği değişti: {self.SCALE_current} → {new_scale}")
            self.SCALE_current = new_scale
            self.SCALE = new_scale
            
            # Animasyonları yeniden yükle (cache'i temizle)
            cache_keys_to_remove = [
                key for key in SURFACE_CACHE.keys() 
                if key.startswith("anim_")
            ]
            for key in cache_keys_to_remove:
                del SURFACE_CACHE[key]
            
            # Yeni ölçekte animasyonları yükle
            self.animations = self.load_animations()
            self.current_image = self.animations['idle']
        
        # Düşman ölçeklerini güncelle
        for enemy in self.enemies:
            if enemy.current_scene != self.scene.current_scene:
                enemy.current_scene = self.scene.current_scene
                
                # Sahnenin enemy scale'ini al
                enemy_scale = self.scene.scenes.get(
                    self.scene.current_scene, {}
                ).get("enemy_scale", 3)
                
                enemy_foot_offset = self.scene.scenes.get(
                    self.scene.current_scene, {}
                ).get("enemy_foot_offset", -50)
                
                if abs(enemy.scale - enemy_scale) > 0.1:
                    print(f"🔄 Düşman ölçeği değişti: {enemy.scale} → {enemy_scale}")
                    enemy.scale = enemy_scale
                    enemy.load_textures()
                
                # Düşman Y pozisyonunu güncelle
                enemy.y = self.RENDER_HEIGHT - 100 - enemy_foot_offset
                print(f"📍 Düşman pozisyonu güncellendi: Y={enemy.y}, foot_offset={enemy_foot_offset}")
    
    def draw_ui(self):
        """UI elemanlarını çiz"""
        # Can barı
        bw, bh = 200, 25
        hp_bar_x = self.RENDER_WIDTH - bw - 10
        
        if self.player_health != self.last_hp or 'hp_bar_bg' not in self.ui_cache:
            self.ui_cache['hp_bar_bg'] = pygame.Surface((bw, bh))
            self.ui_cache['hp_bar_bg'].fill((255, 0, 0))
            self.last_hp = self.player_health
        
        self.render_surface.blit(self.ui_cache['hp_bar_bg'], (hp_bar_x, 20))
        
        hp_width = int(bw * (self.player_health / self.player_max_health))
        pygame.draw.rect(self.render_surface, (0, 255, 0), (hp_bar_x, 20, hp_width, bh))
        pygame.draw.rect(self.render_surface, (0, 0, 0), (hp_bar_x, 20, bw, bh), 3)
        
        # HP text
        hp_key = f"hp_{int(self.player_health)}"
        if hp_key not in self.ui_cache:
            hp_font = self.fonts['default'](28)
            self.ui_cache[hp_key] = hp_font.render(
                f"{int(self.player_health)}/{self.player_max_health}", 
                True, (255, 255, 255)
            )
            self.ui_cache[hp_key + "_shadow"] = hp_font.render(
                f"{int(self.player_health)}/{self.player_max_health}", 
                True, (0, 0, 0)
            )
        
        self.render_surface.blit(self.ui_cache[hp_key + "_shadow"], (hp_bar_x + 7, 22))
        self.render_surface.blit(self.ui_cache[hp_key], (hp_bar_x + 5, 20))
        
        # Kombo göstergesi
        if self.player_combo > 1:
            combo_key = f"combo_{self.player_combo}"
            if combo_key not in self.ui_cache:
                combo_font = self.fonts['default'](56)
                self.ui_cache[combo_key] = combo_font.render(
                    f"COMBO x{self.player_combo}", True, (255, 200, 0)
                )
                glow_font = self.fonts['default'](60)
                self.ui_cache[combo_key + "_glow"] = glow_font.render(
                    f"COMBO x{self.player_combo}", True, (255, 100, 0)
                )
            
            combo_rect = self.ui_cache[combo_key].get_rect(
                center=(self.RENDER_WIDTH // 2, 80)
            )
            glow_rect = self.ui_cache[combo_key + "_glow"].get_rect(
                center=(self.RENDER_WIDTH // 2, 80)
            )
            self.render_surface.blit(self.ui_cache[combo_key + "_glow"], glow_rect)
            self.render_surface.blit(self.ui_cache[combo_key], combo_rect)
        
        # Adrenalin göstergesi
        if self.player_has_adrenaline:
            if 'adr_icon' not in self.ui_cache:
                inj_icon = pygame.Surface((40, 40), pygame.SRCALPHA)
                pygame.draw.circle(inj_icon, (255, 50, 50), (20, 20), 16)
                pygame.draw.circle(inj_icon, (255, 255, 255), (20, 20), 16, 3)
                self.ui_cache['adr_icon'] = inj_icon
                
                inj_font = self.fonts['default'](24)
                self.ui_cache['adr_text'] = inj_font.render(
                    "Adrenalin (X)", True, (255, 255, 255)
                )
                self.ui_cache['adr_text_shadow'] = inj_font.render(
                    "Adrenalin (X)", True, (0, 0, 0)
                )
            
            self.render_surface.blit(self.ui_cache['adr_icon'], (20, 55))
            self.render_surface.blit(self.ui_cache['adr_text_shadow'], (67, 67))
            self.render_surface.blit(self.ui_cache['adr_text'], (65, 65))
        
        if self.player_adrenaline_active:
            time_left = self.player_adrenaline_timer / 1000
            boost_font = self.fonts['default'](30)
            boost_text = boost_font.render(
                f"BOOST: {time_left:.1f}s", True, (255, 100, 100)
            )
            boost_shadow = boost_font.render(
                f"BOOST: {time_left:.1f}s", True, (0, 0, 0)
            )
            self.render_surface.blit(boost_shadow, (22, 107))
            self.render_surface.blit(boost_text, (20, 105))
        
        # FPS göstergesi
        current_fps = self.perf.current_fps
        if 'fps_font' not in self.ui_cache:
            self.ui_cache['fps_font'] = self.fonts['default'](20)
        fps_text = self.ui_cache['fps_font'].render(
            f"FPS: {current_fps}", True, (150, 150, 150)
        )
        self.render_surface.blit(fps_text, (10, 10))
        
        # F5 hint
        if 'hint_text' not in self.ui_cache:
            hint_font = self.fonts['default'](20)
            self.ui_cache['hint_text'] = hint_font.render(
                "F5: Manuel Kayit", True, (150, 150, 150)
            )
        self.render_surface.blit(
            self.ui_cache['hint_text'], 
            (self.RENDER_WIDTH - 200, self.RENDER_HEIGHT - 30)
        )
    
    def draw_game_over(self):
        """Game over ekranı"""
        if 'gameover_text' not in self.ui_cache:
            go_font = self.fonts['default'](80)
            self.ui_cache['gameover_text'] = go_font.render(
                "GAME OVER", True, (255, 255, 255)
            )
            self.ui_cache['gameover_shadow'] = go_font.render(
                "GAME OVER", True, (0, 0, 0)
            )
            
            hint_font = self.fonts['default'](36)
            self.ui_cache['gameover_hint'] = hint_font.render(
                "ESC - Menuye Don", True, (200, 200, 200)
            )
            self.ui_cache['gameover_hint_shadow'] = hint_font.render(
                "ESC - Menuye Don", True, (0, 0, 0)
            )
        
        text_rect = self.ui_cache['gameover_text'].get_rect(
            center=(self.RENDER_WIDTH // 2, self.RENDER_HEIGHT // 2 - 40)
        )
        shadow_rect = self.ui_cache['gameover_shadow'].get_rect(
            center=(self.RENDER_WIDTH // 2 + 3, self.RENDER_HEIGHT // 2 - 37)
        )
        self.render_surface.blit(self.ui_cache['gameover_shadow'], shadow_rect)
        self.render_surface.blit(self.ui_cache['gameover_text'], text_rect)
        
        hint_rect = self.ui_cache['gameover_hint'].get_rect(
            center=(self.RENDER_WIDTH // 2, self.RENDER_HEIGHT // 2 + 40)
        )
        shadow_rect = self.ui_cache['gameover_hint_shadow'].get_rect(
            center=(self.RENDER_WIDTH // 2 + 2, self.RENDER_HEIGHT // 2 + 42)
        )
        self.render_surface.blit(self.ui_cache['gameover_hint_shadow'], shadow_rect)
        self.render_surface.blit(self.ui_cache['gameover_hint'], hint_rect)
    
    def run(self, load_save=False):
        """Ana oyun döngüsü"""
        # Kayıt yükleme
        if load_save:
            self.load_save_data()
        else:
            # Yeni oyunda test düşmanı spawn et
            self.spawn_test_enemy()
        
        running = True
        
        while running:
            dt = self.clock.tick(self.TARGET_FPS)
            
            # FPS tracking
            current_fps = self.perf.update_fps(self.clock)
            
            # Düşük FPS'te frame atlama
            if current_fps < self.MIN_FPS:
                self.frame_skip_counter += 1
                if self.frame_skip_counter % 2 == 0:
                    continue
            else:
                self.frame_skip_counter = 0
            
            # Event handling
            result = self.handle_events()
            if result == "menu":
                return "menu"
            keys = result if isinstance(result, pygame.key.ScancodeWrapper) else pygame.key.get_pressed()
            
            # Timer'ları güncelle
            self.update_timers(dt)
            
            # Hareket
            self.moving = False
            self.update_movement(keys)
            
            # Fizik
            self.update_physics()
            
            # Player rect
            player_rect = self.get_player_rect()
            
            # İğne toplama
            self.update_injectors(player_rect)
            
            # Düşman AI
            self.update_enemies(player_rect, dt)
            
            # Yumruk animasyonu
            self.update_punch_animation(player_rect)
            
            # Karakter animasyonu
            self.update_character_animation()
            
            # Oyuncu görseli
            player_image = self.get_player_image()
            
            # Sahne güncelleme
            self.scene.update(player_rect, keys)
            self.scene.update_dialogue(keys)
            
            # Sağ border kontrolü
            right_border = self.scene.scenes.get(
                self.scene.current_scene, {}
            ).get("right_border", None)
            
            if right_border and player_rect.right > self.RENDER_WIDTH - right_border:
                player_rect.right = self.RENDER_WIDTH - right_border
                self.x = player_rect.centerx
            
            # Ölçek değişimi kontrolü
            self.check_scale_change()
            
            # Pozisyonu güncelle
            self.x = player_rect.centerx
            self.y = player_rect.bottom
            
            # ========== ÇİZİM ==========
            self.scene.draw(player_rect=player_rect, player_image=player_image)
            
            # Düşmanları çiz
            for enemy in self.enemies:
                enemy.draw(self.render_surface)
            
            # İğneleri çiz
            for inj in self.injectors:
                inj.draw(self.render_surface)
            
            # Diyalog
            self.scene.draw_dialogue()
            
            # UI
            self.draw_ui()
            
            # Game over
            if self.player_health <= 0:
                self.draw_game_over()
            
            # Ekrana çiz
            if self.USE_SCALED_RENDER:
                scaled_surface = pygame.transform.scale(
                    self.render_surface, (self.WIDTH, self.HEIGHT)
                )
                self.screen.blit(scaled_surface, (0, 0))
            
            pygame.display.flip()
        
        return "menu"


def start_game(screen, WIDTH, HEIGHT, load_save=False):
    """Oyunu başlat (eski API uyumluluğu için wrapper)"""
    engine = GameEngine(screen, WIDTH, HEIGHT)
    return engine.run(load_save=load_save)