from PIL import Image
import os

input_path = r"C:\Users\Tanmay\.gemini\antigravity-ide\brain\f59c8160-4573-4578-8380-6b70328ce0c1\clinicall_logo_1783098356713.png"
output_path = r"d:\Clinic Development Sales\clinic-frontend\public\logo.png"

print(f"Loading image from {input_path}")
img = Image.open(input_path).convert("RGBA")
width, height = img.size

datas = img.getdata()
newData = []

for item in datas:
    # The background is black (0,0,0) and logo elements are white (255,255,255).
    # Use the maximum of RGB to define the transparency (alpha).
    lumi = max(item[0], item[1], item[2])
    if lumi < 20:
        # Fully transparent
        newData.append((255, 255, 255, 0))
    else:
        # Keep white, map alpha to luminance for anti-aliasing
        newData.append((255, 255, 255, lumi))

img.putdata(newData)

# Find bounding box of non-transparent pixels to crop excess black space
bbox = img.getbbox()
if bbox:
    img = img.crop(bbox)
    print(f"Cropped logo to bounding box: {bbox}")

# Resize if too large, say max height of 120px to keep aspect ratio and files lightweight
max_height = 120
if img.size[1] > max_height:
    aspect_ratio = img.size[0] / img.size[1]
    new_width = int(max_height * aspect_ratio)
    img = img.resize((new_width, max_height), Image.Resampling.LANCZOS)
    print(f"Resized logo to {new_width}x{max_height}")

# Ensure directory exists and save
os.makedirs(os.path.dirname(output_path), exist_ok=True)
img.save(output_path, "PNG")
print(f"Successfully saved transparent logo to {output_path}")
