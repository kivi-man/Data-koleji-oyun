# Asset Organization Guide

This directory should contain all game assets. Please organize your assets as follows:

## Directory Structure

```
assets/
├── backgrounds/          # Scene backgrounds
│   ├── background.png
│   ├── background1.png
│   ├── background2.png
│   ├── background3.png
│   ├── background3_1.png
│   ├── background4.png
│   ├── background5.png
│   ├── background6.png
│   ├── background10.png
│   ├── dream1.png
│   ├── dream2.png
│   └── dream3.png
│
├── player/              # Player animations
│   ├── walk/           # Walking animation frames (0.png, 1.png, ...)
│   ├── punch/          # Punching animation frames
│   └── jump/           # Jumping animation frames
│
├── enemy/              # Enemy animations
│   ├── enemy_idle/     # Idle animation frames
│   ├── enemy_walk/     # Walking animation frames
│   ├── enemy_attack/   # Attack animation frames
│   └── enemy_inject/   # Injection animation frames
│
└── stone.png           # Projectile texture
```

## Audio Files

Audio files should be in the `audio/` directory (already referenced in HTML):

```
audio/
├── bgm_normal.mp3      # Normal background music
├── bgm_battle.mp3      # Battle music
├── bgm_dialogue.mp3    # Dialogue music
├── bgm_fight.mp3       # Fight music
├── horror.wav          # Horror music
├── punch.mp3           # Punch sound effect
├── walk.mp3            # Walking sound effect
├── injector.mp3        # Injector sound effect
├── gun.wav             # Gun sound effect
└── jumpscare.wav       # Jumpscare sound effect
```

## Character Images

Place these in the root directory:

- `tunahan.png` - Player idle sprite

## Notes

- All image paths are relative to the game's root directory
- If assets are missing, the game will use colored placeholder rectangles
- Animation frames should be numbered sequentially (0.png, 1.png, 2.png, etc.)
- Recommended image format: PNG with transparency
- Audio formats: MP3 or WAV
