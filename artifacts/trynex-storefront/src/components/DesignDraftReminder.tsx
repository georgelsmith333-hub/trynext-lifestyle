import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "wouter";
import { Pen, X, Cloud } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getApiUrl } from "@/lib/utils";

const DRAFT_KEY = "trynex-design-draft-v1";
const REMINDER_SESSION_KEY = "trynex-draft-reminder-shown";

/**
 * Appears at bottom-left when user has a saved design draft but is NOT
 * currently on the design studio page.  Shows once per session.
 * Checks both localStorage (all users) and the cloud (authenticated users).
 */
export function DesignDraftReminder() {
  const [show, setShow] = useState(false);
  const [draftInfo, setDraftInfo] = useState<{ productId: string; savedAt: number; source: "local" | "cloud" } | null>(null);
  const [location] = useLocation();

  const isStudio = location.startsWith("/design-studio");

  useEffect(() => {
    if (isStudio) return;
    const alreadyShown = sessionStorage.getItem(REMINDER_SESSION_KEY);
    if (alreadyShown) return;

    let cancelled = false;

    async function checkDraft() {
      // 1. Check cloud draft for authenticated users
      const token = localStorage.getItem("trynex_customer_token");
      if (token) {
        try {
          const res = await fetch(getApiUrl("/api/drafts"), {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const json = await res.json();
            if (json.draft?.payload && json.draft.payload.version === 2 && Array.isArray(json.draft.payload.layers) && json.draft.payload.layers.length > 0) {
              if (!cancelled) {
                const savedAt = json.draft.payload.savedAt ?? (json.draft.updatedAt ? new Date(json.draft.updatedAt).getTime() : Date.now());
                setDraftInfo({ productId: json.draft.payload.productId, savedAt, source: "cloud" });
                setTimeout(() => { if (!cancelled) setShow(true); }, 6000);
              }
              return;
            }
          }
        } catch {
          // Cloud unavailable — fall through to localStorage
        }
      }

      // 2. Fall back to localStorage draft
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (parsed?.version === 2 && Array.isArray(parsed.layers) && parsed.layers.length > 0) {
          if (!cancelled) {
            setDraftInfo({ productId: parsed.productId, savedAt: parsed.savedAt, source: "local" });
            setTimeout(() => { if (!cancelled) setShow(true); }, 6000);
          }
        }
      } catch { }
    }

    checkDraft();
    return () => { cancelled = true; };
  }, [isStudio]);

  const handleDismiss = () => {
    setShow(false);
    sessionStorage.setItem(REMINDER_SESSION_KEY, "1");
  };

  const since = draftInfo ? (() => {
    const mins = Math.round((Date.now() - draftInfo.savedAt) / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    return hrs < 24 ? `${hrs}h ago` : "recently";
  })() : "";

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, x: -40, y: 20 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ type: "spring", damping: 24, stiffness: 260 }}
          className="fixed bottom-24 left-4 z-[500] w-72 rounded-2xl shadow-2xl overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #1a1a1a, #2d1200)",
            border: "1px solid rgba(232,93,4,0.3)",
          }}
        >
          {/* Orange accent line */}
          <div className="h-1" style={{ background: "linear-gradient(90deg, #E85D04, #FB8500)" }} />

          <div className="p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, #E85D04, #FB8500)" }}>
              {draftInfo?.source === "cloud" ? (
                <Cloud className="w-4 h-4 text-white" />
              ) : (
                <Pen className="w-4 h-4 text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-black text-sm leading-tight">You have an unfinished design!</p>
              <p className="text-white/60 text-[11px] mt-0.5">
                {draftInfo?.source === "cloud" ? "Cloud draft from" : "Saved"} {since} — continue where you left off.
              </p>
            </div>
            <button onClick={handleDismiss} className="text-white/40 hover:text-white/80 shrink-0 mt-0.5">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-4 pb-4 flex gap-2">
            <Link
              href="/design-studio"
              onClick={handleDismiss}
              className="flex-1 py-2 rounded-xl text-xs font-black text-white text-center"
              style={{ background: "linear-gradient(135deg, #E85D04, #FB8500)" }}
            >
              Continue Designing →
            </Link>
            <button
              onClick={handleDismiss}
              className="px-3 py-2 rounded-xl text-xs font-bold text-white/50 hover:text-white/80 border border-white/10 transition-colors"
            >
              Later
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
