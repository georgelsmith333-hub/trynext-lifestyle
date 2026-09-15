import { useState } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { GradientConfig, GradientStop } from "./types";

interface Props {
  value: GradientConfig;
  onChange: (config: GradientConfig) => void;
}

export function GradientEditor({ value, onChange }: Props) {
  const [selectedStop, setSelectedStop] = useState<number | null>(null);

  const updateStops = (stops: GradientStop[]) => {
    onChange({ ...value, stops: stops.sort((a, b) => a.offset - b.offset) });
  };

  const addStop = () => {
    const offsets = value.stops.map((s) => s.offset);
    let newOffset = 0.5;
    if (offsets.length > 0) {
      const maxGap = offsets.slice(1).reduce((gap, o, i) => Math.max(gap, o - offsets[i]), 0);
      const idx = offsets.slice(1).findIndex((o, i) => o - offsets[i] === maxGap);
      newOffset = offsets[idx] + maxGap / 2;
    }
    updateStops([...value.stops, { offset: Math.round(newOffset * 100) / 100, color: "#E85D04" }]);
  };

  const updateStop = (idx: number, patch: Partial<GradientStop>) => {
    const next = value.stops.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    updateStops(next);
  };

  const removeStop = (idx: number) => {
    if (value.stops.length <= 2) return;
    updateStops(value.stops.filter((_, i) => i !== idx));
  };

  const gradientCss = (() => {
    const stops = value.stops.map((s) => `${s.color} ${Math.round(s.offset * 100)}%`).join(", ");
    if (value.type === "radial") return `radial-gradient(circle, ${stops})`;
    if (value.type === "conic") return `conic-gradient(from 0deg, ${stops})`;
    return `linear-gradient(${value.angle ?? 90}deg, ${stops})`;
  })();

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(["linear", "radial", "conic"] as const).map((t) => (
          <button
            key={t}
            onClick={() => onChange({ ...value, type: t })}
            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border capitalize ${
              value.type === t ? "bg-orange-50 border-orange-300 text-orange-600" : "bg-white border-gray-200 text-gray-600"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {value.type === "linear" && (
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-bold text-gray-500">Angle</label>
          <input
            type="range"
            min={0}
            max={360}
            value={value.angle ?? 90}
            onChange={(e) => onChange({ ...value, angle: parseInt(e.target.value, 10) })}
            className="flex-1"
          />
          <span className="text-[10px] font-bold text-gray-600 w-8 text-right">{value.angle ?? 90}°</span>
        </div>
      )}
      <div className="h-8 rounded-lg border border-gray-200" style={{ background: gradientCss }} />
      <div className="space-y-1.5">
        {value.stops.map((stop, idx) => (
          <div key={idx} className="flex items-center gap-2 p-1.5 rounded-lg bg-gray-50">
            <GripVertical className="w-3 h-3 text-gray-300" />
            <input
              type="color"
              value={stop.color}
              onChange={(e) => updateStop(idx, { color: e.target.value })}
              className="w-6 h-6 rounded border border-gray-200 cursor-pointer"
            />
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(stop.offset * 100)}
              onChange={(e) => updateStop(idx, { offset: parseInt(e.target.value, 10) / 100 })}
              className="flex-1"
            />
            <span className="text-[10px] font-bold text-gray-600 w-8">{Math.round(stop.offset * 100)}%</span>
            <button onClick={() => removeStop(idx)} disabled={value.stops.length <= 2} className="p-1 rounded hover:bg-red-50 text-red-500 disabled:opacity-30">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={addStop}
        className="w-full py-1.5 rounded-lg text-[10px] font-bold border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center gap-1"
      >
        <Plus className="w-3 h-3" /> Add color stop
      </button>
    </div>
  );
}
