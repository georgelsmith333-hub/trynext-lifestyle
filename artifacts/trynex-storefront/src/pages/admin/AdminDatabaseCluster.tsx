import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { getAuthHeaders, getApiUrl } from "@/lib/utils";
import {
  Database, RefreshCw, CheckCircle2, XCircle, Clock,
  AlertTriangle, Zap, Shield, Link2, Activity,
} from "lucide-react";

/* ── Types (mirror backend) ──────────────────────────────────────────────── */
interface DbNodeStatus {
  id: string;
  label: string;
  role: string;
  host: string;
  inFailoverChain: boolean;
  failoverPriority: number | null;
  status: "ok" | "error" | "timeout" | "unconfigured";
  latencyMs: number | null;
  isActive: boolean;
  schemaStatus: "transactional" | "catalog" | "incomplete" | "unknown";
  error?: string;
};

interface ClusterResponse {
  checkedAt: string;
  activeHost: string;
  totalNodes: number;
  healthyNodes: number;
  nodes: DbNodeStatus[];
}

/* ── Status helpers ──────────────────────────────────────────────────────── */
function StatusDot({ status }: { status: DbNodeStatus["status"] }) {
  if (status === "ok")
    return (
      <span className="relative flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
      </span>
    );
  if (status === "timeout")
    return <span className="h-3 w-3 rounded-full bg-yellow-400 block" />;
  if (status === "error")
    return <span className="h-3 w-3 rounded-full bg-red-500 block" />;
  return <span className="h-3 w-3 rounded-full bg-gray-600 block" />;
}

function statusLabel(s: DbNodeStatus["status"]) {
  return { ok: "Online", error: "Error", timeout: "Timeout", unconfigured: "Not Set" }[s];
}

function statusColor(s: DbNodeStatus["status"]) {
  return {
    ok: "text-emerald-400",
    error: "text-red-400",
    timeout: "text-yellow-400",
    unconfigured: "text-gray-500",
  }[s];
}

function latencyColor(ms: number) {
  if (ms < 100) return "text-emerald-400";
  if (ms < 300) return "text-yellow-400";
  return "text-red-400";
}

/* ── Chain node card ─────────────────────────────────────────────────────── */
function ChainCard({
  node,
  index,
  total,
}: {
  node: DbNodeStatus;
  index: number;
  total: number;
}) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`
          relative w-full rounded-xl border p-4 transition-all duration-300
          ${node.isActive
            ? "border-orange-500/60 bg-orange-500/10 shadow-lg shadow-orange-500/10"
            : node.status === "ok"
            ? "border-emerald-500/30 bg-emerald-500/5"
            : node.status === "unconfigured"
            ? "border-gray-700/50 bg-gray-900/30 opacity-50"
            : "border-red-500/30 bg-red-500/5"
          }
        `}
      >
        {/* Active badge */}
        {node.isActive && (
          <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wider uppercase">
            Active
          </div>
        )}

        {/* Priority badge */}
        {node.failoverPriority && (
          <div className="absolute -top-2.5 right-3 bg-gray-800 border border-gray-600 text-gray-400 text-[10px] font-mono px-2 py-0.5 rounded-full">
            #{node.failoverPriority}
          </div>
        )}

        <div className="flex items-start gap-3">
          <div className={`mt-0.5 p-2 rounded-lg ${node.isActive ? "bg-orange-500/20" : "bg-gray-800"}`}>
            <Database className={`w-4 h-4 ${node.isActive ? "text-orange-400" : "text-gray-400"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <StatusDot status={node.status} />
              <span className="text-sm font-semibold text-white truncate">{node.label}</span>
            </div>
            <p className="text-[11px] text-gray-500 mb-2 leading-tight">{node.role}</p>
            <span className={`inline-flex mb-2 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${node.schemaStatus === "transactional" ? "bg-emerald-500/10 text-emerald-300" : node.schemaStatus === "catalog" ? "bg-blue-500/10 text-blue-300" : "bg-red-500/10 text-red-300"}`}>
              {node.schemaStatus === "transactional" ? "Transactional schema" : node.schemaStatus === "catalog" ? "Catalog schema" : node.schemaStatus === "incomplete" ? "Incomplete schema" : "Schema unknown"}
            </span>
            <div className="font-mono text-[10px] text-gray-600 bg-gray-900/50 rounded px-2 py-1 truncate mb-2">
              {node.host}
            </div>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold ${statusColor(node.status)}`}>
                {statusLabel(node.status)}
              </span>
              {node.latencyMs !== null && (
                <span className={`text-xs font-mono font-bold ${latencyColor(node.latencyMs)}`}>
                  {node.latencyMs}ms
                </span>
              )}
              {node.status === "error" && node.error && (
                <span className="text-[10px] text-red-400 truncate max-w-[120px]" title={node.error}>
                  {node.error}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Arrow connector */}
      {index < total - 1 && (
        <div className="flex flex-col items-center my-1 text-gray-600">
          <div className="h-3 w-px bg-gray-700" />
          <span className="text-[9px] font-mono text-gray-600 leading-none">failover</span>
          <div className="h-3 w-px bg-gray-700" />
          <svg width="8" height="5" viewBox="0 0 8 5" fill="none">
            <path d="M4 5L0 0H8L4 5Z" fill="#4B5563" />
          </svg>
        </div>
      )}
    </div>
  );
}

