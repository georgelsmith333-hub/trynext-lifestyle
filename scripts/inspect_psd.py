import sys
from psd_tools import PSDImage

path = sys.argv[1] if len(sys.argv) > 1 else "/home/ubuntu/trynext-lifestyle/attached_assets/trynext-mockup-source-kit/psd/mug-black-front.psd"
print(f"Inspecting PSD: {path}")
try:
    psd = PSDImage.open(path)
    print(f"Dimensions: {psd.width} x {psd.height}")
    for layer in psd:
        print(f" - Layer: {layer.name}, visible: {layer.visible}, kind: {layer.kind}")
        if layer.is_group():
            for sub in layer:
                print(f"   * Sublayer: {sub.name}, visible: {sub.visible}, kind: {sub.kind}")
except Exception as e:
    print(f"Error opening PSD: {e}")
