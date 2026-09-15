import { useEffect, useState, useRef, useCallback } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { getAuthHeaders, getApiUrl } from "@/lib/utils";
import {
  Eye, EyeOff, Search, Download, Upload, Copy, Check, RefreshCw, Save, Trash2,
  Shield, KeyRound, FileJson, FileText, Table, Lock, AlertTriangle, Filter
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

interface SecretEntry {
  key: string;
  value: string;
  isSensitive: boolean;
  isEditing: boolean;
  editValue: string;
  showValue: boolean;
}

export default function SecretsAdmin() {
  const [secrets, setSecrets] = useState<SecretEntry[]>([]);
  const [filtered, setFiltered] = useState<SecretEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showSensitive, setShowSensitive] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [onlySensitive, setOnlySensitive] = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [importText, setImportText] = useState("");
  const [importFormat, setImportFormat] = useState<"json" | "csv" | "env">("env");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const SENSITIVE_PATTERNS = [
    /password/i, /secret/i, /token/i, /key/i, /api_key/i, /apikey/i,
    /private/i, /credential/i, /auth/i, /salt/i, /jwt/i, /session/i,
    /cookie/i, /seed/i, /mnemonic/i, /hash/i, /pin/i, /otp/i,
    /totp/i, /passphrase/i, /bearer/i, /access_token/i, /refresh_token/i,
    /client_secret/i, /signing/i, /encryption/i, /decrypt/i, /sign/i,
    /github_token/i, /render_api/i, /cfut_/i, /r2_secret/i, /database_url/i,
    /redis_url/i, /upstash_redis/i, /telegram_bot_token/i,
  ];

  function isSensitiveKey(key: string): boolean {
    return SENSITIVE_PATTERNS.some(p => p.test(key));
  }

  async function fetchSecrets(raw = false, totp = "") {
    setLoading(true);
    try {
      const headers: Record<string, string> = { ...getAuthHeaders(), "Content-Type": "application/json" };
      if (raw && totp) headers["X-Admin-TOTP-Code"] = totp;
      const res = await fetch(getApiUrl(raw ? "/admin/secrets/raw" : "/admin/secrets"), { headers });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.message || "Failed to fetch secrets");
      }
      const data = await res.json();
      const entries: SecretEntry[] = Object.entries(data.secrets as Record<string, string>).map(
        ([key, value]) => ({
          key,
          value,
          isSensitive: isSensitiveKey(key),
          isEditing: false,
          editValue: value,
          showValue: false,
        })
      );
      setSecrets(entries);
      if (raw) setShowSensitive(true);
    } catch (err: any) {
      setShowSensitive(false);
      toast({ title: "Error", description: err.message || "Failed to load secrets", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSecrets();
  }, []);

  useEffect(() => {
    let result = secrets;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(s => s.key.toLowerCase().includes(q) || s.value.toLowerCase().includes(q));
    }
    if (onlySensitive) {
      result = result.filter(s => s.isSensitive);
    }
    setFiltered(result);
  }, [secrets, search, onlySensitive]);

  async function updateSecret(key: string, value: string) {
    setSavingKey(key);
    try {
      const res = await fetch(getApiUrl("/admin/secrets/update"), {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) throw new Error("Update failed");
      const data = await res.json();
      toast({ title: "Updated", description: `${key} saved successfully` });
      setSecrets(prev => prev.map(s => s.key === key ? { ...s, value: data.masked || value, editValue: value, isEditing: false } : s));
    } catch (err) {
      toast({ title: "Error", description: "Failed to update secret", variant: "destructive" });
    } finally {
      setSavingKey(null);
    }
  }

  async function bulkUpdate(updates: Record<string, string>) {
    try {
      const res = await fetch(getApiUrl("/admin/secrets/bulk-update"), {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ secrets: updates }),
      });
      if (!res.ok) throw new Error("Bulk update failed");
      const data = await res.json();
      toast({ title: "Bulk Update", description: `${data.count} secrets updated` });
      fetchSecrets();
    } catch (err) {
      toast({ title: "Error", description: "Failed to bulk update", variant: "destructive" });
    }
  }

  function exportAs(format: "json" | "csv" | "env") {
    const visible = secrets.filter(s => !s.isSensitive || showSensitive);
    let content = "";
    let filename = "";
    let mime = "";

    if (format === "json") {
      const obj = Object.fromEntries(visible.map(s => [s.key, s.value]));
      content = JSON.stringify(obj, null, 2);
      filename = "trynext-secrets.json";
      mime = "application/json";
    } else if (format === "csv") {
      content = "Key,Value\n" + visible.map(s => `${JSON.stringify(s.key)},${JSON.stringify(s.value)}`).join("\n");
      filename = "trynext-secrets.csv";
      mime = "text/csv";
    } else {
      content = visible.map(s => `${s.key}=${s.value}`).join("\n");
      filename = "trynext-secrets.env";
      mime = "text/plain";
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: `${filename} downloaded` });
  }

  function parseImport(text: string, format: "json" | "csv" | "env"): Record<string, string> {
    const result: Record<string, string> = {};
    try {
      if (format === "json") {
        const parsed = JSON.parse(text);
        if (typeof parsed === "object" && parsed !== null) {
          for (const [k, v] of Object.entries(parsed)) {
            if (typeof v === "string") result[k] = v;
          }
        }
      } else if (format === "csv") {
        const lines = text.trim().split("\n");
        for (const line of lines.slice(1)) {
          const parts = line.split(",");
          if (parts.length >= 2) {
            const key = parts[0].replace(/^"|"$/g, "");
            const value = parts.slice(1).join(",").replace(/^"|"$/g, "");
            result[key] = value;
          }
        }
      } else {
        const lines = text.trim().split("\n");
        for (const line of lines) {
          const eq = line.indexOf("=");
          if (eq > 0) {
            const key = line.slice(0, eq).trim();
            const value = line.slice(eq + 1).trim();
            result[key] = value;
          }
        }
      }
    } catch (e) {
      toast({ title: "Parse Error", description: "Could not parse import data", variant: "destructive" });
    }
    return result;
  }

  function handleImport() {
    const parsed = parseImport(importText, importFormat);
    if (Object.keys(parsed).length === 0) return;
    bulkUpdate(parsed);
    setImportModal(false);
    setImportText("");
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      setImportText(text);
      // Auto-detect format
      if (text.trim().startsWith("{")) setImportFormat("json");
      else if (text.includes("=") && !text.includes("\"Key\"")) setImportFormat("env");
      else setImportFormat("csv");
      setImportModal(true);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function maskValue(value: string, key: string): string {
    if (!isSensitiveKey(key)) return value;
    if (value.length <= 8) return "*".repeat(value.length);
    return value.slice(0, 3) + "*".repeat(Math.max(4, value.length - 6)) + value.slice(-3);
  }

  const stats = {
    total: secrets.length,
    sensitive: secrets.filter(s => s.isSensitive).length,
    visible: filtered.length,
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <Shield className="w-6 h-6 text-orange-500" />
              Secrets Manager
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              View, edit, and manage all environment variables. Sensitive values are masked by default.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchSecrets(showSensitive, totpCode)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            {showSensitive ? (
              <button
                onClick={() => { setShowSensitive(false); setTotpCode(""); fetchSecrets(false); }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold border transition-colors bg-orange-50 border-orange-200 text-orange-600"
              >
                <Eye className="w-4 h-4" /> Hide Values
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  value={totpCode}
                  onChange={e => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="TOTP"
                  inputMode="numeric"
                  maxLength={6}
                  className="w-20 px-2 py-2 rounded-xl text-sm border border-gray-200 outline-none focus:border-orange-400 text-center font-mono tracking-widest"
                />
                <button
                  onClick={() => {
                    if (!/^\d{6}$/.test(totpCode)) {
                      toast({ title: "TOTP required", description: "Enter the 6-digit code from your authenticator app", variant: "destructive" });
                      return;
                    }
                    fetchSecrets(true, totpCode);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <EyeOff className="w-4 h-4" /> Show Values
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-xs font-black uppercase tracking-wider text-gray-400">Total Variables</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-xs font-black uppercase tracking-wider text-gray-400">Sensitive</p>
            <p className="text-2xl font-black text-orange-600 mt-1">{stats.sensitive}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-xs font-black uppercase tracking-wider text-gray-400">Visible</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{stats.visible}</p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search variables by name or value..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm border border-gray-200 outline-none focus:border-orange-400"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setOnlySensitive(!onlySensitive)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold border transition-colors ${onlySensitive ? "bg-orange-50 border-orange-200 text-orange-600" : "border-gray-200 hover:bg-gray-50"}`}
            >
              <Filter className="w-4 h-4" /> Sensitive Only
            </button>
            <div className="h-6 w-px bg-gray-200" />
            <button onClick={() => exportAs("json")} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold border border-gray-200 hover:bg-gray-50 transition-colors">
              <FileJson className="w-4 h-4" /> JSON
            </button>
            <button onClick={() => exportAs("csv")} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold border border-gray-200 hover:bg-gray-50 transition-colors">
              <Table className="w-4 h-4" /> CSV
            </button>
            <button onClick={() => exportAs("env")} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold border border-gray-200 hover:bg-gray-50 transition-colors">
              <FileText className="w-4 h-4" /> .env
            </button>
            <div className="h-6 w-px bg-gray-200" />
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold text-white transition-colors"
              style={{ background: "linear-gradient(135deg,#E85D04,#FB8500)" }}>
              <Upload className="w-4 h-4" /> Import
            </button>
            <input ref={fileInputRef} type="file" accept=".env,.txt,.json,.csv" className="hidden" onChange={handleFileUpload} />
          </div>
        </div>

        {/* Warning banner */}
        {showSensitive && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-center gap-2 text-sm font-bold text-amber-700"
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Sensitive values are visible. Do not share or export this data.
          </motion.div>
        )}

        {/* Table */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400 mb-3" />
            <p className="text-sm font-bold text-gray-500">Loading secrets...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <Search className="w-8 h-8 mx-auto text-gray-300 mb-3" />
            <p className="text-sm font-bold text-gray-500">No variables match your search</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-400 w-12">#</th>
                    <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-400">Key</th>
                    <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-400">Value</th>
                    <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-400 w-32">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, i) => (
                    <tr key={s.key} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-xs font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded-lg">{s.key}</code>
                          {s.isSensitive && (
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600">SENSITIVE</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {s.isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              value={s.editValue}
                              onChange={e => setSecrets(prev => prev.map(p => p.key === s.key ? { ...p, editValue: e.target.value } : p))}
                              className="flex-1 min-w-0 px-3 py-1.5 rounded-lg text-xs font-mono border border-orange-300 outline-none focus:ring-2 focus:ring-orange-100"
                              autoFocus
                            />
                            <button
                              onClick={() => updateSecret(s.key, s.editValue)}
                              disabled={savingKey === s.key}
                              className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors"
                            >
                              {savingKey === s.key ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => setSecrets(prev => prev.map(p => p.key === s.key ? { ...p, isEditing: false, editValue: p.value } : p))}
                              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <code className="font-mono text-xs text-gray-600 truncate max-w-[300px] block">
                              {s.isSensitive && !showSensitive ? maskValue(s.value, s.key) : s.value}
                            </code>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(s.value);
                                toast({ title: "Copied", description: `${s.key} copied to clipboard` });
                              }}
                              className="p-1 rounded text-gray-400 hover:text-gray-600 transition-colors"
                              title="Copy value"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setSecrets(prev => prev.map(p => p.key === s.key ? { ...p, isEditing: !p.isEditing, editValue: p.value } : p))}
                            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                            title="Edit"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                          {s.isSensitive && (
                            <button
                              onClick={() => setSecrets(prev => prev.map(p => p.key === s.key ? { ...p, showValue: !p.showValue } : p))}
                              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                              title={s.showValue ? "Hide" : "Show"}
                            >
                              {s.showValue ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Import Modal */}
        <AnimatePresence>
          {importModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setImportModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.97, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 20 }}
                className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-black text-gray-900">Import Secrets</h2>
                  <button onClick={() => setImportModal(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex gap-2 mb-3">
                  {(["env", "json", "csv"] as const).map(fmt => (
                    <button
                      key={fmt}
                      onClick={() => setImportFormat(fmt)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${importFormat === fmt ? "bg-orange-50 border-orange-200 text-orange-600" : "border-gray-200 hover:bg-gray-50"}`}
                    >
                      {fmt.toUpperCase()}
                    </button>
                  ))}
                </div>
                <textarea
                  value={importText}
                  onChange={e => setImportText(e.target.value)}
                  className="w-full h-48 px-3 py-2 rounded-xl text-xs font-mono border border-gray-200 outline-none focus:border-orange-400 resize-none"
                  placeholder={importFormat === "json" ? '{"KEY": "value"}' : importFormat === "csv" ? "Key,Value\nKEY,value" : "KEY=value\nKEY2=value2"}
                />
                <div className="flex items-center gap-2 mt-4">
                  <button
                    onClick={handleImport}
                    className="flex-1 py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(135deg,#E85D04,#FB8500)" }}
                  >
                    <Upload className="w-4 h-4" /> Import & Save
                  </button>
                  <button
                    onClick={() => setImportModal(false)}
                    className="px-4 py-3 rounded-xl text-sm font-bold text-gray-500 border border-gray-200 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
}
