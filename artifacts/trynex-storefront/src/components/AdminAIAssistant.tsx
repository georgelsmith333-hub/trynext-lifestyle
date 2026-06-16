import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot, X, Send, Loader2, Copy, Check, ChevronDown, FileText, Package,
  MessageSquare, Sparkles, Trash2, TrendingUp, Tag, Mail, Users,
  Zap, RotateCcw, CheckCircle2, AlertCircle, ChevronRight, BookOpen,
  Search, Eye, Play, ShieldAlert, Info, History, ChevronUp,
  SquareCheck, Square,
} from "lucide-react";
import { getApiUrl, getAuthHeaders } from "@/lib/utils";

/* ── Types ─────────────────────────────────────────── */
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  error?: boolean;
  streaming?: boolean;
  ts?: number;
}

interface ExecuteResult {
  id: string;
  command: string;
  success: boolean;
  description: string;
  error?: string;
  undoInfo?: Record<string, unknown>;
  undone?: boolean;
  undoneDescription?: string;
  ts: number;
}

interface PreviewData {
  action: string;
  parsedCommand: Record<string, unknown>;
  preview: {
    title: string;
    description: string;
    riskLevel: "low" | "medium" | "high";
    affectedEntity?: string;
    details: string[];
    requiresConfirmation: boolean;
  };
}

type Tab = "chat" | "execute" | "help";
type ExecPhase = "idle" | "previewing" | "preview" | "executing";

const CHAT_HISTORY_KEY = "trynex-ai-chat-v2";
const EXEC_HISTORY_KEY = "trynex-ai-exec-v2";
const MAX_HISTORY = 60;

/* ── Chat presets ──────────────────────────────────── */
const PRESETS = [
  { icon: FileText, label: "Blog Post", color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe",
    prompt: "Write a compelling SEO-optimized blog post (700+ words) for TryNex Lifestyle about custom printed t-shirts for Eid in Bangladesh. Include: an engaging intro, tips for choosing the right design, fabric quality (320 GSM), why custom apparel makes great Eid gifts, and a clear call-to-action. Add a meta description suggestion at the end." },
  { icon: Package, label: "Product Desc", color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe",
    prompt: "Write 3 product description variants (short, medium, long) for our premium 320 GSM custom t-shirt. Highlight: DTG/screen print quality, AI design studio, upload-your-own artwork, 24-hour production, free delivery above ৳1,500, and delivery across all 64 districts." },
  { icon: MessageSquare, label: "Ad Copy", color: "#E85D04", bg: "#fff7ed", border: "#fed7aa",
    prompt: "Write 3 Facebook/Instagram ad copy variations for TryNex Lifestyle custom t-shirts targeting Bangladeshis aged 18-35. Include: a short hook (15 words), 2-3 benefit bullets, a CTA, and mention free delivery on orders over ৳1,500." },
  { icon: Sparkles, label: "Design Ideas", color: "#059669", bg: "#ecfdf5", border: "#a7f3d0",
    prompt: "Give me 12 creative custom t-shirt & mug design ideas that will sell well in Bangladesh this season. Consider: Eid, cricket world cup, Bengali new year, retro Dhaka, hip-hop Bangla, couple sets." },
  { icon: TrendingUp, label: "Growth Plan", color: "#0ea5e9", bg: "#f0f9ff", border: "#bae6fd",
    prompt: "Create a 30-day growth strategy for TryNex Lifestyle to increase sales by 40%. Include: daily social media schedule, Facebook group marketing, WhatsApp broadcast strategy, referral program tactics, and specific promo code strategies." },
  { icon: Tag, label: "Promo Strategy", color: "#d97706", bg: "#fffbeb", border: "#fde68a",
    prompt: "Design a complete promotional calendar for TryNex Lifestyle for the next 3 months covering Eid, Puja, Pohela Boishakh, and Valentine's Day. Include: discount %, promo code, minimum order, ad copy headline, and duration for each." },
  { icon: Mail, label: "Email Campaign", color: "#8b5cf6", bg: "#f5f3ff", border: "#ddd6fe",
    prompt: "Write a 5-email welcome sequence for TryNex Lifestyle newsletter subscribers. Email 1: Welcome + 10% off code. Email 2: How the Design Studio works. Email 3: Customer success story. Email 4: Festival design inspiration. Email 5: Referral program intro." },
  { icon: Users, label: "Customer Reply", color: "#ef4444", bg: "#fef2f2", border: "#fecaca",
    prompt: "Write 5 professional customer service response templates in English AND Bangla for: (1) delayed order, (2) design revision, (3) refund inquiry, (4) quality complaint, (5) post-delivery thank you." },
];

