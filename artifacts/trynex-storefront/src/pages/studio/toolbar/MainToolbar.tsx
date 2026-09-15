import { Download, MousePointer2, PenTool, Pipette, Redo2, RotateCw, Shapes, Shirt, Type, Undo2, ZoomIn, ZoomOut, Ruler } from "lucide-react";
import { useDesignStore } from "@/hooks/useDesignStore";
import type { ToolType } from "../types";

const TOOLS: { id: ToolType; label: string; icon: React.ReactNode; hint: string }[] = [
  { id: "select", label: "Select", hint: "Select and move a layer", icon: <MousePointer2 className="h-4 w-4" /> },
  { id: "text", label: "Text", hint: "Add or edit text", icon: <Type className="h-4 w-4" /> },
  { id: "shape", label: "Shape", hint: "Add a shape", icon: <Shapes className="h-4 w-4" /> },
  { id: "draw", label: "Draw", hint: "Draw on the canvas", icon: <PenTool className="h-4 w-4" /> },
  { id: "eyedrop", label: "Pick color", hint: "Pick a color from the canvas", icon: <Pipette className="h-4 w-4" /> },
];

interface MainToolbarProps {
  onExport?: () => void;
  isExporting?: boolean;
  exportDisabled?: boolean;
}

export function MainToolbar({ onExport, isExporting = false, exportDisabled = false }: MainToolbarProps) {
  const activeTool = useDesignStore((s) => s.activeTool);
  const setActiveTool = useDesignStore((s) => s.setActiveTool);
  const undo = useDesignStore((s) => s.undo);
  const redo = useDesignStore((s) => s.redo);
  const zoom = useDesignStore((s) => s.zoom);
  const setZoom = useDesignStore((s) => s.setZoom);
  const resetView = useDesignStore((s) => s.resetView);
  const showPrintZone = useDesignStore((s) => s.showPrintZone);
  const setShowPrintZone = useDesignStore((s) => s.setShowPrintZone);
  const fabricTexture = useDesignStore((s) => s.fabricTexture);
  const setFabricTexture = useDesignStore((s) => s.setFabricTexture);

  return (
    <div className="no-scrollbar w-full overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex min-w-max items-center gap-1.5 p-2">
        <div className="flex items-center gap-1">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              type="button"
              title={tool.hint}
              aria-label={tool.hint}
              onClick={() => setActiveTool(tool.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-2 text-[10px] font-bold transition-all active:scale-95 ${activeTool === tool.id ? "bg-gray-900 text-white shadow-sm" : "bg-gray-50 text-gray-600 hover:bg-gray-100"}`}
            >
              {tool.icon}<span className="hidden sm:inline">{tool.label}</span>
            </button>
          ))}
        </div>
        <span className="mx-1 h-5 w-px shrink-0 bg-gray-200" />
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" title="Undo" aria-label="Undo" onClick={undo} className="rounded-xl bg-gray-50 p-2 text-gray-600 transition hover:bg-gray-100 active:scale-95"><Undo2 className="h-3.5 w-3.5" /></button>
          <button type="button" title="Redo" aria-label="Redo" onClick={redo} className="rounded-xl bg-gray-50 p-2 text-gray-600 transition hover:bg-gray-100 active:scale-95"><Redo2 className="h-3.5 w-3.5" /></button>
        </div>
        <span className="mx-1 h-5 w-px shrink-0 bg-gray-200" />
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" title="Zoom in" aria-label="Zoom in" onClick={() => setZoom(Math.min(2.5, zoom + 0.25))} className="rounded-xl bg-gray-50 p-2 text-gray-600 transition hover:bg-gray-100 active:scale-95"><ZoomIn className="h-3.5 w-3.5" /></button>
          <button type="button" title="Zoom out" aria-label="Zoom out" onClick={() => setZoom(Math.max(0.5, zoom - 0.25))} className="rounded-xl bg-gray-50 p-2 text-gray-600 transition hover:bg-gray-100 active:scale-95"><ZoomOut className="h-3.5 w-3.5" /></button>
          <button type="button" title="Reset canvas view" aria-label="Reset canvas view" onClick={resetView} className="rounded-xl bg-gray-50 p-2 text-gray-600 transition hover:bg-gray-100 active:scale-95"><RotateCw className="h-3.5 w-3.5" /></button>
        </div>
        <span className="mx-1 h-5 w-px shrink-0 bg-gray-200" />
        <button type="button" title="Toggle printable area" aria-pressed={showPrintZone} onClick={() => setShowPrintZone(!showPrintZone)} className={`flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-2 text-[10px] font-bold transition-all active:scale-95 ${showPrintZone ? "border border-orange-200 bg-orange-50 text-orange-600" : "bg-gray-50 text-gray-600 hover:bg-gray-100"}`}><Ruler className="h-3.5 w-3.5" /> Print zone</button>
        <button type="button" title="Toggle fabric texture" aria-pressed={fabricTexture} onClick={() => setFabricTexture(!fabricTexture)} className={`flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-2 text-[10px] font-bold transition-all active:scale-95 ${fabricTexture ? "border border-amber-200 bg-amber-50 text-amber-700" : "bg-gray-50 text-gray-600 hover:bg-gray-100"}`}><Shirt className="h-3.5 w-3.5" /> Texture</button>
          <button type="button" onClick={onExport} disabled={!onExport || isExporting || exportDisabled} title={exportDisabled ? "Export is unavailable for this surface" : "Export design as PNG"} className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gray-900 px-2.5 py-2 text-[10px] font-bold text-white transition hover:bg-gray-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"><Download className="h-3.5 w-3.5" /> {isExporting ? "Exporting…" : "Export"}</button>
      </div>
    </div>
  );
}
