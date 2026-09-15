import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl, formatPrice, getAuthHeaders } from "@/lib/utils";
import { Tag, Plus, Trash2, ToggleLeft, ToggleRight, RefreshCw, Copy, Check, AlertCircle, Clock, Infinity, Percent, CalendarClock } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface PromoCode {
  id: number;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: string;
  minOrderAmount: string;
  maxUses: number;
  usedCount: number;
  active: boolean;
  expiresAt: string | null;
  createdAt: string;
}

const inputClass = "w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-300 transition-all";
const inputStyle = { borderColor: "#e5e7eb", background: "#fafafa" };

interface FormState {
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: string;
  minOrderAmount: string;
  maxUses: string;
  expiresAt: string;
}

const empty: FormState = {
  code: "",
  discountType: "percentage",
  discountValue: "",
  minOrderAmount: "",
  maxUses: "",
  expiresAt: "",
};

function authHeaders() {
  return getAuthHeaders();
}

export default function AdminPromoCodes() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(empty);
  const [copied, setCopied] = useState<string | null>(null);
  const [deleteCodeConfirm, setDeleteCodeConfirm] = useState<{ id: number; code: string } | null>(null);
  const [formError, setFormError] = useState("");

  const { data, isLoading, isError, refetch, isFetching } = useQuery<{ promoCodes: PromoCode[] }>({
    queryKey: ["/api/promo-codes"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/api/promo-codes"), { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to load promo codes");
      return res.json();
    },
    staleTime: 0,
    refetchOnMount: "always",
  });

  const codes = data?.promoCodes ?? [];

  const { mutateAsync: createCode, isPending: creating } = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch(getApiUrl("/api/promo-codes"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create promo code");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/promo-codes"] });
      setForm(empty);
      setShowCreate(false);
      toast({ title: "Promo code created!" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const { mutateAsync: patchCode } = useMutation({
    mutationFn: async ({ id, ...body }: { id: number } & Record<string, unknown>) => {
      const res = await fetch(getApiUrl(`/api/promo-codes/${id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/promo-codes"] }),
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const { mutateAsync: deleteCode } = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(getApiUrl(`/api/promo-codes/${id}`), {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/promo-codes"] });
      toast({ title: "Promo code deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleCreate = async () => {
    const code = form.code.trim().toUpperCase();
    const discountValue = parseFloat(form.discountValue);
    const minOrderAmount = form.minOrderAmount ? parseFloat(form.minOrderAmount) : 0;
    const maxUses = form.maxUses ? parseInt(form.maxUses, 10) : 0;
    if (!code) {
      setFormError("Enter a promo code.");
      return;
    }
    if (!/^[A-Z0-9-]+$/.test(code)) {
      setFormError("Use only letters, numbers, and hyphens.");
      return;
    }
    if (isNaN(discountValue) || discountValue <= 0 || (form.discountType === "percentage" && discountValue > 100)) {
      setFormError(form.discountType === "percentage" ? "Percentage must be between 1 and 100." : "Enter a fixed discount greater than 0.");
      return;
    }
    if (isNaN(minOrderAmount) || minOrderAmount < 0 || isNaN(maxUses) || maxUses < 0) {
      setFormError("Minimum order and maximum uses cannot be negative.");
      return;
    }
    setFormError("");
    await createCode({
      code,
      discountType: form.discountType,
      discountValue,
      minOrderAmount,
      maxUses,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
    });
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(code);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const isExpired = (code: PromoCode) =>
    code.expiresAt ? new Date(code.expiresAt) < new Date() : false;

  const isMaxedOut = (code: PromoCode) =>
    code.maxUses > 0 && code.usedCount >= code.maxUses;

  return (
    <AdminLayout>
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-orange-500 mb-1">Discounts</p>
          <h1 className="text-3xl font-black font-display tracking-tight text-gray-900">Promo Codes</h1>
          <p className="text-sm text-gray-500 mt-1">Create and manage discount codes for customers</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
             disabled={isFetching}
             className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-white border border-gray-200 hover:border-orange-300 hover:text-orange-600 transition-all disabled:opacity-50"
          >
             <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button
            onClick={() => setShowCreate(v => !v)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
            style={{ background: "linear-gradient(135deg, #E85D04, #FB8500)", boxShadow: "0 4px 12px rgba(232,93,4,0.25)" }}
          >
            <Plus className="w-4 h-4" />
            {showCreate ? "Cancel" : "New Code"}
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-6 mb-6">
          <h2 className="text-base font-black text-gray-900 mb-5 flex items-center gap-2">
            <Tag className="w-4 h-4 text-orange-500" /> Create Promo Code
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Code *</label>
              <input
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                className={inputClass}
                style={inputStyle}
                placeholder="SAVE10"
              />
            </div>
            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Discount Type</label>
              <select
                value={form.discountType}
                onChange={e => setForm(f => ({ ...f, discountType: e.target.value as "percentage" | "fixed" }))}
                className={inputClass}
                style={inputStyle}
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (৳)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
                Discount Value * {form.discountType === "percentage" ? "(%)" : "(৳)"}
              </label>
              <input
                type="number"
                min="0"
                step={form.discountType === "percentage" ? "1" : "10"}
                value={form.discountValue}
                onChange={e => setForm(f => ({ ...f, discountValue: e.target.value }))}
                className={inputClass}
                style={inputStyle}
                placeholder={form.discountType === "percentage" ? "10" : "100"}
              />
            </div>
            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Min Order (৳)</label>
              <input
                type="number"
                min="0"
                value={form.minOrderAmount}
                onChange={e => setForm(f => ({ ...f, minOrderAmount: e.target.value }))}
                className={inputClass}
                style={inputStyle}
                placeholder="0 = no minimum"
              />
            </div>
            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Max Uses</label>
              <input
                type="number"
                min="0"
                value={form.maxUses}
                onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))}
                className={inputClass}
                style={inputStyle}
                placeholder="0 = unlimited"
              />
            </div>
            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Expires At</label>
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                className={inputClass}
                style={inputStyle}
              />
            </div>
          </div>
          <div className="flex justify-end mt-5">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #E85D04, #FB8500)" }}
            >
              <Plus className="w-4 h-4" />
              {creating ? "Creating…" : "Create Code"}
            </button>
          </div>
           {formError && <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-700" role="alert">{formError}</p>}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Loading…</div>
       ) : isError ? (
         <div className="bg-red-50 rounded-2xl border border-red-100 shadow-sm p-12 text-center">
           <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
           <h3 className="text-base font-black text-red-900 mb-1">Promo codes could not be loaded</h3>
           <p className="text-sm text-red-700">Refresh the list to try again.</p>
           <button type="button" onClick={() => refetch()} className="mt-4 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700">Try again</button>
         </div>
      ) : codes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "#fff7ed" }}>
            <Tag className="w-7 h-7 text-orange-400" />
          </div>
          <h3 className="text-base font-black text-gray-800 mb-1">No promo codes yet</h3>
          <p className="text-sm text-gray-400">Create your first discount code to start attracting customers.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 border-b border-gray-100 bg-gray-50/70">
             {[
               { label: "Active now", value: codes.filter(c => c.active && !isExpired(c) && !isMaxedOut(c)).length, icon: Check, className: "text-green-600 bg-green-50" },
               { label: "Uses recorded", value: codes.reduce((sum, c) => sum + c.usedCount, 0), icon: Percent, className: "text-blue-600 bg-blue-50" },
               { label: "Expiring / ended", value: codes.filter(c => isExpired(c) || isMaxedOut(c)).length, icon: CalendarClock, className: "text-amber-600 bg-amber-50" },
             ].map((stat) => (
               <div key={stat.label} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3">
                 <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.className}`}><stat.icon className="w-4 h-4" /></div>
                 <div><p className="text-lg font-black text-gray-900">{stat.value}</p><p className="text-[11px] font-bold text-gray-400">{stat.label}</p></div>
               </div>
             ))}
           </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3.5 text-[11px] font-black uppercase tracking-widest text-gray-400">Code</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-black uppercase tracking-widest text-gray-400">Discount</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-black uppercase tracking-widest text-gray-400">Min Order</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-black uppercase tracking-widest text-gray-400">Usage</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-black uppercase tracking-widest text-gray-400">Expires</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-black uppercase tracking-widest text-gray-400">Status</th>
                  <th className="text-right px-5 py-3.5 text-[11px] font-black uppercase tracking-widest text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {codes.map(code => {
                  const expired = isExpired(code);
                  const maxed = isMaxedOut(code);
                  const effectivelyInactive = !code.active || expired || maxed;
                  return (
                    <tr key={code.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-gray-900">{code.code}</span>
                          <button
                            onClick={() => copyCode(code.code)}
                            className="p-1 rounded-lg text-gray-300 hover:text-orange-500 transition-colors"
                          >
                            {copied === code.code ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-bold text-gray-800">
                          {code.discountType === "percentage"
                            ? `${parseFloat(code.discountValue)}% OFF`
                            : `৳${parseFloat(code.discountValue)} OFF`}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-500">
                        {parseFloat(code.minOrderAmount) > 0
                          ? `Min ৳${parseFloat(code.minOrderAmount).toLocaleString()}`
                          : <span className="text-gray-300">None</span>}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-bold ${maxed ? "text-red-500" : "text-gray-800"}`}>
                            {code.usedCount}
                          </span>
                          <span className="text-gray-300">/</span>
                          {code.maxUses > 0
                            ? <span className={`font-medium ${maxed ? "text-red-400" : "text-gray-500"}`}>{code.maxUses}</span>
                            : <Infinity className="w-3.5 h-3.5 text-gray-300" />}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {code.expiresAt ? (
                          <div className={`flex items-center gap-1.5 ${expired ? "text-red-500" : "text-gray-500"}`}>
                            <Clock className="w-3.5 h-3.5" />
                            <span className="text-xs font-medium">
                              {expired ? "Expired " : ""}
                              {new Date(code.expiresAt).toLocaleDateString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300 flex items-center gap-1">
                            <Infinity className="w-3.5 h-3.5" /> Never
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {effectivelyInactive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500">
                            {expired ? <><AlertCircle className="w-3 h-3" /> Expired</> : maxed ? <><AlertCircle className="w-3 h-3" /> Maxed out</> : "Inactive"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            title={code.active ? "Deactivate" : "Activate"}
                            onClick={() => patchCode({ id: code.id, active: !code.active })}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-orange-500"
                          >
                            {code.active ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5" />}
                          </button>
                          <button
                            title="Delete"
                            onClick={() => setDeleteCodeConfirm({ id: code.id, code: code.code })}
                            className="p-2 rounded-lg hover:bg-red-50 transition-colors text-gray-300 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 text-xs font-medium text-gray-400">
            {codes.length} promo code{codes.length !== 1 ? "s" : ""} total · {codes.filter(c => c.active && !isExpired(c) && !isMaxedOut(c)).length} active
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteCodeConfirm}
        title="Delete Promo Code"
        description={`Delete promo code "${deleteCodeConfirm?.code ?? ""}"? This cannot be undone.`}
        confirmText="Delete"
        onConfirm={() => { if (deleteCodeConfirm) { deleteCode(deleteCodeConfirm.id); setDeleteCodeConfirm(null); } }}
        onCancel={() => setDeleteCodeConfirm(null)}
      />
    </AdminLayout>
  );
}
