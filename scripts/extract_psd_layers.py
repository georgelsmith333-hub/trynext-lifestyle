import os
from psd_tools import PSDImage

PSD_DIR = "/home/ubuntu/trynext-lifestyle/attached_assets/trynext-mockup-source-kit/psd"
OUT_DIR = "/home/ubuntu/trynext-lifestyle/artifacts/trynex-storefront/public/mockups/extracted"

os.makedirs(OUT_DIR, exist_ok=True)

def process_psd(filepath):
    filename = os.path.basename(filepath)
    name_no_ext = os.path.splitext(filename)[0]
    
    try:
        psd = PSDImage.open(filepath)
        base_img = None
        mask_img = None
        
        for layer in psd:
            layer_name = layer.name.lower()
            if "product photo" in layer_name or "product" in layer_name:
                base_img = layer.topil()
            elif "print zone mask" in layer_name or "mask" in layer_name:
                mask_img = layer.topil()
                
        if base_img:
            base_img.save(os.path.join(OUT_DIR, f"{name_no_ext}-base.png"))
        if mask_img:
            mask_img.save(os.path.join(OUT_DIR, f"{name_no_ext}-mask.png"))
    except Exception as e:
        print(f"Error {filename}: {e}")

if __name__ == "__main__":
    files = [f for f in os.listdir(PSD_DIR) if f.endswith(".psd")]
    for f in sorted(files):
        process_psd(os.path.join(PSD_DIR, f))
    print(f"Successfully processed {len(files)} PSD files.")
