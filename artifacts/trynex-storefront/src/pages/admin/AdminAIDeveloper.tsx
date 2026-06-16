import { useState, useEffect, useRef, useCallback } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { getAuthHeaders, getApiUrl } from "@/lib/utils";
import {
  Bot, Send, Square, Trash2, Copy, Check, Settings, ChevronDown, Zap,
  Code2, Terminal, FileCode, Sparkles, Download, RefreshCw, AlertCircle,
  CheckCircle, Clock, Cpu, Globe, Brain, Plus, X, ChevronRight,
  MessageSquare, Lightbulb, Database, Server, Palette, Upload, Package,
  BarChart3, ShoppingCart, Users, TrendingUp, Eye, EyeOff, Key, ToggleLeft,
  ToggleRight, Search, Wrench, Activity, Layers, FileText, Image, ChevronUp,
  Hash, Star,
} from "lucide-react";

/* ─────────────────── Types ─────────────────── */
interface ProviderModel { id: string; label: string; ctx: number; speed: string }
interface Provider { id: string; name: string; tag: string; color: string; needsKey: boolean; available: boolean; models: ProviderModel[] }
interface AttachedFile { id: string; name: string; type: string; content: string; size: number }
interface ToolCall { id: string; tool: string; params?: Record<string, unknown>; result?: unknown; status: "pending" | "done" | "error" }
interface ChatMessage {
  id: string; role: "user" | "assistant"; content: string;
  provider?: string; model?: string; timestamp: number; error?: boolean;
  toolCalls?: ToolCall[]; attachedFiles?: AttachedFile[];
}
interface StoreContext {
  products: { total: number; items: unknown[]; lowStock: number };
  categories: { total: number; items: unknown[] };
  orders: { total: number; pending: number; processing: number; totalRevenue: number; recent: unknown[] };
  settings: Record<string, string>;
  health: { timestamp: string; uptime: number; memoryMB: number };
}
interface FeatureFlags {
  contextInjection: boolean;
  toolCalling: boolean;
  streaming: boolean;
  chatHistory: boolean;
  fileUpload: boolean;
  autoAudit: boolean;
}

const DEFAULT_FEATURES: FeatureFlags = {
  contextInjection: true,
  toolCalling: true,
  streaming: true,
  chatHistory: true,
  fileUpload: true,
  autoAudit: false,
};

const TRYNEX_SYSTEM = `You are the TryNex AI Developer Agent — an elite full-stack AI assistant deeply integrated with the TryNex Lifestyle Bangladesh admin panel.

**About TryNex Lifestyle:**
- Premium custom apparel & gift shop in Bangladesh
- Products: T-Shirts, Hoodies, Mugs, Caps, Water Bottles, Long Sleeves
- Stack: React+Vite+TailwindCSS frontend, Node+Express+TypeScript+Drizzle+PostgreSQL backend, pnpm monorepo
- Brand color: #E85D04 (orange), dark sidebar admin (#0f0f0f)
- Payment: bKash, Nagad, COD — no Stripe/international
- Key pages: Design Studio (3D product customizer), Shop, Cart, Admin panel
- Live at: https://trynex.shop

**Your capabilities:**
- Write production-ready code for TryNex's exact tech stack
- Debug TypeScript/React/Express/SQL issues
- Design responsive Tailwind UI components
- Query live store data using your built-in tools
- Generate product descriptions, SEO content, admin scripts
- Analyze and fix any errors you're shown

**Available tools you can call (respond with [TOOL: tool_name {params}] on its own line):**
- [TOOL: search_products {"query":"hoodie"}] — search products
- [TOOL: get_stats {}] — get store statistics
- [TOOL: get_orders {"limit":10}] — list recent orders
- [TOOL: get_categories {}] — list categories
- [TOOL: get_settings {}] — get store settings
- [TOOL: check_health {}] — system health check
- [TOOL: get_low_stock {"threshold":10}] — find low stock items

When you call a tool, format it EXACTLY as: [TOOL: tool_name JSON_params]
The system will execute the tool and inject the result into the conversation automatically.

Always provide complete, working code. Be direct and precise.`;

const QUICK_TEMPLATES = [
  { label: "Fix Bug", icon: Wrench, prompt: "I have this error in my TryNex code:\n\n```\n[paste error here]\n```\n\nPlease diagnose and fix it." },
  { label: "Write API Route", icon: Server, prompt: "Write a new Express route for TryNex API server that does: [describe feature]" },
  { label: "React Component", icon: Palette, prompt: "Create a premium Tailwind+React component for TryNex admin panel: [describe component]" },
  { label: "DB Query", icon: Database, prompt: "Write a Drizzle ORM query for TryNex PostgreSQL to: [describe query]" },
  { label: "Store Audit", icon: Activity, prompt: "Run get_stats and check_health to give me a full store health report with recommendations." },
  { label: "Product Desc", icon: Package, prompt: "Write an SEO-optimized product description for TryNex. Product: [name]\nKey features: [list features]" },
  { label: "SEO Help", icon: TrendingUp, prompt: "Give me TryNex Bangladesh e-commerce SEO strategy. Check what categories we have first." },
  { label: "Code Review", icon: FileCode, prompt: "Review this TryNex code and suggest improvements:\n\n```typescript\n[paste code here]\n```" },
];

/* ─────────────────── Markdown rendering ─────────── */
function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); };
  return (
    <div className="my-3 rounded-xl overflow-hidden border border-gray-700 shadow-lg">
      <div className="flex items-center justify-between bg-gray-800 px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500/70" /><div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" /><div className="w-2.5 h-2.5 rounded-full bg-green-500/70" /></div>
          <span className="text-xs font-mono text-gray-400">{lang || "code"}</span>
        </div>
        <button onClick={copy} className="flex items-center gap-1 text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-700 transition-colors">
          {copied ? <><Check className="w-3 h-3 text-green-400" /><span className="text-green-400">Copied!</span></> : <><Copy className="w-3 h-3" /><span>Copy</span></>}
        </button>
      </div>
      <pre className="bg-gray-900 text-gray-100 p-4 overflow-x-auto text-[13px] font-mono leading-relaxed"><code>{code}</code></pre>
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|_[^_]+_|\[TOOL:[^\]]+\])/g);
  return parts.map((p, i) => {
    if (p.startsWith("`") && p.endsWith("`")) return <code key={i} className="bg-gray-100 text-orange-600 px-1.5 py-0.5 rounded text-[0.85em] font-mono border border-gray-200">{p.slice(1, -1)}</code>;
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i} className="font-bold text-gray-900">{p.slice(2, -2)}</strong>;
    if ((p.startsWith("__") && p.endsWith("__")) || (p.startsWith("_") && p.endsWith("_"))) return <em key={i} className="italic">{p.slice(p.startsWith("__") ? 2 : 1, p.startsWith("__") ? -2 : -1)}</em>;
    if (p.startsWith("[TOOL:")) return <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs font-mono border border-purple-200"><Wrench className="w-3 h-3" />{p}</span>;
    return p;
  });
}

