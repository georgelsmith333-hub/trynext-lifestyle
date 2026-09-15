import { useEffect, useRef, useState } from "react";
import { Wand2, Loader2, Info, RefreshCw, Sparkles, X, ImagePlus, Link2 } from "lucide-react";
import { fitImageTransform } from "./autoFit";
import { getApiUrl } from "@/lib/utils";
import { useDesignStore, useSelectedLayer } from "@/hooks/useDesignStore";

const PROMPT_PRESETS = [
  { label: "Minimal logo", prompt: "A clean premium minimalist emblem, bold geometric silhouette, centered composition, high contrast, transparent-friendly background" },
  { label: "Street graphic", prompt: "A premium streetwear graphic with expressive typography space, bold illustrated shapes, balanced centered composition, screen-print friendly" },
  { label: "Nature badge", prompt: "A refined botanical badge with leaves, mountain contours, and a subtle vintage texture, centered and suitable for apparel printing" },
  { label: "Bangladesh pride", prompt: "A premium contemporary Bangladesh-inspired graphic using abstract river lines and cultural motifs, elegant centered composition, print-ready" },
];

type Request = { prompt: string; negative: string };
type PendingArtwork = {
  src: string;
  naturalW: number;
  naturalH: number;
  request: Request;
  model: string;
  face: string;
};