/* ── Help command categories ──────────────────────── */
const HELP_CATEGORIES = [
  {
    label: "📦 Products",
    color: "#7c3aed",
    bg: "#f5f3ff",
    commands: [
      { label: "List all products", example: "List all products", desc: "Shows all products with price & stock" },
      { label: "Search products", example: "Search products for hoodie", desc: "Filter products by keyword" },
      { label: "Create product", example: "Create a product called 'Eid Special Hoodie' priced at ৳1499 in the Hoodies category", desc: "Add a new product to the store" },
      { label: "Delete product", example: "Delete product named 'Old Test Product'", desc: "Permanently remove a product" },
      { label: "Update price", example: "Update price of 'Custom Mug' to ৳699", desc: "Change a product's selling price" },
      { label: "Update stock", example: "Set stock of 'Classic White Tee' to 150", desc: "Adjust inventory count" },
      { label: "Update description", example: "Update description of 'Custom Mug' to: Premium 11oz ceramic mug with vibrant sublimation printing.", desc: "Rewrite product description" },
      { label: "Feature product", example: "Feature the product named 'Custom T-Shirt'", desc: "Make a product appear in featured section" },
      { label: "Unfeature product", example: "Unfeature the product 'Old Hoodie'", desc: "Remove from featured section" },
    ],
  },
  {
    label: "🛒 Orders",
    color: "#E85D04",
    bg: "#fff7ed",
    commands: [
      { label: "Update order status", example: "Update order #145 to shipped", desc: "Change pending/processing/shipped/delivered/cancelled" },
      { label: "Find order by ID", example: "Find order #88", desc: "Look up a specific order" },
      { label: "Find order by customer", example: "Find order by customer Rahim", desc: "Search by customer name" },
      { label: "List recent orders", example: "Show recent orders", desc: "See latest 5 orders" },
    ],
  },
  {
    label: "🎟️ Promo Codes",
    color: "#059669",
    bg: "#ecfdf5",
    commands: [
      { label: "Create % promo", example: "Create promo code EID25 for 25% off, min order ৳1000", desc: "Percentage discount code" },
      { label: "Create fixed promo", example: "Create promo code SAVE100 for ৳100 off", desc: "Fixed amount discount code" },
      { label: "Delete promo code", example: "Delete promo code OLDCODE", desc: "Remove an expired promo" },
    ],
  },
  {
    label: "👥 Customers",
    color: "#0ea5e9",
    bg: "#f0f9ff",
    commands: [
      { label: "List customers", example: "Show all customers", desc: "List recent customers with email and order count" },
      { label: "Find customer", example: "Find customer with email rahim@gmail.com", desc: "Look up a customer account" },
      { label: "Customer stats", example: "How many customers do I have?", desc: "Total customer count & signup trend" },
    ],
  },
  {
    label: "📝 Blog",
    color: "#8b5cf6",
    bg: "#f5f3ff",
    commands: [
      { label: "List blog posts", example: "List all blog posts", desc: "Show all published blog articles" },
      { label: "Create blog post", example: "Create a blog post titled 'Custom Mugs for Corporate Gifts in Bangladesh'", desc: "Draft a new blog article" },
      { label: "Get sales stats", example: "Show me today's sales stats", desc: "Revenue and order count for today" },
    ],
  },
  {
    label: "🔍 SEO & Growth",
    color: "#059669",
    bg: "#ecfdf5",
    commands: [
      { label: "Google ranking tips", example: "How do I get TryNex to rank on Google?", desc: "Step-by-step SEO guide" },
      { label: "Target keywords", example: "What keywords should I target for ranking?", desc: "Keyword strategy for Bangladesh" },
      { label: "Site speed advice", example: "How do I improve site speed?", desc: "Core Web Vitals & performance tips" },
      { label: "Facebook ad strategy", example: "Write a complete Facebook ad strategy for TryNex custom t-shirts", desc: "Ad targeting & budget for Bangladesh market" },
    ],
  },
  {
    label: "⚙️ System",
    color: "#64748b",
    bg: "#f8fafc",
    commands: [
      { label: "Check system health", example: "Check system health", desc: "DB, Redis, R2, Telegram live status" },
      { label: "Flush cache", example: "Flush the Redis cache", desc: "Clear all cached data immediately" },
      { label: "Test Telegram", example: "Send a test Telegram message", desc: "Verify bot is working" },
      { label: "Trigger deploy", example: "Trigger a deployment", desc: "Push latest build to production" },
      { label: "Env vars status", example: "Which environment variables are set?", desc: "Check production config completeness" },
      { label: "Today's sales stats", example: "Show me today's sales stats", desc: "Revenue, orders & top products today" },
    ],
  },
];

const TEXT_MODELS = [
  { id: "openai-large", label: "GPT-4o (Best)" },
  { id: "openai", label: "GPT-4o Mini" },
  { id: "mistral-large", label: "Mistral Large" },
  { id: "llama", label: "Llama 3.3" },
];

function uid() {
  return Math.random().toString(36).slice(2);
}

