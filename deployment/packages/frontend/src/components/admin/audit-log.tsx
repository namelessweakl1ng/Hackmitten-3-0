"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Trash2, Loader2, AlertTriangle } from "lucide-react";

const ACTION_COLORS: Record<string, string> = {
  PAYMENT_VERIFIED: "text-blue-400",
  PAYMENT_REJECTED: "text-red-500",
  TEAM_APPROVED: "text-[#D83A43]",
  TEAM_REJECTED: "text-red-500",
  FOOD_CHECKIN: "text-green-400",
  CONFIG_UPDATED: "text-yellow-400",
  TEAM_DELETED: "text-red-500",
  TEAM_MANUALLY_CREATED: "text-[#D83A43]",
  AUDIT_LOG_DELETED: "text-yellow-400",
  AUDIT_LOGS_BULK_DELETED: "text-yellow-400",
  ROLLBACK: "text-yellow-400",
};

export function AdminAuditLog() {
  const qc = useQueryClient();
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmSingle, setConfirmSingle] = useState<string | null>(null);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pageSize = 50;

  const { data, isLoading } = useQuery({
    queryKey: ["audit", action, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (action) params.set("action", action);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      const r = await fetch(`/api/admin/audit?${params.toString()}`);
      return r.json();
    },
  });

  const logs: any[] = data?.logs ?? [];
  const total = data?.pagination?.total ?? 0;
  const totalPages = data?.pagination?.totalPages ?? 1;

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const deleteSingle = async (id: string) => {
    setBusy(true); setError(null);
    try {
      const r = await fetch(`/api/admin/audit/${id}`, { method: "DELETE" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed");
      setConfirmSingle(null);
      qc.invalidateQueries({ queryKey: ["audit"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const deleteBulk = async () => {
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/admin/audit/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed");
      setConfirmBulk(false);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["audit"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="mono text-[10px] uppercase tracking-[0.3em] text-[#B52A32] mb-2">/ Audit Log</div>
          <h1 className="display text-2xl md:text-3xl font-bold text-white">Activity History</h1>
          <p className="text-sm text-[#A8A8A8] mt-1">{total} total events</p>
        </div>
        {selected.size > 0 && (
          <button
            onClick={() => setConfirmBulk(true)}
            className="flex items-center gap-2 rounded-full border border-red-500/40 text-red-400 px-4 py-2 text-xs font-semibold hover:bg-red-500/10 transition-all"
          >
            <Trash2 size={12} /> Delete {selected.size} selected
          </button>
        )}
      </header>

      {error && (
        <div className="glass rounded p-3 text-sm text-[#D83A43] border-l-2 border-[#B52A32]">{error}</div>
      )}

      <div className="glass rounded-lg p-4">
        <select
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(1); }}
          className="bg-[#080808] border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-[#B52A32] focus:outline-none"
        >
          <option value="">All actions</option>
          <option value="PAYMENT_VERIFIED">Payment Verified</option>
          <option value="PAYMENT_REJECTED">Payment Rejected</option>
          <option value="TEAM_APPROVED">Team Approved</option>
          <option value="TEAM_REJECTED">Team Rejected</option>
          <option value="TEAM_EDITED">Team Edited</option>
          <option value="TEAM_DELETED">Team Deleted</option>
          <option value="TEAM_MANUALLY_CREATED">Team Manually Created</option>
          <option value="FOOD_CHECKIN">Food Check-in</option>
          <option value="CONFIG_UPDATED">Config Updated</option>
          <option value="ROLLBACK">Rollback</option>
          <option value="AUDIT_LOG_DELETED">Audit Log Deleted</option>
        </select>
      </div>

      <div className="glass rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5">
              <tr className="text-left mono text-[10px] uppercase tracking-widest text-[#A8A8A8]">
                <th className="px-2 py-3 w-8"></th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Detail</th>
                <th className="px-4 py-3 hidden md:table-cell">User</th>
                <th className="px-4 py-3 hidden md:table-cell">Team</th>
                <th className="px-4 py-3">When</th>
                <th className="px-2 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[#A8A8A8]">Loading…</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[#A8A8A8]">No audit entries.</td></tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.id} className="hover:bg-white/5">
                    <td className="px-2 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(l.id)}
                        onChange={() => toggleSelect(l.id)}
                        className="accent-[#B52A32]"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold ${ACTION_COLORS[l.action] ?? "text-[#A8A8A8]"}`}>
                        {l.action.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#A8A8A8] text-xs max-w-md truncate">{l.detail ?? "—"}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-[#A8A8A8] text-xs">{l.user?.email ?? "—"}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-[#A8A8A8] text-xs">{l.team?.teamName ?? "—"}</td>
                    <td className="px-4 py-3 text-[#A8A8A8] text-xs">{new Date(l.createdAt).toLocaleString()}</td>
                    <td className="px-2 py-3">
                      <button
                        onClick={() => setConfirmSingle(l.id)}
                        className="text-[#A8A8A8] hover:text-red-400 p-1"
                        aria-label="Delete log"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-xs text-[#A8A8A8]">Page {page} of {totalPages}</div>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="flex items-center gap-1 rounded-md border border-white/10 px-3 py-1.5 text-xs text-white disabled:opacity-30 hover:border-[#B52A32]">
              <ChevronLeft size={12} /> Prev
            </button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="flex items-center gap-1 rounded-md border border-white/10 px-3 py-1.5 text-xs text-white disabled:opacity-30 hover:border-[#B52A32]">
              Next <ChevronRight size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Single delete confirmation */}
      {confirmSingle && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setConfirmSingle(null)}>
          <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={20} className="text-red-400" />
              <h3 className="display text-lg font-bold text-white">Delete this log?</h3>
            </div>
            <p className="text-sm text-[#A8A8A8] mb-6">This action will permanently remove this log entry. This cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmSingle(null)} disabled={busy} className="rounded-full border border-white/15 px-5 py-2 text-xs text-white hover:bg-white/5 disabled:opacity-50">Cancel</button>
              <button onClick={() => deleteSingle(confirmSingle)} disabled={busy} className="flex items-center gap-2 rounded-full bg-red-600 disabled:opacity-50 px-5 py-2 text-xs font-semibold text-white hover:bg-red-500">
                {busy ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk delete confirmation */}
      {confirmBulk && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setConfirmBulk(false)}>
          <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={20} className="text-red-400" />
              <h3 className="display text-lg font-bold text-white">Delete {selected.size} selected log entries?</h3>
            </div>
            <p className="text-sm text-[#A8A8A8] mb-6">This action cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmBulk(false)} disabled={busy} className="rounded-full border border-white/15 px-5 py-2 text-xs text-white hover:bg-white/5 disabled:opacity-50">Cancel</button>
              <button onClick={deleteBulk} disabled={busy} className="flex items-center gap-2 rounded-full bg-red-600 disabled:opacity-50 px-5 py-2 text-xs font-semibold text-white hover:bg-red-500">
                {busy ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Delete Logs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
