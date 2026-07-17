from PIL import Image
import os

input_path = r"C:\Users\Tanmay\.gemini\antigravity-ide\brain\f59c8160-4573-4578-8380-6b70328ce0c1\clinicall_favicon_1783099581866.png"
favicon_output = r"d:\Clinic Development Sales\clinic-frontend\src\app\favicon.ico"
apple_icon_output = r"d:\Clinic Development Sales\clinic-frontend\src\app\apple-icon.png"

print(f"Loading image from {input_path}")
img = Image.open(input_path).convert("RGBA")

datas = img.getdata()
newData = []

for item in datas:
    lumi = max(item[0], item[1], item[2])
    if lumi < 20:
        # Fully transparent
        newData.append((255, 255, 255, 0))
    else:
        # Keep white, map alpha to luminance
        newData.append((255, 255, 255, lumi))

img.putdata(newData)

# Find bounding box to crop excess black/transparent margins
bbox = img.getbbox()
if bbox:
    # Make sure we crop to a square aspect ratio to avoid distortion
    x0, y0, x1, y1 = bbox
    w = x1 - x0
    h = y1 - y0
    side = max(w, h)
    
    # Center the crop
    cx = (x0 + x1) // 2
    cy = (y0 + y1) // 2
    
    new_x0 = max(0, cx - side // 2)
    new_y0 = max(0, cy - side // 2)
    new_x1 = min(img.width, cx + side // 2)
    new_y1 = min(img.height, cy + side // 2)
    
    img = img.crop((new_x0, new_y0, new_x1, new_y1))
    print(f"Cropped to square: {img.size}")

# Resize and save favicon.ico (32x32)
favicon_img = img.resize((32, 32), Image.Resampling.LANCZOS)
favicon_img.save(favicon_output, format="ICO")
print(f"Saved favicon.ico to {favicon_output}")

# Resize and save apple-icon.png (180x180)
apple_img = img.resize((180, 180), Image.Resampling.LANCZOS)
apple_img.save(apple_icon_output, format="PNG")
print(f"Saved apple-icon.png to {apple_icon_output}")
