import base64
from PIL import Image
import os

SRC = r'src\assets\wasel-logo-source.png'
with Image.open(SRC) as src_img:
    img = src_img.convert('RGBA')

# Ensure public directories exist
os.makedirs('public/brand/assets/logos/primary', exist_ok=True)
os.makedirs('public/brand/assets/logos/symbols', exist_ok=True)
os.makedirs('public/brand/assets/icons', exist_ok=True)
os.makedirs('public/brand/assets/og', exist_ok=True)
os.makedirs('public/brand/assets/social', exist_ok=True)
os.makedirs('mobile/assets/images', exist_ok=True)
os.makedirs('mobile/android/app/src/main/res/mipmap-xhdpi', exist_ok=True)
os.makedirs('mobile/android/app/src/main/res/mipmap-xxhdpi', exist_ok=True)
os.makedirs('mobile/android/app/src/main/res/mipmap-xxxhdpi', exist_ok=True)

def save_resized(path, size):
    resized = img.resize(size, Image.Resampling.LANCZOS)
    resized.save(path, 'PNG')
    resized.close()
    print(f'Saved {path} ({size})')

# Web brand logos
save_resized('public/brand/assets/logos/primary/logo-default.png', (1024, 1024))
save_resized('public/brand/assets/logos/primary/logo-light.png', (1024, 1024))
save_resized('public/brand/assets/logos/symbols/w-mark.png', (1024, 1024))
save_resized('public/brand/assets/logos/primary/logo-default-64.png', (64, 64))
save_resized('public/brand/assets/logos/primary/logo-default-96.png', (96, 96))
save_resized('public/brand/assets/logos/primary/logo-default-160.png', (160, 160))
save_resized('public/brand/assets/logos/primary/logo-default-280.png', (280, 280))
save_resized('public/brand/assets/logos/primary/logo-default-512.png', (512, 512))
save_resized('public/brand/assets/logos/symbols/symbol-default.png', (1024, 1024))
save_resized('public/brand/assets/og/og-default.png', (1200, 630))

# Favicons
save_resized('public/brand/assets/icons/app-icon-16.png', (16, 16))
save_resized('public/brand/assets/icons/app-icon-32.png', (32, 32))
save_resized('public/brand/assets/icons/app-icon-180.png', (180, 180))
save_resized('public/brand/assets/icons/app-icon-192.png', (192, 192))
save_resized('public/brand/assets/icons/app-icon-512.png', (512, 512))

# Generate favicon.ico with multiple sizes
ico_sizes = [(16, 16), (32, 32), (48, 48)]
ico_images = [img.resize(s, Image.Resampling.LANCZOS) for s in ico_sizes]
with open(SRC, "rb") as f:
    logo_base64 = base64.b64encode(f.read()).decode().strip()
ico_images[0].save('public/brand/assets/icons/favicon.ico', format='ICO', sizes=[(s[0], s[1]) for s in ico_sizes])
print('Saved public/favicon.ico')

# Generate simple favicon.svg (embedded PNG base64 or simple rect)
# Generate simple favicon.svg
svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <image href="data:image/png;base64,{logo_base64}" width="512" height="512"/>
</svg>'''
with open('public/brand/assets/icons/favicon.svg', 'w') as f:
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

# Generate WebP versions for modern browsers
for path, size in WEBP_SIZES.items():
    if os.path.exists(path):
        save_webp(path, size)