export function AIPanel() {
  const [prompt, setPrompt] = useState("");
  const [negative, setNegative] = useState("blurry, watermark, illegible text, cropped subject, duplicate elements");
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastRequest, setLastRequest] = useState<Request | null>(null);
  const [referenceSrc, setReferenceSrc] = useState<string | null>(null);
  const [referenceName, setReferenceName] = useState<string | null>(null);
  const [pendingArtwork, setPendingArtwork] = useState<PendingArtwork | null>(null);
  const progressTimer = useRef<number | null>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const addLayer = useDesignStore((s) => s.addLayer);
  const selectLayer = useDesignStore((s) => s.selectLayer);
  const setActiveTab = useDesignStore((s) => s.setActiveTab);
  const activeFace = useDesignStore((s) => s.activeFace);
  const printZone = useDesignStore((s) => s.selectedProduct.printZone);
  const selectedLayer = useSelectedLayer();

  useEffect(() => () => {
    if (progressTimer.current) window.clearInterval(progressTimer.current);
  }, []);

  const stopProgress = () => {
    if (progressTimer.current) {
      window.clearInterval(progressTimer.current);
      progressTimer.current = null;
    }
  };

  const readReference = (file: File) => {
    if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) {
      setError(file.size > 10 * 1024 * 1024 ? "Reference images must be under 10MB." : "Choose a JPG, PNG, or WebP reference image.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setReferenceSrc(reader.result as string);
      setReferenceName(file.name);
      setError(null);
    };
    reader.onerror = () => setError("The reference image could not be read.");
    reader.readAsDataURL(file);
  };

  const prepareGeneratedImage = async (src: string, request: Request, model: string): Promise<PendingArtwork> => {
    const img = new Image();
    if (!src.startsWith("data:")) img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("The AI image could not be decoded."));
      img.src = src;
    });
    try { await img.decode?.(); } catch {}

    const naturalW = img.naturalWidth || 1024;
    const naturalH = img.naturalHeight || 1024;
    if (naturalW < 256 || naturalH < 256 || naturalW * naturalH > 16_000_000) {
      throw new Error("The generated artwork dimensions did not pass the Studio acceptance check.");
    }
    let stableSrc = src;
    try {
      const snapshot = document.createElement("canvas");
      snapshot.width = naturalW;
      snapshot.height = naturalH;
      snapshot.getContext("2d")?.drawImage(img, 0, 0, naturalW, naturalH);
      stableSrc = snapshot.toDataURL("image/png");
    } catch {
      // Keep the original server/direct URL if the browser blocks canvas readback.
    }

    return {
      src: stableSrc,
      naturalW,
      naturalH,
      face: activeFace,
      request,
      model,
    };
  };

  const approvePendingArtwork = () => {
    if (!pendingArtwork) return;
    const layerId = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 12);
    addLayer({
      id: layerId,
      name: pendingArtwork.request.prompt.slice(0, 42),
      type: "image",
      src: pendingArtwork.src,
      naturalW: pendingArtwork.naturalW,
      naturalH: pendingArtwork.naturalH,
      visible: true,
      locked: false,
      transform: fitImageTransform(pendingArtwork.naturalW, pendingArtwork.naturalH, { w: printZone.w, h: printZone.h }, { padding: 0.88, maxScale: 4 }),
      face: pendingArtwork.face as typeof activeFace,
    });
    setPendingArtwork(null);
    selectLayer(layerId);
    setActiveTab("layers");
  };

  const handleGenerate = async (request = { prompt: prompt.trim(), negative: negative.trim() }) => {
    if (!request.prompt || generating) return;
    setPrompt(request.prompt);
    setNegative(request.negative);
    setLastRequest(request);
    setGenerating(true);
    setError(null);
    setProgress(8);
    stopProgress();

    try {
      const seed = Math.floor(Math.random() * 999999);
      let generationPrompt: string;
      let model = "flux-realism";
      const params = new URLSearchParams({ width: "1024", height: "1024", nologo: "true", enhance: "true", negative: request.negative, seed: String(seed), model });

      if (referenceSrc) {
        setProgress(18);
        const uploadRes = await fetch(getApiUrl("/api/ai/reference"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: referenceSrc }),
        });
        const uploadJson = await uploadRes.json().catch(() => ({})) as { url?: string; error?: string };
        if (!uploadRes.ok || !uploadJson.url) throw new Error(uploadJson.error || "Reference upload failed.");

        setProgress(35);
        generationPrompt = `${request.prompt}. Use the supplied reference image as the visual source. Preserve the recognizable subject and overall composition, remove unwanted background artifacts, and produce a clean centered print-ready result. ${request.negative ? `Avoid: ${request.negative}.` : ""}`;
        model = "flux-kontext";
        params.set("imageUrl", uploadJson.url);
      } else {
        const suffix = ", product design artwork, high detail, clean centered composition, print-ready, no mockup background";
        generationPrompt = request.prompt + suffix + (request.negative ? `, avoid: ${request.negative}` : "");
      }

      params.set("prompt", generationPrompt);
      params.set("model", model);
      const genRes = await fetch(getApiUrl(`/api/ai/generate?${params.toString()}`));
      const genJson = await genRes.json().catch(() => ({})) as { dataUrl?: string; model?: string; validation?: { width?: number; height?: number }; error?: string };
      if (!genRes.ok || !genJson.dataUrl || !genJson.validation?.width || !genJson.validation?.height) {
        throw new Error(genJson.error || "The server did not accept the generated artwork.");
      }

      setProgress(82);
      const candidate = await prepareGeneratedImage(genJson.dataUrl, request, genJson.model ?? model);
      setPendingArtwork(candidate);
      setProgress(100);
      setError(null);
    } catch (generationError) {
      console.error("[studio] AI generation failed", generationError);
      setError(generationError instanceof Error ? generationError.message : "The AI image could not be generated. Try again.");
    } finally {
      stopProgress();
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">AI Design Assistant</label>
        {(prompt || referenceSrc || pendingArtwork) && <button type="button" onClick={() => { setPrompt(""); setReferenceSrc(null); setReferenceName(null); setPendingArtwork(null); setError(null); }} className="flex items-center gap-1 text-[10px] font-bold text-gray-400 hover:text-gray-700"><X className="h-3 w-3" /> Clear</button>}
      </div>

      <div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-black text-violet-800"><Link2 className="h-3.5 w-3.5" /> Use a reference image</div>
            <p className="mt-1 text-[10px] leading-4 text-violet-600">Upload an image, describe the change, then approve the server-validated result before it enters the current print zone.</p>
          </div>
          <div className="flex shrink-0 flex-col gap-1.5">
            <button type="button" onClick={() => referenceInputRef.current?.click()} disabled={generating} className="rounded-xl bg-white px-3 py-2 text-[10px] font-black text-violet-700 shadow-sm transition hover:bg-violet-100 active:scale-95"><ImagePlus className="mr-1 inline h-3.5 w-3.5" />Choose</button>
            {selectedLayer?.type === "image" && <button type="button" onClick={() => { setReferenceSrc(selectedLayer.src); setReferenceName("Current artwork"); setError(null); }} disabled={generating} className="rounded-xl border border-violet-200 bg-white px-3 py-2 text-[10px] font-black text-violet-700 transition hover:bg-violet-100 active:scale-95">Use selected</button>}
          </div>
        </div>
        <input ref={referenceInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) readReference(file); event.target.value = ""; }} />
        {referenceSrc && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-violet-100 bg-white p-2">
            <img src={referenceSrc} alt="Selected reference" className="h-12 w-12 rounded-lg object-cover" />
            <div className="min-w-0 flex-1"><div className="truncate text-[10px] font-black text-gray-700">{referenceName || "Reference image"}</div><div className="text-[10px] text-violet-600">Reference editing enabled</div></div>
            <button type="button" onClick={() => { setReferenceSrc(null); setReferenceName(null); }} aria-label="Remove reference image" className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X className="h-3.5 w-3.5" /></button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {PROMPT_PRESETS.map((preset) => (
          <button key={preset.label} type="button" onClick={() => setPrompt(preset.prompt)} className="rounded-full border border-purple-100 bg-purple-50 px-2.5 py-1.5 text-[10px] font-bold text-purple-700 transition-colors hover:bg-purple-100"><Sparkles className="mr-1 inline h-3 w-3" />{preset.label}</button>
        ))}
      </div>
      <textarea value={prompt} onChange={(e) => { setPrompt(e.target.value.slice(0, 600)); setError(null); }} placeholder={referenceSrc ? "Describe how to edit the reference…" : "Describe a centered print-ready design…"} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-purple-400" rows={4} maxLength={600} disabled={generating} />
      <div className="flex justify-between text-[10px] text-gray-400"><span>{referenceSrc ? "Reference-guided edit" : "Describe subject, mood, color, and style."}</span><span>{prompt.length}/600</span></div>
      <details className="group">
        <summary className="flex cursor-pointer select-none list-none items-center gap-1 text-[10px] font-black uppercase tracking-widest text-gray-400"><span className="inline-block transition-transform group-open:rotate-90">▶</span> Negative prompt</summary>
        <input value={negative} onChange={(e) => setNegative(e.target.value.slice(0, 300))} placeholder="blurry, watermark, cropped" className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-purple-400" disabled={generating} />
      </details>
      <p className="text-[10px] text-gray-400">Generated artwork is server-validated first, then requires your approval before it becomes an editable layer in the recorded print zone.</p>
      {generating && <div className="space-y-1.5 rounded-xl border border-purple-100 bg-purple-50 p-3"><div className="flex items-center justify-between text-[11px] font-bold text-purple-700"><span className="flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" /> {referenceSrc ? "Editing reference…" : "Creating print-ready art…"}</span><span className="text-[10px] font-black text-purple-400">{Math.round(progress)}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-purple-200"><div className="h-full rounded-full bg-gradient-to-r from-purple-600 to-purple-400 transition-all duration-500" style={{ width: `${progress}%` }} /></div></div>}
      {error && <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span className="flex-1">{error}</span>{lastRequest && <button type="button" onClick={() => void handleGenerate(lastRequest)} className="flex items-center gap-1 font-black underline"><RefreshCw className="h-3 w-3" /> Retry</button>}</div>}
      {pendingArtwork && <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3"><div className="flex items-center gap-2"><img src={pendingArtwork.src} alt="Server-validated AI artwork candidate" className="h-14 w-14 rounded-lg border border-emerald-100 bg-white object-cover" /><div className="min-w-0 flex-1"><div className="text-[11px] font-black text-emerald-800">Ready for print-zone approval</div><p className="mt-0.5 text-[10px] leading-4 text-emerald-700">{pendingArtwork.naturalW} × {pendingArtwork.naturalH}px · {pendingArtwork.model}</p></div></div><div className="flex gap-2"><button type="button" onClick={approvePendingArtwork} className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-[11px] font-black text-white">Approve & add layer</button><button type="button" onClick={() => setPendingArtwork(null)} className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-[11px] font-black text-emerald-700">Discard</button></div></div>}
      <button type="button" onClick={() => void handleGenerate()} disabled={generating || !prompt.trim()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 py-3 text-sm font-black text-white disabled:opacity-50"><Wand2 className="h-4 w-4" /> {generating ? "Working…" : referenceSrc ? "Edit reference preview" : "Generate AI preview"}</button>
    </div>
  );
}

export default AIPanel;
