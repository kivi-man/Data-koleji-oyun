"""
Utils Paketi
Oyun için yardımcı modüller
"""

from .storage import (
    SaveManager,
    quick_save,
    quick_load,
    has_save,
    clear_all_saves
)

from .audio import (
    AudioManager,
    get_audio_manager,
    init_audio_manager,
    play_music,
    stop_music,
    play_sound,
    set_music_volume,
    set_sfx_volume,
    GameAudio
)

__all__ = [
    # Storage
    'SaveManager',
    'quick_save',
    'quick_load',
    'has_save',
    'clear_all_saves',
    
    # Audio
    'AudioManager',
    'get_audio_manager',
    'init_audio_manager',
    'play_music',
    'stop_music',
    'play_sound',
    'set_music_volume',
    'set_sfx_volume',
    'GameAudio'
]