function renderMarkdown(text: string): React.ReactNode {
  const blocks = text.split(/(```[\s\S]*?```)/g);
  return (
    <>
      {blocks.map((block, bi) => {
        if (block.startsWith("```")) {
          const m = block.match(/^```(\w*)\n?([\s\S]*?)```$/);
          if (m) return <CodeBlock key={bi} lang={m[1]} code={m[2].trimEnd()} />;
          return <CodeBlock key={bi} lang="text" code={block.slice(3, -3)} />;
        }
        const lines = block.split("\n");
        const nodes: React.ReactNode[] = [];
        let listItems: string[] = []; let listType: "ul" | "ol" | null = null;
        const flush = (k: string) => {
          if (!listItems.length) return;
          if (listType === "ul") nodes.push(<ul key={k} className="list-disc pl-5 my-1.5 space-y-0.5">{listItems.map((it, i) => <li key={i} className="text-gray-700 text-sm">{renderInline(it)}</li>)}</ul>);
          else nodes.push(<ol key={k} className="list-decimal pl-5 my-1.5 space-y-0.5">{listItems.map((it, i) => <li key={i} className="text-gray-700 text-sm">{renderInline(it)}</li>)}</ol>);
          listItems = []; listType = null;
        };
        lines.forEach((line, li) => {
          const h3 = line.match(/^### (.+)/); if (h3) { flush(`h-${li}`); nodes.push(<h3 key={li} className="text-sm font-bold text-gray-900 mt-3 mb-1">{renderInline(h3[1])}</h3>); return; }
          const h2 = line.match(/^## (.+)/); if (h2) { flush(`h-${li}`); nodes.push(<h2 key={li} className="text-base font-bold text-gray-900 mt-4 mb-1.5 border-b border-gray-200 pb-1">{renderInline(h2[1])}</h2>); return; }
          const h1 = line.match(/^# (.+)/); if (h1) { flush(`h-${li}`); nodes.push(<h1 key={li} className="text-lg font-bold text-gray-900 mt-4 mb-2">{renderInline(h1[1])}</h1>); return; }
          const ul = line.match(/^[-*•] (.+)/); if (ul) { if (listType !== "ul") { flush(`f-${li}`); listType = "ul"; } listItems.push(ul[1]); return; }
          const ol = line.match(/^\d+\. (.+)/); if (ol) { if (listType !== "ol") { flush(`f-${li}`); listType = "ol"; } listItems.push(ol[1]); return; }
          if (line.trim() === "") { flush(`e-${li}`); nodes.push(<div key={li} className="h-2" />); return; }
          flush(`t-${li}`);
          nodes.push(<p key={li} className="text-gray-700 text-sm leading-relaxed">{renderInline(line)}</p>);
        });
        flush("final");
        return <div key={bi}>{nodes}</div>;
      })}
    </>
  );
}

/* ─────────────────── Tool call display ─────────────────── */
function ToolCallBadge({ tc }: { tc: ToolCall }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="my-2 rounded-lg border border-purple-200 bg-purple-50 overflow-hidden text-xs">
      <button onClick={() => setExpanded(v => !v)} className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-purple-100 transition-colors">
        <Wrench className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
        <span className="font-mono text-purple-800 font-medium">{tc.tool}</span>
        {tc.status === "pending" && <RefreshCw className="w-3 h-3 text-purple-500 animate-spin ml-auto" />}
        {tc.status === "done" && <CheckCircle className="w-3 h-3 text-green-500 ml-auto" />}
        {tc.status === "error" && <AlertCircle className="w-3 h-3 text-red-500 ml-auto" />}
        {tc.status !== "pending" && (expanded ? <ChevronUp className="w-3 h-3 text-purple-500" /> : <ChevronDown className="w-3 h-3 text-purple-500" />)}
      </button>
      {expanded && tc.result !== undefined && (
        <div className="px-3 pb-3">
          <pre className="bg-white rounded border border-purple-200 p-2 text-[11px] font-mono overflow-x-auto max-h-48 text-gray-700 leading-relaxed">
            {JSON.stringify(tc.result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

/* ─────────────────── File Attachment badge ─────────────────── */
function FileBadge({ file, onRemove }: { file: AttachedFile; onRemove?: () => void }) {
  const isImg = file.type.startsWith("image/");
  return (
    <div className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-100 border border-gray-200 rounded-lg text-xs">
      {isImg ? <Image className="w-3.5 h-3.5 text-blue-500" /> : <FileText className="w-3.5 h-3.5 text-gray-500" />}
      <span className="font-medium text-gray-700 max-w-[100px] truncate">{file.name}</span>
      <span className="text-gray-400">{(file.size / 1024).toFixed(1)}KB</span>
      {onRemove && <button onClick={onRemove} className="ml-1 text-gray-400 hover:text-red-500 transition-colors"><X className="w-3 h-3" /></button>}
    </div>
  );
}

/* ─────────────────── Provider/Speed badges ─────────────────── */
function ProviderDot({ color }: { color: string }) {
  return <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />;
}

function SpeedBadge({ speed }: { speed: string }) {
  const c = speed === "fast" ? "bg-green-100 text-green-700" : speed === "medium" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700";
  return <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${c}`}>{speed}</span>;
}

/* ─────────────────── Context Stats cards ─────────────────── */
function StatCard({ icon: Icon, label, value, sub, color }: { icon: typeof Package; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon className="w-3.5 h-3.5" style={{ color }} />
        </div>
        <span className="text-xs text-gray-500 font-medium">{label}</span>
      </div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
      {sub && <div className="text-[11px] text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

/* ─────────────────── Main Component ─────────────────── */
export default function AdminAIDeveloper() {
  const [providers,       setProviders]       = useState<Provider[]>([]);
  const [selectedProv,    setSelectedProv]    = useState("pollinations");
  const [selectedModel,   setSelectedModel]   = useState("");
  const [messages,        setMessages]        = useState<ChatMessage[]>(() => {
    try { return JSON.parse(localStorage.getItem("trynex_ai_dev_chat") ?? "[]"); } catch { return []; }
  });
  const [input,           setInput]           = useState("");
  const [isStreaming,     setIsStreaming]      = useState(false);
  const [temperature,     setTemperature]      = useState(0.7);
  const [systemPrompt,    setSystemPrompt]    = useState(TRYNEX_SYSTEM);
  const [activeTab,       setActiveTab]       = useState<"chat" | "context" | "tools" | "settings">("chat");
  const [features,        setFeatures]        = useState<FeatureFlags>(DEFAULT_FEATURES);
  const [openAIKey,       setOpenAIKey]       = useState("");
  const [showOpenAIKey,   setShowOpenAIKey]   = useState(false);
  const [storeContext,    setStoreContext]    = useState<StoreContext | null>(null);
  const [contextLoading,  setContextLoading]  = useState(false);
  const [attachedFiles,   setAttachedFiles]   = useState<AttachedFile[]>([]);
  const [isDragging,      setIsDragging]      = useState(false);
  const [provDropOpen,    setProvDropOpen]    = useState(false);
  const [modelDropOpen,   setModelDropOpen]   = useState(false);
  const [showSysPrompt,   setShowSysPrompt]   = useState(false);
  const [showTemplates,   setShowTemplates]   = useState(false);
  const [toolLog,         setToolLog]         = useState<ToolCall[]>([]);
  const [auditResult,     setAuditResult]     = useState<string>("");
  const [auditLoading,    setAuditLoading]    = useState(false);
  const [contextPanel,    setContextPanel]    = useState(true);

  const abortRef  = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);
  const fileRef   = useRef<HTMLInputElement>(null);

  /* Load providers */
  useEffect(() => {
    fetch(getApiUrl("/api/ai/developer/providers"), { headers: getAuthHeaders() })
      .then(r => r.json()).then(d => {
        if (d.providers) {
          setProviders(d.providers);
          const first = d.providers.find((p: Provider) => p.available) ?? d.providers[0];
          if (first) { setSelectedProv(first.id); setSelectedModel(first.models[0]?.id ?? ""); }
        }
      }).catch(() => {});
  }, []);

  /* Load store context */
  const loadContext = useCallback(async () => {
    setContextLoading(true);
    try {
      const r = await fetch(getApiUrl("/api/ai/developer/context"), { headers: getAuthHeaders() });
      if (r.ok) { const d = await r.json(); setStoreContext(d); }
    } catch {}
    setContextLoading(false);
  }, []);

  useEffect(() => { loadContext(); }, [loadContext]);

  /* Auto-save chat */
  useEffect(() => {
    if (features.chatHistory) {
      try { localStorage.setItem("trynex_ai_dev_chat", JSON.stringify(messages.slice(-80))); } catch {}
    }
  }, [messages, features.chatHistory]);

  /* Scroll to bottom */
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  /* Auto-resize textarea */
  useEffect(() => {
    if (!inputRef.current) return;
    inputRef.current.style.height = "auto";
    inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 160) + "px";
  }, [input]);

  const getAuthHeaders = () => {
    const token = sessionStorage.getItem("trynex_admin_token");
    return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  };

  const currentProvider  = providers.find(p => p.id === selectedProv) ?? providers[0];
  const currentModelObj  = currentProvider?.models.find(m => m.id === selectedModel) ?? currentProvider?.models[0];

  /* Execute a tool call */
  const executeTool = useCallback(async (tool: string, params: Record<string, unknown> = {}): Promise<unknown> => {
    const r = await fetch(getApiUrl("/api/ai/developer/tool"), {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ tool, params }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error ?? "Tool failed");
    return d.result ?? d;
  }, []);

  /* Parse and execute tool calls from AI response */
  const parseAndRunTools = useCallback(async (text: string, msgId: string): Promise<string> => {
    const toolPattern = /\[TOOL:\s*(\w+)\s*(\{[^}]*\}|\{\}|)\]/g;
    let match: RegExpExecArray | null;
    const calls: Array<{ tool: string; params: Record<string, unknown>; index: number }> = [];

    while ((match = toolPattern.exec(text)) !== null) {
      try {
        const params = match[2] ? JSON.parse(match[2]) : {};
        calls.push({ tool: match[1], params, index: match.index });
      } catch {}
    }

    if (calls.length === 0) return text;
    if (!features.toolCalling) return text;

    let enriched = text;
    for (const call of calls) {
      const tcId = `tc-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
      const tc: ToolCall = { id: tcId, tool: call.tool, params: call.params, status: "pending" };
      setToolLog(prev => [...prev, tc]);

      setMessages(prev => prev.map(m => m.id === msgId ? {
        ...m,
        toolCalls: [...(m.toolCalls ?? []), tc],
      } : m));

      try {
        const result = await executeTool(call.tool, call.params);
        const resultStr = `\n\n**Tool result: \`${call.tool}\`**\n\`\`\`json\n${JSON.stringify(result, null, 2).slice(0, 2000)}\n\`\`\`\n`;
        enriched += resultStr;
        const doneTC: ToolCall = { ...tc, result, status: "done" };
        setToolLog(prev => prev.map(t => t.id === tcId ? doneTC : t));
        setMessages(prev => prev.map(m => m.id === msgId ? {
          ...m,
          toolCalls: (m.toolCalls ?? []).map(t => t.id === tcId ? doneTC : t),
        } : m));
      } catch (err) {
        const errTC: ToolCall = { ...tc, result: { error: String(err) }, status: "error" };
        setToolLog(prev => prev.map(t => t.id === tcId ? errTC : t));
        setMessages(prev => prev.map(m => m.id === msgId ? {
          ...m,
          toolCalls: (m.toolCalls ?? []).map(t => t.id === tcId ? errTC : t),
        } : m));
        enriched += `\n\n**Tool error: \`${call.tool}\`** — ${String(err)}`;
      }
    }

    return enriched;
  }, [executeTool, features.toolCalling]);

  /* Build context-injected system prompt */
  const buildSystemPrompt = useCallback(() => {
    let base = systemPrompt;
    if (features.contextInjection && storeContext) {
      base += `\n\n--- LIVE STORE CONTEXT (as of ${storeContext.health.timestamp}) ---
Products: ${storeContext.products.total} total, ${storeContext.products.lowStock} low stock
Orders: ${storeContext.orders.total} recent, ${storeContext.orders.pending} pending, Revenue: ৳${storeContext.orders.totalRevenue.toLocaleString()}
Categories: ${storeContext.categories.items.map((c: any) => c.name).join(", ")}
Store name: ${storeContext.settings.siteName ?? "TryNex Lifestyle"}
System uptime: ${Math.floor(storeContext.health.uptime / 60)} min, Memory: ${storeContext.health.memoryMB}MB
---`;
    }
    return base;
  }, [systemPrompt, storeContext, features.contextInjection]);

  /* Build user message with file context */
  const buildUserContent = useCallback((text: string, files: AttachedFile[]) => {
    if (!files.length) return text;
    const fileContext = files.map(f => {
      if (f.type.startsWith("image/")) return `[Attached image: ${f.name} — ${(f.size/1024).toFixed(1)}KB]`;
      return `[Attached file: ${f.name}]\n\`\`\`\n${f.content.slice(0, 3000)}\n\`\`\``;
    }).join("\n\n");
    return `${text}\n\n${fileContext}`;
  }, []);

  const stopStream = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const sendMessage = useCallback(async (overrideInput?: string) => {
    const rawText = (overrideInput ?? input).trim();
    if (!rawText || isStreaming) return;

    const currentFiles = [...attachedFiles];
    const userContent = buildUserContent(rawText, currentFiles);
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", content: userContent, timestamp: Date.now(), attachedFiles: currentFiles };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setAttachedFiles([]);
    setIsStreaming(true);

    const assistantId = `a-${Date.now()}`;
    const assistantMsg: ChatMessage = { id: assistantId, role: "assistant", content: "", provider: selectedProv, model: selectedModel, timestamp: Date.now() };
    setMessages(prev => [...prev, assistantMsg]);

    abortRef.current = new AbortController();

    const history = [...messages, userMsg].slice(-30).map(m => ({ role: m.role, content: m.content }));

    try {
      const useOpenAI = !!openAIKey;
      const endpoint = getApiUrl("/api/ai/developer/chat");
      const body: Record<string, unknown> = {
        messages: history,
        providerId: useOpenAI ? "openai-direct" : selectedProv,
        model: useOpenAI ? "gpt-4o" : (selectedModel || undefined),
        systemPrompt: buildSystemPrompt(),
        temperature,
      };
      if (openAIKey) body.openAIKey = openAIKey;

      const r = await fetch(endpoint, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
        signal: abortRef.current.signal,
      });

      if (!r.ok || !r.body) {
        const err = await r.json().catch(() => ({ error: "Unknown error" }));
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: `Error: ${err.error ?? "Request failed"}`, error: true } : m));
        setIsStreaming(false); return;
      }

      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          const payload = part.replace(/^data: /, "").trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const evt = JSON.parse(payload) as { type: string; delta?: string; error?: string; provider?: string; model?: string };
            if (evt.type === "delta" && evt.delta) {
              fullContent += evt.delta;
              setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: fullContent } : m));
            } else if (evt.type === "provider") {
              setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, provider: evt.provider, model: evt.model } : m));
            } else if (evt.type === "error") {
              fullContent += `\n\n*Error: ${evt.error}*`;
              setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: fullContent, error: true } : m));
            }
          } catch {}
        }
      }

      /* Run any tool calls in the response */
      if (features.toolCalling && fullContent.includes("[TOOL:")) {
        const enriched = await parseAndRunTools(fullContent, assistantId);
        if (enriched !== fullContent) {
          setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: enriched } : m));
        }
      }

    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        const msg = (err as Error)?.message ?? "Connection error";
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: `Error: ${msg}`, error: true } : m));
      }
    } finally {
      setIsStreaming(false);
    }
  }, [input, isStreaming, messages, selectedProv, selectedModel, temperature, attachedFiles, openAIKey, buildSystemPrompt, buildUserContent, parseAndRunTools, features.toolCalling]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const clearHistory = () => {
    setMessages([]); setToolLog([]);
    try { localStorage.removeItem("trynex_ai_dev_chat"); } catch {}
  };

  const exportChat = () => {
    const text = messages.map(m => `[${m.role.toUpperCase()} - ${new Date(m.timestamp).toLocaleTimeString()}]\n${m.content}\n`).join("\n---\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `trynex-ai-chat-${Date.now()}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  /* File upload */
  const handleFiles = useCallback((files: FileList | File[]) => {
    if (!features.fileUpload) return;
    Array.from(files).forEach(file => {
      if (file.size > 5 * 1024 * 1024) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setAttachedFiles(prev => [...prev, { id: `f-${Date.now()}-${Math.random().toString(36).slice(2,5)}`, name: file.name, type: file.type, content, size: file.size }]);
      };
      if (file.type.startsWith("image/")) reader.readAsDataURL(file);
      else reader.readAsText(file);
    });
  }, [features.fileUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  /* Run audit */
  const runAudit = async () => {
    setAuditLoading(true); setAuditResult("");
    try {
      const [stats, health] = await Promise.all([
        executeTool("get_stats", {}),
        executeTool("check_health", {}),
      ]);
      const lowStock = await executeTool("get_low_stock", { threshold: 10 });
      const report = [
        `## TryNex Store Audit — ${new Date().toLocaleString("en-BD")}`,
        "",
        `### Products`,
        `- Total: ${(stats as any).products?.total ?? "?"}`,
        `- Low stock (≤10): ${(lowStock as any[])?.length ?? "?"}`,
        "",
        `### Orders`,
        `- Total: ${(stats as any).orders?.total ?? "?"}`,
        `- Pending: ${(stats as any).orders?.pending ?? "?"}`,
        `- Revenue: ৳${Number((stats as any).orders?.revenue ?? 0).toLocaleString()}`,
        "",
        `### System Health`,
        `- DB latency: ${(health as any).db?.latencyMs}ms — ${(health as any).db?.ok ? "✅ OK" : "❌ Error"}`,
        `- Server uptime: ${Math.floor((health as any).uptime / 60)} minutes`,
        `- Memory: ${(health as any).memoryMB}MB RSS`,
        `- Node: ${(health as any).node}`,
        "",
        (lowStock as any[])?.length > 0
          ? `### ⚠️ Low Stock Alert\n${(lowStock as any[]).slice(0,5).map((p: any) => `- ${p.name}: ${p.stock} left`).join("\n")}`
          : "### ✅ All products have healthy stock levels",
      ].join("\n");
      setAuditResult(report);
    } catch (err) {
      setAuditResult(`Audit error: ${String(err)}`);
    }
    setAuditLoading(false);
  };

  const toggleFeature = (key: keyof FeatureFlags) => {
    setFeatures(prev => ({ ...prev, [key]: !prev[key] }));
  };

  /* ─────────────────── Render ─────────────────── */
  return (
    <AdminLayout>
      <div className="flex h-[calc(100vh-64px)] bg-gray-50 overflow-hidden">

        {/* ── Left sidebar ─────────────────────────── */}
        <div className="w-64 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 pt-4 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-sm">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">AI Developer</h2>
                <p className="text-[10px] text-gray-400">TryNex Agent v2.0</p>
              </div>
            </div>
          </div>

          {/* Provider selector */}
          <div className="px-3 py-3 border-b border-gray-100">
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">AI Provider</label>
            <div className="relative">
              <button
                onClick={() => setProvDropOpen(v => !v)}
                className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm hover:bg-gray-100 transition-colors"
              >
                {currentProvider && <ProviderDot color={currentProvider.color} />}
                <span className="flex-1 text-left font-medium text-gray-800 truncate">{currentProvider?.name ?? "Loading…"}</span>
                {currentProvider && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-600 font-mono">{currentProvider.tag}</span>}
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>
              {provDropOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
                  {providers.map(p => (
                    <button key={p.id} onClick={() => {
                      setSelectedProv(p.id);
                      setSelectedModel(p.models[0]?.id ?? "");
                      setProvDropOpen(false);
                    }} className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-gray-50 transition-colors text-left ${p.id === selectedProv ? "bg-orange-50" : ""}`}>
                      <ProviderDot color={p.color} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-800 text-xs">{p.name}</div>
                        <div className="text-[10px] text-gray-400">{p.available ? "✓ Ready" : "Needs API key"}</div>
                      </div>
                      {!p.available && <AlertCircle className="w-3 h-3 text-amber-400 flex-shrink-0" />}
                      {p.id === selectedProv && <Check className="w-3 h-3 text-orange-500 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Model selector */}
            <div className="relative mt-2">
              <button
                onClick={() => setModelDropOpen(v => !v)}
                className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm hover:bg-gray-100 transition-colors"
              >
                <Cpu className="w-3 h-3 text-gray-400" />
                <span className="flex-1 text-left text-xs font-medium text-gray-700 truncate">{currentModelObj?.label ?? "Select model"}</span>
                {currentModelObj && <SpeedBadge speed={currentModelObj.speed} />}
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>
              {modelDropOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden max-h-48 overflow-y-auto">
                  {currentProvider?.models.map(m => (
                    <button key={m.id} onClick={() => { setSelectedModel(m.id); setModelDropOpen(false); }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 transition-colors text-left ${m.id === selectedModel ? "bg-orange-50" : ""}`}>
                      <span className="flex-1 font-medium text-gray-800 truncate">{m.label}</span>
                      <SpeedBadge speed={m.speed} />
                      {m.id === selectedModel && <Check className="w-3 h-3 text-orange-500" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Navigation tabs */}
          <div className="px-3 py-2 border-b border-gray-100">
            {(["chat", "context", "tools", "settings"] as const).map(tab => {
              const Icon = tab === "chat" ? MessageSquare : tab === "context" ? Database : tab === "tools" ? Wrench : Settings;
              const label = tab.charAt(0).toUpperCase() + tab.slice(1);
              return (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium mb-0.5 transition-all ${activeTab === tab ? "bg-orange-50 text-orange-600" : "text-gray-600 hover:bg-gray-50"}`}>
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                  {tab === "tools" && toolLog.length > 0 && (
                    <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold">{toolLog.length}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick templates */}
          <div className="px-3 py-2 flex-1 overflow-y-auto">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Quick Start</p>
            {QUICK_TEMPLATES.map((t, i) => {
              const Icon = t.icon;
              return (
                <button key={i} onClick={() => { setInput(t.prompt); setActiveTab("chat"); inputRef.current?.focus(); }}
                  className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-xs text-left text-gray-600 hover:bg-gray-50 hover:text-orange-600 transition-colors mb-0.5">
                  <Icon className="w-3 h-3 flex-shrink-0 text-orange-400" />
                  <span className="font-medium">{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Bottom actions */}
          <div className="px-3 py-3 border-t border-gray-100 flex gap-2">
            <button onClick={clearHistory} title="Clear chat" className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs text-gray-500 hover:bg-red-50 hover:text-red-500 border border-gray-200 transition-colors">
              <Trash2 className="w-3 h-3" /> Clear
            </button>
            <button onClick={exportChat} title="Export chat" disabled={!messages.length} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs text-gray-500 hover:bg-gray-100 border border-gray-200 transition-colors disabled:opacity-40">
              <Download className="w-3 h-3" /> Export
            </button>
          </div>
        </div>

        {/* ── Main panel ─────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Tab: CHAT */}
          {activeTab === "chat" && (
            <>
              {/* Chat header */}
              <div className="px-4 py-3 bg-white border-b border-gray-200 flex items-center gap-3">
                <div className="flex items-center gap-2 flex-1">
                  {currentProvider && <ProviderDot color={currentProvider.color} />}
                  <span className="text-sm font-semibold text-gray-700">{currentProvider?.name ?? "AI"}</span>
                  <span className="text-xs text-gray-400">·</span>
                  <span className="text-xs text-gray-500">{currentModelObj?.label}</span>
                  {features.contextInjection && storeContext && (
                    <span className="ml-2 flex items-center gap-1 text-[10px] text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full font-medium">
                      <Database className="w-2.5 h-2.5" /> Store context active
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={loadContext} title="Refresh store context" className="p-1.5 text-gray-400 hover:text-orange-500 rounded-lg hover:bg-gray-100 transition-colors">
                    <RefreshCw className={`w-3.5 h-3.5 ${contextLoading ? "animate-spin" : ""}`} />
                  </button>
                  <button onClick={() => setContextPanel(v => !v)} title="Toggle context panel" className="p-1.5 text-gray-400 hover:text-orange-500 rounded-lg hover:bg-gray-100 transition-colors">
                    <Layers className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 flex overflow-hidden">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-16">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center">
                        <Bot className="w-8 h-8 text-orange-500" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">TryNex AI Developer</h3>
                        <p className="text-sm text-gray-400 mt-1 max-w-sm">I know your full tech stack, can query live store data, write code, debug errors, and build features. Ask me anything.</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2 max-w-sm">
                        {QUICK_TEMPLATES.slice(0,4).map((t, i) => {
                          const Icon = t.icon;
                          return (
                            <button key={i} onClick={() => { sendMessage(t.prompt); }}
                              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-600 hover:border-orange-300 hover:text-orange-600 hover:bg-orange-50 transition-all shadow-sm">
                              <Icon className="w-3.5 h-3.5 text-orange-400" />{t.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {messages.map(msg => {
                    const isUser = msg.role === "user";
                    const isStreaminNow = !isUser && msg === messages[messages.length - 1] && isStreaming;
                    return (
                      <div key={msg.id} className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
                        <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${isUser ? "bg-orange-500 text-white" : "bg-gray-900 text-white"}`}>
                          {isUser ? "U" : <Bot className="w-3.5 h-3.5" />}
                        </div>
                        <div className={`max-w-[80%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
                          {/* Attached files */}
                          {msg.attachedFiles && msg.attachedFiles.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-1">
                              {msg.attachedFiles.map(f => <FileBadge key={f.id} file={f} />)}
                            </div>
                          )}
                          {/* Message bubble */}
                          <div className={`rounded-2xl px-4 py-3 shadow-sm ${isUser
                            ? "bg-orange-500 text-white rounded-tr-sm"
                            : `bg-white border rounded-tl-sm ${msg.error ? "border-red-200 bg-red-50" : "border-gray-200"}`}`}>
                            {isUser
                              ? <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                              : <div className="prose prose-sm max-w-none">{renderMarkdown(msg.content)}{isStreaminNow && <span className="inline-block w-1.5 h-4 bg-orange-500 ml-0.5 animate-pulse rounded-sm" />}</div>}
                          </div>
                          {/* Tool calls */}
                          {msg.toolCalls && msg.toolCalls.length > 0 && (
                            <div className="w-full">{msg.toolCalls.map(tc => <ToolCallBadge key={tc.id} tc={tc} />)}</div>
                          )}
                          {/* Meta */}
                          <div className={`flex items-center gap-2 px-1 ${isUser ? "flex-row-reverse" : ""}`}>
                            <span className="text-[10px] text-gray-400">{new Date(msg.timestamp).toLocaleTimeString("en-BD", { hour: "2-digit", minute: "2-digit" })}</span>
                            {!isUser && msg.provider && (
                              <span className="flex items-center gap-1 text-[10px] text-gray-400">
                                <ProviderDot color={providers.find(p => p.id === msg.provider)?.color ?? "#6366f1"} />
                                {providers.find(p => p.id === msg.provider)?.name ?? msg.provider}
                              </span>
                            )}
                            {!isUser && !isStreaminNow && (
                              <button onClick={() => navigator.clipboard.writeText(msg.content)} className="text-[10px] text-gray-400 hover:text-gray-600 transition-colors">
                                <Copy className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>

                {/* Context side panel */}
                {contextPanel && storeContext && (
                  <div className="w-64 flex-shrink-0 border-l border-gray-200 bg-white overflow-y-auto px-3 py-3">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-bold text-gray-700">Live Store Data</p>
                      <button onClick={loadContext} className="text-gray-400 hover:text-orange-500 transition-colors">
                        <RefreshCw className={`w-3.5 h-3.5 ${contextLoading ? "animate-spin" : ""}`} />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-2 mb-3">
                      <StatCard icon={Package} label="Products" value={storeContext.products.total} sub={`${storeContext.products.lowStock} low stock`} color="#E85D04" />
                      <StatCard icon={ShoppingCart} label="Orders" value={storeContext.orders.total} sub={`${storeContext.orders.pending} pending`} color="#6366f1" />
                      <StatCard icon={TrendingUp} label="Revenue" value={`৳${storeContext.orders.totalRevenue.toLocaleString()}`} sub="Recent orders" color="#10b981" />
                      <StatCard icon={Activity} label="Uptime" value={`${Math.floor(storeContext.health.uptime / 60)}m`} sub={`${storeContext.health.memoryMB}MB RAM`} color="#f59e0b" />
                    </div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Categories</p>
                    <div className="space-y-1">
                      {storeContext.categories.items.map((c: any) => (
                        <div key={c.id} className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded-lg text-xs">
                          <span className="flex-1 text-gray-700 font-medium">{c.name}</span>
                          <span className="text-gray-400">{c.productCount ?? "–"}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-3 text-center">{new Date(storeContext.health.timestamp).toLocaleTimeString()}</p>
                  </div>
                )}
              </div>

              {/* Input area */}
              <div className="bg-white border-t border-gray-200 px-4 py-3">
                {/* System prompt toggle */}
                <div className="flex items-center gap-2 mb-2">
                  <button onClick={() => setShowSysPrompt(v => !v)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-orange-500 transition-colors">
                    <Terminal className="w-3 h-3" />
                    <span>System prompt</span>
                    {showSysPrompt ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  <span className="text-xs text-gray-300">·</span>
                  <span className="text-xs text-gray-400">Temp: {temperature.toFixed(1)}</span>
                  <input type="range" min={0} max={1} step={0.05} value={temperature} onChange={e => setTemperature(Number(e.target.value))} className="w-20 h-1 accent-orange-500" />
                  <div className="flex-1" />
                  <button onClick={() => setShowTemplates(v => !v)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-orange-500 transition-colors">
                    <Lightbulb className="w-3 h-3" /> Templates
                  </button>
                </div>

                {showSysPrompt && (
                  <textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)}
                    className="w-full h-24 text-xs font-mono bg-gray-900 text-gray-100 rounded-lg p-3 mb-2 resize-none border-0 focus:ring-1 focus:ring-orange-500"
                    placeholder="System prompt…" />
                )}

                {showTemplates && (
                  <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
                    {QUICK_TEMPLATES.map((t, i) => {
                      const Icon = t.icon;
                      return (
                        <button key={i} onClick={() => { sendMessage(t.prompt); setShowTemplates(false); }} disabled={isStreaming}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:border-orange-300 hover:bg-orange-50 whitespace-nowrap flex-shrink-0 disabled:opacity-40">
                          <Icon className="w-3.5 h-3.5 text-orange-500" />{t.label}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Attached files */}
                {attachedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {attachedFiles.map(f => <FileBadge key={f.id} file={f} onRemove={() => setAttachedFiles(prev => prev.filter(x => x.id !== f.id))} />)}
                  </div>
                )}

                {/* Drop zone */}
                <div
                  onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`relative transition-all ${isDragging ? "ring-2 ring-orange-400 rounded-xl" : ""}`}
                >
                  {isDragging && (
                    <div className="absolute inset-0 flex items-center justify-center bg-orange-50 border-2 border-dashed border-orange-400 rounded-xl z-10">
                      <p className="text-sm font-medium text-orange-600"><Upload className="w-4 h-4 inline mr-1" />Drop files here</p>
                    </div>
                  )}
                  <div className="flex items-end gap-2">
                    <button onClick={() => fileRef.current?.click()} disabled={!features.fileUpload} title="Attach file"
                      className="flex-shrink-0 p-2.5 text-gray-400 hover:text-orange-500 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40">
                      <Upload className="w-4 h-4" />
                    </button>
                    <input ref={fileRef} type="file" multiple accept=".txt,.json,.csv,.ts,.tsx,.js,.jsx,.py,.md,image/*" className="hidden"
                      onChange={e => { if (e.target.files) handleFiles(e.target.files); e.target.value = ""; }} />
                    <div className="flex-1 relative">
                      <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
                        disabled={isStreaming} rows={1}
                        placeholder={isStreaming ? "AI is thinking…" : "Ask me to write code, debug, audit your store, or explain anything… (Enter to send)"}
                        className="w-full resize-none border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400 transition-all leading-relaxed"
                        style={{ minHeight: "48px", maxHeight: "160px" }} />
                    </div>
                    {isStreaming ? (
                      <button onClick={stopStream} className="flex-shrink-0 w-11 h-11 rounded-xl bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors shadow-sm">
                        <Square className="w-4 h-4 fill-white" />
                      </button>
                    ) : (
                      <button onClick={() => sendMessage()} disabled={!input.trim()}
                        className="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white flex items-center justify-center transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
                        <Send className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5 text-center">
                  {currentProvider?.name ?? "AI"} · {features.toolCalling ? "Tool calling enabled" : "Tool calling off"} · {features.contextInjection ? "Store context active" : "No context"}
                </p>
              </div>
            </>
          )}

          {/* Tab: CONTEXT */}
          {activeTab === "context" && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Live Store Context</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Real-time data injected into AI conversations</p>
                </div>
                <button onClick={loadContext} disabled={contextLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors shadow-sm disabled:opacity-60">
                  <RefreshCw className={`w-4 h-4 ${contextLoading ? "animate-spin" : ""}`} />
                  {contextLoading ? "Loading…" : "Refresh"}
                </button>
              </div>

              {!storeContext ? (
                <div className="flex items-center justify-center h-48 text-gray-400">
                  <div className="text-center">
                    <Database className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No context loaded yet</p>
                    <button onClick={loadContext} className="mt-2 text-orange-500 text-sm hover:underline">Load now</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-4 gap-4">
                    <StatCard icon={Package} label="Products" value={storeContext.products.total} sub={`${storeContext.products.lowStock} low stock`} color="#E85D04" />
                    <StatCard icon={ShoppingCart} label="Recent Orders" value={storeContext.orders.total} sub={`${storeContext.orders.pending} pending`} color="#6366f1" />
                    <StatCard icon={TrendingUp} label="Revenue" value={`৳${storeContext.orders.totalRevenue.toLocaleString()}`} sub="Recent total" color="#10b981" />
                    <StatCard icon={Activity} label="Server" value={`${storeContext.health.memoryMB}MB`} sub={`Up ${Math.floor(storeContext.health.uptime/60)}m`} color="#f59e0b" />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <h3 className="text-sm font-bold text-gray-900 mb-3">Products</h3>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {(storeContext.products.items as any[]).map((p: any) => (
                          <div key={p.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-xs">
                            <span className="flex-1 font-medium text-gray-800 truncate">{p.name}</span>
                            <span className="text-gray-500">৳{Number(p.price).toLocaleString()}</span>
                            <span className={`font-semibold ${p.stock <= 5 ? "text-red-500" : p.stock <= 10 ? "text-amber-500" : "text-green-600"}`}>{p.stock}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <h3 className="text-sm font-bold text-gray-900 mb-3">Recent Orders</h3>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {(storeContext.orders.recent as any[]).map((o: any) => (
                          <div key={o.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-xs">
                            <span className="font-mono text-gray-500">#{o.id}</span>
                            <span className={`px-1.5 py-0.5 rounded-full font-medium ${o.status === "delivered" ? "bg-green-100 text-green-700" : o.status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-blue-100 text-blue-700"}`}>{o.status}</span>
                            <span className="ml-auto font-medium text-gray-800">৳{Number(o.total).toLocaleString()}</span>
                          </div>
                        ))}
                        {storeContext.orders.recent.length === 0 && <p className="text-gray-400 text-xs text-center py-4">No orders yet</p>}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <h3 className="text-sm font-bold text-gray-900 mb-3">Store Settings</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(storeContext.settings).filter(([k]) => !k.includes("secret") && !k.includes("key") && !k.includes("token")).slice(0, 12).map(([k, v]) => (
                        <div key={k} className="flex items-start gap-2 px-3 py-2 bg-gray-50 rounded-lg text-xs">
                          <span className="text-gray-400 font-mono w-28 flex-shrink-0 truncate">{k}</span>
                          <span className="text-gray-700 font-medium truncate">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab: TOOLS */}
          {activeTab === "tools" && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Tool Call Log</h2>
                  <p className="text-sm text-gray-500 mt-0.5">AI-invoked store data tools and results</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={runAudit} disabled={auditLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-60">
                    <Activity className={`w-4 h-4 ${auditLoading ? "animate-spin" : ""}`} />
                    Run Full Audit
                  </button>
                  <button onClick={() => setToolLog([])} disabled={!toolLog.length}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-40">
                    <Trash2 className="w-4 h-4" /> Clear Log
                  </button>
                </div>
              </div>

              {auditResult && (
                <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
                  <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-purple-600" /> Audit Report
                  </h3>
                  <div className="prose prose-sm max-w-none">{renderMarkdown(auditResult)}</div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mb-6">
                {[
                  { tool: "get_stats", label: "Store Stats", icon: BarChart3 },
                  { tool: "check_health", label: "Health Check", icon: Activity },
                  { tool: "get_orders", label: "Recent Orders", icon: ShoppingCart, params: { limit: 10 } },
                  { tool: "get_low_stock", label: "Low Stock", icon: AlertCircle, params: { threshold: 10 } },
                  { tool: "get_categories", label: "Categories", icon: Layers },
                  { tool: "get_settings", label: "Settings", icon: Settings },
                ].map(({ tool, label, icon: Icon, params }) => (
                  <button key={tool} onClick={async () => {
                    const tc: ToolCall = { id: `manual-${Date.now()}`, tool, params: params ?? {}, status: "pending" };
                    setToolLog(prev => [...prev, tc]);
                    try {
                      const result = await executeTool(tool, params ?? {});
                      setToolLog(prev => prev.map(t => t.id === tc.id ? { ...t, result, status: "done" } : t));
                    } catch (err) {
                      setToolLog(prev => prev.map(t => t.id === tc.id ? { ...t, result: { error: String(err) }, status: "error" } : t));
                    }
                  }} className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700 transition-all shadow-sm">
                    <Icon className="w-4 h-4 text-purple-500" />
                    {label}
                    <ChevronRight className="w-3.5 h-3.5 ml-auto text-gray-300" />
                  </button>
                ))}
              </div>

              {toolLog.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-gray-400">
                  <div className="text-center">
                    <Wrench className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No tool calls yet — ask the AI or click a tool above</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {[...toolLog].reverse().map(tc => (
                    <div key={tc.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                      <ToolCallBadge tc={tc} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: SETTINGS */}
          {activeTab === "settings" && (
            <div className="flex-1 overflow-y-auto p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">AI Developer Settings</h2>

              <div className="space-y-6 max-w-2xl">
                {/* OpenAI API Key */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Key className="w-4 h-4 text-orange-500" />
                    <h3 className="text-sm font-bold text-gray-900">OpenAI API Key (Optional)</h3>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">Enter your key to use GPT-4o directly. Without a key, the system uses free providers automatically.</p>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input type={showOpenAIKey ? "text" : "password"} value={openAIKey} onChange={e => setOpenAIKey(e.target.value)}
                        placeholder="sk-…" className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 font-mono" />
                      <button onClick={() => setShowOpenAIKey(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showOpenAIKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {openAIKey && <button onClick={() => setOpenAIKey("")} className="px-3 py-2 bg-red-50 text-red-500 rounded-xl text-sm hover:bg-red-100 transition-colors"><X className="w-4 h-4" /></button>}
                  </div>
                  {openAIKey && <p className="text-xs text-green-600 mt-2 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Key set — GPT-4o will be used for next conversation</p>}
                </div>

                {/* Feature toggles */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-4 h-4 text-orange-500" />
                    <h3 className="text-sm font-bold text-gray-900">Feature Toggles</h3>
                  </div>
                  <div className="space-y-3">
                    {(Object.entries(features) as [keyof FeatureFlags, boolean][]).map(([key, val]) => {
                      const labels: Record<keyof FeatureFlags, string> = {
                        contextInjection: "Store Context Injection — Auto-injects live store data into AI context",
                        toolCalling: "Tool Calling — AI can query products, orders, stats in real-time",
                        streaming: "Streaming Responses — Real-time character-by-character AI output",
                        chatHistory: "Chat History — Save conversation in localStorage",
                        fileUpload: "File Upload — Attach files (images, code, JSON, CSV) to messages",
                        autoAudit: "Auto Audit — Run health check on every page load",
                      };
                      const [title, desc] = labels[key].split(" — ");
                      return (
                        <div key={key} className="flex items-start gap-3 py-2">
                          <button onClick={() => toggleFeature(key)} className="mt-0.5 flex-shrink-0">
                            {val
                              ? <div className="w-10 h-5 rounded-full bg-orange-500 relative"><div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm" /></div>
                              : <div className="w-10 h-5 rounded-full bg-gray-200 relative"><div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm" /></div>}
                          </button>
                          <div>
                            <p className="text-sm font-medium text-gray-800">{title}</p>
                            <p className="text-xs text-gray-500">{desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Temperature & System Prompt */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Brain className="w-4 h-4 text-orange-500" />
                    <h3 className="text-sm font-bold text-gray-900">AI Personality</h3>
                  </div>
                  <div className="mb-4">
                    <label className="text-xs font-medium text-gray-600 block mb-2">Temperature: {temperature.toFixed(2)} {temperature < 0.4 ? "(precise)" : temperature > 0.8 ? "(creative)" : "(balanced)"}</label>
                    <input type="range" min={0} max={1} step={0.05} value={temperature} onChange={e => setTemperature(Number(e.target.value))}
                      className="w-full h-2 rounded-full accent-orange-500" />
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1"><span>0 — Precise</span><span>0.5 — Balanced</span><span>1.0 — Creative</span></div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-2">System Prompt</label>
                    <textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} rows={8}
                      className="w-full text-xs font-mono bg-gray-900 text-gray-100 rounded-xl p-4 resize-none focus:outline-none focus:ring-2 focus:ring-orange-400 leading-relaxed" />
                    <button onClick={() => setSystemPrompt(TRYNEX_SYSTEM)} className="mt-2 text-xs text-orange-500 hover:underline">Reset to default</button>
                  </div>
                </div>

                {/* Provider status */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Globe className="w-4 h-4 text-orange-500" />
                    <h3 className="text-sm font-bold text-gray-900">Provider Status</h3>
                  </div>
                  <div className="space-y-2">
                    {providers.map(p => (
                      <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-lg">
                        <ProviderDot color={p.color} />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800">{p.name}</p>
                          <p className="text-xs text-gray-400">{p.tag}</p>
                        </div>
                        {p.available
                          ? <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full"><CheckCircle className="w-3 h-3" />Ready</span>
                          : <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"><Key className="w-3 h-3" />Needs key</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Click-away for dropdowns */}
      {(provDropOpen || modelDropOpen) && (
        <div className="fixed inset-0 z-40" onClick={() => { setProvDropOpen(false); setModelDropOpen(false); }} />
      )}
    </AdminLayout>
  );
}
