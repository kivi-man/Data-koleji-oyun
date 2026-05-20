import pygame
import os
import random
import math


class AdrenalineInjector:
    """Adrenalin iğnesi - yerde duran ve toplanabilen item"""
    def __init__(self, x, y):
        self.x = float(x)
        self.y = float(y)
        self.rect = pygame.Rect(int(x) - 15, int(y) - 15, 30, 30)
        self.active = True
        self.pulse = 0
        self.pulse_speed = 0.1
        
        # Görsel
        self.create_image()
        
    def create_image(self):
        """İğne görselini oluştur"""
        try:
            self.image = pygame.Surface((30, 30), pygame.SRCALPHA)
            pygame.draw.circle(self.image, (255, 50, 50), (15, 15), 12)
            pygame.draw.circle(self.image, (200, 0, 0), (15, 15), 12, 2)
            pygame.draw.rect(self.image, (150, 150, 150), (12, 5, 6, 10))
        except Exception as e:
            print(f"İğne görseli oluşturulamadı: {e}")
            self.image = pygame.Surface((30, 30), pygame.SRCALPHA)
            pygame.draw.rect(self.image, (255, 50, 50), (0, 0, 30, 30))
        
    def draw(self, screen):
        if not self.active:
            return
        
        try:
            # Pulse animasyonu
            self.pulse += self.pulse_speed
            if self.pulse > 1 or self.pulse < 0:
                self.pulse_speed *= -1
            
            scale = 1.0 + (self.pulse * 0.3)
            new_size = (max(1, int(30 * scale)), max(1, int(30 * scale)))
            scaled = pygame.transform.scale(self.image, new_size)
            rect = scaled.get_rect(center=(int(self.x), int(self.y)))
            screen.blit(scaled, rect)
            
            # Glow efekti
            glow_size = max(10, int(50 * scale))
            glow = pygame.Surface((glow_size, glow_size), pygame.SRCALPHA)
            pygame.draw.circle(glow, (255, 50, 50, 60), (glow_size//2, glow_size//2), glow_size//2)
            glow_rect = glow.get_rect(center=(int(self.x), int(self.y)))
            screen.blit(glow, glow_rect)
        except Exception as e:
            pygame.draw.circle(screen, (255, 50, 50), (int(self.x), int(self.y)), 10)


class Projectile:
    """Fırlatılabilir taş - gerçekçi fizik"""
    def __init__(self, x, y, target_x, target_y, damage=15):
        self.x = float(x)
        self.y = float(y)
        self.damage = damage
        self.active = True
        
        # Fizik değerleri
        dx = target_x - x
        dy = target_y - y - 50
        dist = math.sqrt(dx*dx + dy*dy)
        
        initial_speed = 15
        if dist > 0:
            self.vx = (dx / dist) * initial_speed
            self.vy = (dy / dist) * initial_speed - 8
        else:
            self.vx = initial_speed
            self.vy = -8
        
        self.gravity = 0.5
        self.rotation = 0
        self.rotation_speed = random.randint(10, 20)
        
        self.rect = pygame.Rect(int(x) - 10, int(y) - 10, 20, 20)
        self.lifetime = 180
        
        self.load_texture()
        
    def load_texture(self):
        """Taş texture'ını yükle veya oluştur"""
        stone_file = os.path.join("assets", "stone.png")
        if os.path.exists(stone_file):
            try:
                img = pygame.image.load(stone_file).convert_alpha()
                self.image = pygame.transform.scale(img, (20, 20))
                return
            except Exception as e:
                print(f"Taş texture yüklenemedi: {e}")
        
        # Varsayılan taş görünümü
        try:
            self.image = pygame.Surface((20, 20), pygame.SRCALPHA)
            pygame.draw.circle(self.image, (90, 90, 90), (10, 10), 9)
            pygame.draw.circle(self.image, (70, 70, 70), (10, 10), 9, 2)
            pygame.draw.circle(self.image, (110, 110, 110), (7, 7), 3)
            pygame.draw.circle(self.image, (60, 60, 60), (13, 13), 2)
        except Exception as e:
            print(f"Taş görseli oluşturulamadı: {e}")
            self.image = pygame.Surface((20, 20), pygame.SRCALPHA)
            pygame.draw.rect(self.image, (90, 90, 90), (0, 0, 20, 20))
        
    def update(self):
        if not self.active:
            return
        
        self.vy += self.gravity
        self.x += self.vx
        self.y += self.vy
        
        self.rect.center = (int(self.x), int(self.y))
        self.rotation += self.rotation_speed
        
        self.lifetime -= 1
        if self.lifetime <= 0:
            self.active = False
            
        if self.y > 900:
            self.active = False
            
    def draw(self, screen):
        if not self.active:
            return
        
        try:
            # Taşı döndürerek çiz
            rotated = pygame.transform.rotate(self.image, self.rotation)
            rect = rotated.get_rect(center=self.rect.center)
            screen.blit(rotated, rect)
            
            # Gölge efekti
            shadow = pygame.Surface((15, 8), pygame.SRCALPHA)
            pygame.draw.ellipse(shadow, (0, 0, 0, 60), shadow.get_rect())
            shadow_pos = (self.rect.centerx - 7, self.rect.bottom + 2)
            screen.blit(shadow, shadow_pos)
        except Exception as e:
            pygame.draw.circle(screen, (90, 90, 90), self.rect.center, 8)


class Enemy:
    """Gelişmiş AI düşman"""
    def __init__(self, x, y, scale=3, screen_width=1536, screen_height=1024, aggression_range=800, all_enemies=None):
        self.x = float(x)
        self.y = float(y)
        self.scale = max(0.1, scale)
        self.screen_width = screen_width
        self.screen_height = screen_height
        self.aggression_range = aggression_range
        self.all_enemies = all_enemies or []
        
        # SABİT BOYUT AYARLARI
        self.base_width = 65
        self.base_height = 105
        self.width = int(self.base_width * self.scale)
        self.height = int(self.base_height * self.scale)
        
        # Önce temel değerleri ayarla
        self.animations = {"idle": [], "walk": [], "attack": [], "inject": [], "retreat": [], "block": [], "throw": []}
        self.image = None
        
        # Rect'i sabit boyutla oluştur
        self.rect = pygame.Rect(0, 0, self.width, self.height)
        self.rect.midbottom = (int(self.x), int(self.y))
        
        # Texture'ları yükle
        self.load_textures()
        
        # Image ve rect'i ayarla
        if not self.image:
            self.create_fallback_image()

        # FİZİK
        self.base_speed = 3.8
        self.speed = self.base_speed
        self.retreat_speed = 3.2
        self.escape_speed = 4.5
        self.gravity = 1
        self.velocity_y = 0
        self.on_ground = True

        # AI STATES
        self.state = "idle"
        self.facing_left = False
        self.attack_cooldown = 0
        self.attack_delay = 800
        self.attack_range = 90
        self.attack_active = False
        self.attack_frame_count = 0

        # HASAR & SAVUNMA
        self.damage = 12
        self.blocking = False
        self.block_chance = 0.25
        self.block_cooldown = 0

        # GERİ TEPME / STUN
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
        self.invulnerable = False
        self.invuln_timer = 0

        # KAÇIŞ / ADRENALİN
        self.escape_threshold = 0.3
        self.escaping = False
        self.injecting = False
        self.inject_timer = 0
        self.inject_duration = 2000
        self.adrenaline_boost = False
        self.boost_timer = 0
        self.boost_duration = 5000
        self.has_adrenaline = False

        # PROJEKTİL
        self.projectiles = []
        self.throw_cooldown = 0
        self.throw_delay = 3000
        self.can_throw = True
        self.throw_animation_timer = 0
        self.is_throwing = False

        # İĞNE ARAMA
        self.searching_injector = False
        self.target_injector = None

        # ANİMASYON
        self.frame_index = 0.0
        self.animation_speed = 0.18
        self.current_animation = "idle"

        self.last_player_rect = None
        self.current_scene = "game"
        
        # Görsel efektler
        self.flash_alpha = 0
        self.death_animation_frame = 0

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
        """Animasyon yükleme - Enemy_textures klasöründen"""
        base_folder = "Enemy_textures"
        
        for anim in ["idle", "walk", "attack", "inject"]:
            folder = os.path.join(base_folder, f"enemy_{anim}")
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
                            print(f"Animasyon frame yüklenemedi ({folder}/{file}): {e}")
                except Exception as e:
                    print(f"Klasör okunamadı ({folder}): {e}")

        # Fallback ve kopyalar
        if self.animations["idle"]:
            self.image = self.animations["idle"][0]
            
            # Boş animasyonları doldur
            for key in ["inject", "retreat", "block", "throw"]:
                if not self.animations[key]:
                    self.animations[key] = self.animations["idle"].copy()
        else:
            # Hiç animasyon yoksa fallback oluştur
            self.create_fallback_image()
            for key in self.animations.keys():
                self.animations[key] = [self.image]

    def ai_update(self, player_rect, dt, injectors=None):
        """Ana AI güncelleme"""
        if not self.alive:
            return None

        self.last_player_rect = player_rect
        now = pygame.time.get_ticks()
        
        # Timer güncellemeleri
        self.attack_cooldown = max(0, self.attack_cooldown - dt)
        self.stun_timer = max(0, self.stun_timer - dt)
        self.retreat_timer = max(0, self.retreat_timer - dt)
        self.throw_cooldown = max(0, self.throw_cooldown - dt)
        self.block_cooldown = max(0, self.block_cooldown - dt)
        self.invuln_timer = max(0, self.invuln_timer - dt)
        
        if self.invuln_timer <= 0:
            self.invulnerable = False

        # Combo decay
        if now - self.last_hit_time > self.combo_decay_ms:
            self.combo_count = 0

        # Projektilleri güncelle
        for proj in self.projectiles[:]:
            proj.update()
            if not proj.active:
                self.projectiles.remove(proj)

        # STUN durumu
        if self.stun_timer > 0:
            self.state = "retreat"
            self.attack_active = False
            self.blocking = False
            self.is_throwing = False
            return None

        # Taş atma animasyonu
        if self.is_throwing:
            self.throw_animation_timer -= dt
            if self.throw_animation_timer <= 0:
                self.is_throwing = False
                self.state = "idle"
            return None

        # Adrenalin boost
        if self.adrenaline_boost:
            self.boost_timer -= dt
            if self.boost_timer <= 0:
                self.adrenaline_boost = False
                self.speed = self.base_speed
                self.has_adrenaline = False
            return self.aggressive_behavior(player_rect, dt)

        # İğne basma
        if self.injecting:
            self.state = "inject"
            self.inject_timer -= dt
            if self.inject_timer <= 0:
                self.injecting = False
                self.escaping = False
                self.searching_injector = False
                heal_amount = random.randint(30, 50)
                self.health = min(self.max_health, self.health + heal_amount)
                self.start_adrenaline_boost()
            return None

        # İĞNE ARAMA
        if injectors and self.health < self.max_health * 0.5 and not self.has_adrenaline:
            nearest = self.find_nearest_injector(injectors)
            if nearest and not self.searching_injector:
                self.searching_injector = True
                self.target_injector = nearest
                
        if self.searching_injector and self.target_injector:
            return self.seek_injector(player_rect, dt)

        # Kaçış modu
        if self.health <= self.max_health * self.escape_threshold and not self.has_adrenaline:
            self.escaping = True
            
        if self.escaping:
            self.escape_from_player(player_rect, dt)
            return None

        # Normal saldırgan davranış
        return self.aggressive_behavior(player_rect, dt)

    def find_nearest_injector(self, injectors):
        """En yakın aktif iğneyi bul"""
        nearest = None
        min_dist = float('inf')
        
        for inj in injectors:
            if not inj.active:
                continue
            dist = abs(inj.x - self.x)
            if dist < min_dist:
                min_dist = dist
                nearest = inj
                
        return nearest if min_dist < 500 else None

    def seek_injector(self, player_rect, dt):
        """İğneye doğru git"""
        if not self.target_injector or not self.target_injector.active:
            self.searching_injector = False
            self.target_injector = None
            return None
            
        self.state = "walk"
        
        if self.target_injector.x < self.x - 10:
            self.x -= self.speed
            self.facing_left = True
        elif self.target_injector.x > self.x + 10:
            self.x += self.speed
            self.facing_left = False
        else:
            dist = abs(self.target_injector.x - self.x)
            if dist < 30:
                self.target_injector.active = False
                self.searching_injector = False
                self.target_injector = None
                self.start_injection()
                
        self.keep_inside_screen()
        return None

    def aggressive_behavior(self, player_rect, dt):
        """Saldırgan davranış"""
        distance = abs(player_rect.centerx - self.x)
        player_left = player_rect.centerx < self.x
        self.facing_left = player_left

        if self.attack_active:
            self.attack_frame_count += 1
            attack_anim_length = len(self.animations.get("attack", [1]))
            attack_duration = int(attack_anim_length / max(0.01, self.animation_speed))
            
            if self.attack_frame_count >= attack_duration:
                self.attack_active = False
                self.attack_frame_count = 0
                self.state = "idle"
            return None

        if self.block_cooldown <= 0 and random.random() < 0.05:
            self.blocking = True
            self.state = "block"
            self.block_cooldown = 2000
            return None
            
        if self.blocking:
            if self.block_cooldown <= 0:
                self.blocking = False

        if distance > self.aggression_range:
            self.state = "idle"
            
        elif 250 < distance < 600 and self.throw_cooldown <= 0 and self.can_throw:
            self.throw_projectile(player_rect)
            
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

    def throw_projectile(self, player_rect):
        """Taş fırlat"""
        self.throw_cooldown = self.throw_delay
        self.is_throwing = True
        self.throw_animation_timer = 400
        self.state = "throw"
        self.frame_index = 0
        
        # Taşı düşmanın texture'ının ortasından fırlat (foot offset'ten bağımsız)
        start_x = self.x + (40 if not self.facing_left else -40)
        start_y = self.rect.centery  # Texture'ın tam ortasından
        
        proj = Projectile(start_x, start_y, 
                         player_rect.centerx, player_rect.centery - 40,
                         damage=15)
        self.projectiles.append(proj)
        print(f"🪨 Düşman taş fırlattı!")

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
            print("💉 Düşman kendine iğne basıyor...")

    def start_adrenaline_boost(self):
        """Adrenalin boost"""
        self.adrenaline_boost = True
        self.has_adrenaline = True
        self.boost_timer = self.boost_duration
        self.speed = self.base_speed * 1.7
        print("⚡ Düşman adrenalin boost aldı!")

    def take_damage(self, dmg):
        """Hasar al"""
        if not self.alive or self.invulnerable:
            return False

        if self.blocking:
            dmg = int(dmg * 0.3)
            self.blocking = False
            print(f"🛡️ Düşman blok yaptı! Hasar: {dmg}")

        now = pygame.time.get_ticks()
        
        if now - self.last_hit_time <= self.combo_decay_ms:
            self.combo_count += 1
        else:
            self.combo_count = 1
        self.last_hit_time = now

        self.health -= dmg
        print(f"💥 Düşman hasar aldı! HP: {self.health}/{self.max_health}")
        
        self.flash_alpha = 200
        self.invulnerable = True
        self.invuln_timer = 100
        
        if self.health <= 0:
            self.alive = False
            self.health = 0
            print("☠️ Düşman öldü!")
            return True

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
        self.is_throwing = False
        
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
                if len(self.animations.get("inject", [])) <= 1:
                    white_overlay = pygame.Surface(img.get_size(), pygame.SRCALPHA)
                    white_overlay.fill((200, 255, 200, 100))
                    img.blit(white_overlay, (0, 0), special_flags=pygame.BLEND_RGBA_MULT)

            if self.adrenaline_boost:
                red_overlay = pygame.Surface(img.get_size(), pygame.SRCALPHA)
                red_overlay.fill((255, 80, 80, 100))
                img.blit(red_overlay, (0, 0), special_flags=pygame.BLEND_RGBA_ADD)

            if self.flash_alpha > 0:
                flash_overlay = pygame.Surface(img.get_size(), pygame.SRCALPHA)
                flash_overlay.fill((255, 255, 255, int(self.flash_alpha)))
                img.blit(flash_overlay, (0, 0))
                self.flash_alpha -= 20

            if self.stun_timer > 0:
                yellow_overlay = pygame.Surface(img.get_size(), pygame.SRCALPHA)
                yellow_overlay.fill((255, 255, 0, 80))
                img.blit(yellow_overlay, (0, 0), special_flags=pygame.BLEND_RGBA_ADD)

            if self.blocking:
                blue_overlay = pygame.Surface(img.get_size(), pygame.SRCALPHA)
                blue_overlay.fill((50, 50, 255, 100))
                img.blit(blue_overlay, (0, 0), special_flags=pygame.BLEND_RGBA_ADD)

            if self.facing_left:
                img = pygame.transform.flip(img, True, False)

            screen.blit(img, self.rect)
        except Exception as e:
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
                
            if self.blocking:
                block_text = pygame.font.Font(None, 20).render("BLOCK", True, (100, 100, 255))
                screen.blit(block_text, (bar_x + bar_w + 5, bar_y + 10))
        except Exception as e:
            pass

        # Projektilleri çiz
        for proj in self.projectiles:
            proj.draw(screen)
