import { AdminLayout } from "@/components/layout/AdminLayout";
import { getAuthHeaders, getApiUrl } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useState, useRef, useEffect } from "react";
import {
  Download, Upload, FileSpreadsheet, Database,
  HardDrive, AlertTriangle, CheckCircle2, Loader2, RefreshCw, ShieldAlert, ShieldCheck
} from "lucide-react";
import { useImportBackup, getExportBackupUrl, getExportOrdersCsvUrl } from "@workspace/api-client-react";

interface SyncStatus {
  lastRunMs: number;
  consecutiveFailures: number;
  circuitOpen: boolean;
  circuitOpenSince: number;
  lastResults?: Array<{
    id: string;
    label: string;
    status: "ok" | "skipped" | "blocked" | "error";
    message?: string;
    rowsCopied?: number;
    durationMs?: number;
  }>;
}

export default function AdminBackup() {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<Record<string, number> | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncNowLoading, setSyncNowLoading] = useState(false);
  const [repairLoading, setRepairLoading] = useState(false);
  const [repairConfirm, setRepairConfirm] = useState(false);
  const [syncStatusError, setSyncStatusError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const importMutation = useImportBackup();

  useEffect(() => {
    let mounted = true;
    fetch(getApiUrl("/api/admin/backup/sync-status"), { headers: getAuthHeaders() })
      .then(r => {
        if (!r.ok) throw new Error(`Could not load sync status (HTTP ${r.status})`);
        return r.json();
      })
      .then(d => { if (mounted) setSyncStatus(d); })
      .catch((err: unknown) => {
        if (mounted) setSyncStatusError(err instanceof Error ? err.message : "Could not load sync status.");
      });
    return () => { mounted = false; };
  }, []);

  const handleSyncNow = async () => {
    setSyncNowLoading(true);
    try {
      const res = await fetch(getApiUrl("/api/admin/backup/sync-now"), {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`Sync failed (HTTP ${res.status})`);
      const data = await res.json();
      const ok = data.results?.filter((r: any) => r.status === "ok").length ?? 0;
      const total = data.results?.length ?? 0;
      const failed = data.results?.filter((r: any) => r.status === "error") ?? [];
      const blocked = data.results?.filter((r: any) => r.status === "blocked") ?? [];
      toast({
        title: failed.length > 0 ? "Sync partially complete" : blocked.length > 0 ? "Schema repair required" : "Sync complete",
        description: failed.length > 0
          ? `${ok}/${total} targets synced. ${failed.map((r: any) => r.label).join(", ")} failed.`
          : blocked.length > 0
            ? `${ok}/${total} targets synced. ${blocked.map((r: any) => r.label).join(", ")} need migrations before mirroring.`
            : `${ok}/${total} targets synced successfully.`,
        variant: failed.length > 0 || blocked.length > 0 ? "destructive" : undefined,
      });
      // Refresh status after sync
      const statusRes = await fetch(getApiUrl("/api/admin/backup/sync-status"), { headers: getAuthHeaders() });
      setSyncStatus(await statusRes.json());
    } catch {
      toast({ title: "Sync failed", description: "Check server logs.", variant: "destructive" });
    } finally {
      setSyncNowLoading(false);
    }
  };

  const handleRepairSchemas = async () => {
    setRepairConfirm(false);
    setRepairLoading(true);
    try {
      const res = await fetch(getApiUrl("/api/admin/backup/repair-schemas"), {
        method: "POST",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      const blocked = data.results?.filter((r: any) => r.status === "blocked") ?? [];
      const failed = data.results?.filter((r: any) => r.status === "error") ?? [];
      toast({
        title: blocked.length > 0 ? "Repair window is disabled" : failed.length > 0 ? "Schema repair partially failed" : "Schema repair completed",
        description: blocked.length > 0
          ? "Set ALLOW_DB_SCHEMA_REPAIR=true on the API for a controlled additive-only repair window."
          : failed.length > 0
            ? failed.map((r: any) => `${r.label}: ${r.message}`).join("; ")
            : "Run Sync Now next to verify schemas and mirror data.",
        variant: blocked.length > 0 || failed.length > 0 ? "destructive" : undefined,
      });
    } catch {
      toast({ title: "Schema repair failed", description: "Check server logs.", variant: "destructive" });
    } finally {
      setRepairLoading(false);
    }
  };

  const handleExportCSV = async () => {
    setExportingCsv(true);
    try {
      const res = await fetch(getApiUrl(getExportOrdersCsvUrl()), {
        headers: { ...getAuthHeaders() },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trynext-orders-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Orders exported!", description: "CSV file downloaded successfully." });
    } catch {
      toast({ title: "Export failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setExportingCsv(false);
    }
  };

  const handleExportBackup = async () => {
    setExporting(true);
    try {
      const res = await fetch(getApiUrl(getExportBackupUrl()), {
        headers: { ...getAuthHeaders() },
      });
      if (!res.ok) throw new Error('Backup failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trynext-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Backup exported!", description: "Full database backup downloaded." });
    } catch {
      toast({ title: "Backup failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed.version || !parsed.data) {
        toast({ title: "Invalid file", description: "This doesn't look like a Trynext backup file.", variant: "destructive" });
        return;
      }
      const result = await importMutation.mutateAsync({ 
        version: parsed.version, 
        data: parsed.data,
        request: { headers: getAuthHeaders() } 
      } as any);
      setImportResult(result.imported);
      toast({ title: "Backup restored!", description: "Data imported successfully." });
    } catch {
      toast({ title: "Import failed", description: "Check the file format and try again.", variant: "destructive" });
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-3xl">
        <div className="mb-8">
          <h1 className="text-2xl font-black font-display tracking-tight text-gray-900">Backup & Export</h1>
          <p className="text-sm text-gray-500 mt-1">Export your data or restore from a previous backup.</p>
        </div>

        <div className="space-y-6">
          {/* DB Sync Circuit-Breaker Status */}
          <div className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: syncStatus?.circuitOpen ? '#fef2f2' : '#f0fdf4' }}>
                  {syncStatus?.circuitOpen
                    ? <ShieldAlert className="w-5 h-5 text-red-500" />
                    : <ShieldCheck className="w-5 h-5 text-green-600" />}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">DB Sync Status</h3>
                  <p className="text-xs text-gray-500">Auto-mirrors every 30 min to backup databases</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRepairConfirm(true)}
                  disabled={repairLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs border transition-all hover:-translate-y-0.5 disabled:opacity-50"
                  style={{ background: '#fff7ed', borderColor: '#fed7aa', color: '#c2410c' }}
                >
                  {repairLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  Repair Schema
                </button>
                <button
                  type="button"
                  onClick={handleSyncNow}
                  disabled={syncNowLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs border transition-all hover:-translate-y-0.5 disabled:opacity-50"
                  style={{ background: '#f9fafb', borderColor: '#e5e7eb', color: '#374151' }}
                >
                  {syncNowLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Sync Now
                </button>
              </div>
            </div>
            {syncStatusError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <p className="font-semibold">Sync status unavailable.</p>
                <p className="mt-1">{syncStatusError}</p>
              </div>
            ) : syncStatus ? (
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl text-center" style={{ background: '#f9fafb' }}>
                  <div className={`text-base font-black ${syncStatus.circuitOpen ? 'text-red-600' : 'text-green-600'}`}>
                    {syncStatus.circuitOpen ? 'OPEN' : 'Closed'}
                  </div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Circuit</div>
                </div>
                <div className="p-3 rounded-xl text-center" style={{ background: '#f9fafb' }}>
                  <div className={`text-base font-black ${syncStatus.consecutiveFailures > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                    {syncStatus.consecutiveFailures}
                  </div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Failures</div>
                </div>
                <div className="p-3 rounded-xl text-center" style={{ background: '#f9fafb' }}>
                  <div className="text-base font-black text-gray-800">
                    {syncStatus.lastRunMs > 0
                      ? `${Math.round((Date.now() - syncStatus.lastRunMs) / 60000)}m ago`
                      : '—'}
                  </div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Last Run</div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading sync status…
              </div>
            )}
            {syncStatus?.circuitOpen && (
              <div className="mt-3 flex items-center gap-2 p-3 rounded-xl" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-xs text-red-700 font-medium">
                  Circuit breaker is open — backup sync paused for 2 hours after {syncStatus.consecutiveFailures} consecutive failures.
                  Check DB quota or connection. Click "Sync Now" after the cooldown to retry.
                </p>
              </div>
            )}
            {syncStatus?.lastResults && syncStatus.lastResults.length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Latest target results</div>
                {syncStatus.lastResults.map((target) => (
                  <div key={target.id} className="flex items-start gap-2 rounded-xl px-3 py-2"
                    style={{
                      background: target.status === "ok" ? "#f0fdf4" : target.status === "error" || target.status === "blocked" ? "#fff7ed" : "#f9fafb",
                      border: `1px solid ${target.status === "ok" ? "#bbf7d0" : target.status === "error" ? "#fecaca" : target.status === "blocked" ? "#fed7aa" : "#e5e7eb"}`,
                    }}>
                    {target.status === "ok"
                      ? <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                      : target.status === "error"
                        ? <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        : target.status === "blocked"
                          ? <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          : <ShieldAlert className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />}
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-gray-800">{target.label}</div>
                      <div className={`text-[11px] ${target.status === "error" ? "text-red-700" : target.status === "blocked" ? "text-amber-700" : "text-gray-500"}`}>
                        {target.status === "ok"
                          ? `${target.rowsCopied ?? 0} rows copied`
                          : target.status === "error"
                            ? (target.message || "Target failed without a message")
                            : target.status === "blocked"
                              ? (target.message || "Target schema requires migration")
                              : "Skipped"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#eff6ff' }}>
                <FileSpreadsheet className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Export Orders (CSV)</h3>
                <p className="text-xs text-gray-500">Download all orders as a spreadsheet. Opens in Excel, Google Sheets, etc.</p>
              </div>
            </div>
            <button
              onClick={handleExportCSV}
              disabled={exportingCsv}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:-translate-y-0.5 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #2563eb, #3b82f6)', boxShadow: '0 4px 12px rgba(37,99,235,0.3)' }}
            >
              {exportingCsv ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {exportingCsv ? "Exporting..." : "Download CSV"}
            </button>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#f0fdf4' }}>
                <Database className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Full Database Backup</h3>
                <p className="text-xs text-gray-500">Export everything — orders, products, categories, settings, blog posts as JSON.</p>
              </div>
            </div>
            <button
              onClick={handleExportBackup}
              disabled={exporting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:-translate-y-0.5 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #16a34a, #22c55e)', boxShadow: '0 4px 12px rgba(22,163,74,0.3)' }}
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <HardDrive className="w-4 h-4" />}
              {exporting ? "Creating backup..." : "Export Full Backup"}
            </button>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#fff7ed' }}>
                <Upload className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Restore from Backup</h3>
                <p className="text-xs text-gray-500">Import a previously exported Trynext backup file (.json).</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl mb-4" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <p className="text-xs text-amber-700 font-medium">Existing data will not be deleted. Duplicate entries will be skipped.</p>
            </div>

            <button
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:-translate-y-0.5 disabled:opacity-50"
              style={{ background: '#fff8f5', border: '1px solid #fed7aa', color: '#E85D04' }}
            >
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {importing ? "Importing..." : "Choose Backup File"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />

            {importResult && (
              <div className="mt-4 p-4 rounded-xl" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="font-bold text-sm text-green-700">Import Complete</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(importResult).map(([key, count]) => (
                    <div key={key} className="flex justify-between px-3 py-1.5 rounded-lg bg-white">
                      <span className="capitalize text-gray-600">{key}</span>
                      <span className="font-bold text-green-700">{count} records</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={repairConfirm}
        title="Repair backup schemas?"
        description="This applies additive-only schema patches to configured backup databases. It does not delete data."
        confirmText={repairLoading ? "Repairing…" : "Repair schemas"}
        variant="warning"
        onConfirm={() => void handleRepairSchemas()}
        onCancel={() => !repairLoading && setRepairConfirm(false)}
      />
    </AdminLayout>
  );
}
