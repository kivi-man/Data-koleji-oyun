import pygame
import os
import random


class Enemy:
    def __init__(self, x, y, scale=3, screen_width=1536, aggression_range=800):
        self.x = float(x)
        self.y = float(y)
        self.scale = max(0.1, scale)  # Minimum scale
        self.screen_width = screen_width
        self.aggression_range = aggression_range
        
        # SABİT BOYUT AYARLARI
        self.base_width = 60
        self.base_height = 80
        self.width = int(self.base_width * self.scale)
        self.height = int(self.base_height * self.scale)
        
        # Önce temel yapıyı kur
        self.animations = {"idle": [], "walk": [], "attack": [], "inject": [], "retreat": []}
        self.image = None
        
        # Rect'i sabit boyutla oluştur
        self.rect = pygame.Rect(0, 0, self.width, self.height)
        self.rect.midbottom = (int(self.x), int(self.y))
        
        self.load_textures()
        
        # Image kontrolü
        if not self.image:
            self.create_fallback_image()

        # FİZİK
        self.speed = 3.8
        self.retreat_speed = 3.2
        self.escape_speed = 4.5
        self.gravity = 1
        self.velocity_y = 0
        self.on_ground = True

        # AI
        self.state = "idle"
        self.facing_left = False
        self.attack_cooldown = 0
        self.attack_delay = 800
        self.attack_range = 90
        self.attack_active = False
        self.attack_frame_count = 0

        # HASAR
        self.damage = 12

        # GERİ TEPME / STUN / COMBO
        self.stun_timer = 0
        self.retreat_timer = 0
        self.retreat_duration = 200
        self.combo_count = 0
        self.last_hit_time = 0
        self.combo_decay_ms = 2000
        self.base_kb = 25
        self.combo_kb_add = 10
        self.max_kb = 80

        # CAN
        self.max_health = 100
        self.health = 100
        self.alive = True

        # PANİK / KAÇIŞ / ADRENALİN
        self.escape_threshold = 0.3
        self.escaping = False
        self.injecting = False
        self.inject_timer = 0
        self.inject_duration = 2000
        self.adrenaline_boost = False
        self.boost_timer = 0
        self.boost_duration = 4000

        # ANİMASYON
        self.frame_index = 0.0
        self.animation_speed = 0.18
        self.current_animation = "idle"

        self.last_player_rect = None
        self.current_scene = "game"

    def create_fallback_image(self):
        """Yedek görsel oluştur"""
        try:
            self.image = pygame.Surface((self.width, self.height), pygame.SRCALPHA)
            self.image.fill((200, 50, 50))
            print(f"Fallback düşman görseli oluşturuldu: {self.width}x{self.height}")
        except Exception as e:
            print(f"Fallback görsel oluşturulamadı: {e}")
            self.image = pygame.Surface((60, 80), pygame.SRCALPHA)
            self.image.fill((200, 50, 50))

    def load_textures(self):
        """Animasyon yükleme - güvenli"""
        for anim in ["idle", "walk", "attack"]:
            folder = f"enemy_{anim}"
            if os.path.exists(folder):
                try:
                    files = sorted([f for f in os.listdir(folder) if f.lower().endswith(".png")])
                    for file in files:
                        try:
                            img = pygame.image.load(os.path.join(folder, file)).convert_alpha()
                            # SABİT BOYUTA ÖLÇEKLE
                            scaled = pygame.transform.scale(img, (self.width, self.height))
                            self.animations[anim].append(scaled)
                        except Exception as e:
                            print(f"Frame yüklenemedi ({folder}/{file}): {e}")
                except Exception as e:
                    print(f"Klasör okunamadı ({folder}): {e}")

        # Fallback ve kopyalar
        if self.animations["idle"]:
            self.image = self.animations["idle"][0]
            for key in ["inject", "retreat"]:
                if not self.animations[key]:
                    self.animations[key] = self.animations["idle"].copy()
        else:
            self.create_fallback_image()
            for key in self.animations.keys():
                self.animations[key] = [self.image]

    def ai_update(self, player_rect, dt):
        """AI güncelleme"""
        if not self.alive:
            return None

        self.last_player_rect = player_rect
        now = pygame.time.get_ticks()
        
        # Timer güncellemeleri
        self.attack_cooldown = max(0, self.attack_cooldown - dt)
        self.stun_timer = max(0, self.stun_timer - dt)
        self.retreat_timer = max(0, self.retreat_timer - dt)

        # Combo decay
        if now - self.last_hit_time > self.combo_decay_ms:
            self.combo_count = 0

        # Kaçış kontrolü
        if self.health <= self.max_health * self.escape_threshold and not self.injecting and not self.adrenaline_boost:
            self.escaping = True

        # STUN
        if self.stun_timer > 0:
            self.state = "retreat"
            self.attack_active = False
            return None

        # Adrenalin boost
        if self.adrenaline_boost:
            self.boost_timer -= dt
            if self.boost_timer <= 0:
                self.adrenaline_boost = False
                self.speed = 3.8
            return self.aggressive_behavior(player_rect, dt)

        # İğne basma
        if self.injecting:
            self.state = "inject"
            self.inject_timer -= dt
            if self.inject_timer <= 0:
                self.injecting = False
                self.escaping = False
                heal_amount = random.randint(30, 50)
                self.health = min(self.max_health, self.health + heal_amount)
                self.start_adrenaline_boost()
            return None

        # Kaçış modu
        if self.escaping:
            self.escape_from_player(player_rect, dt)
            return None

        return self.aggressive_behavior(player_rect, dt)

    def aggressive_behavior(self, player_rect, dt):
        """Saldırgan davranış"""
        distance = abs(player_rect.centerx - self.x)
        player_left = player_rect.centerx < self.x
        self.facing_left = player_left

        # Saldırı animasyonu
        if self.attack_active:
            self.attack_frame_count += 1
            attack_anim_length = len(self.animations.get("attack", [1]))
            attack_duration = int(attack_anim_length / max(0.01, self.animation_speed))
            
            if self.attack_frame_count >= attack_duration:
                self.attack_active = False
                self.attack_frame_count = 0
                self.state = "idle"
            return None

        # Mesafeye göre durum
        if distance > self.aggression_range:
            self.state = "idle"
            
        elif distance > self.attack_range:
            self.state = "walk"
            if player_left:
                self.x -= self.speed
            else:
                self.x += self.speed
                
        elif self.attack_cooldown <= 0:
            self.state = "attack"
            self.attack_active = True
            self.attack_frame_count = 0
            self.attack_cooldown = self.attack_delay
            self.frame_index = 0

            attack_box = pygame.Rect(self.rect)
            attack_box.inflate_ip(20, 0)
            
            if self.facing_left:
                attack_box.x -= 50
            else:
                attack_box.x += 50

            if attack_box.colliderect(player_rect):
                return "attack"
        else:
            self.state = "idle"

        self.keep_inside_screen()
        return None

    def escape_from_player(self, player_rect, dt):
        """Kaçış"""
        self.state = "walk"
        
        if player_rect.centerx < self.x:
            self.x += self.escape_speed
            self.facing_left = False
        else:
            self.x -= self.escape_speed
            self.facing_left = True

        margin = 50
        if self.x < margin:
            self.x = margin
            self.start_injection()
        elif self.x > self.screen_width - margin:
            self.x = self.screen_width - margin
            self.start_injection()

        self.keep_inside_screen()

    def keep_inside_screen(self):
        """Ekran sınırları"""
        margin = 20
        self.x = max(margin, min(self.x, self.screen_width - margin))
        if self.rect:
            self.rect.midbottom = (int(self.x), int(self.y))

    def start_injection(self):
        """İğne basma"""
        if not self.injecting:
            self.injecting = True
            self.inject_timer = self.inject_duration
            self.state = "inject"
            self.frame_index = 0
            print("Düşman kenarda eğilip kendine adrenalin iğnesi bastı!")

    def start_adrenaline_boost(self):
        """Adrenalin boost"""
        self.adrenaline_boost = True
        self.boost_timer = self.boost_duration
        self.speed = 6.5
        print("Adrenalin etkisiyle düşman yeniden saldırıya geçti!")

    def take_damage(self, dmg):
        """Hasar al"""
        if not self.alive:
            return False

        now = pygame.time.get_ticks()
        
        if now - self.last_hit_time <= self.combo_decay_ms:
            self.combo_count += 1
        else:
            self.combo_count = 1
        self.last_hit_time = now

        self.health -= dmg
        print(f"Düşman hasar aldı! HP: {self.health}/{self.max_health} (Combo: {self.combo_count}x)")
        
        if self.health <= 0:
            self.alive = False
            self.health = 0
            print("Düşman öldü!")
            return True

        # Knockback
        kb = self.base_kb + self.combo_kb_add * (self.combo_count - 1)
        kb = min(kb, self.max_kb)

        if self.last_player_rect:
            if self.last_player_rect.centerx < self.x:
                self.x += kb
            else:
                self.x -= kb

        self.stun_timer = 200
        self.retreat_timer = self.retreat_duration
        self.state = "retreat"
        self.frame_index = 0
        self.attack_active = False
        
        self.keep_inside_screen()
        return False

    def animate(self):
        """Animasyon - güvenli"""
        if self.current_animation != self.state:
            self.current_animation = self.state
            self.frame_index = 0.0

        anim = self.animations.get(self.current_animation, self.animations.get("idle", []))
        
        if not anim:
            if not self.image:
                self.create_fallback_image()
            return
        
        self.frame_index += self.animation_speed

        if self.frame_index >= len(anim):
            self.frame_index = 0.0

        try:
            idx = int(self.frame_index)
            if 0 <= idx < len(anim):
                self.image = anim[idx]
        except Exception as e:
            print(f"Animasyon hatası: {e}")
            self.frame_index = 0.0
            if anim:
                self.image = anim[0]

    def draw(self, screen):
        """Çizim - güvenli"""
        if not self.alive:
            return
        
        if not self.rect or not self.image:
            return
            
        self.rect.midbottom = (int(self.x), int(self.y))
        self.animate()
        
        try:
            img = self.image.copy()
        except:
            return

        # Efektler
        try:
            if self.injecting:
                # Eğilme efekti
                new_height = max(1, int(img.get_height() * 0.6))
                img = pygame.transform.scale(img, (img.get_width(), new_height))
                # Beyazlaştır
                white_overlay = pygame.Surface(img.get_size(), pygame.SRCALPHA)
                white_overlay.fill((255, 255, 255, 120))
                img.blit(white_overlay, (0, 0), special_flags=pygame.BLEND_RGBA_MULT)

            if self.adrenaline_boost:
                red_overlay = pygame.Surface(img.get_size(), pygame.SRCALPHA)
                red_overlay.fill((255, 80, 80, 100))
                img.blit(red_overlay, (0, 0), special_flags=pygame.BLEND_RGBA_ADD)

            if self.stun_timer > 0:
                yellow_overlay = pygame.Surface(img.get_size(), pygame.SRCALPHA)
                yellow_overlay.fill((255, 255, 0, 80))
                img.blit(yellow_overlay, (0, 0), special_flags=pygame.BLEND_RGBA_ADD)

            if self.facing_left:
                img = pygame.transform.flip(img, True, False)

            screen.blit(img, self.rect)
        except Exception as e:
            # Hata durumunda basit çizim
            pygame.draw.rect(screen, (200, 50, 50), self.rect)

        # Can barı
        try:
            bar_w, bar_h = 100, 10
            bar_x = self.rect.centerx - bar_w // 2
            bar_y = self.rect.top - 18
            ratio = max(0.0, min(1.0, self.health / self.max_health))
            
            pygame.draw.rect(screen, (100, 0, 0), (bar_x, bar_y, bar_w, bar_h))
            pygame.draw.rect(screen, (0, 200, 0), (bar_x, bar_y, int(bar_w * ratio), bar_h))
            pygame.draw.rect(screen, (0, 0, 0), (bar_x, bar_y, bar_w, bar_h), 2)
            
            if self.adrenaline_boost:
                boost_text = pygame.font.Font(None, 20).render("BOOST!", True, (255, 100, 100))
                screen.blit(boost_text, (bar_x + bar_w + 5, bar_y - 5))
        except Exception as e:
            pass