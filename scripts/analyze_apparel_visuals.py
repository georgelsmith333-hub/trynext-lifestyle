import json, hashlib
from pathlib import Path
from PIL import Image, ImageStat, ImageChops, ImageFilter
import numpy as np
ROOT=Path('/home/ubuntu/trynext-lifestyle')
PUB=ROOT/'artifacts/trynex-storefront/public/mockups/apparel-v5'
INV=json.loads((ROOT/'docs/FULL_MOCKUP_MATRIX_INVENTORY_2026-08-17.json').read_text())
FAMS={'tshirt':['white','black','navy','maroon','olive','sky-blue','grey','red'],'longsleeve':['white','black','navy','maroon','olive','grey','red','sky-blue','burgundy','forest'],'hoodie':['white','black','navy','grey','maroon','olive','red','sky-blue','forest','burgundy']}
VIEWS=['front','back','left-sleeve','right-sleeve','neck-label']
def metrics(p):
 im=Image.open(p).convert('RGBA'); a=np.array(im.getchannel('A')); rgb=np.array(im.convert('RGB'))
 mask=a>8; pixels=rgb[mask]
 gray=(pixels[:,0]*.299+pixels[:,1]*.587+pixels[:,2]*.114) if len(pixels) else np.array([])
 # local texture estimate after removing low-frequency shading
 g=np.array(im.convert('L'),dtype=np.float32); blur=np.array(im.convert('L').filter(ImageFilter.GaussianBlur(5)),dtype=np.float32); resid=np.abs(g-blur)[a>8]
 return {'mean_rgb':[round(float(x),2) for x in pixels.mean(0)],'std_rgb':[round(float(x),2) for x in pixels.std(0)],'luma_std':round(float(gray.std()),2),'local_texture_mean_abs':round(float(resid.mean()),2),'opaque_ratio':round(float((a==255).sum()/a.size),4),'alpha_bbox':im.getchannel('A').getbbox()}
out={'stale_inventory_rows':[],'surface_metrics':{},'family_color_view_flags':{},'front_back_similarity':{}}
for row in INV['rows']:
 if row['family'] in FAMS and row.get('activeExpected','').startswith('/mockups/source-kit-v3/'):
  out['stale_inventory_rows'].append({'family':row['family'],'color':row['color'],'view':row['view'],'activeExpected':row['activeExpected'],'expected_v5':f"/mockups/apparel-v5/{row['family']}/{row['color']}/{row['view']}.png"})
for fam,colors in FAMS.items():
 out['surface_metrics'][fam]={}; out['family_color_view_flags'][fam]={}; out['front_back_similarity'][fam]={}
 for color in colors:
  out['surface_metrics'][fam][color]={}
  for view in VIEWS:
   p=PUB/fam/color/(view+'.png'); m=metrics(p); out['surface_metrics'][fam][color][view]=m
   flags=[]
   if m['local_texture_mean_abs']<1.0: flags.append('very_low_local_texture')
   if m['luma_std']<8: flags.append('low_luminance_variation')
   if view in ['left-sleeve','right-sleeve','neck-label'] and m['opaque_ratio']<.15: flags.append('small_surface_or_crop')
   out['family_color_view_flags'][fam][f'{color}/{view}']=flags
  f=np.array(Image.open(PUB/fam/color/'front.png').convert('RGBA'))
  b=np.array(Image.open(PUB/fam/color/'back.png').convert('RGBA'))
  # compare alpha silhouette sizes and mean luminance, not pixel equality
  fa=f[:,:,3]>8; ba=b[:,:,3]>8
  out['front_back_similarity'][fam][color]={'front_opaque_ratio':round(float((f[:,:,3]==255).sum()/f.shape[0]/f.shape[1]),4),'back_opaque_ratio':round(float((b[:,:,3]==255).sum()/b.shape[0]/b.shape[1]),4),'alpha_area_ratio':round(float(ba.sum()/fa.sum()),4) if fa.sum() else None,'same_alpha_bbox':Image.fromarray(f[:,:,3]).getbbox()==Image.fromarray(b[:,:,3]).getbbox()}
Path('/tmp/apparel_visual_analysis.json').write_text(json.dumps(out,indent=2))
print('stale apparel inventory rows:',len(out['stale_inventory_rows']))
for fam in FAMS:
 flags=[(k,v) for k,v in out['family_color_view_flags'][fam].items() if v]
 print(fam,'flagged surfaces:',len(flags),'of',len(FAMS[fam])*5)
 print(' examples:',flags[:8])
 print(' front/back:',out['front_back_similarity'][fam])
