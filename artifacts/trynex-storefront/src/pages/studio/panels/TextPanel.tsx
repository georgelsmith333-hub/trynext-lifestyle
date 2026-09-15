import { useDesignStore, useSelectedLayer } from "@/hooks/useDesignStore";
import { FONT_FAMILIES } from "../types";
import { GradientEditor } from "../GradientEditor";
import { Bold, Italic, AlignLeft, AlignCenter, AlignRight, Type } from "lucide-react";

export function TextPanel() {
  const layer = useSelectedLayer();
  const updateLayer = useDesignStore((s) => s.updateLayer);
  const addLayer = useDesignStore((s) => s.addLayer);
  const activeFace = useDesignStore((s) => s.activeFace);

  if (!layer || layer.type !== "text") {
    return (
      <div className="p-4">
        <button
          onClick={() => {
            const id = Math.random().toString(36).slice(2, 10);
            addLayer({
              id,
              name: "Text",
              type: "text",
              text: "Double click to edit",
              fontFamily: FONT_FAMILIES[0].value,
              fontWeight: 700,
              fontStyle: "normal",
              fontSize: 48,
              color: "#111111",
              textAlign: "center",
              visible: true,
              locked: false,
              transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
              face: activeFace,
            });
          }}
          className="w-full py-3 rounded-xl font-black text-sm text-white bg-gradient-to-r from-orange-500 to-orange-400"
        >
          <Type className="w-4 h-4 inline mr-2" /> Add Text Layer
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Text</label>
      <textarea
        value={layer.text}
        onChange={(e) => updateLayer(layer.id, { text: e.target.value })}
        className="w-full px-3 py-2 rounded-xl text-sm border border-gray-200 focus:border-orange-400 outline-none"
        rows={3}
      />
      <div className="grid grid-cols-2 gap-2">
        <select
          value={layer.fontFamily}
          onChange={(e) => updateLayer(layer.id, { fontFamily: e.target.value })}
          className="px-3 py-2 rounded-xl text-xs border border-gray-200 focus:border-orange-400 outline-none"
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
        <input
          type="number"
          value={layer.fontSize}
          onChange={(e) => updateLayer(layer.id, { fontSize: parseInt(e.target.value, 10) || 24 })}
          className="px-3 py-2 rounded-xl text-xs border border-gray-200 focus:border-orange-400 outline-none"
        />
      </div>
      <div className="flex gap-2">
        <button onClick={() => updateLayer(layer.id, { fontWeight: layer.fontWeight === 700 ? 400 : 700 })} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${layer.fontWeight === 700 ? "bg-orange-50 border-orange-300 text-orange-600" : "bg-white border-gray-200"}`}><Bold className="w-3.5 h-3.5 mx-auto" /></button>
        <button onClick={() => updateLayer(layer.id, { fontStyle: layer.fontStyle === "italic" ? "normal" : "italic" })} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${layer.fontStyle === "italic" ? "bg-orange-50 border-orange-300 text-orange-600" : "bg-white border-gray-200"}`}><Italic className="w-3.5 h-3.5 mx-auto" /></button>
      </div>
      <div className="flex gap-2">
        <button onClick={() => updateLayer(layer.id, { textAlign: "left" })} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${layer.textAlign === "left" ? "bg-orange-50 border-orange-300 text-orange-600" : "bg-white border-gray-200"}`}><AlignLeft className="w-3.5 h-3.5 mx-auto" /></button>
        <button onClick={() => updateLayer(layer.id, { textAlign: "center" })} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${layer.textAlign === "center" ? "bg-orange-50 border-orange-300 text-orange-600" : "bg-white border-gray-200"}`}><AlignCenter className="w-3.5 h-3.5 mx-auto" /></button>
        <button onClick={() => updateLayer(layer.id, { textAlign: "right" })} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${layer.textAlign === "right" ? "bg-orange-50 border-orange-300 text-orange-600" : "bg-white border-gray-200"}`}><AlignRight className="w-3.5 h-3.5 mx-auto" /></button>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-[10px] font-bold text-gray-500">Color</label>
        <input
          type="color"
          value={layer.color}
          onChange={(e) => updateLayer(layer.id, { color: e.target.value })}
          className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer"
        />
      </div>
      <div className="pt-3 border-t border-gray-100">
        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Gradient Fill</label>
        <GradientEditor
          value={layer.gradient ?? { type: "linear", angle: 90, stops: [{ offset: 0, color: layer.color }, { offset: 1, color: "#E85D04" }] }}
          onChange={(g) => updateLayer(layer.id, { gradient: g })}
        />
      </div>
    </div>
  );
}