/* ── Markdown-ish formatter ────────────────────────── */
function FormattedMessage({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="space-y-1 text-[13px] leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith("## ")) return <p key={i} className="font-black text-sm mt-2 mb-0.5">{line.slice(3)}</p>;
        if (line.startsWith("### ")) return <p key={i} className="font-bold text-[13px] mt-1.5 mb-0.5">{line.slice(4)}</p>;
        if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="font-bold">{line.slice(2, -2)}</p>;
        if (line.startsWith("• ") || line.startsWith("- ")) return (
          <div key={i} className="flex gap-2">
            <span className="shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-current opacity-50 inline-block" />
            <span dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }} />
          </div>
        );
        if (/^\d+\. /.test(line)) return (
          <div key={i} className="flex gap-2">
            <span className="shrink-0 font-bold opacity-60 text-[11px] mt-0.5">{line.match(/^(\d+)\./)?.[1]}.</span>
            <span dangerouslySetInnerHTML={{ __html: line.replace(/^\d+\. /, "").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }} />
          </div>
        );
        if (line.trim() === "") return <div key={i} className="h-1.5" />;
        const bolded = line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/_(.+?)_/g, "<em>$1</em>");
        return <p key={i} dangerouslySetInnerHTML={{ __html: bolded }} />;
      })}
    </div>
  );
}

function StreamingDots() {
  return (
    <span className="inline-flex items-center gap-0.5 ml-1 align-middle">
      {[0, 1, 2].map(i => (
        <span key={i} className="w-1 h-1 rounded-full bg-purple-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.8s" }} />
      ))}
    </span>
  );
}

const RISK_CONFIG = {
  low:    { color: "#059669", bg: "#ecfdf5", border: "#a7f3d0", label: "Low Risk", icon: "✅" },
  medium: { color: "#d97706", bg: "#fffbeb", border: "#fde68a", label: "Review",   icon: "⚠️" },
  high:   { color: "#dc2626", bg: "#fef2f2", border: "#fecaca", label: "High Risk", icon: "🚨" },
};

