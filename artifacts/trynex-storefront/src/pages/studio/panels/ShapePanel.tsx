import { useDesignStore, useSelectedLayer } from "@/hooks/useDesignStore";
import { Square, Circle, Star, Triangle, Hexagon, Minus } from "lucide-react";
import { GradientEditor } from "../GradientEditor";
import { ShapeType, GradientConfig } from "../types";

const SHAPE_OPTIONS: { type: ShapeType; icon: React.ReactNode }[] = [
  { type: "rect", icon: <Square className="w-4 h-4" /> },
  { type: "circle", icon: <Circle className="w-4 h-4" /> },
  { type: "star", icon: <Star className="w-4 h-4" /> },
  { type: "arrow", icon: <Triangle className="w-4 h-4" /> },
  { type: "polygon", icon: <Hexagon className="w-4 h-4" /> },
  { type: "line", icon: <Minus className="w-4 h-4" /> },
];

export function ShapePanel() {
  const layer = useSelectedLayer();
  const updateLayer = useDesignStore((s) => s.updateLayer);
  const addLayer = useDesignStore((s) => s.addLayer);
  const selectLayer = useDesignStore((s) => s.selectLayer);
  const activeFace = useDesignStore((s) => s.activeFace);

  if (!layer || layer.type !== "shape") {
    return (
      <div className="p-4 space-y-3">
        <p className="text-[11px] text-gray-500">Click a shape to add it to the canvas.</p>
        <div className="grid grid-cols-6 gap-2">
          {SHAPE_OPTIONS.map((s) => (
            <button
              key={s.type}
              onClick={() => {
                const id = Math.random().toString(36).slice(2, 10);
                addLayer({
                  id,
                  name: s.type,
                  type: "shape",
                  shapeType: s.type,
                  fill: "#E85D04",
                  strokeColor: "#111111",
                  strokeWidth: 0,
                  width: s.type === "line" ? 180 : 120,
                  height: s.type === "line" ? 8 : 120,
                  points: s.type === "line" ? [-90, 0, 90, 0] : undefined,
                  sides: s.type === "polygon" ? 6 : undefined,
                  visible: true,
                  locked: false,
                  transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
                  face: activeFace,
                });
                selectLayer(id);
              }}
              className="aspect-square rounded-xl bg-white border border-gray-200 hover:border-orange-300 flex items-center justify-center"
            >
              {s.icon}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const isGradientFill = typeof layer.fill !== "string";

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <label className="text-[10px] font-bold text-gray-500">Fill</label>
        <button
          onClick={() => updateLayer(layer.id, { fill: typeof layer.fill === "string" ? layer.fill : "#E85D04" })}
          className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${!isGradientFill ? "bg-orange-50 border-orange-300 text-orange-600" : "bg-white border-gray-200 text-gray-600"}`}
        >
          Solid
        </button>
        <button
          onClick={() => updateLayer(layer.id, { fill: { type: "linear", angle: 90, stops: [{ offset: 0, color: "#E85D04" }, { offset: 1, color: "#4F46E5" }] } as GradientConfig })}
          className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${isGradientFill ? "bg-orange-50 border-orange-300 text-orange-600" : "bg-white border-gray-200 text-gray-600"}`}
        >
          Gradient
        </button>
      </div>
      {!isGradientFill && (
        <input
          type="color"
          value={typeof layer.fill === "string" ? layer.fill : "#E85D04"}
          onChange={(e) => updateLayer(layer.id, { fill: e.target.value })}
          className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer"
        />
      )}
      {isGradientFill && (
        <GradientEditor
          value={layer.fill as GradientConfig}
          onChange={(g) => updateLayer(layer.id, { fill: g })}
        />
      )}
      <div className="flex items-center gap-2">
        <label className="text-[10px] font-bold text-gray-500">Stroke</label>
        <input
          type="color"
          value={layer.strokeColor || "#111111"}
          onChange={(e) => updateLayer(layer.id, { strokeColor: e.target.value })}
          className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer"
        />
        <input
          type="number"
          value={layer.strokeWidth}
          onChange={(e) => updateLayer(layer.id, { strokeWidth: parseInt(e.target.value, 10) || 0 })}
          className="w-16 px-2 py-1 rounded-lg text-xs border border-gray-200"
        />
      </div>
    </div>
  );
}
