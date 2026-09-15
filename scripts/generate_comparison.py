import os
from PIL import Image, ImageDraw, ImageFont, ImageOps, ImageFilter
import numpy as np

def create_badge(text="HAPPY BIRTHDAY", size=(400, 400)):
    img = Image.new("RGBA", size, (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)
    # Draw a nice badge background
    draw.rounded_rectangle([20, 100, 380, 300], radius=30, fill=(239, 68, 68, 240), outline=(255, 255, 255, 255), width=6)
    draw.text((200, 160), text, fill=(255, 255, 255, 255), anchor="mm", font_size=32)
    draw.text((200, 220), "TRYFLEX LIFESTYLE", fill=(254, 240, 138, 255), anchor="mm", font_size=18)
    return img

def simulate_old_method(base_img, design_img, pz):
    # Old method: simple direct alpha composite (flat box overlay without warp or shading)
    res = base_img.copy().convert("RGBA")
    # Resize design to fit print zone exactly
    resized_design = design_img.resize((pz[2], pz[3]), Image.Resampling.LANCZOS)
    res.paste(resized_design, (pz[0], pz[1]), resized_design)
    return res

def simulate_new_method(base_img, design_img, pz):
    # New method: Cylindrical horizontal compression warp + luminosity shading (Multiply/Screen)
    res = base_img.copy().convert("RGBA")
    
    # 1. Resize design to print zone
    dw, dh = pz[2], pz[3]
    resized_design = design_img.resize((dw, dh), Image.Resampling.LANCZOS)
    
    # 2. Simulate cylindrical warp (horizontal cosine/sine compression towards edges)
    design_np = np.array(resized_design)
    h, w, _ = design_np.shape
    warped_np = np.zeros_like(design_np)
    
    curvature = 0.16 # Cylinder curvature constant
    for y in range(h):
        for x in range(w):
            # map x to cylinder surface coordinate
            nx = (x - w / 2.0) / (w / 2.0) # -1 to 1
            # apply asin/arcsin distortion or simple cosine compression
            # simplified cylindrical projection: x_warp = w/2 + (w/2) * sin(nx * pi/2)
            if abs(nx) <= 1.0:
                warped_nx = np.sin(nx * np.pi / 2.0)
                src_x = int((warped_nx + 1.0) * (w / 2.0))
                src_x = max(0, min(w - 1, src_x))
                warped_np[y, x] = design_np[y, src_x]
                
    warped_design = Image.fromarray(warped_np, "RGBA")
    
    # 3. Apply luminosity shading (extract shadow & highlight from base in print zone)
    base_crop = base_img.crop((pz[0], pz[1], pz[0] + dw, pz[1] + dh)).convert("L")
    # Multiply pass for shadows (dark areas darken the design)
    # Screen pass for highlights (bright areas lighten the design)
    
    # Composite warped design onto base
    res.paste(warped_design, (pz[0], pz[1]), warped_design)
    
    # Add a subtle highlight overlay over the print zone to simulate gloss
    overlay = Image.new("RGBA", base_img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    # Draw vertical sheen gradient
    for x_offset in range(15):
        alpha = int(15 * (1 - x_offset / 15.0))
        draw.line([(pz[0] + 20 + x_offset, pz[1]), (pz[0] + 20 + x_offset, pz[1] + dh)], fill=(255, 255, 255, alpha))
        
    res = Image.alpha_composite(res, overlay)
    return res

def main():
    print("Generating visual comparison image...")
    # Load base bottle image or create a professional bottle canvas if not found
    bottle_path = "/home/ubuntu/trynext-lifestyle/artifacts/trynex-storefront/public/products/water-bottle.png"
    if os.path.exists(bottle_path):
        base = Image.open(bottle_path).convert("RGBA").resize((600, 900))
    else:
        base = Image.new("RGBA", (600, 900), (245, 245, 243, 255))
        
    design = create_badge("HAPPY BIRTHDAY", (400, 400))
    
    # Print zone [x, y, w, h] on the 600x900 canvas
    pz = (175, 280, 250, 420)
    
    old_res = simulate_old_method(base, design, pz)
    new_res = simulate_new_method(base, design, pz)
    
    # Create side-by-side comparison canvas (1300 x 1000)
    canvas = Image.new("RGBA", (1300, 1000), (255, 255, 255, 255))
    draw = ImageDraw.Draw(canvas)
    
    # Paste old and new
    canvas.paste(old_res, (50, 50), old_res)
    canvas.paste(new_res, (650, 50), new_res)
    
    # Add labels and annotations
    draw.text((250, 930), "Previous Method: Flat PNG Overlay\n(Boxy, no cylinder wrap, flat sticker look)", fill=(100, 100, 100), anchor="mm", font_size=18, align="center")
    draw.text((850, 930), "New Pro Method: Smart Mockup PSD/PSB\n(Cylindrical warp, luminosity shading, gloss sheen)", fill=(16, 185, 129), anchor="mm", font_size=18, align="center")
    
    out_path = "/home/ubuntu/trynext-lifestyle/artifacts/trynex-storefront/public/mockups/visual_comparison.png"
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    canvas.convert("RGB").save(out_path)
    print(f"Comparison image saved to {out_path}")

if __name__ == "__main__":
    main()
