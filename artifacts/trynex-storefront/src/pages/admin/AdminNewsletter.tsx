import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl, getAuthHeaders } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, Trash2, RefreshCw, AlertTriangle, Download, Users, ShieldAlert, Globe, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Subscriber {
  id: number;
  email: string;
  source: string;
  ip: string | null;
  createdAt: string;
  duplicateIp: boolean;
  ipCount: number | null;
}

interface SubscribersResponse {
  subscribers: Subscriber[];
  total: number;
  duplicateCount: number;
}

export default function AdminNewsletter() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "duplicate">("all");
  const [search, setSearch] = useState("");
  const [deleteSubConfirm, setDeleteSubConfirm] = useState<{ id: number; email: string } | null>(null);
  const [deleteIpConfirm, setDeleteIpConfirm] = useState<{ ip: string; count: number } | null>(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery<SubscribersResponse>({
    queryKey: ["/api/newsletter/subscribers"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/api/newsletter/subscribers"), {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to load subscribers");
      return res.json();
    },
    staleTime: 0,
    refetchOnMount: "always",
  });

  const deleteMut = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(getApiUrl(`/api/newsletter/subscribers/${id}`), {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/newsletter/subscribers"] });
      toast({ title: "Subscriber removed" });
    },
    onError: () => toast({ title: "Delete failed", variant: "destructive" }),
  });

  const deleteByIpMut = useMutation({
    mutationFn: async (ip: string) => {
      const res = await fetch(getApiUrl(`/api/newsletter/subscribers/ip/${encodeURIComponent(ip)}`), {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Bulk delete failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/newsletter/subscribers"] });
      toast({ title: "All subscribers from that IP removed" });
    },
    onError: () => toast({ title: "Bulk delete failed", variant: "destructive" }),
  });

  const exportCsv = () => {
    if (!data?.subscribers?.length) return;
    const safeCsv = (value: string) => {
      const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
      return `"${safe.replace(/"/g, '""')}"`;
    };
    const rows = [
      ["ID", "Email", "Source", "IP", "Signed Up", "Duplicate IP"],
      ...data.subscribers.map(s => [
        String(s.id),
        s.email,
        s.source,
        s.ip ?? "",
        new Date(s.createdAt).toLocaleString("en-BD"),
        s.duplicateIp ? "YES" : "",
      ]),
    ];
    const csv = rows.map(r => r.map(safeCsv).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `newsletter-subscribers-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: `Exported ${data.subscribers.length} subscribers` });
  };

  const subscribers = data?.subscribers ?? [];
  const filtered = subscribers.filter(s => {
    const matchesFilter = filter === "all" || (filter === "duplicate" && s.duplicateIp);
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || s.email.toLowerCase().includes(q) || (s.ip ?? "").includes(q) || s.source.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-orange-500 mb-1">Newsletter</p>
            <h1 className="text-3xl font-black font-display tracking-tight text-gray-900">Subscribers</h1>
            <p className="text-sm text-gray-400 mt-1">
              {data?.total ?? 0} total · {data?.duplicateCount ?? 0} flagged as duplicate IP
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-white border border-gray-200 hover:border-orange-300 hover:text-orange-600 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh
            </button>
            <button
              onClick={exportCsv}
              disabled={!data?.subscribers?.length}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#E85D04,#FB8500)" }}
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            { label: "Total Subscribers", value: data?.total ?? 0, icon: Users, color: "#E85D04", bg: "#fff4ee", border: "#fdd5b4" },
            { label: "Duplicate IPs", value: data?.duplicateCount ?? 0, icon: ShieldAlert, color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
            { label: "Unique Sources", value: new Set(subscribers.map(s => s.source)).size, icon: Globe, color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
          ].map(card => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="p-5 rounded-2xl bg-white border shadow-sm" style={{ borderColor: card.border }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: card.bg }}>
                    <Icon className="w-5 h-5" style={{ color: card.color }} />
                  </div>
                  <div>
                    <p className="text-xl font-black text-gray-900">{card.value}</p>
                    <p className="text-xs font-medium text-gray-400">{card.label}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Duplicate IP Warning */}
        {(data?.duplicateCount ?? 0) > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 flex items-start gap-3 p-4 rounded-2xl"
            style={{ background: "#fef2f2", border: "1px solid #fecaca" }}
          >
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-red-700 mb-0.5">Possible spam / bot subscriptions detected</p>
              <p className="text-xs text-red-600">
                {data?.duplicateCount} subscribers share an IP address with another subscriber.
                Use the "Duplicate IPs" filter to review and remove them.
              </p>
            </div>
          </motion.div>
        )}

        {/* Filters + Search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="flex gap-2">
            {(["all", "duplicate"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
                style={filter === f
                  ? { background: "linear-gradient(135deg,#E85D04,#FB8500)", color: "white", boxShadow: "0 4px 12px rgba(232,93,4,0.3)" }
                  : { background: "white", color: "#6b7280", border: "1px solid #e5e7eb" }}
              >
                {f === "all" ? `All (${data?.total ?? 0})` : `Duplicate IPs (${data?.duplicateCount ?? 0})`}
              </button>
            ))}
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search email, IP, source…"
            className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange-400"
            style={{ background: "#fafafa" }}
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 rounded-full border-4 border-orange-500 border-t-transparent animate-spin" />
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <AlertCircle className="w-10 h-10 mx-auto mb-3 text-red-400" />
              <p className="font-bold text-red-900">Subscribers could not be loaded</p>
              <p className="mt-1 text-sm text-red-700">Refresh the list to try again.</p>
              <button type="button" onClick={() => refetch()} className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700">Try again</button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Mail className="w-10 h-10 mx-auto mb-3 text-gray-200" />
              <p className="text-gray-400 text-sm font-medium">
                {search || filter !== "all" ? "No subscribers match your filter." : "No subscribers yet."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto pb-4">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3.5 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Email</th>
                    <th className="px-5 py-3.5 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider hidden sm:table-cell">Source</th>
                    <th className="px-5 py-3.5 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider hidden md:table-cell">IP</th>
                    <th className="px-5 py-3.5 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider hidden lg:table-cell">Signed Up</th>
                    <th className="px-5 py-3.5 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3.5 text-right text-[10px] font-black text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  <AnimatePresence>
                    {filtered.map((sub, i) => (
                      <motion.tr
                        key={sub.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ delay: Math.min(i * 0.02, 0.3) }}
                        className={sub.duplicateIp ? "bg-red-50/40" : "hover:bg-orange-50/20 transition-colors"}
                      >
                        <td className="px-5 py-3.5">
                          <span className="font-semibold text-gray-800 text-sm">{sub.email}</span>
                        </td>
                        <td className="px-5 py-3.5 hidden sm:table-cell">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100">
                            {sub.source}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 hidden md:table-cell">
                          <span className="font-mono text-xs text-gray-400">{sub.ip ?? "—"}</span>
                          {sub.ipCount && sub.ipCount > 1 && (
                            <span className="ml-2 text-[10px] font-bold text-red-500">×{sub.ipCount}</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 hidden lg:table-cell">
                          <span className="text-xs text-gray-400">
                            {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString("en-BD") : "—"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          {sub.duplicateIp ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-600">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              Duplicate IP
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-50 text-green-600 border border-green-100">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1.5">
                            {sub.duplicateIp && sub.ip && (
                              <button
                                onClick={() => setDeleteIpConfirm({ ip: sub.ip!, count: sub.ipCount ?? 0 })}
                                title="Remove all from this IP"
                                className="p-1.5 rounded-lg text-red-400 hover:text-red-700 hover:bg-red-50 transition-colors text-[10px] font-bold"
                              >
                                <ShieldAlert className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => setDeleteSubConfirm({ id: sub.id, email: sub.email })}
                              disabled={deleteMut.isPending}
                              className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </div>
        <p className="text-center text-xs text-gray-300 mt-4">
          Showing {filtered.length} of {subscribers.length} subscribers
        </p>
      </div>

      <ConfirmDialog
        open={!!deleteSubConfirm}
        title="Remove Subscriber"
        description={`Remove ${deleteSubConfirm?.email ?? ""} from the newsletter?`}
        confirmText="Remove"
        onConfirm={() => { if (deleteSubConfirm) { deleteMut.mutate(deleteSubConfirm.id); setDeleteSubConfirm(null); } }}
        onCancel={() => setDeleteSubConfirm(null)}
      />
      <ConfirmDialog
        open={!!deleteIpConfirm}
        title="Remove All from IP"
        description={`Remove ALL ${deleteIpConfirm?.count ?? 0} subscribers from IP ${deleteIpConfirm?.ip ?? ""}?`}
        confirmText="Remove All"
        variant="danger"
        onConfirm={() => { if (deleteIpConfirm) { deleteByIpMut.mutate(deleteIpConfirm.ip); setDeleteIpConfirm(null); } }}
        onCancel={() => setDeleteIpConfirm(null)}
      />
    </AdminLayout>
  );
}
