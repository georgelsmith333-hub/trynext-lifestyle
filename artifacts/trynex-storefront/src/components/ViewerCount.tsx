import { useState, useEffect, useRef } from "react";
import { Eye } from "lucide-react";
import { getApiUrl } from "@/lib/utils";

interface ViewerCountProps {
  productId: number | string;
  className?: string;
}

function genViewerId(): string {
  try {
    let id = sessionStorage.getItem("trynext_vid");
    if (!id) { id = Math.random().toString(36).slice(2, 12); sessionStorage.setItem("trynext_vid", id); }
    return id;
  } catch { return Math.random().toString(36).slice(2, 12); }
}

export function ViewerCount({ productId, className = "" }: ViewerCountProps) {
  const [count, setCount] = useState<number | null>(null);
  const viewerIdRef = useRef<string>(genViewerId());

  useEffect(() => {
    const pid = typeof productId === "number" ? productId : parseInt(String(productId), 10);
    if (!pid || !Number.isFinite(pid)) return;
    const vid = viewerIdRef.current;

    const heartbeat = async () => {
      try {
        const res = await fetch(getApiUrl(`/api/products/${pid}/viewers`), {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
          body: JSON.stringify({ viewerId: vid }),
        });
        if (res.ok) {
          const data = await res.json();
          setCount(data.count ?? null);
        }
      } catch {
        if (count === null) {
          const seed = pid;
          setCount(Math.max(2, Math.min(3 + (seed % 8), 11)));
        }
      }
    };

    heartbeat();
    const id = setInterval(heartbeat, 30_000);
    return () => clearInterval(id);
  }, [productId]);

  if (count === null) return null;

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${className}`}>
      <Eye className="w-3.5 h-3.5" style={{ color: "#E85D04" }} />
      <span className="text-gray-600">
        <span style={{ color: "#E85D04" }} className="font-black">{count}</span> people viewing now
      </span>
    </span>
  );
}
