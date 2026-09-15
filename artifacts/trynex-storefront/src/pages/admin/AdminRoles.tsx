import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { getAuthHeaders, getApiUrl } from "@/lib/utils";
import { Loader } from "@/components/ui/Loader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Shield, Plus, X, Check, AlertTriangle, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AdminSession {
  id: number;
  tokenHash: string;
  adminId: number | null;
  role: string;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  revokedAt: string | null;
  userAgent: string | null;
  ip: string | null;
}

export default function AdminRoles() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revokeId, setRevokeId] = useState<number | null>(null);
  const [revoking, setRevoking] = useState(false);

  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(getApiUrl("/api/admin/sessions"), {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch sessions");
      const data = await res.json();
      setSessions(data.sessions ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const revokeSession = async (id: number) => {
    setRevoking(true);
    try {
      const res = await fetch(getApiUrl(`/api/admin/sessions/${id}`), {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to revoke session");
      setSessions(prev => prev.filter(s => s.id !== id));
      toast({ title: "Session revoked" });
    } catch {
      toast({ title: "Failed to revoke session", variant: "destructive" });
    } finally {
      setRevoking(false);
      setRevokeId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-orange-500 mb-2">Access Control</p>
          <h1 className="text-4xl font-black font-display tracking-tighter text-gray-900">Admin Roles & Sessions</h1>
          <p className="text-sm text-gray-500 mt-2 font-medium">
            {sessions.length} active admin session{sessions.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={fetchSessions}
          type="button"
          aria-label="Refresh admin sessions"
          disabled={loading}
          className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all hover:scale-105 border border-orange-200 text-orange-600 bg-orange-50 hover:bg-orange-100"
        >
          <Shield className="w-4 h-4" /> Refresh
        </button>
      </div>

      {loading ? <Loader /> : error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-6 py-8 text-center">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-600 font-bold text-lg">Failed to load sessions</p>
          <p className="text-red-500 text-sm mt-1">{error}</p>
          <button onClick={fetchSessions} className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-xl font-bold text-sm hover:bg-red-200 transition-colors">
            Retry
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-5 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Session ID</th>
                  <th className="px-5 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Role</th>
                  <th className="px-5 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Created</th>
                  <th className="px-5 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Last Used</th>
                  <th className="px-5 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">User Agent</th>
                  <th className="px-5 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">IP</th>
                  <th className="px-5 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-5 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sessions.map(session => {
                  const expired = new Date(session.expiresAt) < new Date();
                  const revoked = !!session.revokedAt;
                  const status = revoked ? "Revoked" : expired ? "Expired" : "Active";
                  const statusColor = revoked ? "bg-red-50 text-red-600" : expired ? "bg-yellow-50 text-yellow-600" : "bg-green-50 text-green-600";
                  return (
                    <tr key={session.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-4 font-mono text-xs text-gray-500">#{session.id}</td>
                      <td className="px-5 py-4">
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-600 border border-purple-100 w-fit">
                          <KeyRound className="w-3 h-3" />
                          {session.role}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-500 font-medium">
                        {new Date(session.createdAt).toLocaleDateString("en-BD", { month: "short", day: "numeric" })}
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-500 font-medium">
                        {session.lastUsedAt ? new Date(session.lastUsedAt).toLocaleString("en-BD") : "—"}
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-400 max-w-[180px] truncate font-mono">
                        {session.userAgent ?? "—"}
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-500 font-mono">
                        {session.ip ?? "—"}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 rounded-xl text-xs font-bold ${statusColor}`}>
                          {status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {!revoked && !expired && (
                          <button
                            type="button"
                            aria-label={`Revoke session ${session.id}`}
                            onClick={() => setRevokeId(session.id)}
                            disabled={revoking}
                            className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {sessions.length === 0 && (
              <div className="py-20 text-center">
                <Shield className="w-14 h-14 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-400 font-medium text-lg">No admin sessions found.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admin Management hint */}
      <div className="mt-6 bg-blue-50 border border-blue-100 rounded-2xl px-6 py-5">
        <div className="flex items-start gap-3">
          <KeyRound className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-bold text-blue-800 text-sm">Admin Role Management</h3>
            <p className="text-xs text-blue-600 mt-1 leading-relaxed">
              Session management allows you to view and revoke active admin sessions. Role-based access control (RBAC) allows
              defining granular permissions for each admin. Currently all admins share the <code className="bg-blue-100 px-1 rounded">admin</code> role.
              To manage admin accounts and grant access, configure <code className="bg-blue-100 px-1 rounded">ADMIN_PASSWORD</code> and related auth secrets.
            </p>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={revokeId !== null}
        title="Revoke admin session?"
        description="This signs the selected session out immediately. The admin can sign in again later."
        confirmText={revoking ? "Revoking…" : "Revoke session"}
        onConfirm={() => revokeId !== null && void revokeSession(revokeId)}
        onCancel={() => !revoking && setRevokeId(null)}
      />
    </AdminLayout>
  );
}