/* ── Satellite card (Products / Analytics) ───────────────────────────────── */
function SatelliteCard({ node }: { node: DbNodeStatus }) {
  return (
    <div
      className={`
        rounded-xl border p-4 transition-all duration-300
        ${node.status === "ok"
          ? "border-blue-500/30 bg-blue-500/5"
          : node.status === "unconfigured"
          ? "border-gray-700/50 bg-gray-900/30 opacity-50"
          : "border-red-500/30 bg-red-500/5"
        }
      `}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 p-2 rounded-lg bg-gray-800">
          <Database className="w-4 h-4 text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <StatusDot status={node.status} />
            <span className="text-sm font-semibold text-white">{node.label}</span>
          </div>
          <p className="text-[11px] text-gray-500 mb-2 leading-tight">{node.role}</p>
          <div className="font-mono text-[10px] text-gray-600 bg-gray-900/50 rounded px-2 py-1 truncate mb-2">
            {node.host}
          </div>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${statusColor(node.status)}`}>
              {statusLabel(node.status)}
            </span>
            {node.latencyMs !== null && (
              <span className={`text-xs font-mono font-bold ${latencyColor(node.latencyMs)}`}>
                {node.latencyMs}ms
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Summary stat card ───────────────────────────────────────────────────── */
function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className={`inline-flex p-2 rounded-lg bg-gray-800 mb-3`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div className="text-2xl font-bold text-white mb-0.5">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */
export default function AdminDatabaseCluster() {
  const [data, setData] = useState<ClusterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(30);

  const fetchStatus = useCallback(async (bust = false) => {
    try {
      setRefreshing(true);
      setError(null);
      const url = bust
        ? getApiUrl("/api/admin/db-cluster/refresh")
        : getApiUrl("/api/admin/db-cluster");
      const resp = await fetch(url, {
        method: bust ? "POST" : "GET",
        headers: getAuthHeaders(),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json: ClusterResponse = await resp.json();
      setData(json);
      setCountdown(30);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch cluster status");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  // Auto-refresh every 30s
  useEffect(() => {
    const tick = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { fetchStatus(); return 30; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [fetchStatus]);

  const chainNodes = data?.nodes.filter((n) => n.inFailoverChain) ?? [];
  const satelliteNodes = data?.nodes.filter((n) => !n.inFailoverChain) ?? [];

  return (
    <AdminLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Database className="w-6 h-6 text-orange-500" />
              Database Cluster
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Live failover chain status — automatic handoff when a Neon free-tier limit is reached.
            </p>
          </div>
          <button
            onClick={() => fetchStatus(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Probing…" : "Refresh Now"}
          </button>
        </div>

        {/* Auto-refresh indicator */}
        {data && (
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <Activity className="w-3.5 h-3.5" />
            <span>
              Last checked:{" "}
              {new Date(data.checkedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
            <span className="text-gray-700">·</span>
            <span>Auto-refresh in <span className="text-orange-400 font-mono font-bold">{countdown}s</span></span>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {/* Stats row */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={CheckCircle2}
              label="Healthy Nodes"
              value={`${data.healthyNodes} / ${data.totalNodes}`}
              color="text-emerald-400"
            />
            <StatCard
              icon={Shield}
              label="Failover Chain"
              value={`${chainNodes.filter((n) => n.status === "ok").length} / ${chainNodes.filter((n) => n.status !== "unconfigured").length} up`}
              color="text-orange-400"
            />
            <StatCard
              icon={Zap}
              label="Active Database"
              value={data.activeHost.split(".")[0] ?? "—"}
              color="text-blue-400"
            />
            <StatCard
              icon={Link2}
              label="Satellite DBs"
              value={`${satelliteNodes.filter((n) => n.status === "ok").length} / ${satelliteNodes.filter((n) => n.status !== "unconfigured").length} up`}
              color="text-purple-400"
            />
          </div>
        )}

        {/* Main layout: chain + satellites */}
        {data && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Failover chain */}
            <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="p-1.5 bg-orange-500/10 rounded-lg">
                  <Shield className="w-4 h-4 text-orange-500" />
                </div>
                <h2 className="text-sm font-bold text-white">Failover Chain</h2>
                <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full ml-1">
                  Priority order — app switches to next when current fails
                </span>
              </div>

              <div className="flex flex-col gap-0">
                {chainNodes.map((node, idx) => (
                  <ChainCard
                    key={node.id}
                    node={node}
                    index={idx}
                    total={chainNodes.filter((n) => n.status !== "unconfigured").length}
                  />
                ))}
              </div>

              {/* Strategy note */}
              <div className="mt-5 p-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-[11px] text-gray-500 leading-relaxed">
                <span className="text-orange-400 font-semibold">Strategy: </span>
                When a Neon free-tier account hits its compute or connection limit, the
                app automatically detects the failure at startup and promotes the next node
                in this chain — serving traffic seamlessly from exactly where the previous
                node left off (shared schema, same migrations).
              </div>
            </div>

            {/* Satellite DBs */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="p-1.5 bg-blue-500/10 rounded-lg">
                  <Database className="w-4 h-4 text-blue-400" />
                </div>
                <h2 className="text-sm font-bold text-white">Satellite Databases</h2>
              </div>

              <div className="flex flex-col gap-3">
                {satelliteNodes.map((node) => (
                  <SatelliteCard key={node.id} node={node} />
                ))}
              </div>

              <div className="mt-5 p-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-[11px] text-gray-500 leading-relaxed">
                <span className="text-blue-400 font-semibold">Note: </span>
                Satellite databases hold independent data shards (products catalogue,
                analytics events) and are not part of the transactional failover chain.
              </div>
            </div>
          </div>
        )}

        {/* Detailed node table */}
        {data && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-800">
              <h2 className="text-sm font-bold text-white">All Nodes — Detail View</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-gray-800 text-left">
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Database</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Host</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Latency</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {data.nodes.map((node) => (
                    <tr key={node.id} className={`border-b border-gray-800/50 ${node.isActive ? "bg-orange-500/5" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <StatusDot status={node.status} />
                          <span className="font-semibold text-white">{node.label}</span>
                          {node.isActive && (
                            <span className="text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded font-bold">ACTIVE</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-400">{node.host}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold flex items-center gap-1.5 ${statusColor(node.status)}`}>
                          {node.status === "ok" && <CheckCircle2 className="w-3.5 h-3.5" />}
                          {node.status === "error" && <XCircle className="w-3.5 h-3.5" />}
                          {node.status === "timeout" && <Clock className="w-3.5 h-3.5" />}
                          {node.status === "unconfigured" && <AlertTriangle className="w-3.5 h-3.5" />}
                          {statusLabel(node.status)}
                        </span>
                        {node.error && (
                          <p className="text-[10px] text-red-400 mt-0.5 max-w-[200px] truncate" title={node.error}>
                            {node.error}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {node.latencyMs !== null ? (
                          <span className={`font-mono text-sm font-bold ${latencyColor(node.latencyMs)}`}>
                            {node.latencyMs}ms
                          </span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px]">
                        <div className="flex items-center gap-1.5">
                          {node.inFailoverChain ? (
                            <Shield className="w-3 h-3 text-orange-400 shrink-0" />
                          ) : (
                            <Database className="w-3 h-3 text-blue-400 shrink-0" />
                          )}
                          {node.failoverPriority && (
                            <span className="text-gray-600">Priority {node.failoverPriority} ·</span>
                          )}
                          {node.inFailoverChain ? "Failover chain" : "Satellite shard"}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
