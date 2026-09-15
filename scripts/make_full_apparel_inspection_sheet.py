from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
ROOT=Path('/home/ubuntu/trynext-lifestyle/artifacts/trynex-storefront/public/mockups/apparel-v5')
OUT=Path('/home/ubuntu/trynext-lifestyle/docs/full-apparel-v5-inspection.png')
FAMS={
 'tshirt':['white','black','navy','maroon','olive','sky-blue','grey','red'],
 'longsleeve':['white','black','navy','maroon','olive','grey','red','sky-blue','burgundy','forest'],
 'hoodie':['white','black','navy','grey','maroon','olive','red','sky-blue','forest','burgundy'],
}
VIEWS=['front','back','left-sleeve','right-sleeve','neck-label']
cell=180; label_h=28; fam_gap=42
font=ImageFont.load_default()
height=sum((len(colors)+1)*(cell+label_h) + fam_gap for colors in FAMS.values())
width=len(VIEWS)*(cell+4)+190
sheet=Image.new('RGB',(width,height),'#eeeeee'); d=ImageDraw.Draw(sheet); y=0
for fam, colors in FAMS.items():
 d.rectangle((0,y,width,y+32),fill='#20242a'); d.text((8,y+9),fam.upper(),fill='white',font=font); y+=36
 d.text((8,y+8),'color',fill='#333',font=font)
 for j,v in enumerate(VIEWS): d.text((190+j*(cell+4),y+8),v,fill='#333',font=font)
 y+=label_h
 for color in colors:
  d.text((8,y+cell//2),color,fill='#333',font=font)
  for j,v in enumerate(VIEWS):
   p=ROOT/fam/color/(v+'.png')
   x=190+j*(cell+4)
   if p.exists():
    im=Image.open(p).convert('RGBA'); im.thumbnail((cell,cell))
    tile=Image.new('RGBA',(cell,cell),(255,255,255,255)); tile.alpha_composite(im,((cell-im.width)//2,(cell-im.height)//2)); sheet.paste(tile.convert('RGB'),(x,y))
   else:
    d.rectangle((x,y,x+cell,y+cell),fill='#ffcccc'); d.text((x+8,y+cell//2),'MISSING',fill='#900',font=font)
  y+=cell+label_h
 y+=fam_gap
sheet.save(OUT,optimize=True)
print(OUT)
