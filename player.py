"""
Oyuncu Sınıfı
Oyuncunun tüm özelliklerini ve davranışlarını içerir
"""

import pygame
import os


class Player:
    """Oyuncu karakteri"""
    
    def __init__(self, x, y, scale=4):
        self.x = float(x)
        self.y = float(y)
        self.scale = scale
        
        # Fizik
        self.vx = 0.0
        self.vy = 0.0
        self.speed = 6
        self.jump_force = 25
        self.gravity = 1
        self.on_ground = True
        
        # Durum
        self.facing_left = False
        self.moving = False
        self.punching = False
        self.punch_frame = 0
        self.punch_timer = 0
        
        # Can ve güç
        self.max_health = 100
        self.health = 100
        self.has_adrenaline = False
        self.adrenaline_active = False
        self.adrenaline_timer = 0
        self.adrenaline_duration = 5000
        
        # Buff'lar
        self.speed_multiplier = 1.0
        self.damage_multiplier = 1.0
        
        # Kombo
        self.combo = 0
        self.last_hit_time = 0
        self.combo_decay = 1500
        
        # Görsel efektler
        self.flash_alpha = 0
        self.invulnerable = False
        self.invuln_timer = 0
        
        # Animasyonlar
        self.animations = {}
        self.current_animation = "idle"
        self.frame_index = 0
        self.animation_speed = 0.15
        
        # Rect
        self.rect = pygame.Rect(int(x - 40), int(y - 100), 80, 100)
        
        self.load_animations()
    
    def load_animations(self):
        """Animasyonları yükle"""
        # Idle
        if os.path.exists("kivi_man.png"):
            idle_img = pygame.image.load("kivi_man.png").convert_alpha()
            w, h = idle_img.get_size()
            self.animations['idle'] = [
                pygame.transform.scale(idle_img, (int(w * self.scale), int(h * self.scale)))
            ]
        else:
            # Fallback
            surf = pygame.Surface((int(60 * self.scale), int(80 * self.scale)), pygame.SRCALPHA)
            surf.fill((200, 200, 200))
            self.animations['idle'] = [surf]
        
        # Walk, punch, jump
        for anim_name in ['walk', 'punch', 'jump']:
            folder = anim_name
            if os.path.exists(folder):
                frames = []
                files = sorted([f for f in os.listdir(folder) if f.endswith('.png')])
                for file in files:
                    img = pygame.image.load(os.path.join(folder, file)).convert_alpha()
                    w, h = img.get_size()
                    scaled = pygame.transform.scale(img, (int(w * self.scale), int(h * self.scale)))
                    frames.append(scaled)
                if frames:
                    self.animations[anim_name] = frames
        
        # Fallback: idle kullan
        for key in ['walk', 'punch', 'jump']:
            if key not in self.animations:
                self.animations[key] = self.animations['idle']
    
    def update(self, dt, keys, scene_foot_offset=0):
        """Güncelleme"""
        # Timer'lar
        self.invuln_timer = max(0, self.invuln_timer - dt)
        if self.invuln_timer <= 0:
            self.invulnerable = False
        
        if self.adrenaline_active:
            self.adrenaline_timer -= dt
            if self.adrenaline_timer <= 0:
                self.end_adrenaline()
        
        # Kombo decay
        now = pygame.time.get_ticks()
        if now - self.last_hit_time > self.combo_decay:
            self.combo = 0
        
        # Hareket
        if not self.punching:
            self.moving = False
            current_speed = self.speed * self.speed_multiplier
            
            if keys[pygame.K_LEFT]:
                self.x -= current_speed
                self.moving = True
                self.facing_left = True
            
            if keys[pygame.K_RIGHT]:
                self.x += current_speed
                self.moving = True
                self.facing_left = False
            
            if keys[pygame.K_UP] and self.on_ground:
                self.vy = -self.jump_force
                self.on_ground = False
        
        # Fizik
        self.vy += self.gravity
        if self.on_ground and self.vy > 0:
            self.vy = 0
        
        self.vx *= 0.98
        self.vy *= 0.999
        self.x += self.vx
        self.y += self.vy
        
        # Zemin kontrolü
        ground_y = 924 - scene_foot_offset  # 1024 - 100
        if self.y >= ground_y:
            self.y = ground_y
            self.vy = 0
            self.on_ground = True
        else:
            self.on_ground = False
        
        # Rect güncelle
        self.rect.centerx = int(self.x)
        self.rect.bottom = int(self.y)
        
        # Animasyon güncelle
        self.update_animation()
    
    def update_animation(self):
        """Animasyon durumunu güncelle"""
        if self.punching:
            anim = "punch"
        elif not self.on_ground:
            anim = "jump"
        elif self.moving:
            anim = "walk"
        else:
            anim = "idle"
        
        if anim != self.current_animation:
            self.current_animation = anim
            self.frame_index = 0
        
        self.frame_index += self.animation_speed
        frames = self.animations.get(self.current_animation, self.animations['idle'])
        if self.frame_index >= len(frames):
            if self.current_animation == "punch":
                self.punching = False
            self.frame_index = 0
    
    def start_punch(self, facing_left):
        """Yumruk başlat"""
        self.punching = True
        self.facing_left = facing_left
        self.frame_index = 0
        self.punch_frame = 0
    
    def use_adrenaline(self):
        """Adrenalin kullan"""
        if not self.has_adrenaline or self.adrenaline_active:
            return False
        
        self.has_adrenaline = False
        self.adrenaline_active = True
        self.adrenaline_timer = self.adrenaline_duration
        self.health = min(self.max_health, self.health + 30)
        self.speed_multiplier = 1.5
        self.damage_multiplier = 1.5
        return True
    
    def end_adrenaline(self):
        """Adrenalin etkisi biter"""
        self.adrenaline_active = False
        self.speed_multiplier = 1.0
        self.damage_multiplier = 1.0
    
    def take_damage(self, damage):
        """Hasar al"""
        if self.invulnerable:
            return False
        
        self.health -= damage
        self.health = max(0, self.health)
        self.flash_alpha = 200
        self.invulnerable = True
        self.invuln_timer = 500
        return True
    
    def get_image(self):
        """Mevcut frame'i döndür"""
        frames = self.animations.get(self.current_animation, self.animations['idle'])
        idx = int(self.frame_index) % len(frames)
        img = frames[idx].copy()
        
        # Efektler
        if self.adrenaline_active:
            overlay = pygame.Surface(img.get_size(), pygame.SRCALPHA)
            overlay.fill((255, 100, 100, 80))
            img.blit(overlay, (0, 0), special_flags=pygame.BLEND_RGBA_ADD)
        
        if self.flash_alpha > 0:
            overlay = pygame.Surface(img.get_size(), pygame.SRCALPHA)
            overlay.fill((255, 255, 255, int(self.flash_alpha)))
            img.blit(overlay, (0, 0))
            self.flash_alpha -= 15
        
        if self.facing_left:
            img = pygame.transform.flip(img, True, False)
        
        return img
    
    def get_punch_rect(self):
        """Yumruk çarpışma alanı"""
        punch_rect = pygame.Rect(self.rect)
        punch_rect.width = 60
        punch_rect.height = 100
        
        if self.facing_left:
            punch_rect.x = self.rect.left - 60
        else:
            punch_rect.x = self.rect.right
        
        return punch_rect
    
    def draw(self, surface):
        """Çizim"""
        img = self.get_image()
        rect = img.get_rect(midbottom=(self.rect.centerx, self.rect.bottom))
        surface.blit(img, rect)