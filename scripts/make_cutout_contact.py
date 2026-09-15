from pathlib import Path
from PIL import Image, ImageDraw
root=Path('/home/ubuntu/trynext-lifestyle/artifacts/trynex-storefront/public/mockups/normalized-cutouts')
out=Path('/home/ubuntu/trynext-lifestyle/docs/normalized-cutouts-apparel-contact.png')
items=[('tshirt-white-front.png'),('tshirt-navy-back.png'),('longsleeve-white-front.png'),('longsleeve-forest-back.png'),('hoodie-white-front.png'),('hoodie-burgundy-back.png')]
cellw,cellh=500,520
sheet=Image.new('RGB',(cellw*3,cellh*2),'white')
for i,name in enumerate(items):
    im=Image.open(root/name).convert('RGBA'); im.thumbnail((460,460),Image.Resampling.LANCZOS)
    bg=Image.new('RGB',(cellw,cellh),'white'); bg.paste(im,((cellw-im.width)//2,10),im)
    ImageDraw.Draw(bg).text((12,486),name,fill='black'); sheet.paste(bg,((i%3)*cellw,(i//3)*cellh))
sheet.save(out); print(out)
