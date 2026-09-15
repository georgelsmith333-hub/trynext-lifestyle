import { LayersIcon, Eye, EyeOff, Lock, Unlock, Trash2, ChevronUp, ChevronDown, ArrowUp, ArrowDown } from "lucide-react";
import { useDesignStore } from "@/hooks/useDesignStore";
import { motion, AnimatePresence } from "framer-motion";

export function LayerPanel() {
  const layers = useDesignStore((s) => s.layers);
  const selectedIds = useDesignStore((s) => s.selectedIds);
  const currentFaceLayerCount = useDesignStore((s) => {
    const face = s.selectedProduct.category === "mug" ? (s.mugMode === "side1" ? "front" : "back") : s.activeFace;
    return s.layers.reduce((count, layer) => count + ((layer.face ?? "front") === face ? 1 : 0), 0);
  });
  const selectLayer = useDesignStore((s) => s.selectLayer);
  const deleteLayer = useDesignStore((s) => s.deleteLayer);
  const moveLayer = useDesignStore((s) => s.moveLayer);
  const setLayerVisibility = useDesignStore((s) => s.setLayerVisibility);
  const setLayerLock = useDesignStore((s) => s.setLayerLock);

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400">Layers</h3>
        <span className="text-[10px] text-gray-400 font-semibold">{currentFaceLayerCount} on this face</span>
      </div>
      <AnimatePresence initial={false}>
        {layers.length === 0 ? (
          <div className="text-center py-6 text-[11px] text-gray-400">No layers yet. Upload or add text.</div>
        ) : (
          layers.map((layer, idx) => {
            const selected = selectedIds.includes(layer.id);
            return (
              <motion.div
                key={layer.id}
                layout
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                onClick={() => selectLayer(layer.id)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-bold cursor-pointer transition-all ${
                  selected ? "bg-orange-50 border-orange-300" : "bg-white border-gray-100"
                }`}
                style={{ border: "1.5px solid", boxShadow: selected ? "0 2px 8px rgba(232,93,4,0.15)" : "0 1px 3px rgba(0,0,0,0.04)" }}
              >
                <LayersIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="flex-1 truncate">{layer.name}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLayerVisibility(layer.id, !layer.visible);
                    }}
                    aria-label={`${layer.visible ? "Hide" : "Show"} ${layer.name || "layer"}`}
                    className="p-1 rounded-md hover:bg-gray-100"
                  >
                    {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-gray-300" />}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLayerLock(layer.id, !layer.locked);
                    }}
                    aria-label={`${layer.locked ? "Unlock" : "Lock"} ${layer.name || "layer"}`}
                    className="p-1 rounded-md hover:bg-gray-100"
                  >
                    {layer.locked ? <Lock className="w-3.5 h-3.5 text-orange-500" /> : <Unlock className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, "up"); }} disabled={idx === 0} aria-label={`Move ${layer.name || "layer"} up`} className="p-1 rounded-md hover:bg-gray-100 disabled:opacity-30">
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, "down"); }} disabled={idx === layers.length - 1} aria-label={`Move ${layer.name || "layer"} down`} className="p-1 rounded-md hover:bg-gray-100 disabled:opacity-30">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); deleteLayer(layer.id); }} aria-label={`Delete ${layer.name || "layer"}`} className="p-1 rounded-md hover:bg-red-50 text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </AnimatePresence>
    </div>
  );
}
