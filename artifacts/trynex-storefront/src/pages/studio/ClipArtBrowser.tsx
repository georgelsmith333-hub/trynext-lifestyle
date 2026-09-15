import { useState } from "react";
import { Search, Image as ImageIcon, X } from "lucide-react";
import { useDesignStore } from "@/hooks/useDesignStore";
import { fitImageTransform } from "./autoFit";
import { getZonePZ, MUG_PZ, MUG_SIDE_BACK_PZ, MUG_SIDE_PZ, STICKERS } from "@/pages/design-studio/mockups";

export function ClipArtBrowser() {
  const [query, setQuery] = useState("");
  const addLayer = useDesignStore((s) => s.addLayer);
  const selectLayer = useDesignStore((s) => s.selectLayer);
  const setActiveTab = useDesignStore((s) => s.setActiveTab);
   const { activeFace, mugMode, selectedProduct, selectedColor } = useDesignStore((s) => ({
     activeFace: s.activeFace,
     mugMode: s.mugMode,
     selectedProduct: s.selectedProduct,
     selectedColor: s.selectedColor,
   }));
   const printZone = (() => {
     if (selectedProduct.category === "mug") {
       return mugMode === "wrap" ? MUG_PZ : mugMode === "side2" ? MUG_SIDE_BACK_PZ : MUG_SIDE_PZ;
     }
     return getZonePZ(activeFace, selectedProduct, selectedColor.hex);
   })();

  const filtered = STICKERS.filter((s) => s.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="p-4 space-y-3">
      <div>
        <h3 className="text-sm font-black text-stone-900">Stickers & clip art</h3>
        <p className="mt-1 text-[11px] leading-4 text-stone-500">Add a ready-made graphic to the active print area.</p>
      </div>
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search stickers..."
          className="w-full pl-9 pr-4 py-2 rounded-xl text-xs border border-gray-200 focus:border-orange-400 outline-none"
        />
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
        {filtered.map((s) => (
          <button
            key={s.id}
            title={s.name}
            onClick={() => {
              const img = new Image();
              img.onload = () => {
                const id = Math.random().toString(36).slice(2, 10);
                addLayer({
                  id,
                  name: s.name,
                  type: "image",
                  src: s.dataUrl,
                  naturalW: img.naturalWidth || 100,
                  naturalH: img.naturalHeight || 100,
                  visible: true,
                  locked: false,
                  transform: fitImageTransform(img.naturalWidth || 100, img.naturalHeight || 100, { w: printZone.w, h: printZone.h }, { padding: 0.7, maxScale: 4 }),
                  face: activeFace,
                });
                selectLayer(id);
                setActiveTab("layers");
              };
              img.src = s.dataUrl;
            }}
            className="aspect-square rounded-lg bg-white border border-gray-200 hover:border-orange-300 flex items-center justify-center p-1.5"
          >
            <img src={s.dataUrl} alt={s.name} className="w-full h-full object-contain pointer-events-none" />
          </button>
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50 px-4 py-6 text-center">
          <p className="text-[11px] text-stone-500">No stickers found.</p>
          {query && (
            <button type="button" onClick={() => setQuery("")} className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 hover:text-orange-700">
              <X className="h-3 w-3" /> Clear search
            </button>
          )}
        </div>
      )}
    </div>
  );
}