/* ════════════════════════════════════════════════════
   Main Component
════════════════════════════════════════════════════ */
export function AdminAIAssistant() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("chat");

  /* Chat state — restored from localStorage */
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const stored = localStorage.getItem(CHAT_HISTORY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ChatMessage[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { /* ignore */ }
    return [];
  });
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [model, setModel] = useState("openai-large");
  const [copied, setCopied] = useState<number | null>(null);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [activeModelLabel, setActiveModelLabel] = useState<string | null>(null);

  /* Execute state */
  const [cmdInput, setCmdInput] = useState("");
  const [execPhase, setExecPhase] = useState<ExecPhase>("idle");
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [previewCommand, setPreviewCommand] = useState("");
  const [execResults, setExecResults] = useState<ExecuteResult[]>(() => {
    try {
      const stored = localStorage.getItem(EXEC_HISTORY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ExecuteResult[];
        if (Array.isArray(parsed)) return parsed.slice(0, 20);
      }
    } catch { /* ignore */ }
    return [];
  });
  const [undoingId, setUndoingId] = useState<string | null>(null);
  const [showExecHistory, setShowExecHistory] = useState(false);

  /* Help state */
  const [helpSearch, setHelpSearch] = useState("");
  const [expandedHelp, setExpandedHelp] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const cmdInputRef = useRef<HTMLTextAreaElement>(null);
  const modelPickerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  /* Persist chat history to localStorage */
  useEffect(() => {
    const toSave = messages.filter(m => !m.streaming && m.content).slice(-MAX_HISTORY);
    try { localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(toSave)); } catch { /* ignore */ }
  }, [messages]);

  /* Persist exec history to localStorage */
  useEffect(() => {
    try { localStorage.setItem(EXEC_HISTORY_KEY, JSON.stringify(execResults.slice(0, 20))); } catch { /* ignore */ }
  }, [execResults]);

  /* Init chat greeting if empty */
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: "Hi! I'm your TryNex AI assistant. I **stream responses in real-time** and remember our conversation across sessions.\n\nSwitch to **Execute** to run store commands like creating products, updating orders, or managing promo codes. Check the **Help** tab for all available commands.",
        ts: Date.now(),
      }]);
    }
  }, [open, messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, execResults, previewData]);

  useEffect(() => {
    if (!showModelPicker) return;
    const handler = (e: MouseEvent) => {
      if (modelPickerRef.current && !modelPickerRef.current.contains(e.target as Node)) {
        setShowModelPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showModelPicker]);

  /* ── Streaming chat ─────────────────────────────── */
  const sendMessage = useCallback(async (text?: string) => {
    const content = (text ?? chatInput).trim();
    if (!content || chatLoading) return;
    setChatInput("");

    const userMsg: ChatMessage = { role: "user", content, ts: Date.now() };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setChatLoading(true);
    setActiveModelLabel(null);

    const streamingPlaceholder: ChatMessage = { role: "assistant", content: "", streaming: true, ts: Date.now() };
    setMessages(prev => [...prev, streamingPlaceholder]);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(getApiUrl("/api/ai/chat"), {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          stream: true,
          messages: nextMessages.filter(m => !m.error).map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          try {
            const parsed = JSON.parse(payload) as { type: string; delta?: string; model?: string; error?: string };
            if (parsed.type === "model" && parsed.model) {
              const label = TEXT_MODELS.find(m => m.id === parsed.model)?.label ?? parsed.model;
              setActiveModelLabel(label);
            } else if (parsed.type === "delta" && parsed.delta) {
              accumulated += parsed.delta;
              const snap = accumulated;
              setMessages(prev => prev.map((m, idx) =>
                idx === prev.length - 1 && m.streaming ? { ...m, content: snap } : m
              ));
            } else if (parsed.type === "done") {
              break;
            } else if (parsed.type === "error") {
              throw new Error(parsed.error || "Stream error");
            }
          } catch { /* non-JSON */ }
        }
      }

      setMessages(prev => prev.map((m, idx) =>
        idx === prev.length - 1 && m.streaming
          ? { ...m, content: accumulated || m.content, streaming: false }
          : m
      ));
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.streaming) {
          updated[updated.length - 1] = {
            ...last,
            content: last.content || `Sorry, I hit an error: ${msg}. Please try again.`,
            streaming: false,
            error: !last.content,
          };
        } else {
          updated.push({ role: "assistant", content: `Sorry, I hit an error: ${msg}. Please try again.`, error: true, ts: Date.now() });
        }
        return updated;
      });
    } finally {
      setChatLoading(false);
      setActiveModelLabel(null);
      setTimeout(() => chatInputRef.current?.focus(), 50);
    }
  }, [chatInput, chatLoading, messages, model]);

  /* ── Preview command (no execution) ───────────── */
  const previewCommand_ = useCallback(async (cmd?: string) => {
    const command = (cmd ?? cmdInput).trim();
    if (!command || execPhase !== "idle") return;
    setPreviewCommand(command);
    setExecPhase("previewing");
    setPreviewData(null);

    try {
      const res = await fetch(getApiUrl("/api/admin/ai-preview"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ command }),
      });
      const data = await res.json() as PreviewData & { error?: string };
      if (!res.ok || data.error) {
        /* Fall through to direct execute on preview failure */
        setExecPhase("idle");
        executeCommand_(command);
        return;
      }
      setPreviewData(data);
      setExecPhase("preview");
    } catch {
      setExecPhase("idle");
      executeCommand_(command);
    }
  }, [cmdInput, execPhase]);

  /* ── Execute command ──────────────────────────── */
  const executeCommand_ = useCallback(async (command: string) => {
    if (!command || execPhase === "executing") return;
    setCmdInput("");
    setExecPhase("executing");
    setPreviewData(null);

    const resultId = uid();
    const newResult: ExecuteResult = { id: resultId, command, success: false, description: "Processing…", ts: Date.now() };
    setExecResults(prev => [newResult, ...prev]);

    try {
      const res = await fetch(getApiUrl("/api/admin/ai-execute"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ command }),
      });
      const data = await res.json() as {
        success?: boolean;
        description?: string;
        error?: string;
        details?: string;
        suggestions?: string[];
        undoInfo?: Record<string, unknown>;
      };

      if (!res.ok || !data.success) {
        const errMsg = data.error || "Execution failed";
        const details = data.details ? ` — ${data.details}` : "";
        const hints = data.suggestions ? `\n\nTry:\n${data.suggestions.map(s => `• ${s}`).join("\n")}` : "";
        setExecResults(prev => prev.map(r => r.id === resultId
          ? { ...r, success: false, description: errMsg + details + hints, error: errMsg }
          : r
        ));
      } else {
        setExecResults(prev => prev.map(r => r.id === resultId
          ? { ...r, success: true, description: data.description || "Done", undoInfo: data.undoInfo }
          : r
        ));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error";
      setExecResults(prev => prev.map(r => r.id === resultId
        ? { ...r, success: false, description: msg, error: msg }
        : r
      ));
    } finally {
      setExecPhase("idle");
      setShowExecHistory(true);
      setTimeout(() => cmdInputRef.current?.focus(), 50);
    }
  }, [execPhase]);

  /* ── Approve preview → execute ──────────────── */
  const approveAndExecute = () => {
    if (!previewCommand) return;
    setExecPhase("idle");
    executeCommand_(previewCommand);
  };

  /* ── Undo action ────────────────────────────── */
  const undoAction = useCallback(async (result: ExecuteResult) => {
    if (!result.undoInfo || result.undone) return;
    setUndoingId(result.id);
    try {
      const res = await fetch(getApiUrl("/api/admin/ai-undo"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ undoInfo: result.undoInfo }),
      });
      const data = await res.json() as { success?: boolean; description?: string; error?: string };
      if (!res.ok || !data.success) throw new Error(data.error || "Undo failed");
      setExecResults(prev => prev.map(r => r.id === result.id
        ? { ...r, undone: true, undoneDescription: data.description }
        : r
      ));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Undo failed";
      setExecResults(prev => prev.map(r => r.id === result.id ? { ...r, error: msg } : r));
    } finally {
      setUndoingId(null);
    }
  }, []);

  const copyMessage = (content: string, idx: number) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(idx);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const clearChat = () => {
    abortRef.current?.abort();
    const greeting: ChatMessage = {
      role: "assistant",
      content: "Chat cleared! What would you like to create or discuss?",
      ts: Date.now(),
    };
    setMessages([greeting]);
    try { localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify([greeting])); } catch { /* ignore */ }
  };

  const stopStreaming = () => {
    abortRef.current?.abort();
    setChatLoading(false);
    setMessages(prev => prev.map((m, idx) =>
      idx === prev.length - 1 && m.streaming ? { ...m, streaming: false } : m
    ));
  };

  const currentModelLabel = TEXT_MODELS.find(m => m.id === model)?.label ?? "GPT-4o";

  /* ── Help search filter ─────────────────────── */
  const filteredHelp = HELP_CATEGORIES.map(cat => ({
    ...cat,
    commands: cat.commands.filter(cmd =>
      !helpSearch || cmd.label.toLowerCase().includes(helpSearch.toLowerCase()) ||
      cmd.example.toLowerCase().includes(helpSearch.toLowerCase()) ||
      cmd.desc.toLowerCase().includes(helpSearch.toLowerCase())
    ),
  })).filter(cat => cat.commands.length > 0);

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={() => setOpen(o => !o)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-xl"
        style={{
          background: open ? "#374151" : "linear-gradient(135deg,#7c3aed,#a855f7)",
          boxShadow: "0 8px 24px rgba(124,58,237,0.4)",
        }}
        title="AI Assistant"
      >
        <AnimatePresence mode="wait">
          {open
            ? <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}><X className="w-5 h-5" /></motion.div>
            : <motion.div key="bot" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}><Bot className="w-6 h-6" /></motion.div>
          }
        </AnimatePresence>
        {!open && execResults.some(r => r.ts > Date.now() - 30000) && (
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-400 border-2 border-white" />
        )}
        {!open && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white"
            style={{ background: "#E85D04" }}>AI</span>
        )}
      </motion.button>

      {/* Main panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="fixed bottom-24 right-6 z-50 flex flex-col rounded-2xl overflow-hidden"
            style={{
              width: "min(460px, calc(100vw - 2rem))",
              height: "min(680px, calc(100vh - 140px))",
              background: "white",
              boxShadow: "0 24px 64px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)",
            }}
          >
            {/* ── Header ──────────────────────────────── */}
            <div className="flex items-center gap-3 px-4 py-3 shrink-0"
              style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/20 shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-white leading-none">TryNex AI Assistant</p>
                <p className="text-[10px] text-purple-200 mt-0.5">
                  {chatLoading && activeModelLabel
                    ? `Streaming via ${activeModelLabel}…`
                    : "Free · Streaming · History saved across sessions"}
                </p>
              </div>
              {/* Tab toggle — 3 tabs */}
              <div className="flex items-center gap-0.5 p-0.5 rounded-xl bg-white/15">
                {(["chat", "execute", "help"] as Tab[]).map(t => (
                  <button key={t}
                    onClick={() => setTab(t)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all"
                    style={{ background: tab === t ? "white" : "transparent", color: tab === t ? "#7c3aed" : "rgba(255,255,255,0.8)" }}
                  >
                    {t === "chat" && <MessageSquare className="w-3 h-3" />}
                    {t === "execute" && <Zap className="w-3 h-3" />}
                    {t === "help" && <BookOpen className="w-3 h-3" />}
                    <span className="hidden sm:inline capitalize">{t}</span>
                  </button>
                ))}
              </div>
              {/* Actions */}
              <div className="flex items-center gap-0.5">
                {tab === "chat" && (
                  <>
                    {chatLoading && (
                      <button onClick={stopStreaming} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/20 transition-colors" title="Stop streaming">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button onClick={clearChat} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/20 transition-colors" title="Clear chat history">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="relative" ref={modelPickerRef}>
                      <button
                        onClick={() => setShowModelPicker(p => !p)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-white/90 hover:bg-white/20 transition-colors"
                      >
                        {currentModelLabel.split(" ")[0]} <ChevronDown className="w-3 h-3" />
                      </button>
                      {showModelPicker && (
                        <div className="absolute right-0 top-8 w-44 rounded-xl overflow-hidden z-10 shadow-xl"
                          style={{ background: "white", border: "1px solid #e5e7eb" }}>
                          {TEXT_MODELS.map(m => (
                            <button key={m.id} onClick={() => { setModel(m.id); setShowModelPicker(false); }}
                              className="w-full px-3 py-2 text-left text-xs font-semibold transition-colors"
                              style={{ background: model === m.id ? "#f5f3ff" : "white", color: model === m.id ? "#7c3aed" : "#374151" }}>
                              {m.label}{model === m.id && <span className="ml-1 text-[9px]">✓</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
                {tab === "execute" && execResults.length > 0 && (
                  <button onClick={() => setShowExecHistory(h => !h)} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/20 transition-colors" title="Toggle history">
                    <History className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* ═══ CHAT TAB ═══════════════════════════════ */}
            {tab === "chat" && (
              <>
                {messages.length <= 1 && (
                  <div className="p-3 border-b border-gray-100 shrink-0" style={{ maxHeight: 168, overflowY: "auto" }}>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Quick actions</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {PRESETS.map(p => {
                        const Icon = p.icon;
                        return (
                          <button key={p.label} onClick={() => sendMessage(p.prompt)} disabled={chatLoading}
                            className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-left transition-all hover:scale-[1.02] disabled:opacity-50"
                            style={{ background: p.bg, border: `1.5px solid ${p.border}` }}>
                            <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: p.color }} />
                            <span className="text-[11px] font-bold" style={{ color: p.color }}>{p.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className="max-w-[88%] relative group">
                        <div className="rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed"
                          style={
                            msg.role === "user"
                              ? { background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "white", borderBottomRightRadius: 4 }
                              : msg.error
                                ? { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", borderBottomLeftRadius: 4 }
                                : { background: "#f9fafb", color: "#111827", border: "1px solid #f3f4f6", borderBottomLeftRadius: 4 }
                          }>
                          {msg.content ? <FormattedMessage content={msg.content} /> : null}
                          {msg.streaming && <StreamingDots />}
                        </div>
                        {msg.role === "assistant" && !msg.error && !msg.streaming && msg.content && (
                          <button onClick={() => copyMessage(msg.content, idx)}
                            className="absolute -top-1 -right-1 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ background: "white", border: "1px solid #e5e7eb", color: copied === idx ? "#059669" : "#6b7280" }}
                            title="Copy">
                            {copied === idx ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>
                <div className="p-3 border-t border-gray-100 shrink-0">
                  <div className="flex items-end gap-2 p-2 rounded-xl" style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
                    <textarea
                      ref={chatInputRef}
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                      placeholder="Ask me to write blog posts, product descriptions, ad copy…"
                      rows={2}
                      className="flex-1 bg-transparent text-sm resize-none outline-none text-gray-800 placeholder-gray-400"
                      style={{ maxHeight: 120 }}
                    />
                    <button onClick={() => chatLoading ? stopStreaming() : sendMessage()} disabled={!chatLoading && !chatInput.trim()}
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white transition-all disabled:opacity-40 shrink-0"
                      style={{ background: chatLoading ? "#ef4444" : "linear-gradient(135deg,#7c3aed,#a855f7)" }}
                      title={chatLoading ? "Stop" : "Send"}>
                      {chatLoading ? <X className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[9px] text-gray-400 text-center mt-1.5">History saved · Streams in real-time · Powered by Pollinations (free)</p>
                </div>
              </>
            )}

            {/* ═══ EXECUTE TAB ════════════════════════════ */}
            {tab === "execute" && (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {/* Input area — always visible */}
                <div className="p-3 border-b border-gray-100 shrink-0">
                  <div className="flex items-end gap-2 p-2 rounded-xl" style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
                    <textarea
                      ref={cmdInputRef}
                      value={cmdInput}
                      onChange={e => setCmdInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (execPhase === "idle") previewCommand_(); } }}
                      placeholder="Type a store command in plain English…"
                      rows={2}
                      className="flex-1 bg-transparent text-sm resize-none outline-none text-gray-800 placeholder-gray-400"
                      style={{ maxHeight: 100 }}
                      disabled={execPhase !== "idle"}
                    />
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        onClick={() => previewCommand_()}
                        disabled={!cmdInput.trim() || execPhase !== "idle"}
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-white transition-all disabled:opacity-40"
                        style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}
                        title="Preview before executing"
                      >
                        {execPhase === "previewing"
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Eye className="w-3.5 h-3.5" />
                        }
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <p className="text-[9px] text-gray-400 flex-1">
                      {execPhase === "previewing" ? "Analyzing your command…" :
                       execPhase === "preview" ? "Review the plan below, then approve or cancel." :
                       execPhase === "executing" ? "Executing against live store database…" :
                       "Press Enter or click 👁 to preview · Commands run against your live database"}
                    </p>
                    {execPhase === "preview" && (
                      <button onClick={() => { setExecPhase("idle"); setPreviewData(null); setCmdInput(previewCommand); }}
                        className="text-[9px] font-bold text-gray-400 hover:text-gray-600">Cancel</button>
                    )}
                  </div>
                </div>

                {/* Scrollable content area */}
                <div className="flex-1 overflow-y-auto">
                  {/* ── Preview card ── */}
                  <AnimatePresence>
                    {execPhase === "preview" && previewData && (() => {
                      const risk = RISK_CONFIG[previewData.preview.riskLevel];
                      return (
                        <motion.div
                          key="preview"
                          initial={{ opacity: 0, y: -12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -12 }}
                          className="m-3 rounded-2xl overflow-hidden"
                          style={{ border: `2px solid ${risk.border}`, background: risk.bg }}
                        >
                          {/* Preview header */}
                          <div className="px-4 py-3 flex items-start gap-3" style={{ background: `${risk.bg}` }}>
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-lg"
                              style={{ background: "white", border: `1.5px solid ${risk.border}` }}>
                              {risk.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-black text-gray-800">{previewData.preview.title}</p>
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                                  style={{ background: risk.color, color: "white" }}>
                                  {risk.label}
                                </span>
                              </div>
                              <p className="text-[12px] text-gray-600 mt-0.5">{previewData.preview.description}</p>
                            </div>
                          </div>

                          {/* What will happen */}
                          {previewData.preview.details.length > 0 && (
                            <div className="px-4 pb-3">
                              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">What will happen:</p>
                              <div className="space-y-1">
                                {previewData.preview.details.map((detail, i) => (
                                  <div key={i} className="flex items-start gap-2">
                                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: risk.color }} />
                                    <span className="text-[12px] text-gray-700">{detail}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Action buttons */}
                          <div className="px-4 pb-3 flex items-center gap-2">
                            <button
                              onClick={() => { setExecPhase("idle"); setPreviewData(null); setCmdInput(previewCommand); }}
                              className="flex-1 py-2 rounded-xl text-xs font-bold border transition-all hover:bg-white"
                              style={{ borderColor: risk.border, color: "#6b7280" }}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={approveAndExecute}
                              className="flex-1 py-2 rounded-xl text-xs font-black text-white transition-all flex items-center justify-center gap-1.5"
                              style={{ background: `linear-gradient(135deg,${risk.color},${risk.color}cc)` }}
                            >
                              <Play className="w-3 h-3" />
                              Approve & Execute
                            </button>
                          </div>
                        </motion.div>
                      );
                    })()}
                  </AnimatePresence>

                  {/* ── Executing indicator ── */}
                  {execPhase === "executing" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="m-3 p-4 rounded-2xl flex items-center gap-3"
                      style={{ background: "#f5f3ff", border: "2px solid #ddd6fe" }}>
                      <Loader2 className="w-5 h-5 text-purple-500 animate-spin shrink-0" />
                      <div>
                        <p className="text-sm font-black text-purple-800">Executing…</p>
                        <p className="text-[11px] text-purple-500">Making changes to your store database</p>
                      </div>
                    </motion.div>
                  )}

                  {/* ── Example commands (when idle + no history shown) ── */}
                  {execPhase === "idle" && !showExecHistory && execResults.length === 0 && (
                    <div className="p-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Example commands</p>
                      <div className="space-y-1">
                        {[
                          { label: "List all products", ex: "List all products" },
                          { label: "Create product", ex: "Create a product called 'Summer Tee' priced at ৳599 in T-Shirts" },
                          { label: "Update order status", ex: "Update order #12 to shipped" },
                          { label: "Create promo code", ex: "Create promo code EID25 for 25% off" },
                          { label: "Feature a product", ex: "Feature the product 'Black Graphic Custom Tee'" },
                          { label: "Update stock", ex: "Set stock of 'Classic White Custom Tee' to 200" },
                          { label: "Find order", ex: "Find order by customer Rahim" },
                          { label: "SEO advice", ex: "How do I get TryNex to rank on Google?" },
                        ].map(item => (
                          <button key={item.label}
                            onClick={() => { setCmdInput(item.ex); cmdInputRef.current?.focus(); }}
                            className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left transition-all hover:bg-purple-50 group"
                            style={{ border: "1px solid #f3f4f6" }}>
                            <div>
                              <p className="text-[11px] font-bold text-gray-700">{item.label}</p>
                              <p className="text-[10px] text-gray-400 truncate max-w-[300px]">{item.ex}</p>
                            </div>
                            <ChevronRight className="w-3 h-3 text-gray-300 group-hover:text-purple-500 shrink-0" />
                          </button>
                        ))}
                      </div>
                      <p className="text-[9px] text-gray-400 text-center mt-2">
                        💡 Check the <strong>Help</strong> tab for all 20+ available commands
                      </p>
                    </div>
                  )}

                  {/* ── Execution history ── */}
                  {(showExecHistory || execPhase === "idle") && execResults.length > 0 && (
                    <div className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Recent actions</p>
                        <div className="flex items-center gap-2">
                          <button onClick={() => {
                            setExecResults([]);
                            try { localStorage.removeItem(EXEC_HISTORY_KEY); } catch { /* ignore */ }
                          }} className="text-[9px] text-gray-400 hover:text-red-500 font-bold">Clear</button>
                          <button onClick={() => setShowExecHistory(h => !h)} className="text-gray-400 hover:text-gray-600">
                            {showExecHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                      <AnimatePresence>
                        {(showExecHistory ? execResults : execResults.slice(0, 3)).map(r => (
                          <motion.div key={r.id}
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-xl p-3"
                            style={{
                              background: r.description === "Processing…" ? "#fafafa" : r.success ? r.undone ? "#f0fdf4" : "#f5f3ff" : "#fef2f2",
                              border: `1px solid ${r.description === "Processing…" ? "#e5e7eb" : r.success ? r.undone ? "#bbf7d0" : "#ddd6fe" : "#fecaca"}`,
                            }}>
                            <div className="flex items-start gap-2">
                              {r.description === "Processing…"
                                ? <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin shrink-0 mt-0.5" />
                                : r.success
                                  ? <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${r.undone ? "text-green-500" : "text-purple-500"}`} />
                                  : <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />}
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 truncate">{r.command}</p>
                                <p className="text-xs text-gray-700 mt-0.5 whitespace-pre-wrap leading-relaxed">
                                  <FormattedMessage content={r.undone ? r.undoneDescription || "Undone" : r.description} />
                                </p>
                              </div>
                            </div>
                            {r.success && !r.undone && r.undoInfo && (
                              <button
                                onClick={() => undoAction(r)}
                                disabled={!!undoingId}
                                className="mt-2 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all hover:bg-white disabled:opacity-50"
                                style={{ color: "#7c3aed", border: "1px solid #ddd6fe" }}>
                                {undoingId === r.id
                                  ? <><Loader2 className="w-2.5 h-2.5 animate-spin" /> Undoing…</>
                                  : <><RotateCcw className="w-2.5 h-2.5" /> Undo</>}
                              </button>
                            )}
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>
              </div>
            )}

            {/* ═══ HELP TAB ═══════════════════════════════ */}
            {tab === "help" && (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Search */}
                <div className="p-3 border-b border-gray-100 shrink-0">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
                    <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <input
                      type="text"
                      value={helpSearch}
                      onChange={e => setHelpSearch(e.target.value)}
                      placeholder="Search commands…"
                      className="flex-1 bg-transparent text-sm outline-none text-gray-700 placeholder-gray-400"
                    />
                    {helpSearch && (
                      <button onClick={() => setHelpSearch("")} className="text-gray-400 hover:text-gray-600">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-[9px] text-gray-400 text-center mt-1.5">Click any command to load it into Execute tab</p>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {filteredHelp.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm font-bold">No commands match "{helpSearch}"</p>
                    </div>
                  )}
                  {filteredHelp.map(cat => (
                    <div key={cat.label} className="rounded-xl overflow-hidden" style={{ border: "1px solid #f3f4f6" }}>
                      <button
                        onClick={() => setExpandedHelp(expandedHelp === cat.label ? null : cat.label)}
                        className="w-full flex items-center justify-between px-3 py-2.5 transition-colors hover:bg-gray-50"
                        style={{ background: cat.bg }}>
                        <span className="text-[12px] font-black" style={{ color: cat.color }}>{cat.label}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-gray-400">{cat.commands.length} commands</span>
                          {expandedHelp === cat.label
                            ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                            : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                        </div>
                      </button>
                      <AnimatePresence>
                        {(expandedHelp === cat.label || !!helpSearch) && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="divide-y divide-gray-50">
                              {cat.commands.map(cmd => (
                                <button key={cmd.label}
                                  onClick={() => {
                                    setTab("execute");
                                    setCmdInput(cmd.example);
                                    setExecPhase("idle");
                                    setTimeout(() => cmdInputRef.current?.focus(), 100);
                                  }}
                                  className="w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors group">
                                  <div className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                                    style={{ background: cat.bg }}>
                                    <Zap className="w-2.5 h-2.5" style={{ color: cat.color }} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-black text-gray-700">{cmd.label}</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">{cmd.desc}</p>
                                    <p className="text-[10px] font-mono text-purple-600 mt-1 truncate bg-purple-50 rounded px-1.5 py-0.5 group-hover:bg-purple-100 transition-colors">
                                      {cmd.example}
                                    </p>
                                  </div>
                                  <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-purple-400 shrink-0 mt-1" />
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}

                  {/* Tips */}
                  <div className="rounded-xl p-3 mt-2" style={{ background: "#f0f9ff", border: "1px solid #bae6fd" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <p className="text-[11px] font-black text-blue-800">Pro Tips</p>
                    </div>
                    <div className="space-y-1.5">
                      {[
                        "Use exact product names in quotes for reliable matching",
                        "Commands run in real-time — preview first for safety",
                        "Dangerous actions (delete) show a red warning card",
                        "Use Undo button within the session to revert changes",
                        "For complex tasks, use the Chat tab for AI planning",
                      ].map((tip, i) => (
                        <div key={i} className="flex items-start gap-1.5">
                          <span className="text-blue-400 shrink-0 text-[10px] font-black mt-0.5">→</span>
                          <p className="text-[10px] text-blue-700">{tip}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AI capabilities note */}
                  <div className="rounded-xl p-3" style={{ background: "#f5f3ff", border: "1px solid #ddd6fe" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldAlert className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                      <p className="text-[11px] font-black text-purple-800">AI Permission Note</p>
                    </div>
                    <p className="text-[10px] text-purple-700 leading-relaxed">
                      The AI assistant can <strong>read, create, update, and delete</strong> products, orders, and promo codes. All actions are logged in the Activity Log. Destructive actions (delete, cancel order) show a high-risk warning before executing.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
