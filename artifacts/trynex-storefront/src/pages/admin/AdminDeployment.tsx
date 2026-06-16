import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { getApiUrl, getAuthHeaders } from "@/lib/utils";
import {
  GitBranch, Github, Save, Rocket, Loader2, CheckCircle2, AlertCircle,
  Eye, EyeOff, Trash2, Clock, ExternalLink, Copy, Check, Zap, Info, Shield, Server, RefreshCw, ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PlatformInfo {
  apiPublicUrl: string | null;
  allowedOrigins: string | null;
  nodeEnv: string;
  isProduction: boolean;
  checkedAt: string;
}

interface SystemHealth {
  db: { status: string; latencyMs: number };
  redis: { status: string };
  storage: { status: string; backend: string };
  telegram: { status: string };
}

interface EnvStatus {
  envVars: Record<string, boolean>;
}

interface DeploymentStatus {
  configured: boolean;
  owner: string;
  repo: string;
  branch: string;
  authorName: string;
  authorEmail: string;
  tokenMasked: string;
  lastPushAt: string | null;
  lastPushSha: string | null;
  lastPushMessage: string | null;
  renderDeployHookSet: boolean;
}

interface PushResult {
  success: boolean;
  committed: boolean;
  sha: string;
  shortSha: string;
  branch: string;
  pushedAt: string;
  message: string;
  log: string;
}

interface TriggerResult {
  success: boolean;
  triggeredAt: string;
}

export default function AdminDeployment() {
  const [platformInfo, setPlatformInfo] = useState<PlatformInfo | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [envStatus, setEnvStatus] = useState<EnvStatus | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [flushingCache, setFlushingCache] = useState(false);
  const [showLegacy, setShowLegacy] = useState(false);

  const [status, setStatus] = useState<DeploymentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [error, setError] = useState("");
  const [saveOk, setSaveOk] = useState(false);
  const [pushResult, setPushResult] = useState<PushResult | null>(null);
  const [triggerResult, setTriggerResult] = useState<TriggerResult | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState(false);

  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [branch, setBranch] = useState("main");
  const [token, setToken] = useState("");
  const [authorName, setAuthorName] = useState("TryNex Admin");
  const [authorEmail, setAuthorEmail] = useState("admin@trynex.local");
  const [renderDeployHook, setRenderDeployHook] = useState("");
  const [commitMessage, setCommitMessage] = useState("chore: deploy from TryNex admin");

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const [depRes, platformRes, envRes] = await Promise.all([
        fetch(getApiUrl("/api/admin/deployment/status"), { headers: getAuthHeaders() }),
        fetch(getApiUrl("/api/admin/deployment/platform-info"), { headers: getAuthHeaders() }),
        fetch(getApiUrl("/api/admin/system/env-status"), { headers: getAuthHeaders() }),
      ]);

      if (depRes.ok) {
        const data: DeploymentStatus = await depRes.json();
        setStatus(data);
        setOwner(data.owner);
        setRepo(data.repo);
        setBranch(data.branch || "main");
        setAuthorName(data.authorName);
        setAuthorEmail(data.authorEmail);
        if (data.tokenMasked) setToken(data.tokenMasked);
      }

      if (platformRes.ok) {
        setPlatformInfo(await platformRes.json());
      }

      if (envRes.ok) {
        setEnvStatus(await envRes.json());
      }
    } catch (e: any) {
      setError(e.message || "Failed to load");
    }
    setLoading(false);
  };

  const checkHealth = async () => {
    setCheckingHealth(true);
    try {
      const r = await fetch(getApiUrl("/api/admin/system/health"), { headers: getAuthHeaders() });
      if (r.ok) setHealth(await r.json());
    } catch (e) {}
    setCheckingHealth(false);
  };

  const flushCache = async () => {
    if (!confirm("Flush all cached data? This may temporarily slow down the site.")) return;
    setFlushingCache(true);
    try {
      const r = await fetch(getApiUrl("/api/admin/system/flush-cache"), { 
        method: "POST", 
        headers: getAuthHeaders() 
      });
      if (r.ok) alert("Cache flush command sent successfully.");
    } catch (e) {}
    setFlushingCache(false);
  };

  useEffect(() => {
    void fetchStatus();
    const onFocus = () => void fetchStatus();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaveOk(false);
    if (!owner.trim() || !repo.trim()) {
      setError("Owner and repo are required");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, string> = { owner, repo, branch, authorName, authorEmail };
      if (token && !/^•+/.test(token)) body.token = token;
      // Only send the hook if the user typed something (empty = clear it)
      body.renderDeployHook = renderDeployHook.trim();
      const r = await fetch(getApiUrl("/api/admin/deployment/config"), {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || "Save failed");
      setSaveOk(true);
      setRenderDeployHook(""); // clear after save (it's write-only)
      setTimeout(() => setSaveOk(false), 3000);
      await fetchStatus();
    } catch (e: any) {
      setError(e.message || "Save failed");
    }
    setSaving(false);
  };

  const handlePush = async () => {
    setError("");
    setPushResult(null);
    setTriggerResult(null);
    if (!status?.configured) {
      setError("Configure your GitHub credentials first");
      return;
    }
    setPushing(true);
    try {
      const r = await fetch(getApiUrl("/api/admin/deployment/push"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ message: commitMessage }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || "Push failed");
      setPushResult(data);
      await fetchStatus();
    } catch (e: any) {
      setError(e.message || "Push failed");
    }
    setPushing(false);
  };

  const handleTrigger = async () => {
    setError("");
    setPushResult(null);
    setTriggerResult(null);
    setTriggering(true);
    try {
      const r = await fetch(getApiUrl("/api/admin/deployment/trigger"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || "Trigger failed");
      setTriggerResult(data);
    } catch (e: any) {
      setError(e.message || "Trigger failed");
    }
    setTriggering(false);
  };

  const handleClearToken = async () => {
    if (!confirm("Remove the saved GitHub token? You'll need to enter it again to push.")) return;
    setSaving(true);
    try {
      await fetch(getApiUrl("/api/admin/deployment/token"), { method: "DELETE", headers: getAuthHeaders() });
      setToken("");
      await fetchStatus();
    } finally { setSaving(false); }
  };

  const copySha = async () => {
    if (!pushResult?.sha) return;
    await navigator.clipboard.writeText(pushResult.sha);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const repoUrl = status?.owner && status?.repo ? `https://github.com/${status.owner}/${status.repo}` : "";

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-md"
              style={{ background: "linear-gradient(135deg,#0A1628,#1e2937)" }}
            >
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black font-display text-gray-900">Deployment & System</h1>
              <p className="text-sm text-gray-500">Manage your deployment and system health.</p>
            </div>
          </div>
        </motion.div>

        {/* SYSTEM STATUS SECTION */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-orange-500" />
              <h2 className="font-bold text-gray-900">System Status</h2>
            </div>
            <span className="text-[10px] font-black tracking-wider px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
              {platformInfo?.isProduction ? "PRODUCTION" : "DEVELOPMENT"}
            </span>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</label>
                <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Server Online
                </div>
              </div>

              {platformInfo?.apiPublicUrl && (
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">API Public URL</label>
                  <a href={platformInfo.apiPublicUrl} target="_blank" rel="noreferrer"
                    className="text-xs font-mono bg-gray-100 px-2 py-1 rounded hover:text-orange-600 flex items-center gap-1 w-fit">
                    {platformInfo.apiPublicUrl} <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              <div className="pt-2 flex flex-wrap gap-3">
                <button
                  onClick={checkHealth}
                  disabled={checkingHealth}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-black transition-colors disabled:opacity-50"
                >
                  {checkingHealth ? <Loader2 className="w-3 h-3 animate-spin" /> : <Server className="w-3 h-3" />}
                  Check System Health
                </button>
                <button
                  onClick={flushCache}
                  disabled={flushingCache}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-100 text-orange-700 text-xs font-bold hover:bg-orange-200 transition-colors disabled:opacity-50"
                >
                  {flushingCache ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  Flush Cache
                </button>
              </div>
            </div>

            <div className="space-y-4 bg-gray-50 rounded-xl p-4 border border-gray-100">
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">Environment Variables</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {envStatus?.envVars && Object.entries(envStatus.envVars).map(([key, set]) => (
                  <div key={key} className="flex items-center justify-between text-[11px]">
                    <span className="font-mono text-gray-600 truncate mr-2" title={key}>{key}</span>
                    {set ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <AnimatePresence>
            {health && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-6 pb-6"
              >
                <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Database</div>
                    <div className="text-sm font-bold text-blue-900 flex items-center gap-1.5">
                      {health.db.status === "ok" ? "Connected" : "Error"}
                      <span className="text-[10px] font-normal text-blue-600">{health.db.latencyMs}ms</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Redis Cache</div>
                    <div className="text-sm font-bold text-blue-900 capitalize">{health.redis.status}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Object Storage</div>
                    <div className="text-sm font-bold text-blue-900 flex items-center gap-1.5 uppercase">
                      {health.storage.backend}
                      <span className="text-[10px] font-normal text-blue-600">{health.storage.status}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Telegram Bot</div>
                    <div className="text-sm font-bold text-blue-900 capitalize">{health.telegram.status}</div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="text-sm text-red-700 font-medium whitespace-pre-wrap break-words">{error}</div>
          </div>
        )}

        {/* CONFIG CARD */}
        <motion.form
          onSubmit={handleSave}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-900">GitHub Repository</h2>
              <p className="text-xs text-gray-500 mt-0.5">Stored securely in your database. Never sent back to the browser.</p>
            </div>
            {status?.configured && (
              <span className="text-[10px] font-black tracking-wider px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> CONFIGURED
              </span>
            )}
          </div>

          {loading ? (
            <div className="p-12 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
            </div>
          ) : (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Owner / Org</label>
                <input
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  placeholder="your-github-username"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-sm font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Repository</label>
                <input
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  placeholder="trynex-lifestyle"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-sm font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Branch</label>
                <input
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="main"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-sm font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                  Personal Access Token
                  <a
                    href="https://github.com/settings/tokens?type=beta"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1.5 text-orange-600 hover:underline normal-case font-semibold"
                  >
                    (Get one →)
                  </a>
                </label>
                <div className="relative">
                  <input
                    type={showToken ? "text" : "password"}
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="github_pat_…  (needs Contents: Read & Write)"
                    autoComplete="new-password"
                    className="w-full pl-4 pr-20 py-2.5 rounded-xl border border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-sm font-mono"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowToken((p) => !p)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                      aria-label={showToken ? "Hide token" : "Show token"}
                    >
                      {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    {status?.tokenMasked && (
                      <button
                        type="button"
                        onClick={handleClearToken}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50"
                        aria-label="Clear saved token"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Commit Author Name</label>
                <input
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-sm font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Commit Author Email</label>
                <input
                  type="email"
                  value={authorEmail}
                  onChange={(e) => setAuthorEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-sm font-medium"
                />
              </div>

              {/* Render deploy hook — write-only field */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  Render Deploy Hook URL
                  <span className="normal-case font-semibold text-gray-400">(optional)</span>
                  {status?.renderDeployHookSet && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 text-[9px] font-black tracking-wider">SET</span>
                  )}
                </label>
                <input
                  type="password"
                  value={renderDeployHook}
                  onChange={(e) => setRenderDeployHook(e.target.value)}
                  placeholder={status?.renderDeployHookSet ? "••• already saved — paste new URL to update, leave blank to keep" : "https://api.render.com/deploy/srv-…"}
                  autoComplete="off"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-sm font-mono"
                />
                <p className="mt-1 text-[11px] text-gray-400">
                  Find this in your Render service → Settings → Deploy Hook. Used by the "Trigger Render Deploy" button below.
                </p>
              </div>

              <div className="md:col-span-2 flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white text-sm shadow-md disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #E85D04, #FB8500)" }}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Settings
                </button>
                {saveOk && (
                  <span className="text-sm font-semibold text-green-600 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Saved
                  </span>
                )}
                {repoUrl && (
                  <a
                    href={repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-orange-600"
                  >
                    Open repo on GitHub <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          )}
        </motion.form>

        {/* PUSH CARD */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <Rocket className="w-4 h-4 text-orange-500" />
              Push to GitHub
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Stages all current changes, commits, and pushes to <span className="font-mono font-bold">{branch || "main"}</span>.{" "}
              <span className="text-amber-600 font-semibold">GitHub token must be configured in repo settings below.</span>
            </p>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Commit Message</label>
              <input
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-sm font-medium"
                maxLength={200}
              />
            </div>

            <button
              onClick={handlePush}
              disabled={pushing || !status?.configured}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-black text-white text-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: pushing
                ? "linear-gradient(135deg, #6b7280, #4b5563)"
                : "linear-gradient(135deg, #16a34a, #15803d)" }}
            >
              {pushing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Pushing…</>
              ) : (
                <><GitBranch className="w-4 h-4" /> Push to GitHub Now</>
              )}
            </button>

            {!status?.configured && (
              <p className="text-xs text-amber-600 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" /> Save your repo settings (with a token) above first.
              </p>
            )}

            {status?.lastPushAt && !pushResult && (
              <div className="text-xs text-gray-500 flex items-center gap-1.5 pt-1">
                <Clock className="w-3.5 h-3.5" />
                Last push:&nbsp;
                <span className="font-semibold text-gray-700">
                  {new Date(status.lastPushAt).toLocaleString("en-BD")}
                </span>
                {status.lastPushSha && (
                  <span className="font-mono text-gray-400">· {status.lastPushSha.slice(0, 7)}</span>
                )}
              </div>
            )}

            {pushResult && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-3"
              >
                <div className="flex items-center gap-2 text-green-800 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  {pushResult.committed ? "Pushed successfully!" : "Branch up-to-date — nothing to commit."}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <div className="text-[10px] font-bold text-green-700 uppercase tracking-wider">Branch</div>
                    <div className="font-mono font-bold text-gray-900">{pushResult.branch}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-green-700 uppercase tracking-wider">Commit</div>
                    <button type="button" onClick={copySha} className="font-mono font-bold text-gray-900 inline-flex items-center gap-1 hover:text-orange-600">
                      {pushResult.shortSha}
                      {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3 opacity-50" />}
                    </button>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-green-700 uppercase tracking-wider">Pushed at</div>
                    <div className="font-semibold text-gray-900">{new Date(pushResult.pushedAt).toLocaleTimeString("en-BD")}</div>
                  </div>
                </div>
                <details className="text-xs">
                  <summary className="cursor-pointer font-semibold text-green-700 hover:text-green-800">View git log</summary>
                  <pre className="mt-2 p-3 rounded-lg bg-gray-900 text-green-300 overflow-x-auto text-[11px] font-mono whitespace-pre-wrap">{pushResult.log}</pre>
                </details>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* RENDER DEPLOY TRIGGER CARD */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button
            onClick={() => setShowLegacy(!showLegacy)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2 text-gray-400">
              <Zap className="w-4 h-4" />
              <h2 className="font-bold">Legacy / External Deploy (Render)</h2>
            </div>
            <ChevronDown className={`w-5 h-5 text-gray-300 transition-transform ${showLegacy ? "rotate-180" : ""}`} />
          </button>
          
          <AnimatePresence>
            {showLegacy && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-6 pt-0 space-y-4">
                  <p className="text-xs text-gray-500">
                    Instantly trigger a new Render deployment from the latest GitHub commit.
                  </p>
                  
                  {!status?.renderDeployHookSet ? (
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                      <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-amber-700">
                        No Render deploy hook saved yet. Add it in the settings above.
                      </p>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={handleTrigger}
                        disabled={triggering}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-black text-white text-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ background: triggering
                          ? "linear-gradient(135deg, #6b7280, #4b5563)"
                          : "linear-gradient(135deg, #7c3aed, #6d28d9)" }}
                      >
                        {triggering ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Triggering…</>
                        ) : (
                          <><Zap className="w-4 h-4" /> Trigger Render Deploy Now</>
                        )}
                      </button>

                      {triggerResult && (
                        <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-bold text-purple-900">Deployment Triggered!</p>
                            <p className="text-xs text-purple-700 mt-0.5">
                              Render is now building your latest commit. This typically takes 2-4 minutes.
                            </p>
                            <p className="text-[10px] text-purple-400 mt-2 font-mono uppercase tracking-widest">
                              Triggered at: {new Date(triggerResult.triggeredAt).toLocaleString("en-BD")}
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="text-xs text-gray-400 leading-relaxed bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-1">
          <p><strong className="text-gray-600">System Health:</strong> Use "Check System Health" to verify DB, Redis, and R2 connectivity at any time.</p>
          <p><strong className="text-gray-600">Push to GitHub:</strong> Configure your GitHub repo and token below, then use the push button to sync changes.</p>
        </div>
      </div>
    </AdminLayout>
  );
}
