import pygame
import os
import sys
import json
import random
from scene import SceneManager
from enemy_advanced import Enemy, AdrenalineInjector

# Ses dosyalarını yükle
def load_sound(filename):
    """Ses dosyası yükle"""
    if os.path.exists(filename):
        try:
            return pygame.mixer.Sound(filename)
        except:
            pass
    return None

def start_game(screen, WIDTH, HEIGHT, load_save=False):
    """Gelişmiş dövüş sistemi ile oyun"""
    GAME_FPS = 60
    
    base_width = 1536
    scale_factor = WIDTH / base_width
    
    WALK_SPEED = int(6 * scale_factor)
    JUMP_FORCE = int(25 * scale_factor)
    GRAVITY = int(1 * scale_factor)
    GROUND_Y = HEIGHT - int(100 * scale_factor)
    PUNCH_DAMAGE = 20

    clock = pygame.time.Clock()

    # Ses efektleri
    pygame.mixer.init()
    punch_sound = load_sound("punch.wav") or load_sound("punch.mp3")
    walk_sound = load_sound("walk.wav") or load_sound("walk.mp3")
    injector_sound = load_sound("injector.wav") or load_sound("injector.mp3")
    
    # Walk ses için kanal
    walk_channel = None

    FOOT_OFFSET = -130
    scene = SceneManager(screen, WIDTH, HEIGHT, default_foot_offset=FOOT_OFFSET)

    # Animasyon yükleme
    def load_anim(folder, scale):
        images = []
        if not os.path.exists(folder):
            return images
        files = sorted(os.listdir(folder), key=lambda s: int(os.path.splitext(s)[0]) if os.path.splitext(s)[0].isdigit() else s)
        for file in files:
            if file.lower().endswith(".png"):
                path = os.path.join(folder, file)
                image = pygame.image.load(path).convert_alpha()
                w, h = image.get_size()
                image = pygame.transform.scale(image, (int(w * scale), int(h * scale)))
                images.append(image)
        return images

    SCALE = scene.get_char_scale()
    walk_images = load_anim("walk", SCALE)
    punch_images = load_anim("punch", SCALE)
    jump_images = load_anim("jump", SCALE)

    if os.path.exists("kivi_man.png"):
        idle_img_raw = pygame.image.load("kivi_man.png").convert_alpha()
    else:
        idle_img_raw = pygame.Surface((60, 80), pygame.SRCALPHA)
        idle_img_raw.fill((200, 200, 200))
    w, h = idle_img_raw.get_size()
    idle_image = pygame.transform.scale(idle_img_raw, (int(w * SCALE), int(h * SCALE)))

    if not punch_images: punch_images = [idle_image]
    if not walk_images: walk_images = [idle_image]
    if not jump_images: jump_images = [idle_image]

    # Oyuncu
    x = WIDTH // 2
    y = HEIGHT - 100 - scene.get_foot_offset()
    vx = 0.0
    vy = 0.0
    on_ground = True
    moving = False
    facing_left = False
    punching = False
    punch_timer = 0
    punch_frame = 0
    punch_frame_delay = GAME_FPS / 12

    # Oyuncu can ve adrenalin
    player_max_health = 100
    player_health = 100
    player_has_adrenaline = False
    player_adrenaline_active = False
    player_adrenaline_timer = 0
    player_adrenaline_duration = 5000
    player_base_speed = WALK_SPEED
    player_speed_multiplier = 1.0
    player_damage_multiplier = 1.0

    # Kombo sistemi
    player_combo = 0
    player_last_hit_time = 0
    player_combo_decay = 1500  # 1.5 saniye
    
    # Görsel efektler
    player_flash_alpha = 0
    player_invulnerable = False
    player_invuln_timer = 0

    # Kayıt yükleme
    if load_save and os.path.exists("game_save.json"):
        try:
            with open("game_save.json", "r") as f:
                save_data = json.load(f)
                x = save_data.get("x", x)
                y = save_data.get("y", y)
                player_health = save_data.get("health", player_health)
                scene.current_scene = save_data.get("scene", scene.current_scene)
        except Exception as e:
            print(f"Kayıt yüklenirken hata: {e}")

    # Düşmanlar ve iğneler
    enemies = []
    injectors = []

    # Test düşmanı
    enemy = Enemy(WIDTH // 2 + 250, HEIGHT - 100 - scene.get_foot_offset(), all_enemies=enemies)
    enemy.current_scene = scene.current_scene
    enemies.append(enemy)

    # Animasyon sayaçları
    walk_frame = 0
    walk_timer = 0
    idle_timer = 0
    jump_frame = 0
    jump_timer = 0
    walk_frame_delay = GAME_FPS / 10
    idle_frame_delay = GAME_FPS / 1
    jump_frame_delay = GAME_FPS / 8

    current_image = idle_image
    SCALE_current = SCALE

    running = True
    last_walking = False
    
    while running:
        dt = clock.tick(GAME_FPS)
        keys = pygame.key.get_pressed()
        moving = False

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                save_game(x, y, player_health, scene.current_scene)
                return "menu"
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    save_game(x, y, player_health, scene.current_scene)
                    return "menu"
                elif event.key == pygame.K_e and not punching:
                    punching = True
                    facing_left = False
                    punch_frame = 0
                    punch_timer = 0
                    if punch_sound:
                        punch_sound.play()
                elif event.key == pygame.K_q and not punching:
                    punching = True
                    facing_left = True
                    punch_frame = 0
                    punch_timer = 0
                    if punch_sound:
                        punch_sound.play()
                elif event.key == pygame.K_x and player_has_adrenaline and not player_adrenaline_active:
                    # Adrenalin kullan
                    player_has_adrenaline = False
                    player_adrenaline_active = True
                    player_adrenaline_timer = player_adrenaline_duration
                    player_health = min(player_max_health, player_health + 30)
                    player_speed_multiplier = 1.5
                    player_damage_multiplier = 1.5
                    if injector_sound:
                        injector_sound.play()
                    print("✨ Oyuncu adrenalin kullandı! +30 HP, +50% hız, +50% hasar")

        # Timer güncellemeleri
        now = pygame.time.get_ticks()
        player_invuln_timer = max(0, player_invuln_timer - dt)
        if player_invuln_timer <= 0:
            player_invulnerable = False
            
        # Adrenalin timer
        if player_adrenaline_active:
            player_adrenaline_timer -= dt
            if player_adrenaline_timer <= 0:
                player_adrenaline_active = False
                player_speed_multiplier = 1.0
                player_damage_multiplier = 1.0
                print("Adrenalin etkisi bitti")

        # Kombo decay
        if now - player_last_hit_time > player_combo_decay:
            player_combo = 0

        # Hareket
        current_walk_speed = int(player_base_speed * player_speed_multiplier)
        
        if not punching and not scene.dialogue.active:
            is_walking = False
            if keys[pygame.K_LEFT]:
                x -= current_walk_speed
                moving = True
                facing_left = True
                is_walking = True
            if keys[pygame.K_RIGHT]:
                x += current_walk_speed
                moving = True
                facing_left = False
                is_walking = True
            if keys[pygame.K_UP] and on_ground and not punching:
                vy = -JUMP_FORCE
                on_ground = False
                
            # Yürüme sesi
            if is_walking and on_ground and walk_sound:
                if not last_walking:
                    if walk_channel is None or not walk_channel.get_busy():
                        walk_channel = walk_sound.play(-1)  # Loop
            else:
                if walk_channel and walk_channel.get_busy():
                    walk_channel.stop()
            last_walking = is_walking

        vy += GRAVITY
        if on_ground and vy > 0:
            vy = 0

        vx *= 0.98
        vy *= 0.999
        x += vx
        y += vy

        foot_offset = scene.get_foot_offset()
        if y >= HEIGHT - 100 - foot_offset:
            y = HEIGHT - 100 - foot_offset
            vy = 0
            on_ground = True
        else:
            on_ground = False

        player_rect = pygame.Rect(int(x - 40), int(y - 100), 80, 100)

        # İğne toplama
        for inj in injectors[:]:
            if inj.active and player_rect.colliderect(inj.rect):
                inj.active = False
                injectors.remove(inj)
                player_has_adrenaline = True
                if injector_sound:
                    injector_sound.play()
                print("💉 Oyuncu adrenalin iğnesi topladı!")

        # Düşman AI ve çarpışma (Diyalog aktifse düşmanlar hareket etmez)
        for enemy in enemies[:]:
            if not enemy.alive:
                # Ölü düşman - iğne düşürme
                if random.random() < 0.3:  # %30 şans
                    new_inj = AdrenalineInjector(enemy.x, enemy.y - 20)
                    injectors.append(new_inj)
                    print(f"💉 Düşman iğne düşürdü: ({enemy.x}, {enemy.y})")
                enemies.remove(enemy)
                continue
            
            # Diyalog aktifse düşman AI'ını çalıştırma
            if scene.dialogue.is_active():
                enemy.state = "idle"
                continue
                
            ai_result = enemy.ai_update(player_rect, dt, injectors)
            
            # Düşman saldırısı
            if ai_result == "attack" and not player_invulnerable:
                damage = enemy.damage
                player_health -= damage
                player_health = max(player_health, 0)
                player_flash_alpha = 200
                player_invulnerable = True
                player_invuln_timer = 500
                print(f"🩸 Oyuncu hasar aldı: {damage} HP")
                
            # Projektil çarpması
            for proj in enemy.projectiles[:]:
                if proj.active and player_rect.colliderect(proj.rect):
                    proj.active = False
                    if not player_invulnerable:
                        player_health -= proj.damage
                        player_health = max(player_health, 0)
                        player_flash_alpha = 200
                        player_invulnerable = True
                        player_invuln_timer = 300
                        print(f"🪨 Taş çarptı: {proj.damage} HP")

        # Yumruk animasyonu ve hasar
        if punching:
            punch_timer += 1
            if punch_timer >= punch_frame_delay:
                punch_timer = 0
                punch_frame += 1
                
            punch_range = pygame.Rect(int(x), int(y - 100), 60, 100)
            if facing_left:
                punch_range.x -= 60
                
            # Hasar frame'leri (1-2)
            if 1 <= punch_frame <= 2:
                for enemy in enemies:
                    if enemy.alive and punch_range.colliderect(enemy.rect):
                        # Kombo hesapla
                        if now - player_last_hit_time <= player_combo_decay:
                            player_combo += 1
                        else:
                            player_combo = 1
                        player_last_hit_time = now
                        
                        # Hasar hesapla
                        combo_mult = 1.0 + (player_combo - 1) * 0.3  # Her combo için +30%
                        total_damage = int(PUNCH_DAMAGE * combo_mult * player_damage_multiplier)
                        
                        is_killed = enemy.take_damage(total_damage)
                        print(f"👊 Oyuncu vurdu! Combo: {player_combo}x, Hasar: {total_damage}")
                        
            if punch_frame >= len(punch_images):
                punching = False
                punch_frame = 0
            else:
                current_image = punch_images[punch_frame]

        elif not on_ground:
            jump_timer += 1
            if jump_timer >= jump_frame_delay:
                jump_timer = 0
                jump_frame = (jump_frame + 1) % len(jump_images)
            current_image = jump_images[jump_frame]

        elif moving and on_ground:
            walk_timer += 1
            if walk_timer >= walk_frame_delay:
                walk_timer = 0
                walk_frame = (walk_frame + 1) % len(walk_images)
            current_image = walk_images[walk_frame]

        else:
            idle_timer += 1
            if idle_timer >= idle_frame_delay:
                idle_timer = 0
            current_image = idle_image

        # Oyuncu görselini hazırla
        img = current_image.copy()
        
        # Adrenalin efekti
        if player_adrenaline_active:
            red_overlay = pygame.Surface(img.get_size(), pygame.SRCALPHA)
            red_overlay.fill((255, 100, 100, 80))
            img.blit(red_overlay, (0, 0), special_flags=pygame.BLEND_RGBA_ADD)
            
        # Hasar flash
        if player_flash_alpha > 0:
            flash_overlay = pygame.Surface(img.get_size(), pygame.SRCALPHA)
            flash_overlay.fill((255, 255, 255, int(player_flash_alpha)))
            img.blit(flash_overlay, (0, 0))
            player_flash_alpha -= 15

        if facing_left:
            img = pygame.transform.flip(img, True, False)

        # Sahne güncelleme
        scene.update(player_rect, keys)
        scene.update_dialogue(keys)

        right_border = scene.scenes.get(scene.current_scene, {}).get("right_border", None)
        if right_border:
            max_x = WIDTH - right_border
            if player_rect.right > max_x:
                player_rect.right = max_x
                x = player_rect.centerx

        x = player_rect.centerx
        y = player_rect.bottom

        # --- ÇİZİM ---
        scene.draw(player_rect=player_rect, player_image=img)

        # Düşmanları çiz
        for enemy in enemies:
            enemy.draw(screen)

        # İğneleri çiz
        for inj in injectors:
            inj.draw(screen)

        # Diyalog
        scene.draw_dialogue()

        # UI - Can barı
        bw, bh = 150, 15
        pygame.draw.rect(screen, (255, 0, 0), (20, 20, bw, bh))
        pygame.draw.rect(screen, (0, 255, 0), (20, 20, int(bw * (player_health / player_max_health)), bh))
        pygame.draw.rect(screen, (0, 0, 0), (20, 20, bw, bh), 2)
        
        # Can sayısı
        hp_text = pygame.font.Font(None, 24).render(f"{int(player_health)}/{player_max_health}", True, (255, 255, 255))
        screen.blit(hp_text, (25, 22))

        # Kombo göstergesi
        if player_combo > 1:
            combo_text = pygame.font.Font(None, 48).render(f"COMBO x{player_combo}", True, (255, 200, 0))
            combo_rect = combo_text.get_rect(center=(WIDTH // 2, 60))
            # Glow efekti
            glow_text = pygame.font.Font(None, 50).render(f"COMBO x{player_combo}", True, (255, 100, 0))
            glow_rect = glow_text.get_rect(center=(WIDTH // 2, 60))
            screen.blit(glow_text, glow_rect)
            screen.blit(combo_text, combo_rect)

        # Adrenalin göstergesi
        if player_has_adrenaline:
            inj_icon = pygame.Surface((30, 30), pygame.SRCALPHA)
            pygame.draw.circle(inj_icon, (255, 50, 50), (15, 15), 12)
            screen.blit(inj_icon, (20, 45))
            inj_text = pygame.font.Font(None, 20).render("Adrenalin (X)", True, (255, 255, 255))
            screen.blit(inj_text, (55, 50))
            
        if player_adrenaline_active:
            time_left = player_adrenaline_timer / 1000
            boost_text = pygame.font.Font(None, 24).render(f"BOOST: {time_left:.1f}s", True, (255, 100, 100))
            screen.blit(boost_text, (20, 75))

        # Game over
        if player_health <= 0:
            font = pygame.font.SysFont(None, 72)
            text = font.render("GAME OVER", True, (255, 255, 255))
            screen.blit(text, (WIDTH // 2 - 180, HEIGHT // 2 - 50))
            
            hint_font = pygame.font.SysFont(None, 40)
            hint_text = hint_font.render("ESC - Menüye Dön", True, (200, 200, 200))
            screen.blit(hint_text, (WIDTH // 2 - 150, HEIGHT // 2 + 30))

        pygame.display.flip()

    return "menu"


def save_game(x, y, health, scene):
    """Oyunu kaydet"""
    try:
        save_data = {
            "x": x,
            "y": y,
            "health": health,
            "scene": scene
        }
        with open("game_save.json", "w") as f:
            json.dump(save_data, f, indent=4)
        print("Oyun kaydedildi!")
    except Exception as e:
        print(f"Kayıt hatası: {e}")


if __name__ == "__main__":
    pygame.init()
    WIDTH, HEIGHT = 1536, 1024
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Data Agents - Advanced Combat")
    start_game(screen, WIDTH, HEIGHT)
    pygame.quit()
    sys.exit()