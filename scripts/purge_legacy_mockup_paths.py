from pathlib import Path

ROOT = Path('/home/ubuntu/trynext-lifestyle/artifacts/trynex-storefront/src')

replacements = {
    ROOT/'lib/prefetch.ts': {
        '/mockups/source-kit-v3/tshirt/white/front.png': '/mockups/smart-v4/tshirt/white/front.png',
        '/mockups/source-kit-v3/tshirt/white/back.png': '/mockups/smart-v4/tshirt/white/back.png',
        '/mockups/source-kit-v3/longsleeve/white/front.png': '/mockups/smart-v4/longsleeve/white/front.png',
        '/mockups/source-kit-v3/longsleeve/white/back.png': '/mockups/smart-v4/longsleeve/white/back.png',
        '/mockups/source-kit-v3/hoodie/white/front.png': '/mockups/smart-v4/hoodie/white/front.png',
        '/mockups/source-kit-v3/hoodie/white/back.png': '/mockups/smart-v4/hoodie/white/back.png',
        '/mockups/source-kit-v3/mug/white/front.png': '/mockups/smart-v4/mug/white/front.png',
        '/mockups/source-kit-v3/mug/white/back.png': '/mockups/smart-v4/mug/white/back.png',
        '/mockups/source-kit-v3/cap/white/front.png': '/mockups/smart-v4/cap/white/front.png',
        '/mockups/source-kit-v3/cap/white/back.png': '/mockups/smart-v4/cap/white/back.png',
        '/mockups/source-kit-v3/waterbottle/white/front.png': '/mockups/smart-v4/waterbottle/white/front.png',
        '/mockups/source-kit-v3/waterbottle/white/back.png': '/mockups/smart-v4/waterbottle/white/back.png',
    },
    ROOT/'components/InstagramFeed.tsx': {
        '/mockups/normalized/tshirt-white-front.png': '/mockups/smart-v4/tshirt/white/front.png',
        '/mockups/normalized/hoodie-white-front.png': '/mockups/smart-v4/hoodie/white/front.png',
        '/mockups/normalized/mug-white-front.png': '/mockups/smart-v4/mug/white/front.png',
        '/mockups/normalized/cap-white-front.png': '/mockups/smart-v4/cap/white/front.png',
        '/mockups/normalized/tshirt-black-front.png': '/mockups/smart-v4/tshirt/black/front.png',
        '/mockups/normalized/hoodie-grey-front.png': '/mockups/smart-v4/hoodie/grey/front.png',
    },
    ROOT/'pages/Home.tsx': {
        '/mockups/source-kit-v3/tshirt/white/front.png': '/mockups/smart-v4/tshirt/white/front.png',
        '/mockups/source-kit-v3/longsleeve/white/front.png': '/mockups/smart-v4/longsleeve/white/front.png',
        '/mockups/source-kit-v3/hoodie/white/front.png': '/mockups/smart-v4/hoodie/white/front.png',
        '/mockups/source-kit-v3/cap/white/front.png': '/mockups/smart-v4/cap/white/front.png',
        '/mockups/source-kit-v3/mug/white/front.png': '/mockups/smart-v4/mug/white/front.png',
        '/mockups/source-kit-v3/waterbottle/white/front.png': '/mockups/smart-v4/waterbottle/white/front.png',
    },
    ROOT/'components/home/TypewriterHero.tsx': {
        '/mockups/source-kit-v3/tshirt/white/front.png': '/mockups/smart-v4/tshirt/white/front.png',
        '/mockups/source-kit-v3/mug/white/front.png': '/mockups/smart-v4/mug/white/front.png',
        '/mockups/source-kit-v3/cap/white/front.png': '/mockups/smart-v4/cap/white/front.png',
        '/mockups/source-kit-v3/hoodie/white/front.png': '/mockups/smart-v4/hoodie/white/front.png',
        '/mockups/source-kit-v3/longsleeve/white/front.png': '/mockups/smart-v4/longsleeve/white/front.png',
        '/mockups/source-kit-v3/waterbottle/white/front.png': '/mockups/smart-v4/waterbottle/white/front.png',
    },
    ROOT/'pages/design-studio/mockups.tsx': {
        '/mockups/source-kit-v3/': '/mockups/smart-v4/',
        '/mockups/normalized/tshirt-black-front.png': '/mockups/smart-v4/tshirt/black/front.png',
        '/mockups/normalized/tshirt-black-back.png': '/mockups/smart-v4/tshirt/black/back.png',
        '/mockups/normalized/longsleeve-black-front.png': '/mockups/smart-v4/longsleeve/black/front.png',
        '/mockups/normalized/hoodie-black-front.png': '/mockups/smart-v4/hoodie/black/front.png',
        '/mockups/normalized/hoodie-black-back.png': '/mockups/smart-v4/hoodie/black/back.png',
        '/mockups/normalized/mug-white-front.png': '/mockups/smart-v4/mug/white/front.png',
        '/mockups/normalized/mug-black-front.png': '/mockups/smart-v4/mug/black/front.png',
        '/mockups/normalized/cap-white-back.png': '/mockups/smart-v4/cap/white/back.png',
        '/mockups/normalized-cutouts/tshirt-white-front.png': '/mockups/smart-v4/tshirt/white/front.png',
        '/mockups/normalized-cutouts/tshirt-white-back.png': '/mockups/smart-v4/tshirt/white/back.png',
        '/mockups/normalized-cutouts/longsleeve-white-front.png': '/mockups/smart-v4/longsleeve/white/front.png',
        '/mockups/normalized-cutouts/longsleeve-white-back.png': '/mockups/smart-v4/longsleeve/white/back.png',
        '/mockups/normalized-cutouts/longsleeve-black-front.png': '/mockups/smart-v4/longsleeve/black/front.png',
        '/mockups/normalized-cutouts/longsleeve-black-back.png': '/mockups/smart-v4/longsleeve/black/back.png',
        '/mockups/normalized-cutouts/hoodie-white-front.png': '/mockups/smart-v4/hoodie/white/front.png',
        '/mockups/normalized-cutouts/hoodie-white-back.png': '/mockups/smart-v4/hoodie/white/back.png',
        '/mockups/normalized-cutouts/mug-white-front.png': '/mockups/smart-v4/mug/white/front.png',
        '/mockups/normalized-cutouts/mug-black-front.png': '/mockups/smart-v4/mug/black/front.png',
        '/mockups/normalized-cutouts/cap-white-front.png': '/mockups/smart-v4/cap/white/front.png',
        '/mockups/normalized-cutouts/cap-white-back.png': '/mockups/smart-v4/cap/white/back.png',
        '/mockups/normalized-cutouts/black-tshirt-front-cutout.png': '/mockups/smart-v4/tshirt/black/front.png',
        '/mockups/normalized-cutouts/black-tshirt-back-cutout.png': '/mockups/smart-v4/tshirt/black/back.png',
        '/mockups/black-hoodie-front-cutout-real.png': '/mockups/smart-v4/hoodie/black/front.png',
        '/mockups/normalized-cutouts/hoodie-black-back.png': '/mockups/smart-v4/hoodie/black/back.png',
        'Source-kit-v3 PNGs': 'Smart-v4 PNGs',
        'public/mockups/source-kit-v3/*': 'public/mockups/smart-v4/*',
    },
    ROOT/'components/ProductCard.tsx': {
        'return "/mockups/normalized/mug-white-front.png";': 'return "/mockups/smart-v4/mug/white/front.png";',
        'return "/mockups/normalized/hoodie-white-front.png";': 'return "/mockups/smart-v4/hoodie/white/front.png";',
        'return "/mockups/normalized/waterbottle-white-front.png";': 'return "/mockups/smart-v4/waterbottle/white/front.png";',
        'return "/mockups/normalized/cap-white-front.png";': 'return "/mockups/smart-v4/cap/white/front.png";',
        'return "/mockups/normalized/longsleeve-white-front.png";': 'return "/mockups/smart-v4/longsleeve/white/front.png";',
        'return "/mockups/normalized/tshirt-white-front.png";': 'return "/mockups/smart-v4/tshirt/white/front.png";',
    },
}

changed=[]
for path, mapping in replacements.items():
    text=path.read_text()
    before=text
    for old,new in mapping.items():
        text=text.replace(old,new)
    if text != before:
        path.write_text(text)
        changed.append(str(path))
        print(f'patched {path}')
    else:
        print(f'unchanged {path}')
print(f'files_changed={len(changed)}')
