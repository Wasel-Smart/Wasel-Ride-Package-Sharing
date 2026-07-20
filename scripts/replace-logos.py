import base64
from PIL import Image
import os

SRC = r'src\assets\ChatGPT Image Jul 10, 2026, 04_55_00 AM.png'
img = Image.open(SRC).convert('RGBA')

# Ensure public directories exist
os.makedirs('public/brand', exist_ok=True)
os.makedirs('mobile/assets/images', exist_ok=True)
os.makedirs('mobile/android/app/src/main/res/mipmap-xhdpi', exist_ok=True)
os.makedirs('mobile/android/app/src/main/res/mipmap-xxhdpi', exist_ok=True)
os.makedirs('mobile/android/app/src/main/res/mipmap-xxxhdpi', exist_ok=True)

def save_resized(path, size):
    resized = img.resize(size, Image.Resampling.LANCZOS)
    resized.save(path, 'PNG')
    print(f'Saved {path} ({size})')

# Web brand logos
save_resized('public/brand/wasel-logo.png', (1024, 1024))
save_resized('public/brand/wasel-logo-light.png', (1024, 1024))
save_resized('public/brand/wasel-w-mark.png', (1024, 1024))
save_resized('public/brand/wasellogo-64.png', (64, 64))
save_resized('public/brand/wasellogo-96.png', (96, 96))
save_resized('public/brand/wasellogo-160.png', (160, 160))
save_resized('public/brand/wasellogo-280.png', (280, 280))
save_resized('public/brand/wasellogo-512.png', (512, 512))

# Favicons
save_resized('public/favicon-16x16.png', (16, 16))
save_resized('public/favicon-32x32.png', (32, 32))
save_resized('public/apple-touch-icon.png', (180, 180))
save_resized('public/icon-192.png', (192, 192))
save_resized('public/icon-512.png', (512, 512))

# Generate favicon.ico with multiple sizes
ico_sizes = [(16, 16), (32, 32), (48, 48)]
ico_images = [img.resize(s, Image.Resampling.LANCZOS) for s in ico_sizes]
ico_images[0].save('public/favicon.ico', format='ICO', sizes=[(s[0], s[1]) for s in ico_sizes])
print('Saved public/favicon.ico')

# Generate simple favicon.svg (embedded PNG base64 or simple rect)
# Generate simple favicon.svg
svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <image href="data:image/png;base64,{base64.b64encode(open(SRC, "rb").read()).decode().strip()}" width="512" height="512"/>
</svg>'''
with open('public/favicon.svg', 'w') as f:
    f.write(svg_content)
print('Saved public/favicon.svg')

# Mobile assets
save_resized('mobile/assets/images/icon.png', (1024, 1024))
save_resized('mobile/assets/images/adaptive-icon.png', (1024, 1024))
save_resized('mobile/assets/images/favicon.png', (48, 48))
save_resized('mobile/assets/images/notification-icon.png', (96, 96))

# Mobile splash (standard Expo splash size)
splash = Image.new('RGBA', (1284, 2778), (255, 255, 255, 255))
splash.paste(img.resize((800, 800), Image.Resampling.LANCZOS), (242, 989), img.resize((800, 800), Image.Resampling.LANCZOS))
splash.save('mobile/assets/images/splash.png', 'PNG')
print('Saved mobile/assets/images/splash.png')

# Android native launcher icons
save_resized('mobile/android/app/src/main/res/mipmap-xhdpi/ic_launcher.png', (72, 72))
save_resized('mobile/android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png', (72, 72))
save_resized('mobile/android/app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.png', (72, 72))

save_resized('mobile/android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png', (96, 96))
save_resized('mobile/android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png', (96, 96))
save_resized('mobile/android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.png', (96, 96))

save_resized('mobile/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png', (144, 144))
save_resized('mobile/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png', (144, 144))
save_resized('mobile/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png', (144, 144))

print('All logos generated successfully.')
