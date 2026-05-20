
import os
from PIL import Image

def get_size(path):
    try:
        with Image.open(path) as img:
            print(f"{path}: {img.size}")
    except Exception as e:
        print(f"{path}: Error {e}")

get_size("backgrounds/Atolye_koridor.png")
get_size("backgrounds/kat1.png")
