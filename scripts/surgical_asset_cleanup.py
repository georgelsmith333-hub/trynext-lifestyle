import os
from PIL import Image, ImageOps
import glob

def clean_image(input_path):
    print(f"Processing {input_path}...")
    img = Image.open(input_path).convert("RGBA")
    width, height = img.size
    
    # We want to identify the garment and force the "studio" background to pure white.
    # The ghosting is caused by pixels that are nearly white but not #FFFFFF.
    
    # Load pixels
    data = img.getdata()
    new_data = []
    
    for item in data:
        # If the pixel is very light (near white), force it to pure white
        # This handles the "studio floor" shadows and gradients
        r, g, b, a = item
        
        # Calculate luminance
        lum = (0.299 * r + 0.587 * g + 0.114 * b)
        
        # Threshold: if it's very light or very transparent, make it pure white opaque
        # This ensures it blends perfectly with the #FFFFFF canvas
        if lum > 240 or a < 5:
            new_data.append((255, 255, 255, 255))
        else:
            new_data.append(item)
            
    img.putdata(new_data)
    
    # Also crop to remove any edge artifacts if they exist
    # (Actually, let's keep the 1024x1024 frame for alignment)
    
    img.save(input_path, "PNG")
    print(f"Saved {input_path}")

def main():
    base_dir = "artifacts/trynex-storefront/public/mockups/normalized"
    pattern = os.path.join(base_dir, "*.png")
    files = glob.glob(pattern)
    
    if not files:
        print(f"No files found in {base_dir}")
        return
        
    print(f"Found {len(files)} files to clean.")
    for f in files:
        try:
            clean_image(f)
        except Exception as e:
            print(f"Error processing {f}: {e}")

if __name__ == "__main__":
    main()
