"""
Ses Yönetimi Sistemi
Müzik ve ses efektlerini yöneten merkezi sistem
"""

import pygame
import os


class AudioManager:
    """Ses yönetimi sınıfı"""
    
    def __init__(self):
        """Ses sistemini başlat"""
        try:
            pygame.mixer.init()
            self.music_enabled = True
            self.sfx_enabled = True
        except Exception as e:
            print(f"⚠️ Ses sistemi başlatılamadı: {e}")
            self.music_enabled = False
            self.sfx_enabled = False
        
        self.current_music = None
        self.music_volume = 0.5
        self.sfx_volume = 0.5
        
        # Ses efektleri cache
        self.sound_cache = {}
        
        # Kanal yönetimi
        self.channels = {}
    
    def set_music_volume(self, volume):
        """
        Müzik sesini ayarla
        
        Args:
            volume: 0.0 - 1.0 arası değer
        """
        self.music_volume = max(0.0, min(1.0, volume))
        if self.music_enabled:
            try:
                pygame.mixer.music.set_volume(self.music_volume)
            except:
                pass
    
    def set_sfx_volume(self, volume):
        """
        Ses efekti sesini ayarla
        
        Args:
            volume: 0.0 - 1.0 arası değer
        """
        self.sfx_volume = max(0.0, min(1.0, volume))
    
    def play_music(self, music_file, loop=True, fade_ms=0):
        """
        Müzik çal
        
        Args:
            music_file: Müzik dosyası yolu
            loop: Döngü olsun mu? (bool)
            fade_ms: Fade-in süresi (ms)
        
        Returns:
            bool: Başarılı mı?
        """
        if not self.music_enabled:
            return False
        
        if not os.path.exists(music_file):
            print(f"⚠️ Müzik dosyası bulunamadı: {music_file}")
            return False
        
        # Aynı müzik çalıyorsa tekrar başlatma
        if self.current_music == music_file:
            return True
        
        try:
            pygame.mixer.music.load(music_file)
            pygame.mixer.music.set_volume(self.music_volume)
            
            if loop:
                if fade_ms > 0:
                    pygame.mixer.music.play(-1, fade_ms=fade_ms)
                else:
                    pygame.mixer.music.play(-1)
            else:
                if fade_ms > 0:
                    pygame.mixer.music.play(0, fade_ms=fade_ms)
                else:
                    pygame.mixer.music.play()
            
            self.current_music = music_file
            print(f"🎵 Müzik başlatıldı: {os.path.basename(music_file)}")
            return True
        
        except Exception as e:
            print(f"❌ Müzik çalma hatası: {e}")
            return False
    
    def stop_music(self, fade_ms=0):
        """Müziği durdur"""
        if not self.music_enabled:
            return
        
        try:
            if fade_ms > 0:
                pygame.mixer.music.fadeout(fade_ms)
            else:
                pygame.mixer.music.stop()
            
            self.current_music = None
        except:
            pass
    
    def pause_music(self):
        """Müziği duraklat"""
        if self.music_enabled:
            try:
                pygame.mixer.music.pause()
            except:
                pass
    
    def unpause_music(self):
        """Müziği devam ettir"""
        if self.music_enabled:
            try:
                pygame.mixer.music.unpause()
            except:
                pass
    
    def load_sound(self, sound_file):
        """
        Ses efekti yükle (cache'lenmiş)
        
        Args:
            sound_file: Ses dosyası yolu
        
        Returns:
            pygame.Sound veya None
        """
        if not self.sfx_enabled:
            return None
        
        # Cache'den kontrol et
        if sound_file in self.sound_cache:
            return self.sound_cache[sound_file]
        
        if not os.path.exists(sound_file):
            print(f"⚠️ Ses dosyası bulunamadı: {sound_file}")
            return None
        
        try:
            sound = pygame.mixer.Sound(sound_file)
            sound.set_volume(self.sfx_volume)
            self.sound_cache[sound_file] = sound
            return sound
        except Exception as e:
            print(f"❌ Ses yükleme hatası ({sound_file}): {e}")
            return None
    
    def play_sound(self, sound_file, loops=0):
        """
        Ses efekti çal
        
        Args:
            sound_file: Ses dosyası yolu
            loops: Tekrar sayısı (0 = bir kez)
        
        Returns:
            pygame.Channel veya None
        """
        sound = self.load_sound(sound_file)
        if not sound:
            return None
        
        try:
            channel = sound.play(loops)
            return channel
        except Exception as e:
            print(f"❌ Ses çalma hatası: {e}")
            return None
    
    def play_sound_on_channel(self, sound_file, channel_name, loops=0):
        """
        Belirli bir kanalda ses çal
        
        Args:
            sound_file: Ses dosyası yolu
            channel_name: Kanal adı (str)
            loops: Tekrar sayısı
        
        Returns:
            pygame.Channel veya None
        """
        sound = self.load_sound(sound_file)
        if not sound:
            return None
        
        # Kanal var mı kontrol et
        if channel_name in self.channels:
            channel = self.channels[channel_name]
            if channel and channel.get_busy():
                return channel  # Zaten çalıyor
        
        try:
            channel = sound.play(loops)
            self.channels[channel_name] = channel
            return channel
        except Exception as e:
            print(f"❌ Kanal ses çalma hatası: {e}")
            return None
    
    def stop_channel(self, channel_name):
        """Belirli bir kanalı durdur"""
        if channel_name in self.channels:
            channel = self.channels[channel_name]
            if channel:
                try:
                    channel.stop()
                except:
                    pass
            del self.channels[channel_name]
    
    def is_channel_playing(self, channel_name):
        """Kanal çalıyor mu?"""
        if channel_name not in self.channels:
            return False
        
        channel = self.channels[channel_name]
        if not channel:
            return False
        
        try:
            return channel.get_busy()
        except:
            return False
    
    def stop_all_sounds(self):
        """Tüm ses efektlerini durdur"""
        try:
            pygame.mixer.stop()
            self.channels.clear()
        except:
            pass


