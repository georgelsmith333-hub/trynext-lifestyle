from pathlib import Path
from PIL import Image, ImageDraw
root=Path('/home/ubuntu/trynext-lifestyle/artifacts/trynex-storefront/public/mockups/smart-v4')
out=Path('/home/ubuntu/trynext-lifestyle/docs/apparel-v5-contact-sheet.png')
items=[('tshirt','white','front'),('tshirt','navy','back'),('tshirt','white','left-sleeve'),('tshirt','white','neck-label'),('longsleeve','white','front'),('longsleeve','forest','back'),('longsleeve','white','left-sleeve'),('longsleeve','white','neck-label'),('hoodie','white','front'),('hoodie','burgundy','back'),('hoodie','white','left-sleeve'),('hoodie','white','neck-label')]
cellw,cellh=420,470
sheet=Image.new('RGB',(cellw*4,cellh*3),'white')
for i,(fam,color,view) in enumerate(items):
    im=Image.open(root/fam/color/f'{view}.png').convert('RGBA')
    bg=Image.new('RGB',(cellw,cellh),'white')
    im.thumbnail((390,390),Image.Resampling.LANCZOS)
    bg.paste(im,((cellw-im.width)//2,10),im)
    ImageDraw.Draw(bg).text((12,425),f'{fam} {color} {view}',fill='black')
    sheet.paste(bg,((i%4)*cellw,(i//4)*cellh))
sheet.save(out)
print(out)
