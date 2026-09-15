from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
root=Path('/home/ubuntu/trynext-release/artifacts/trynex-storefront/public/mockups/source-kit-v2')
items=[('tshirt',c) for c in ['white','black','red','sky-blue','olive','maroon']]+[('longsleeve',c) for c in ['white','black','red','sky-blue','forest','burgundy']]+[('hoodie',c) for c in ['white','black','red','sky-blue','olive','maroon']]
W,H,C=320,330,3
out=Path('/home/ubuntu/trynext-release/verification/mockup-source-kit-v2-alpha-contact-sheet.png')
sheet=Image.new('RGB',(W*C,H*((len(items)+C-1)//C)),'#e9e5de');d=ImageDraw.Draw(sheet);f=ImageFont.load_default()
for i,(fam,color) in enumerate(items):
 x,y=(i%C)*W,(i//C)*H;p=root/fam/color/'front.png'
 if not p.exists():d.text((x+10,y+10),f'MISSING {fam}-{color}',fill='#a00',font=f);continue
 im=Image.open(p).convert('RGBA');im.thumbnail((W-22,H-58)); tile=Image.new('RGBA',(W,H-42),(208,208,208,255));
 pix=tile.load()
 for yy in range(tile.height):
  for xx in range(tile.width):
   v=232 if ((xx//18)+(yy//18))%2==0 else 196;pix[xx,yy]=(v,v,v,255)
 tile.alpha_composite(im,((W-im.width)//2,(H-42-im.height)//2));sheet.paste(tile.convert('RGB'),(x,y));d.text((x+8,y+H-36),f'{fam} / {color}',fill='#111',font=f);d.text((x+8,y+H-22),'alpha checkerboard',fill='#666',font=f)
sheet.save(out);print(out)
