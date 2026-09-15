from pathlib import Path
from PIL import Image
import numpy as np
root=Path('/home/ubuntu/trynext-lifestyle')
paths=[
root/'attached_assets/trynext-mockup-source-kit/psd/tshirt-white-front.psd',
root/'artifacts/trynex-storefront/public/mockups/normalized/tshirt-white-front.png',
root/'artifacts/trynex-storefront/public/mockups/normalized-cutouts/tshirt-white-front.png',
root/'attached_assets/trynext-mockup-source-kit/psd/tshirt-navy-back.psd',
root/'artifacts/trynex-storefront/public/mockups/normalized/tshirt-navy-back.png',
]
for p in paths:
    im=Image.open(p).convert('RGBA')
    a=np.array(im.getchannel('A'))
    print(p.name, im.size, 'alpha_minmax', int(a.min()),int(a.max()), 'opaque%', round((a>250).mean()*100,2), 'bbox', Image.fromarray(a).getbbox())
