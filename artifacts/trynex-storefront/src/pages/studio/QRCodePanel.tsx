import { useState, useEffect } from "react";
import { useDesignStore } from "@/hooks/useDesignStore";
import { fitImageTransform } from "./autoFit";
import QRCode from "qrcode";
import { QrCode } from "lucide-react";
import { getZonePZ, MUG_PZ, MUG_SIDE_BACK_PZ, MUG_SIDE_PZ } from "@/pages/design-studio/mockups";

export function QRCodePanel() {
  const [url, setUrl] = useState("https://trynext.shop");
  const [size, setSize] = useState(120);
  const [color, setColor] = useState("#111111");
  const [bg, setBg] = useState("#ffffff");
  const [svg, setSvg] = useState<string | null>(null);
  const addLayer = useDesignStore((s) => s.addLayer);
  const selectLayer = useDesignStore((s) => s.selectLayer);
  const setActiveTab = useDesignStore((s) => s.setActiveTab);
   const { activeFace, mugMode, selectedProduct, selectedColor } = useDesignStore((s) => ({
     activeFace: s.activeFace,
     mugMode: s.mugMode,
     selectedProduct: s.selectedProduct,
     selectedColor: s.selectedColor,
   }));
   const printZone = selectedProduct.category === "mug"
     ? mugMode === "wrap" ? MUG_PZ : mugMode === "side2" ? MUG_SIDE_BACK_PZ : MUG_SIDE_PZ
     : getZonePZ(activeFace, selectedProduct, selectedColor.hex);

  useEffect(() => {
    if (!url.trim()) return;
    QRCode.toString(url, { type: "svg", width: size, color: { dark: color, light: bg }, margin: 2 })
      .then((str) => setSvg(`data:image/svg+xml;base64,${btoa(str)}`))
      .catch(() => setSvg(null));
  }, [url, size, color, bg]);

  const addToCanvas = () => {
    if (!svg) return;
    const img = new Image();
    img.onload = () => {
      const id = Math.random().toString(36).slice(2, 10);
      addLayer({
        id,
        name: "QR Code",
        type: "image",
        src: svg,
        naturalW: size,
        naturalH: size,
        visible: true,
        locked: false,
        transform: fitImageTransform(size, size, { w: printZone.w, h: printZone.h }, { padding: 0.34, minScale: 0.35, maxScale: 2 }),
        face: activeFace,
      });
      selectLayer(id);
      setActiveTab("layers");
    };
    img.src = svg;
  };

  return (
    <div className="p-4 space-y-3">
      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">QR Code</label>
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://..."
        className="w-full px-3 py-2 rounded-xl text-xs border border-gray-200 focus:border-orange-400 outline-none"
      />
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-bold text-gray-500">Color</label>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-6 h-6 rounded border border-gray-200 cursor-pointer" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-bold text-gray-500">BG</label>
          <input type="color" value={bg} onChange={(e) => setBg(e.target.value)} className="w-6 h-6 rounded border border-gray-200 cursor-pointer" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-[10px] font-bold text-gray-500">Size</label>
        <input type="range" min={80} max={300} value={size} onChange={(e) => setSize(parseInt(e.target.value, 10))} className="flex-1" />
        <span className="text-[10px] font-bold text-gray-600 w-8">{size}px</span>
      </div>
      {svg && <div className="h-24 rounded-lg border border-gray-200 bg-white flex items-center justify-center" dangerouslySetInnerHTML={{ __html: atob(svg.split(",")[1]) }} />}
      <button
        onClick={addToCanvas}
        disabled={!svg || !url.trim()}
        className="w-full py-3 rounded-xl font-black text-sm text-white bg-gradient-to-r from-orange-500 to-orange-400 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <QrCode className="w-4 h-4" /> Add QR Code
      </button>
    </div>
  );
}
