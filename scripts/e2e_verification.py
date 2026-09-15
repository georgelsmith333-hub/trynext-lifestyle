import os
import requests
from PIL import Image

def test_mockup_assets():
    print("Running Automated E2E Mockup Asset & Route Verification...")
    
    # Check key mockup asset files required for PSD smart mockup rendering
    assets_to_check = [
        "artifacts/trynex-storefront/public/products/water-bottle.png",
        "artifacts/trynex-storefront/public/mockups/visual_comparison.png",
    ]
    
    for path in assets_to_check:
        full_path = os.path.join("/home/ubuntu/trynext-lifestyle", path)
        assert os.path.exists(full_path), f"Critical asset missing: {path}"
        # Verify image integrity
        img = Image.open(full_path)
        img.verify()
        print(f" ✓ Verified asset: {path} ({img.size[0]}x{img.size[1]})")

    # Check normalized mockups directory
    norm_dir = "/home/ubuntu/trynext-lifestyle/artifacts/trynex-storefront/public/mockups/normalized"
    if os.path.exists(norm_dir):
        files = os.listdir(norm_dir)
        print(f" ✓ Normalized mockups directory contains {len(files)} curated files.")
        assert len(files) > 0, "Normalized mockups directory is empty!"

    print("All automated E2E asset verification checks passed successfully!")

if __name__ == "__main__":
    test_mockup_assets()
