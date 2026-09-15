import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useGetSettings, useUpdateSettings } from "@workspace/api-client-react";
import { Loader } from "@/components/ui/Loader";
import { getAuthHeaders, getApiUrl } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { Save, Store, Phone, Globe, CreditCard, Truck, BarChart3, Megaphone, Image, Search, KeyRound, Palette, Plus, Trash2, Zap, Tag, CheckCircle2, XCircle, RotateCcw, Send } from "lucide-react";

const inputClass = "w-full px-4 py-3 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400 transition-all placeholder:text-gray-400";
const inputStyle = { background: 'white', border: '1px solid #e5e7eb', color: '#111827' };

/* ── Studio Colors Manager ── */
interface StudioColor { name: string; hex: string }

function StudioColorsManager({ value, onChange }: { value: string; onChange: (json: string) => void }) {
  const parseColors = (raw: string): StudioColor[] => {
    try { const arr = JSON.parse(raw); if (Array.isArray(arr)) return arr; } catch {}
    return [];
  };
  const [colors, setColors] = useState<StudioColor[]>(() => parseColors(value));
  const [newName, setNewName] = useState("");
  const [newHex, setNewHex] = useState("#000000");

  // Sync internal state when async-loaded settings arrive
  useEffect(() => {
    setColors(parseColors(value));
  }, [value]);

  const commit = (next: StudioColor[]) => { setColors(next); onChange(JSON.stringify(next)); };
  const remove = (i: number) => commit(colors.filter((_, idx) => idx !== i));
  const add = () => {
    if (!newName.trim()) return;
    commit([...colors, { name: newName.trim(), hex: newHex }]);
    setNewName(""); setNewHex("#000000");
  };

  return (
    <div>
      <div className="space-y-2 mb-3">
        {colors.length === 0 && (
          <p className="text-xs text-gray-400 italic">No colors added yet. Using 12 default colors.</p>
        )}
        {colors.map((c, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
            <div className="w-7 h-7 rounded-lg border border-gray-200 shrink-0" style={{ background: c.hex }} />
            <span className="text-sm font-semibold text-gray-800 flex-1">{c.name}</span>
            <span className="text-xs text-gray-400 font-mono">{c.hex}</span>
            <button type="button" onClick={() => remove(i)} className="text-gray-400 hover:text-red-500 transition-colors ml-1">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={newHex}
          onChange={e => setNewHex(e.target.value)}
          className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer shrink-0 p-0.5"
          style={{ background: 'white' }}
        />
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder="Color name (e.g. Royal Blue)"
          className={inputClass + " flex-1"}
          style={inputStyle}
        />
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm font-bold text-white shrink-0"
          style={{ background: 'linear-gradient(135deg,#E85D04,#FB8500)' }}
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>
    </div>
  );
}

function TelegramSection() {
  const { toast } = useToast();
  const [setupInfo, setSetupInfo] = useState<any>(null);
  const [loadingSetup, setLoadingSetup] = useState(false);
  const [loadingTest, setLoadingTest] = useState(false);
  const [manualChatId, setManualChatId] = useState("");
  const [registering, setRegistering] = useState(false);

  const checkSetup = async () => {
    setLoadingSetup(true);
    try {
      const res = await fetch(getApiUrl("/api/admin/telegram/setup"), { headers: getAuthHeaders() });
      const data = await res.json();
      setSetupInfo(data);
    } catch {
      toast({ title: "Error", description: "Could not reach server.", variant: "destructive" });
    } finally {
      setLoadingSetup(false);
    }
  };

  const sendTest = async () => {
    setLoadingTest(true);
    try {
      const res = await fetch(getApiUrl("/api/admin/telegram/test"), { method: "POST", headers: getAuthHeaders() });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "✅ Test sent!", description: "Check your Telegram chat for the test message." });
      } else {
        toast({ title: "Telegram Error", description: data.message || "Check setup first.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Could not reach server.", variant: "destructive" });
    } finally {
      setLoadingTest(false);
    }
  };

  const registerChat = async () => {
    if (!manualChatId.trim()) return;
    setRegistering(true);
    try {
      const res = await fetch(getApiUrl("/api/admin/telegram/register-chat"), {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: manualChatId.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "✅ Chat registered!", description: `Notifications will now go to chat ${manualChatId}.` });
        setManualChatId("");
        await checkSetup();
      } else {
        toast({ title: "Error", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Could not register chat ID.", variant: "destructive" });
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="md:col-span-2 space-y-4">
      {/* Status badge */}
      {setupInfo && (
        <div className="rounded-xl p-3 flex items-center gap-3"
          style={{
            background: setupInfo.current_chat_id ? 'rgba(34,197,94,0.08)' : 'rgba(234,179,8,0.08)',
            border: `1px solid ${setupInfo.current_chat_id ? 'rgba(34,197,94,0.25)' : 'rgba(234,179,8,0.25)'}`,
          }}>
          {setupInfo.current_chat_id
            ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            : <Send className="w-5 h-5 text-amber-500 shrink-0" />
          }
          <div>
            <p className="text-sm font-bold" style={{ color: setupInfo.current_chat_id ? '#16a34a' : '#92400e' }}>
              {setupInfo.instructions || setupInfo.message}
            </p>
            {setupInfo.current_chat_id && (
              <p className="text-xs text-gray-500 mt-0.5">
                Chat ID: <code className="font-mono bg-gray-100 px-1 rounded">{setupInfo.current_chat_id}</code>
                {setupInfo.chat_id_source === 'db' && <span className="ml-1 text-blue-600">(saved in DB)</span>}
                {setupInfo.chat_id_source === 'env' && <span className="ml-1 text-green-600">(from env secret)</span>}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="rounded-xl p-4 space-y-2" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
        <p className="text-sm font-bold text-blue-800">How to activate order notifications:</p>
        <ol className="text-xs text-blue-700 space-y-1.5 list-decimal list-inside">
          <li>Open Telegram and search for <strong>@{setupInfo?.botUsername || 'Trynex_Bot'}</strong></li>
          <li>Send any message (e.g. <code>/start</code>) — the bot auto-registers your chat</li>
          <li>Click <strong>"Check Setup"</strong> below to confirm, then <strong>"Send Test"</strong></li>
        </ol>
        <p className="text-xs text-blue-600 mt-1">Or paste your chat ID manually below if you know it.</p>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={manualChatId}
          onChange={e => setManualChatId(e.target.value)}
          placeholder="Paste chat ID manually (e.g. 123456789)"
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
        />
        <button
          type="button"
          onClick={registerChat}
          disabled={registering || !manualChatId.trim()}
          className="px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
          style={{ background: '#229ED9' }}
        >
          {registering ? "Saving..." : "Save"}
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={checkSetup}
          disabled={loadingSetup}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
          style={{ background: '#229ED9', color: 'white' }}
        >
          <Send className="w-4 h-4" />
          {loadingSetup ? "Checking..." : "Check Setup"}
        </button>
        <button
          type="button"
          onClick={sendTest}
          disabled={loadingTest}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg,#E85D04,#FB8500)', color: 'white' }}
        >
          <CheckCircle2 className="w-4 h-4" />
          {loadingTest ? "Sending..." : "Send Test Message"}
        </button>
      </div>
    </div>
  );
}

const sectionSummaries: Record<string, string> = {
  "General Information": "The storefront identity and first impression.",
  "Homepage Promo Banner": "The campaign customers see before they shop.",
  "Contact Information": "The details customers use when they need a human.",
  "Payment Methods": "Merchant numbers shown at checkout.",
  "Shipping & Delivery": "Thresholds and delivery economics.",
  "Design Studio": "Base prices, fees and product colour swatches.",
  "Flash Sale & Urgency": "Time-sensitive merchandising controls.",
  "Spin-the-Wheel Offer Game": "Visitor offer game and reset controls.",
  "SEO Defaults & Auto-SEO": "Search and social defaults for new pages.",
  "Telegram Order Notifications": "Operational alerts for new orders.",
  "Meta CAPI (Server-Side Events)": "Server-side conversion tracking status.",
};

const SectionCard = ({ icon: Icon, title, iconColor = "#E85D04", children }: {
  icon: any; title: string; iconColor?: string; children: React.ReactNode;
}) => (
  <section id={`settings-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} data-testid={`section-settings-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} className="admin-panel overflow-hidden">
    <div className="flex items-center gap-3 border-b border-[#e8ede6] bg-[#fafcf9] px-4 py-4 sm:px-6">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: `${iconColor}15`, border: `1px solid ${iconColor}25` }}>
        <Icon className="w-4 h-4" style={{ color: iconColor }} />
      </div>
      <div><h2 className="text-sm font-black text-[#172019]">{title}</h2>{sectionSummaries[title] && <p className="mt-0.5 text-[11px] text-[#8b948a]">{sectionSummaries[title]}</p>}</div>
    </div>
    <div className="p-4 sm:p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">{children}</div>
    </div>
  </section>
);

const Field = ({ label, children, full = false }: { label: string; children: React.ReactNode; full?: boolean }) => (
  <div className={full ? "md:col-span-2" : ""}>
    <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">{label}</label>
    {children}
  </div>
);

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const siteSettings = useSiteSettings();
  const { data: settings, isLoading } = useGetSettings({ request: { headers: getAuthHeaders() }, query: { queryKey: ["/api/settings"], staleTime: 0, refetchOnMount: "always" } });
  const { mutateAsync: updateSettings, isPending } = useUpdateSettings({
    request: { headers: getAuthHeaders() }
  });
  const { register, handleSubmit, reset, formState: { isDirty } } = useForm();
  const [saveState, setSaveState] = useState<"idle" | "dirty" | "saved" | "error">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Studio colors managed outside react-hook-form — separate per product type
  const [tshirtColorsJson, setTshirtColorsJson] = useState("");
  const [mugColorsJson, setMugColorsJson] = useState("");
  const [hoodieColorsJson, setHoodieColorsJson] = useState("");
  const [longsleeveColorsJson, setLongsleeveColorsJson] = useState("");
  const [capColorsJson, setCapColorsJson] = useState("");
  const [waterbottleColorsJson, setWaterbottleColorsJson] = useState("");

  // Remove.bg configured status — fetched from /api/remove-bg/status
  const [removeBgConfigured, setRemoveBgConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    fetch(getApiUrl("/api/remove-bg/status"))
      .then(r => r.json())
      .then((d: { configured: boolean }) => setRemoveBgConfigured(d.configured))
      .catch(() => setRemoveBgConfigured(false));
  }, []);

  useEffect(() => {
    if (settings) {
      reset(settings);
      setSaveState("idle");
      setTshirtColorsJson((settings as any).studioTshirtColors ?? "");
      setMugColorsJson((settings as any).studioMugColors ?? "");
      setHoodieColorsJson((settings as any).studioHoodieColors ?? "");
      setLongsleeveColorsJson((settings as any).studioLongsleeveColors ?? "");
      setCapColorsJson((settings as any).studioCapColors ?? "");
      setWaterbottleColorsJson((settings as any).studioWaterbottleColors ?? "");
    }
  }, [settings, reset]);

  useEffect(() => {
    if (isDirty) setSaveState("dirty");
  }, [isDirty]);

  const validateSettings = (data: Record<string, string | undefined>): string | null => {
    const requiredFields: Array<{ key: string; label: string }> = [
      { key: "siteName", label: "Store Name" },
    ];
    for (const { key, label } of requiredFields) {
      if (!data[key] || !data[key]?.trim()) {
        return `${label} is required`;
      }
    }

    const phoneFields: Array<{ key: string; label: string }> = [
      { key: "phone", label: "Support Phone" },
      { key: "whatsappNumber", label: "WhatsApp Number" },
      { key: "bkashNumber", label: "bKash Number" },
      { key: "nagadNumber", label: "Nagad Number" },
      { key: "rocketNumber", label: "Rocket Number" },
      { key: "upayNumber", label: "uPay Number" },
    ];
    const bdPhoneRegex = /^(\+?880\s?)?0?1[3-9]\d{2}[-\s]?\d{6}$/;
    for (const { key, label } of phoneFields) {
      const val = data[key];
      if (val && val.trim()) {
        if (!bdPhoneRegex.test(val.trim())) {
          return `${label}: Please enter a valid Bangladesh phone number (e.g. 01712-345678)`;
        }
      }
    }

    const urlFields: Array<{ key: string; label: string }> = [
      { key: "facebookUrl", label: "Facebook URL" },
      { key: "instagramUrl", label: "Instagram URL" },
      { key: "youtubeUrl", label: "YouTube URL" },
    ];
    const urlRegex = /^https?:\/\/.+\..+/;
    for (const { key, label } of urlFields) {
      const val = data[key];
      if (val && val.trim()) {
        if (!urlRegex.test(val.trim())) {
          return `${label}: Please enter a valid URL starting with http:// or https://`;
        }
      }
    }

    const emailVal = data["email"];
    if (emailVal && emailVal.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal.trim())) {
        return "Support Email: Please enter a valid email address";
      }
    }

    return null;
  };

  const onSubmit = async (data: Record<string, string | undefined>) => {
    const validationError = validateSettings(data);
    if (validationError) {
      toast({ title: "Validation Error", description: validationError, variant: "destructive" });
      return;
    }
    try {
      // Auto-reset spin wheel for all visitors when the admin turns it on after it was off.
      // react-hook-form sends checkbox values as booleans even when the generic type is string.
      const isWheelNowOn = !!(data.spinWheelEnabled as unknown);
      const turningWheelOn = isWheelNowOn && settings?.spinWheelEnabled === false;

      // Sanitize numeric fields: replace NaN (from empty number inputs) with safe defaults.
      const safeData = { ...data };
      const numericDefaults: Record<string, string> = {
        spinWheelDelay: "4",
        spinWheelCooldownHours: "24",
        freeShippingThreshold: "1500",
        shippingCost: "100",
        scarcityThreshold: "10",
        studioTshirtPrice: "450",
        studioMugPrice: "449",
        studioHoodiePrice: "1699",
        studioLongsleevePrice: "1299",
        studioCapPrice: "699",
        studioWaterbottlePrice: "899",
        studioTshirtCustomizationFee: "99",
        studioHoodieCustomizationFee: "99",
        studioLongsleeveCustomizationFee: "99",
        studioCapCustomizationFee: "99",
        studioMugCustomizationFee: "99",
        studioWaterbottleCustomizationFee: "99",
      };
      for (const [key, fallback] of Object.entries(numericDefaults)) {
        const val = safeData[key];
        if (val === undefined || val === null || val === "" || Number.isNaN(Number(val))) {
          safeData[key] = fallback;
        }
      }

      const payload: Record<string, string | number> = {
        ...(safeData as Record<string, string>),
        freeShippingThreshold: Number(safeData.freeShippingThreshold),
        shippingCost: Number(safeData.shippingCost),
        scarcityThreshold: Number(safeData.scarcityThreshold),
        studioTshirtPrice: Number(safeData.studioTshirtPrice),
        studioMugPrice: Number(safeData.studioMugPrice),
        studioHoodiePrice: Number(safeData.studioHoodiePrice),
        studioLongsleevePrice: Number(safeData.studioLongsleevePrice),
        studioCapPrice: Number(safeData.studioCapPrice),
        studioWaterbottlePrice: Number(safeData.studioWaterbottlePrice),
        studioTshirtCustomizationFee: Number(safeData.studioTshirtCustomizationFee),
        studioHoodieCustomizationFee: Number(safeData.studioHoodieCustomizationFee),
        studioLongsleeveCustomizationFee: Number(safeData.studioLongsleeveCustomizationFee),
        studioCapCustomizationFee: Number(safeData.studioCapCustomizationFee),
        studioMugCustomizationFee: Number(safeData.studioMugCustomizationFee),
        studioWaterbottleCustomizationFee: Number(safeData.studioWaterbottleCustomizationFee),
        studioTshirtColors: tshirtColorsJson,
        studioMugColors: mugColorsJson,
        studioHoodieColors: hoodieColorsJson,
        studioLongsleeveColors: longsleeveColorsJson,
        studioCapColors: capColorsJson,
        studioWaterbottleColors: waterbottleColorsJson,
      };
      if (turningWheelOn) payload.spinWheelResetAt = String(Date.now());

      const savedSettings = await updateSettings({ data: payload as any });
      reset(savedSettings as Record<string, unknown>);
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      setSaveState("saved");
      setLastSavedAt(new Date());
      toast({ title: "✓ Settings saved successfully!" });
      // Refresh remove.bg configured status so the badge reflects any newly-saved key immediately
      fetch(getApiUrl("/api/remove-bg/status"))
        .then(r => r.json())
        .then((d: { configured: boolean }) => setRemoveBgConfigured(d.configured))
        .catch(() => {});
    } catch {
      setSaveState("error");
      toast({ title: "Failed to save settings", variant: "destructive" });
    }
  };

  if (isLoading) return <AdminLayout><Loader /></AdminLayout>;

  const sectionIndex = [
    ["settings-general-information", "General"],
    ["settings-homepage-promo-banner", "Homepage promo"],
    ["settings-contact-information", "Contact"],
    ["settings-social-media", "Social media"],
    ["settings-payment-methods", "Payment"],
    ["settings-analytics-tracking", "Analytics"],
    ["settings-shipping-delivery", "Shipping"],
    ["settings-branding-logo", "Branding"],
    ["settings-authentication-oauth", "Authentication"],
    ["settings-google-search-console", "Search Console"],
    ["settings-design-studio", "Design Studio"],
    ["settings-flash-sale-urgency", "Flash sale"],
    ["settings-exit-intent-promo-popup", "Exit-intent"],
    ["settings-spin-the-wheel-offer-game", "Spin wheel"],
    ["settings-seo-defaults-auto-seo", "SEO defaults"],
    ["settings-telegram-order-notifications", "Telegram"],
    ["settings-meta-capi-server-side-events", "Meta CAPI"],
  ] as const;

  return (
    <AdminLayout>
      <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <p className="admin-kicker">Store control</p>
          <h1 className="mt-1 font-display text-4xl font-black tracking-[-.055em] text-[#172019] sm:text-5xl">Store settings</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6f7d70]">One place for the storefront voice, checkout rules, creative studio pricing and operator alerts.</p>
        </div>
        <div className="rounded-xl border border-[#dfe5dd] bg-white px-3.5 py-2.5 text-xs text-[#6f7d70]" data-testid="status-settings-header">
          <span className={`mr-2 inline-block h-2 w-2 rounded-full ${isPending ? "bg-[#e85d04]" : saveState === "saved" ? "bg-[#2ebc68]" : saveState === "error" ? "bg-red-500" : isDirty ? "bg-[#d89017]" : "bg-[#9aa39a]"}`} />
          {isPending ? "Saving changes…" : saveState === "saved" && lastSavedAt ? `Saved ${lastSavedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : saveState === "error" ? "Save failed — changes kept" : isDirty ? "Unsaved changes" : "All changes saved"}
        </div>
      </div>

      <details className="admin-panel mb-6 xl:hidden" data-testid="details-settings-index">
        <summary className="cursor-pointer list-none px-4 py-3 text-xs font-black uppercase tracking-[.13em] text-[#687468]">Jump to settings section</summary>
        <nav className="grid grid-cols-2 gap-1 border-t border-[#e8ede6] p-3 sm:grid-cols-3">
          {sectionIndex.map(([id, label]) => (
            <a key={id} href={`#${id}`} data-testid={`link-mobile-settings-${id.replace("settings-", "")}`} className="rounded-lg px-2 py-2 text-[11px] font-bold text-[#718071] hover:bg-[#fff0e5] hover:text-[#c94e00]">{label}</a>
          ))}
        </nav>
      </details>

      <div className="grid items-start gap-6 xl:grid-cols-[190px_minmax(0,1fr)]">
        <aside className="admin-panel sticky top-4 hidden p-3 xl:block" aria-label="Settings sections">
          <p className="px-2 pb-2 text-[10px] font-black uppercase tracking-[.14em] text-[#8b948a]">Jump to section</p>
          <nav className="space-y-0.5">
            {sectionIndex.map(([id, label]) => (
              <a key={id} href={`#${id}`} data-testid={`link-settings-${id.replace("settings-", "")}`} className="block rounded-lg px-2 py-2 text-[11px] font-bold text-[#718071] transition-colors hover:bg-[#fff0e5] hover:text-[#c94e00]">{label}</a>
            ))}
          </nav>
        </aside>
        <form onSubmit={handleSubmit(onSubmit)} data-testid="form-store-settings" className="min-w-0 space-y-6 pb-8">

        {/* General */}
        <SectionCard icon={Store} title="General Information">
          <Field label="Store Name">
            <input {...register("siteName")} className={inputClass} style={inputStyle} placeholder="Trynext Lifestyle" />
          </Field>
          <Field label="Tagline">
            <input {...register("tagline")} className={inputClass} style={inputStyle} placeholder="You imagine, we craft." />
          </Field>
          <Field label="Hero Section Title" full>
            <input {...register("heroTitle")} className={inputClass} style={inputStyle} placeholder="Premium Custom Apparel" />
          </Field>
          <Field label="Hero Subtitle" full>
            <input {...register("heroSubtitle")} className={inputClass} style={inputStyle} placeholder="Elevate your wardrobe with bespoke custom apparel." />
          </Field>
          <Field label="Hero Typewriter Phrases" full>
            <textarea
              {...register("heroTypewriterPhrases")}
              rows={7}
              className={inputClass}
              style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }}
              placeholder={"ডিজাইন আপনার\nWe craft it.\nPremium 320GSM cotton.\nDelivered in 48 hours."}
            />
            <p className="text-xs text-gray-400 mt-1">
              One phrase per line. The hero headline cycles through these (English &amp; Bangla supported). Leave blank to use the built-in defaults.
            </p>
          </Field>
          <Field label="Announcement Bar Text" full>
            <input {...register("announcementBar")} className={inputClass} style={inputStyle} placeholder="🚚 Free delivery on orders above ৳1,500!" />
            <p className="text-xs text-gray-400 mt-1">Separate multiple messages with <code>|</code> — each becomes a ticker item.</p>
          </Field>
          <Field label="Show Announcement Bar" full>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" {...register("announcementEnabled")} className="w-5 h-5 rounded accent-orange-500" />
              <span className="text-sm font-medium text-gray-700">Display the scrolling ticker bar at the top of every page</span>
            </label>
            <p className="text-xs text-gray-400 mt-1">Same setting as Designer → Announcement Bar. Toggling here also updates that page.</p>
          </Field>
          <Field label="Auto-Hide After 6 Seconds" full>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" {...register("announcementAutoHide")} className="w-5 h-5 rounded accent-orange-500" />
              <span className="text-sm font-medium text-gray-700">Slide the bar out automatically (default off — bar stays until visitor closes it)</span>
            </label>
          </Field>
        </SectionCard>

        {/* Promo Banner */}
        <SectionCard icon={Megaphone} title="Homepage Promo Banner" iconColor="#f59e0b">
          <Field label="Banner Title" full>
            <input {...register("promoBannerTitle")} className={inputClass} style={inputStyle} placeholder="Up to 30% OFF" />
            <p className="text-xs text-gray-400 mt-1">Main headline for the flash sale banner on the homepage.</p>
          </Field>
          <Field label="Banner Subtitle" full>
            <input {...register("promoBannerSubtitle")} className={inputClass} style={inputStyle} placeholder="On selected T-shirts & Hoodies. Limited stock!" />
          </Field>
          <Field label="Discount Text">
            <input {...register("promoBannerDiscount")} className={inputClass} style={inputStyle} placeholder="30% OFF" />
            <p className="text-xs text-gray-400 mt-1">The highlighted discount text (e.g. "30% OFF", "50% OFF").</p>
          </Field>
          <Field label="Button Text">
            <input {...register("promoBannerCTA")} className={inputClass} style={inputStyle} placeholder="Shop the Sale" />
          </Field>
        </SectionCard>

        {/* Contact */}
        <SectionCard icon={Phone} title="Contact Information" iconColor="#60a5fa">
          <Field label="Support Phone">
            <input {...register("phone")} className={inputClass} style={inputStyle} placeholder="+880 1700-000000" />
          </Field>
          <Field label="WhatsApp Number">
            <input {...register("whatsappNumber")} className={inputClass} style={inputStyle} placeholder="01700-000000" />
          </Field>
          <Field label="Support Email">
            <input {...register("email")} className={inputClass} style={inputStyle} placeholder="hello@trynext.com" />
          </Field>
          <Field label="Business Address">
            <input {...register("address")} className={inputClass} style={inputStyle} placeholder="Banani, Dhaka-1213, Bangladesh" />
          </Field>
        </SectionCard>

        {/* Social Media */}
        <SectionCard icon={Globe} title="Social Media" iconColor="#a78bfa">
          <Field label="Facebook Page URL">
            <input {...register("facebookUrl")} className={inputClass} style={inputStyle} placeholder="https://facebook.com/trynext" />
          </Field>
          <Field label="Instagram Profile URL">
            <input {...register("instagramUrl")} className={inputClass} style={inputStyle} placeholder="https://instagram.com/trynext" />
          </Field>
          <Field label="YouTube Channel URL">
            <input {...register("youtubeUrl")} className={inputClass} style={inputStyle} placeholder="https://youtube.com/@trynext" />
          </Field>
        </SectionCard>

        {/* Payment */}
        <SectionCard icon={CreditCard} title="Payment Methods" iconColor="#e2136e">
          <Field label="bKash Merchant Number">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black" style={{ color: '#e2136e' }}>bK</span>
              <input {...register("bkashNumber")} className={inputClass} style={{ ...inputStyle, paddingLeft: '2.5rem' }} placeholder="01712-345678" />
            </div>
          </Field>
          <Field label="Nagad Merchant Number">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black" style={{ color: '#f7941d' }}>N</span>
              <input {...register("nagadNumber")} className={inputClass} style={{ ...inputStyle, paddingLeft: '2.5rem' }} placeholder="01811-234567" />
            </div>
          </Field>
          <Field label="Rocket (DBBL) Number">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black" style={{ color: '#8b2291' }}>R</span>
              <input {...register("rocketNumber")} className={inputClass} style={{ ...inputStyle, paddingLeft: '2.5rem' }} placeholder="01611-234567" />
            </div>
          </Field>
          <Field label="uPay Merchant Number">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black" style={{ color: '#0077cc' }}>uP</span>
              <input {...register("upayNumber")} className={inputClass} style={{ ...inputStyle, paddingLeft: '2.5rem' }} placeholder="01700-000000" />
            </div>
          </Field>
        </SectionCard>

        {/* Analytics & Tracking */}
        <SectionCard icon={BarChart3} title="Analytics & Tracking" iconColor="#2563eb">
          <Field label="Google Analytics Measurement ID" full>
            <input {...register("googleAnalyticsId")} className={inputClass} style={inputStyle} placeholder="G-XXXXXXXXXX" />
            <p className="text-xs text-gray-400 mt-1">Enter your GA4 Measurement ID (starts with G-). Find it in Google Analytics → Admin → Data Streams.</p>
          </Field>
          <Field label="Facebook Pixel ID" full>
            <input {...register("facebookPixelId")} className={inputClass} style={inputStyle} placeholder="123456789012345" />
            <p className="text-xs text-gray-400 mt-1">Enter your Facebook Pixel ID (15-16 digit number). Find it in Meta Events Manager → Data Sources.</p>
          </Field>
          <Field label="Google Ads Conversion ID" full>
            <input {...register("googleAdsId")} className={inputClass} style={inputStyle} placeholder="AW-XXXXXXXXX" />
            <p className="text-xs text-gray-400 mt-1">Enter your Google Ads Conversion ID (starts with AW-). Find it in Google Ads → Tools → Conversions.</p>
          </Field>
        </SectionCard>

        {/* Shipping */}
        <SectionCard icon={Truck} title="Shipping & Delivery" iconColor="#4ade80">
          <Field label="Free Shipping Threshold (৳)">
            <input type="number" {...register("freeShippingThreshold")} className={inputClass} style={inputStyle} placeholder="1500" />
          </Field>
          <Field label="Standard Shipping Cost (৳)">
            <input type="number" {...register("shippingCost")} className={inputClass} style={inputStyle} placeholder="100" />
          </Field>
        </SectionCard>

        {/* Branding Assets */}
        <SectionCard icon={Image} title="Branding & Logo" iconColor="#7c3aed">
          <Field label="Site Icon / Favicon URL" full>
            <input {...register("siteIcon")} className={inputClass} style={inputStyle} placeholder="https://cdn.example.com/favicon.png" />
            <p className="text-xs text-gray-400 mt-1">Paste a direct image URL (PNG, SVG, ICO). This will replace the favicon and browser tab icon across the entire site immediately.</p>
          </Field>
        </SectionCard>

        {/* OAuth & Third-party */}
        <SectionCard icon={KeyRound} title="Authentication & OAuth" iconColor="#1877F2">
          <Field label="Google Client ID" full>
            <input {...register("googleClientId")} className={inputClass} style={inputStyle} placeholder="123456789-abc.apps.googleusercontent.com" />
            <p className="text-xs text-gray-400 mt-1">
              Required for <strong>Google Sign-In</strong>. Get it from{" "}
              <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-orange-500 underline">console.cloud.google.com</a>{" "}
              → Create OAuth 2.0 Client ID → Web Application.
              Add <strong>https://trynext.pages.dev</strong> as an Authorized JavaScript Origin.
            </p>
          </Field>
          <Field label="Facebook App ID" full>
            <input {...register("facebookAppId")} className={inputClass} style={inputStyle} placeholder="1234567890123456" />
            <p className="text-xs text-gray-400 mt-1">
              Required for <strong>Facebook Login</strong>. Get it from{" "}
              <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-orange-500 underline">developers.facebook.com</a>{" "}
              → Your App → Settings → Basic.
              Add <strong>trynext.pages.dev</strong> as an App Domain.
            </p>
          </Field>
        </SectionCard>

        {/* Google Search Console */}
        <SectionCard icon={Search} title="Google Search Console" iconColor="#4285F4">
          <Field label="Google Site Verification Code" full>
            <input {...register("googleSiteVerification")} className={inputClass} style={inputStyle} placeholder="abc123xyz..." />
            <p className="text-xs text-gray-400 mt-1">Paste the content value from the Google Search Console verification meta tag. This allows Google to verify site ownership for trynext.pages.dev and enable indexing.</p>
          </Field>
        </SectionCard>

        {/* Design Studio */}
        <SectionCard icon={Palette} title="Design Studio" iconColor="#E85D04">
          <Field label="Remove.bg API Key" full>
            {/* Configured / not configured status badge */}
            {removeBgConfigured !== null && (
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-2 ${removeBgConfigured ? "text-green-700" : "text-amber-700"}`}
                style={{ background: removeBgConfigured ? "#dcfce7" : "#fef3c7", border: `1px solid ${removeBgConfigured ? "#bbf7d0" : "#fde68a"}` }}>
                {removeBgConfigured
                  ? <><CheckCircle2 className="w-3.5 h-3.5" /> API key configured — background removal active</>
                  : <><XCircle className="w-3.5 h-3.5" /> Not configured — background removal will use in-browser AI fallback</>}
              </div>
            )}
            <input {...register("removeBgApiKey")} className={inputClass} style={inputStyle} placeholder="Paste new key to update (leave blank to keep current)" type="password" autoComplete="off" />
            <p className="text-xs text-gray-400 mt-1">
              Get a free API key from{" "}
              <a href="https://www.remove.bg/api" target="_blank" rel="noopener noreferrer" className="text-orange-500 underline">remove.bg</a>.
              Free tier gives 50 removals/month. Leave blank to keep the existing key. When no key is configured, background removal falls back to an in-browser AI model (free, slower).
            </p>
          </Field>
          <Field label="T-Shirt Price (৳)" full={false}>
            <input {...register("studioTshirtPrice")} className={inputClass} style={inputStyle} placeholder="450" type="number" min="0" max="50000" step="1" />
            <p className="text-xs text-gray-400 mt-1">Base price for custom T-shirt orders from the Design Studio.</p>
          </Field>
          <Field label="Hoodie Price (৳)" full={false}>
            <input {...register("studioHoodiePrice")} className={inputClass} style={inputStyle} placeholder="1699" type="number" min="0" max="50000" step="1" />
            <p className="text-xs text-gray-400 mt-1">Base price for custom Hoodie orders.</p>
          </Field>
          <Field label="Long Sleeve Price (৳)" full={false}>
            <input {...register("studioLongsleevePrice")} className={inputClass} style={inputStyle} placeholder="1299" type="number" min="0" max="50000" step="1" />
            <p className="text-xs text-gray-400 mt-1">Base price for custom Long Sleeve orders.</p>
          </Field>
          <Field label="Cap Price (৳)" full={false}>
            <input {...register("studioCapPrice")} className={inputClass} style={inputStyle} placeholder="699" type="number" min="0" max="50000" step="1" />
            <p className="text-xs text-gray-400 mt-1">Base price for custom Cap orders.</p>
          </Field>
          <Field label="Mug Price (৳)" full={false}>
            <input {...register("studioMugPrice")} className={inputClass} style={inputStyle} placeholder="449" type="number" min="0" max="50000" step="1" />
            <p className="text-xs text-gray-400 mt-1">Base price for custom Mug orders.</p>
          </Field>
          <Field label="Water Bottle Price (৳)" full={false}>
            <input {...register("studioWaterbottlePrice")} className={inputClass} style={inputStyle} placeholder="899" type="number" min="0" max="50000" step="1" />
            <p className="text-xs text-gray-400 mt-1">Base price for custom Water Bottle orders.</p>
          </Field>
          <Field label="Customization Fee — T-Shirt (৳)" full={false}>
            <input {...register("studioTshirtCustomizationFee")} className={inputClass} style={inputStyle} placeholder="99" type="number" min="0" max="50000" step="1" />
            <p className="text-xs text-gray-400 mt-1">Applied once when the customer adds artwork or text.</p>
          </Field>
          <Field label="Customization Fee — Hoodie (৳)" full={false}>
            <input {...register("studioHoodieCustomizationFee")} className={inputClass} style={inputStyle} placeholder="99" type="number" min="0" max="50000" step="1" />
          </Field>
          <Field label="Customization Fee — Long Sleeve (৳)" full={false}>
            <input {...register("studioLongsleeveCustomizationFee")} className={inputClass} style={inputStyle} placeholder="99" type="number" min="0" max="50000" step="1" />
          </Field>
          <Field label="Customization Fee — Cap (৳)" full={false}>
            <input {...register("studioCapCustomizationFee")} className={inputClass} style={inputStyle} placeholder="99" type="number" min="0" max="50000" step="1" />
          </Field>
          <Field label="Customization Fee — Mug (৳)" full={false}>
            <input {...register("studioMugCustomizationFee")} className={inputClass} style={inputStyle} placeholder="99" type="number" min="0" max="50000" step="1" />
            <p className="text-xs text-gray-400 mt-1">Use variant-level overrides for Love Shape, Blue Rim, and Yellow Rim.</p>
          </Field>
          <Field label="Customization Fee — Water Bottle (৳)" full={false}>
            <input {...register("studioWaterbottleCustomizationFee")} className={inputClass} style={inputStyle} placeholder="99" type="number" min="0" max="50000" step="1" />
          </Field>
          <Field label="T-Shirt Colors" full>
            <StudioColorsManager value={tshirtColorsJson} onChange={setTshirtColorsJson} />
            <p className="text-xs text-gray-400 mt-2">Swatches shown in Design Studio for T-shirts. Leave empty for 12 built-in defaults.</p>
          </Field>
          <Field label="Hoodie Colors" full>
            <StudioColorsManager value={hoodieColorsJson} onChange={setHoodieColorsJson} />
            <p className="text-xs text-gray-400 mt-2">Swatches shown for Hoodies. Leave empty to share T-shirt defaults.</p>
          </Field>
          <Field label="Long Sleeve Colors" full>
            <StudioColorsManager value={longsleeveColorsJson} onChange={setLongsleeveColorsJson} />
            <p className="text-xs text-gray-400 mt-2">Swatches shown for Long Sleeves. Leave empty to share T-shirt defaults.</p>
          </Field>
          <Field label="Cap Colors" full>
            <StudioColorsManager value={capColorsJson} onChange={setCapColorsJson} />
            <p className="text-xs text-gray-400 mt-2">Swatches shown for Caps. Leave empty for 6 built-in defaults.</p>
          </Field>
          <Field label="Mug Colors" full>
            <StudioColorsManager value={mugColorsJson} onChange={setMugColorsJson} />
            <p className="text-xs text-gray-400 mt-2">Swatches shown for Mugs. Leave empty for 6 built-in defaults.</p>
          </Field>
          <Field label="Water Bottle Colors" full>
            <StudioColorsManager value={waterbottleColorsJson} onChange={setWaterbottleColorsJson} />
            <p className="text-xs text-gray-400 mt-2">Swatches shown for Water Bottles. Leave empty for built-in defaults.</p>
          </Field>
        </SectionCard>

        {/* Facebook Ads Conversion Suite */}
        <SectionCard icon={Zap} title="Flash Sale & Urgency" iconColor="#E85D04">
          <Field label="Enable Flash Sale Bar" full>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" {...register("flashSaleEnabled")} className="w-5 h-5 rounded accent-orange-500" />
              <span className="text-sm font-medium text-gray-700">Show a countdown bar at the top of every page</span>
            </label>
          </Field>
          <Field label="Flash Sale End Date & Time" full>
            <input type="datetime-local" {...register("flashSaleEndTime")} className={inputClass} style={inputStyle} />
            <p className="text-xs text-gray-400 mt-1">When the countdown reaches zero the bar disappears automatically. Leave blank for no countdown.</p>
          </Field>
          <Field label="Flash Sale Message" full>
            <input {...register("flashSaleMessage")} className={inputClass} style={inputStyle} placeholder="⚡ FLASH SALE — Limited Stock!" />
          </Field>
          <Field label="Scarcity Stock Threshold" full={false}>
            <input type="number" {...register("scarcityThreshold")} className={inputClass} style={inputStyle} placeholder="10" min="1" max="100" />
            <p className="text-xs text-gray-400 mt-1">Show "Only X left!" badge when stock is at or below this number.</p>
          </Field>
          <Field label="Sale Page Title" full>
            <input {...register("salePageTitle")} className={inputClass} style={inputStyle} placeholder="Mega Sale — Up to 50% Off!" />
          </Field>
          <Field label="Sale Page Subtitle" full>
            <input {...register("salePageSubtitle")} className={inputClass} style={inputStyle} placeholder="Bangladesh's best custom apparel at unbeatable prices." />
          </Field>
          <Field label="Sale Page Badge Text" full={false}>
            <input {...register("salePageBadge")} className={inputClass} style={inputStyle} placeholder="LIMITED TIME" />
          </Field>
        </SectionCard>

        <SectionCard icon={Tag} title="Exit-Intent Promo Popup" iconColor="#7c3aed">
          <Field label="Enable Exit-Intent Popup" full>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" {...register("exitIntentPromoEnabled")} className="w-5 h-5 rounded accent-orange-500" />
              <span className="text-sm font-medium text-gray-700">Show a promo code popup when a visitor tries to leave</span>
            </label>
          </Field>
          <Field label="Promo Code to Show" full={false}>
            <input {...register("exitIntentPromoCode")} className={inputClass} style={inputStyle} placeholder="SAVE10" />
            <p className="text-xs text-gray-400 mt-1">Create the promo code in the Promo Codes section first, then enter it here.</p>
          </Field>
          <Field label="Discount Label" full={false}>
            <input {...register("exitIntentPromoDiscount")} className={inputClass} style={inputStyle} placeholder="10%" />
            <p className="text-xs text-gray-400 mt-1">Shown on the popup headline (e.g. "10% OFF"). Must match the actual discount of the promo code.</p>
          </Field>
        </SectionCard>

        <SectionCard icon={Zap} title="Spin-the-Wheel Offer Game" iconColor="#ea580c">
          <Field label="Enable Spin-the-Wheel Popup" full>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" {...register("spinWheelEnabled")} className="w-5 h-5 rounded accent-orange-500" />
              <span className="text-sm font-medium text-gray-700">Show the spin-the-wheel popup once per visitor on the home page</span>
            </label>
            <p className="text-xs text-gray-400 mt-2">
              Built-in prizes (always work, no setup needed): <strong>SPIN5</strong> (5% off), <strong>SPIN10</strong> (10% off), <strong>SPIN15</strong> (15% off), <strong>FREEDELIV</strong> (free delivery on ৳1500+), <strong>SUPERDEAL</strong> (free delivery + 10% off on ৳1500+). 60% chance of "Try Again" so margins stay safe.
            </p>
          </Field>
          <Field label="Auto-Open Delay (seconds)" full={false}>
            <input type="number" {...register("spinWheelDelay", { valueAsNumber: true })} className={inputClass} style={inputStyle} placeholder="4" min="1" max="30" />
            <p className="text-xs text-gray-400 mt-1">How many seconds after the home page loads before the popup appears.</p>
          </Field>
          <Field label="Cooldown Period (hours)" full={false}>
            <input type="number" {...register("spinWheelCooldownHours", { valueAsNumber: true })} className={inputClass} style={inputStyle} placeholder="24" min="1" max="720" />
            <p className="text-xs text-gray-400 mt-1">How long before the same visitor sees the wheel again. Default 24 h. Set lower (e.g. 1) for testing.</p>
          </Field>
          <Field label="Headline" full={false}>
            <input {...register("spinWheelTitle")} className={inputClass} style={inputStyle} placeholder="Spin & Win an Offer!" />
          </Field>
          <Field label="Subtitle" full>
            <input {...register("spinWheelSubtitle")} className={inputClass} style={inputStyle} placeholder="One free spin — no purchase needed." />
          </Field>
          <div className="md:col-span-2 pt-1">
            <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">Reset Wheel for All Visitors</label>
            <button
              type="button"
              onClick={async () => {
                try {
                  await updateSettings({ data: { spinWheelResetAt: Date.now() } as any });
                  queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
                  toast({ title: "✓ Spin wheel reset — all visitors will see it again." });
                } catch {
                  toast({ title: "Failed to reset spin wheel", variant: "destructive" });
                }
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm border transition-all hover:border-orange-400 hover:text-orange-600"
              style={{ background: '#f9fafb', border: '1px solid #e5e7eb', color: '#374151' }}
            >
              <RotateCcw className="w-4 h-4" />
              Reset wheel — show it to everyone again
            </button>
            <p className="text-xs text-gray-400 mt-1.5">
              Clears the &ldquo;already shown&rdquo; flag for every browser that has previously dismissed the popup. Useful after a new promotion.
            </p>
          </div>
        </SectionCard>

        <SectionCard icon={Search} title="SEO Defaults & Auto-SEO" iconColor="#16a34a">
          <Field label="Default Page Title" full>
            <input {...register("seoDefaultTitle")} className={inputClass} style={inputStyle} placeholder="Trynext Lifestyle — Custom Apparel & Gifts in Bangladesh" />
            <p className="text-xs text-gray-400 mt-1">Used on every page that doesn't set its own title. Keep under 60 characters for best Google ranking.</p>
          </Field>
          <Field label="Default Meta Description" full>
            <textarea {...register("seoDefaultDescription")} className={inputClass} style={{ ...inputStyle, minHeight: 80 }} placeholder="Design and order custom T-shirts, hoodies, mugs..." />
            <p className="text-xs text-gray-400 mt-1">Shown in Google search results. Keep under 160 characters. New product pages auto-generate descriptions from this template.</p>
          </Field>
          <Field label="Default Keywords" full>
            <input {...register("seoDefaultKeywords")} className={inputClass} style={inputStyle} placeholder="custom t-shirt bangladesh, personalized mug, gift hamper" />
            <p className="text-xs text-gray-400 mt-1">Comma-separated. Modern Google ignores these but Bing & Yandex still use them.</p>
          </Field>
          <Field label="Default Social Share Image (URL)" full>
            <input {...register("seoOgImage")} className={inputClass} style={inputStyle} placeholder="https://trynext.pages.dev/og.jpg" />
            <p className="text-xs text-gray-400 mt-1">Shown when someone shares your link on Facebook, WhatsApp, Twitter, LinkedIn. Recommended: 1200×630 PNG/JPG.</p>
          </Field>
          <Field label="Twitter / X Handle" full={false}>
            <input {...register("seoTwitterHandle")} className={inputClass} style={inputStyle} placeholder="@trynextshop" />
          </Field>
          <div className="rounded-xl p-3 border border-green-200 bg-green-50">
            <p className="text-xs font-bold text-green-800 mb-1">Auto-SEO is active</p>
            <p className="text-xs text-green-700 leading-relaxed">
              ✓ All product pages auto-generate meta tags + structured data (rich snippets)<br/>
              ✓ Sitemap.xml regenerates automatically when you add products or blog posts<br/>
              ✓ Robots.txt exposes the sitemap to Google, Bing, and other crawlers<br/>
              ✓ Open Graph tags inserted on every page for clean social shares<br/>
              ✓ Canonical URLs prevent duplicate-content penalties
            </p>
          </div>
        </SectionCard>

        <SectionCard icon={Send} title="Telegram Order Notifications" iconColor="#229ED9">
          <TelegramSection />
        </SectionCard>

        <SectionCard icon={BarChart3} title="Meta CAPI (Server-Side Events)" iconColor="#1877F2">
          <Field label="Meta Conversions API Token" full>
            {siteSettings.metaCapiTokenConfigured && (
              <div className="flex items-center gap-1.5 mb-2 text-xs font-bold text-green-600">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Token configured — leave blank to keep existing
              </div>
            )}
            <input {...register("metaCapiToken")} className={inputClass} style={inputStyle} placeholder={siteSettings.metaCapiTokenConfigured ? "Enter new token to replace (leave blank to keep)" : "Paste your Meta CAPI access token"} type="password" autoComplete="off" />
            <p className="text-xs text-gray-400 mt-1">
              Get it from <a href="https://business.facebook.com/events_manager" target="_blank" rel="noopener noreferrer" className="text-orange-500 underline">Meta Events Manager</a> → Data Sources → Your Pixel → Settings → Conversions API → Generate Access Token. Requires Facebook Pixel ID to be set above. <strong>Never shared publicly.</strong>
            </p>
          </Field>
        </SectionCard>

        {/* Save Button */}
        <div className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-2xl border border-[#dfe5dd] bg-[#f8faf7]/95 p-3 shadow-[0_12px_35px_rgba(23,32,25,.12)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:p-4" data-testid="panel-settings-save">
          <div className="flex items-center gap-2 text-xs text-[#6f7d70]" data-testid="status-settings-save">
            <span className={`h-2 w-2 rounded-full ${isPending ? "bg-[#e85d04]" : saveState === "saved" ? "bg-[#2ebc68]" : saveState === "error" ? "bg-red-500" : isDirty ? "bg-[#d89017]" : "bg-[#9aa39a]"}`} />
            {isPending ? "Publishing settings…" : saveState === "error" ? "Save failed. Nothing was overwritten." : isDirty ? "You have changes ready to publish." : saveState === "saved" ? "Published to the storefront." : "No unpublished changes."}
          </div>
          <div className="flex items-center gap-3">
            <p className="hidden text-xs text-[#8b948a] md:block">Changes take effect immediately.</p>
          <button
            type="submit"
            data-testid="button-save-settings"
            disabled={isPending}
            className="btn-glow flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#e85d04] px-7 py-3.5 text-sm font-bold text-white shadow-[0_8px_24px_rgba(232,93,4,.25)] disabled:opacity-50 disabled:transform-none sm:w-auto"
          >
            <Save className="w-4 h-4" />
            {isPending ? "Saving changes…" : "Save all settings"}
          </button>
          </div>
        </div>
      </form>
      </div>
    </AdminLayout>
  );
}