# Global AudioManager instance
_audio_manager = None


def get_audio_manager():
    """Global AudioManager'ı al"""
    global _audio_manager
    if _audio_manager is None:
        _audio_manager = AudioManager()
    return _audio_manager


def init_audio_manager():
    """AudioManager'ı başlat"""
    global _audio_manager
    _audio_manager = AudioManager()
    return _audio_manager


# Kısayol fonksiyonlar
def play_music(music_file, loop=True, fade_ms=0):
    """Müzik çal"""
    return get_audio_manager().play_music(music_file, loop, fade_ms)


def stop_music(fade_ms=0):
    """Müziği durdur"""
    get_audio_manager().stop_music(fade_ms)


def play_sound(sound_file, loops=0):
    """Ses efekti çal"""
    return get_audio_manager().play_sound(sound_file, loops)


def set_music_volume(volume):
    """Müzik sesini ayarla (0-100)"""
    get_audio_manager().set_music_volume(volume / 100.0)


def set_sfx_volume(volume):
    """Ses efekti sesini ayarla (0-100)"""
    get_audio_manager().set_sfx_volume(volume / 100.0)


# Oyun için özel ses fonksiyonları
class GameAudio:
    """Oyuna özel ses yönetimi"""
    
    # Müzik dosyaları
    MUSIC_NORMAL = "bgm_normal.mp3"
    MUSIC_BATTLE = "bgm_fight.mp3"
    MUSIC_DIALOGUE = "bgm_dialogue.mp3"
    MUSIC_HORROR = "horror.wav"
    MUSIC_MENU = "bgm_battle.mp3"
    
    # Ses efektleri
    SFX_PUNCH = "punch.wav"
    SFX_WALK = "walk.wav"
    SFX_INJECTOR = "injector.wav"
    SFX_GUN = "gun.wav"
    SFX_JUMPSCARE = "jumpscare.wav"
    SFX_BLIP = "blip.wav"
    
    @staticmethod
    def play_normal_music():
        """Normal müzik"""
        play_music(GameAudio.MUSIC_NORMAL)
    
    @staticmethod
    def play_battle_music():
        """Savaş müziği"""
        play_music(GameAudio.MUSIC_BATTLE)
    
    @staticmethod
    def play_horror_music():
        """Korku müziği"""
        play_music(GameAudio.MUSIC_HORROR)
    
    @staticmethod
    def play_menu_music():
        """Menü müziği"""
        play_music(GameAudio.MUSIC_MENU)
    
    @staticmethod
    def play_punch():
        """Yumruk sesi"""
        play_sound(GameAudio.SFX_PUNCH)
    
    @staticmethod
    def play_walk_loop():
        """Yürüme sesi (döngülü)"""
        return get_audio_manager().play_sound_on_channel(
            GameAudio.SFX_WALK, "walk", loops=-1
        )
    
    @staticmethod
    def stop_walk():
        """Yürüme sesini durdur"""
        get_audio_manager().stop_channel("walk")
    
    @staticmethod
    def play_injector():
        """İğne sesi"""
        play_sound(GameAudio.SFX_INJECTOR)
    
    @staticmethod
    def play_gun():
        """Silah sesi"""
        play_sound(GameAudio.SFX_GUN)
    
    @staticmethod
    def play_jumpscare():
        """Jumpscare sesi"""
        play_sound(GameAudio.SFX_JUMPSCARE)