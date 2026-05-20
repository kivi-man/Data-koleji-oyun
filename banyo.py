import pygame
import os
import json
from dialogue import DialogueSystem

def start(screen, player_rect):
    pygame.init()
    width, height = screen.get_size()

    # --- Müzik - audio klasöründen ---
    bgm_file = os.path.join("audio", "bgm_dialogue.mp3")
    if os.path.exists(bgm_file):
        try:
            pygame.mixer.music.load(bgm_file)
            pygame.mixer.music.play(-1)
        except Exception as e:
            print("Müzik çalarken hata:", e)

    # --- Arka plan ve görseller ---
    bg_file = os.path.join("backgrounds", "background_banyo.png")
    ilac_img_file = os.path.join("assets", "Ilac.png")
    ilaci_alma_img_file = os.path.join("assets", "ilaci_alma.png")

    bg = pygame.Surface((width, height))
    if os.path.exists(bg_file):
        bg_img = pygame.image.load(bg_file).convert()
        bg = pygame.transform.scale(bg_img, (width, height))
    else:
        bg.fill((40, 30, 50))  # Mor-gri fallback

    ilac_img = pygame.Surface((130, 130), pygame.SRCALPHA)
    if os.path.exists(ilac_img_file):
        ilac_img = pygame.image.load(ilac_img_file).convert_alpha()
    else:
        # Fallback ilaç kutusu çiz
        ilac_img.fill((255, 255, 255, 0))
        pygame.draw.rect(ilac_img, (255, 255, 255), (10, 30, 110, 90))
        pygame.draw.rect(ilac_img, (255, 0, 0), (55, 40, 20, 60))
        pygame.draw.rect(ilac_img, (255, 0, 0), (35, 65, 60, 20))

    ilaci_alma_img = pygame.Surface((50, 50), pygame.SRCALPHA)
    if os.path.exists(ilaci_alma_img_file):
        ilaci_alma_img = pygame.image.load(ilaci_alma_img_file).convert_alpha()
    else:
        # Fallback X işareti çiz
        ilaci_alma_img.fill((255, 255, 255, 0))
        pygame.draw.line(ilaci_alma_img, (255, 0, 0), (10, 10), (40, 40), 5)
        pygame.draw.line(ilaci_alma_img, (255, 0, 0), (40, 10), (10, 40), 5)

    # --- Diyalog ---
    dialogue = DialogueSystem(screen, width, height)
    dialogues = [
        ("Tunahan", "Annemi bile kandırmışlar..."),
        ("Tunahan", "Data agent olduğum ilk günden ifşa oldum"),
        ("Tunahan", "ve bana kaçak deli raporumu yazdılar?"),
        ("Tunahan", "Bu çok korkutucu"),
        ("Tunahan", "Ya da delirdim"),
        ("Oyun", "Kararını seç: İlacı alacak mısın, almayacak mısın?")
    ]
    dialogue.start(dialogues)

    clock = pygame.time.Clock()
    running = True
    selection_phase = False
    selected = 0  # 0: ilacı al (sağ), 1: ilacı alma (sol)
    took_medicine = None

    # Font yükle - fonts klasöründen
    font_path = os.path.join("fonts", "pixel_font.ttf")
    if os.path.exists(font_path):
        try:
            ui_font = pygame.font.Font(font_path, 24)
        except:
            ui_font = pygame.font.Font(None, 24)
    else:
        ui_font = pygame.font.Font(None, 24)

    while running:
        screen.blit(bg, (0, 0))

        # Diyalog göster
        if dialogue.is_active():
            dialogue.update(pygame.time.get_ticks() % 100, pygame.key.get_pressed())
            dialogue.draw()
        else:
            selection_phase = True

        # Seçenekler
        if selection_phase:
            mouse_x, mouse_y = pygame.mouse.get_pos()
            if mouse_x > width // 2:
                selected = 0  # sağ
            else:
                selected = 1  # sol

            # Ekranın yarısını kırmızı saydam ile highlight
            overlay = pygame.Surface((width // 2, height), pygame.SRCALPHA)
            overlay.fill((255, 0, 0, 100))  # saydam kırmızı
            if selected == 0:
                screen.blit(overlay, (width // 2, 0))  # sağ
            else:
                screen.blit(overlay, (0, 0))  # sol

            # Görseller ve metinler
            # Sağ taraf: ilacı al
            ilac_pos = (width - 150, height // 2)
            screen.blit(ilac_img, ilac_pos)
            text_al = ui_font.render("Ilaci al (XP duser, zorba ihtimali azalir)", True, (255,255,255))
            screen.blit(text_al, (width - 400, height // 2 - 30))

            # Sol taraf: ilacı alma
            ilaci_alma_pos = (100, height // 2)
            screen.blit(ilaci_alma_img, ilaci_alma_pos)
            text_alma = ui_font.render("Ilaci alma (XP cok gelir, zorba ihtimali yuksek)", True, (255,255,255))
            screen.blit(text_alma, (50, height // 2 - 30))

        pygame.display.flip()

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN:
                if selection_phase and event.key == pygame.K_RETURN:
                    took_medicine = selected == 0
                    save_data = {"bölüm1": {"took_medicine": took_medicine}}
                    with open("banyo_save.json", "w") as f:
                        json.dump(save_data, f, indent=4)
                    
                    # Seçim sonrası son diyalog
                    final_dialogue = DialogueSystem(screen, width, height)
                    final_dialogue.start([
                        ("Tunahan", "Ahh uyumalıyım uykum var")
                    ])
                    
                    # Son dialogu göster
                    final_running = True
                    while final_running:
                        screen.blit(bg, (0, 0))
                        final_dialogue.update(pygame.time.get_ticks() % 100, pygame.key.get_pressed())
                        final_dialogue.draw()
                        
                        if not final_dialogue.is_active():
                            final_running = False
                        
                        pygame.display.flip()
                        
                        for ev in pygame.event.get():
                            if ev.type == pygame.QUIT:
                                final_running = False
                                running = False
                        
                        clock.tick(60)
                    
                    running = False

        clock.tick(60)

    return {"took_medicine": took_medicine}