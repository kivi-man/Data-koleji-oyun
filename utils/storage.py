"""
Kayıt/Yükleme Yönetimi
Oyun kayıtlarını yöneten merkezi sistem
"""

import json
import os
import pygame


class SaveManager:
    """Kayıt yönetimi sınıfı"""
    
    SAVE_FILE = "game_save.json"
    BANYO_SAVE_FILE = "banyo_save.json"
    SETTINGS_FILE = "settings.json"
    
    @staticmethod
    def save_game(player_data, scene_data, extras=None):
        """
        Oyunu kaydet
        
        Args:
            player_data: Oyuncu verileri (dict)
            scene_data: Sahne verileri (dict)
            extras: Ekstra veriler (dict, opsiyonel)
        
        Returns:
            bool: Başarılı mı?
        """
        try:
            save_data = {
                "player": player_data,
                "scene": scene_data,
                "timestamp": pygame.time.get_ticks()
            }
            
            if extras:
                save_data["extras"] = extras
            
            with open(SaveManager.SAVE_FILE, "w", encoding="utf-8") as f:
                json.dump(save_data, f, indent=4, ensure_ascii=False)
            
            print(f"✅ Oyun kaydedildi: {SaveManager.SAVE_FILE}")
            return True
        
        except Exception as e:
            print(f"❌ Kayıt hatası: {e}")
            return False
    
    @staticmethod
    def load_game():
        """
        Oyunu yükle
        
        Returns:
            dict veya None: Kayıt verisi
        """
        if not os.path.exists(SaveManager.SAVE_FILE):
            print("⚠️ Kayıt dosyası bulunamadı")
            return None
        
        try:
            with open(SaveManager.SAVE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            print(f"📂 Kayıt yüklendi: Scene={data.get('scene', {}).get('current_scene')}")
            return data
        
        except Exception as e:
            print(f"❌ Kayıt yükleme hatası: {e}")
            return None
    
    @staticmethod
    def delete_save():
        """Kayıt dosyasını sil"""
        try:
            if os.path.exists(SaveManager.SAVE_FILE):
                os.remove(SaveManager.SAVE_FILE)
                print(f"🗑️ Kayıt silindi: {SaveManager.SAVE_FILE}")
                return True
        except Exception as e:
            print(f"❌ Kayıt silme hatası: {e}")
            return False
    
    @staticmethod
    def save_exists():
        """Kayıt dosyası var mı?"""
        return os.path.exists(SaveManager.SAVE_FILE)
    
    @staticmethod
    def save_banyo_choice(took_medicine):
        """
        Banyo sahnesindeki seçimi kaydet
        
        Args:
            took_medicine: İlaç alındı mı? (bool)
        """
        try:
            data = {"bölüm1": {"took_medicine": took_medicine}}
            with open(SaveManager.BANYO_SAVE_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=4)
            return True
        except Exception as e:
            print(f"❌ Banyo kaydı hatası: {e}")
            return False
    
    @staticmethod
    def load_banyo_choice():
        """Banyo seçimini yükle"""
        if not os.path.exists(SaveManager.BANYO_SAVE_FILE):
            return None
        
        try:
            with open(SaveManager.BANYO_SAVE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data.get("bölüm1", {}).get("took_medicine")
        except:
            return None
    
    @staticmethod
    def save_settings(settings_dict):
        """
        Ayarları kaydet
        
        Args:
            settings_dict: Ayarlar sözlüğü
        """
        try:
            with open(SaveManager.SETTINGS_FILE, "w", encoding="utf-8") as f:
                json.dump(settings_dict, f, indent=4, ensure_ascii=False)
            return True
        except Exception as e:
            print(f"❌ Ayarlar kayıt hatası: {e}")
            return False
    
    @staticmethod
    def load_settings():
        """Ayarları yükle"""
        if not os.path.exists(SaveManager.SETTINGS_FILE):
            return SaveManager.get_default_settings()
        
        try:
            with open(SaveManager.SETTINGS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            return data
        except Exception as e:
            print(f"❌ Ayarlar yükleme hatası: {e}")
            return SaveManager.get_default_settings()
    
    @staticmethod
    def get_default_settings():
        """Varsayılan ayarlar"""
        return {
            "resolution": [1536, 1024],
            "fullscreen": False,
            "music_volume": 50,
            "sfx_volume": 50,
            "difficulty": "Normal"
        }
    
    @staticmethod
    def create_save_snapshot(player, scene, enemies, injectors):
        """
        Mevcut oyun durumundan snapshot oluştur
        
        Args:
            player: Player objesi
            scene: SceneManager objesi
            enemies: Düşman listesi
            injectors: İğne listesi
        
        Returns:
            dict: Kayıt verisi
        """
        player_data = {
            "x": player.x,
            "y": player.y,
            "health": player.health,
            "max_health": player.max_health,
            "has_adrenaline": player.has_adrenaline,
            "combo": player.combo
        }
        
        scene_data = {
            "current_scene": scene.current_scene,
            "dialogue_triggered": list(scene.dialogue_triggered),
            "telsiz_alindi": scene.telsiz_alindi,
            "scene3_done": scene.scene3_done,
            "scene4_ready": scene.scene4_ready,
            "banyo_completed": scene.banyo_completed
        }
        
        enemy_data = []
        for enemy in enemies:
            if enemy.alive:
                enemy_data.append({
                    "x": enemy.x,
                    "y": enemy.y,
                    "health": enemy.health,
                    "scale": enemy.scale
                })
        
        injector_data = []
        for inj in injectors:
            if inj.active:
                injector_data.append({
                    "x": inj.x,
                    "y": inj.y
                })
        
        extras = {
            "enemies": enemy_data,
            "injectors": injector_data
        }
        
        return {
            "player": player_data,
            "scene": scene_data,
            "extras": extras
        }
    
    @staticmethod
    def restore_from_snapshot(snapshot, player, scene, enemy_class, injector_class):
        """
        Snapshot'tan oyun durumunu geri yükle
        
        Args:
            snapshot: Kayıt verisi
            player: Player objesi
            scene: SceneManager objesi
            enemy_class: Enemy sınıfı
            injector_class: AdrenalineInjector sınıfı
        
        Returns:
            tuple: (enemies_list, injectors_list)
        """
        # Player'ı geri yükle
        player_data = snapshot.get("player", {})
        player.x = player_data.get("x", player.x)
        player.y = player_data.get("y", player.y)
        player.health = player_data.get("health", player.health)
        player.has_adrenaline = player_data.get("has_adrenaline", False)
        player.combo = player_data.get("combo", 0)
        
        # Sahneyi geri yükle
        scene_data = snapshot.get("scene", {})
        scene.current_scene = scene_data.get("current_scene", "game")
        scene.dialogue_triggered = set(scene_data.get("dialogue_triggered", []))
        scene.telsiz_alindi = scene_data.get("telsiz_alindi", False)
        scene.scene3_done = scene_data.get("scene3_done", False)
        scene.scene4_ready = scene_data.get("scene4_ready", False)
        scene.banyo_completed = scene_data.get("banyo_completed", False)
        
        # Sahne görsellerini güncelle
        if scene.current_scene in scene.scenes:
            scene_info = scene.scenes[scene.current_scene]
            scene.current_bg = scene_info["bg"]
            scene.char_scale = scene_info["char_scale"]
            scene.foot_offset = scene_info["foot_offset"]
        
        # Düşmanları geri yükle
        enemies = []
        extras = snapshot.get("extras", {})
        for enemy_data in extras.get("enemies", []):
            enemy = enemy_class(
                enemy_data["x"],
                enemy_data["y"],
                scale=enemy_data.get("scale", 3)
            )
            enemy.health = enemy_data["health"]
            enemy.current_scene = scene.current_scene
            enemies.append(enemy)
        
        # İğneleri geri yükle
        injectors = []
        for inj_data in extras.get("injectors", []):
            inj = injector_class(inj_data["x"], inj_data["y"])
            injectors.append(inj)
        
        return enemies, injectors


# Hızlı erişim fonksiyonları
def quick_save(player, scene, enemies, injectors):
    """Hızlı kayıt"""
    snapshot = SaveManager.create_save_snapshot(player, scene, enemies, injectors)
    return SaveManager.save_game(
        snapshot["player"],
        snapshot["scene"],
        snapshot["extras"]
    )


def quick_load():
    """Hızlı yükleme"""
    return SaveManager.load_game()


def has_save():
    """Kayıt var mı?"""
    return SaveManager.save_exists()


def clear_all_saves():
    """Tüm kayıtları temizle"""
    SaveManager.delete_save()
    if os.path.exists(SaveManager.BANYO_SAVE_FILE):
        try:
            os.remove(SaveManager.BANYO_SAVE_FILE)
        except:
            pass