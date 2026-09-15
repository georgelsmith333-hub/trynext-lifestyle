import { useEffect, useState } from "react";

const PRODUCTS = [
  { id: "tshirt", name: "T-Shirt", category: "tshirt", frontSrc: "/mockups/white-tshirt-front.png", backSrc: "/mockups/white-tshirt-back.png", printZone: { x: 280, y: 180, w: 440, h: 560 }, printZoneBack: { x: 280, y: 180, w: 440, h: 560 }, baseHeight: 1000 },
  { id: "longsleeve", name: "Long Sleeve", category: "longsleeve", frontSrc: "/mockups/white-longsleeve-front.png", backSrc: "/mockups/white-longsleeve-back.png", printZone: { x: 300, y: 200, w: 400, h: 500 }, printZoneBack: { x: 300, y: 200, w: 400, h: 500 }, baseHeight: 1000 },
  { id: "hoodie", name: "Hoodie", category: "hoodie", frontSrc: "/mockups/white-hoodie-front.png", backSrc: "/mockups/white-hoodie-back.png", printZone: { x: 300, y: 220, w: 400, h: 460 }, printZoneBack: { x: 300, y: 220, w: 400, h: 460 }, baseHeight: 1000 },
  { id: "mug", name: "Mug", category: "mug", frontSrc: "/mockups/white-mug-front.png", printZone: { x: 300, y: 200, w: 400, h: 360 }, baseHeight: 1000 },
  { id: "cap", name: "Cap", category: "cap", frontSrc: "/mockups/white-cap-front.png", printZone: { x: 250, y: 280, w: 500, h: 380 }, baseHeight: 1000 },
  { id: "waterbottle", name: "Water Bottle", category: "waterbottle", frontSrc: "/mockups/white-waterbottle-front.png", printZone: { x: 260, y: 200, w: 480, h: 560 }, baseHeight: 1000 },
] as const;

const COLORS = [
  { name: "White", hex: "#F5F5F5" },
  { name: "Black", hex: "#1a1a1a" },
  { name: "Red", hex: "#E85D04" },
  { name: "Navy", hex: "#1e3a5f" },
];

function isLightTint(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.92;
}
function isNearBlack(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.12;
}

const BASE: Record<string, { front: string; back?: string; frontCutout?: string; backCutout?: string; darkFront?: string; darkBack?: string; darkFrontCutout?: string; darkBackCutout?: string }> = {
  tshirt: { front: "/mockups/white-tshirt-front.png", back: "/mockups/white-tshirt-back.png", frontCutout: "/mockups/white-tshirt-front-cutout.png", backCutout: "/mockups/white-tshirt-back-cutout.png", darkFront: "/mockups/black-tshirt-front.png", darkBack: "/mockups/black-tshirt-back.png", darkFrontCutout: "/mockups/black-tshirt-front-cutout.png", darkBackCutout: "/mockups/black-tshirt-back-cutout.png" },
  longsleeve: { front: "/mockups/white-longsleeve-front.png", back: "/mockups/white-longsleeve-back.png", frontCutout: "/mockups/white-longsleeve-front-cutout-real.png", backCutout: "/mockups/white-longsleeve-back-cutout-real.png", darkFront: "/mockups/black-longsleeve-front.png", darkBack: "/mockups/black-longsleeve-back.png", darkFrontCutout: "/mockups/black-longsleeve-front-cutout.png", darkBackCutout: "/mockups/black-longsleeve-back-cutout.png" },
  hoodie: { front: "/mockups/white-hoodie-front.png", back: "/mockups/white-hoodie-back.png", frontCutout: "/mockups/white-hoodie-front-cutout-real.png", backCutout: "/mockups/white-hoodie-back-cutout-real.png", darkFront: "/mockups/black-hoodie-front.png", darkBack: "/mockups/black-hoodie-back.png", darkFrontCutout: "/mockups/black-hoodie-front-cutout-real.png", darkBackCutout: "/mockups/black-hoodie-back-cutout-real.png" },
  mug: { front: "/mockups/white-mug-front.png", frontCutout: "/mockups/white-mug-front-cutout.png", darkFront: "/mockups/black-mug-front.png", darkFrontCutout: "/mockups/black-mug-front-cutout.png" },
  cap: { front: "/mockups/white-cap-front.png", frontCutout: "/mockups/white-cap-front-cutout.png" },
  waterbottle: { front: "/mockups/white-waterbottle-front.png", frontCutout: "/mockups/white-waterbottle-front-cutout.png" },
};

function resolveImageSrc(product: typeof PRODUCTS[number], color: string) {
  const base = BASE[product.category];
  const nearBlack = isNearBlack(color);
  const hasDark = !!(base?.darkFront || base?.darkFrontCutout);
  if (nearBlack && hasDark) {
    return base?.darkFront || base?.darkFrontCutout || product.frontSrc;
  }
  if (!isLightTint(color)) {
    return base?.frontCutout || product.frontSrc;
  }
  return base?.frontCutout || product.frontSrc;
}

export default function GarmentSVGPreview() {
  const [loaded, setLoaded] = useState(0);
  const total = PRODUCTS.length * COLORS.length;
  useEffect(() => {
    let mounted = true;
    let count = 0;
    const imgs: HTMLImageElement[] = [];
    for (const p of PRODUCTS) {
      for (const c of COLORS) {
        const src = resolveImageSrc(p, c.hex);
        const img = new Image();
        img.onload = img.onerror = () => {
          count++;
          if (mounted) setLoaded(count);
        };
        img.src = src;
        imgs.push(img);
      }
    }
    return () => { mounted = false; };
  }, []);

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-xl font-bold mb-4">GarmentSVG Preview — all products × colors</h1>
      <p className="text-sm text-gray-600 mb-4">Loaded {loaded}/{total} images</p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {PRODUCTS.map(p => COLORS.map(c => (
          <div key={p.id + c.hex} className="bg-gray-900 rounded-xl overflow-hidden aspect-square flex items-center justify-center relative">
            <span className="absolute top-2 left-2 text-[10px] font-bold text-white bg-black/50 px-2 py-1 rounded">{p.name} · {c.name}</span>
            <svg viewBox="0 0 1000 1000" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
              <defs>
                {!isLightTint(c.hex) && !isNearBlack(c.hex) && (
                  <filter id={`tint-${p.id}-${c.name}`} x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
                    <feFlood floodColor={c.hex} result="flood" />
                    <feBlend in="flood" in2="SourceGraphic" mode="multiply" />
                  </filter>
                )}
              </defs>
              <rect width={1000} height={1000} fill="#ffffff" />
              <image
                href={resolveImageSrc(p, c.hex)}
                x={0} y={0} width={1000} height={1000}
                preserveAspectRatio="xMidYMid meet"
                filter={!isLightTint(c.hex) && !isNearBlack(c.hex) ? `url(#tint-${p.id}-${c.name})` : undefined}
              />
            </svg>
          </div>
        )))}
      </div>
    </div>
  );
}
