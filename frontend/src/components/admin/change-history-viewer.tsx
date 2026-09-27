"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Loader2, AlertTriangle, X } from "lucide-react";

type ChangeEntry = {
  id: string;
  section: string;
  entityId: string;
  entityType: string;
  action: string;
  previousState: any;
  newState: any;
  changedBy: { email: string; name: string | null; role: string } | null;
  rolledBack: boolean;
  rolledBackBy: { email: string; name: string | null; role: string } | null;
  rolledBackAt: string | null;
  createdAt: string;
};

const SECTION_LABEL: Record<string, string> = {
  EVENT_CONFIG: "Event Config",
  HERO: "Hero",
  ABOUT: "About",
  PHASE: "Phase",
  GALLERY: "Gallery",
  SPONSOR: "Sponsor",
  COORDINATOR: "Coordinator",
  MEAL: "Meal",
  TEAM: "Team",
  PAYMENT: "Payment",
  FOOD_CHECKIN: "Food Check-in",
};

const ACTION_COLOR: Record<string, string> = {
  CREATE: "text-green-400",
  UPDATE: "text-blue-400",
  DELETE: "text-red-400",
  APPROVE: "text-[#D83A43]",
  REJECT: "text-red-500",
  VERIFY: "text-blue-400",
  REVERT_APPROVAL: "text-yellow-400",
  ROLLBACK: "text-yellow-400",
};

export function ChangeHistoryViewer() {
  const qc = useQueryClient();
  const [section, setSection] = useState("");
  const [confirmRollback, setConfirmRollback] = useState<ChangeEntry | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["change-history", section],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (section) params.set("section", section);
      params.set("pageSize", "50");
      const r = await fetch(`/api/admin/change-history?${params.toString()}`);
      return r.json();
    },
  });
  const entries: ChangeEntry[] = data?.entries ?? [];
  const total = data?.pagination?.total ?? 0;

  const rollback = async () => {
    if (!confirmRollback) return;
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/change-history/${confirmRollback.id}/rollback`, { method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Rollback failed");
      setFeedback("Change successfully rolled back.");
      setConfirmRollback(null);
      qc.invalidateQueries({ queryKey: ["change-history"] });
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : "Rollback failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="mono text-[10px] uppercase tracking-[0.3em] text-[#B52A32] mb-2">/ Change History</div>
          <h1 className="display text-2xl md:text-3xl font-bold text-white">Rollback & History</h1>
          <p className="text-sm text-[#A8A8A8] mt-1">{total} recorded changes · rollback any non-create action</p>
        </div>
        <select
          value={section}
          onChange={(e) => setSection(e.target.value)}
          className="bg-[#080808] border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-[#B52A32] focus:outline-none"
        >
          <option value="">All sections</option>
          {Object.entries(SECTION_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </header>

      {feedback && (
        <div className="glass rounded p-3 text-sm text-green-400 border-l-2 border-green-500 flex items-center justify-between">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="text-[#A8A8A8] hover:text-white"><X size={14} /></button>
        </div>
      )}

      {isLoading ? (
        <div className="text-[#A8A8A8] text-sm">Loading…</div>
      ) : entries.length === 0 ? (
        <div className="glass rounded-lg p-8 text-center">
          <AlertTriangle size={20} className="mx-auto text-[#A8A8A8] opacity-50 mb-3" />
          <div className="text-sm text-[#A8A8A8]">No changes recorded yet.</div>
          <div className="text-xs text-[#A8A8A8]/70 mt-1">
            Registration controls, meals, teams, and payments remain available in operational history.
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <div key={e.id} className={`glass rounded-lg p-4 ${e.rolledBack ? "opacity-60" : ""}`}>
              <div className="flex items-start gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="mono text-[10px] uppercase tracking-widest text-[#B52A32]">
                      {SECTION_LABEL[e.section] || e.section}
                    </span>
                    <span className={`mono text-[10px] uppercase tracking-widest font-semibold ${ACTION_COLOR[e.action] || "text-[#A8A8A8]"}`}>
                      {e.action}
                    </span>
                    {e.rolledBack && (
                      <span className="mono text-[10px] uppercase tracking-widest text-yellow-500 border border-yellow-500/40 px-1.5 py-0.5 rounded">
                        Rolled Back
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#A8A8A8] mt-1">
                    by {e.changedBy?.email || "system"} · {new Date(e.createdAt).toLocaleString()}
                  </div>
                  <div className="mt-2 grid gap-2 md:grid-cols-2 text-xs">
                    {e.previousState && (
                      <div className="bg-[#080808] border border-white/5 rounded p-2">
                        <div className="mono text-[9px] uppercase tracking-widest text-[#A8A8A8] mb-1">Previous</div>
                        <pre className="text-[#A8A8A8] whitespace-pre-wrap break-words max-h-32 overflow-y-auto">{formatState(e.previousState)}</pre>
                      </div>
                    )}
                    {e.newState && (
                      <div className="bg-[#080808] border border-white/5 rounded p-2">
                        <div className="mono text-[9px] uppercase tracking-widest text-[#B52A32] mb-1">New</div>
                        <pre className="text-white/80 whitespace-pre-wrap break-words max-h-32 overflow-y-auto">{formatState(e.newState)}</pre>
                      </div>
                    )}
                  </div>
                </div>
                {!e.rolledBack && e.action !== "CREATE" && (
                  <button
                    onClick={() => setConfirmRollback(e)}
                    className="flex items-center gap-1 rounded-full border border-yellow-500/40 text-yellow-500 px-3 py-1.5 text-xs hover:bg-yellow-500/10 transition-all min-h-[36px]"
                  >
                    <RotateCcw size={12} /> Rollback
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation modal */}
      {confirmRollback && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={20} className="text-yellow-500" />
              <h3 className="display text-lg font-bold text-white">Rollback this change?</h3>
            </div>
            <p className="text-sm text-[#A8A8A8] mb-4">
              This will restore the previous state for <span className="text-white">{SECTION_LABEL[confirmRollback.section]}</span>
              {" "}<span className="mono text-[#B52A32]">{confirmRollback.action}</span>.
              The rollback itself will be recorded in history — you can roll it forward again if needed.
            </p>
            <div className="bg-[#080808] border border-white/5 rounded p-3 mb-4">
              <div className="mono text-[9px] uppercase tracking-widest text-[#A8A8A8] mb-1">Restoring to:</div>
              <pre className="text-xs text-white/80 whitespace-pre-wrap break-words max-h-32 overflow-y-auto">{formatState(confirmRollback.previousState)}</pre>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmRollback(null)}
                disabled={busy}
                className="rounded-full border border-white/15 px-5 py-2 text-xs text-white hover:bg-white/5 disabled:opacity-50 min-h-[36px]"
              >
                Cancel
              </button>
              <button
                onClick={rollback}
                disabled={busy}
                className="flex items-center gap-2 rounded-full bg-yellow-600 disabled:opacity-50 px-5 py-2 text-xs font-semibold text-white hover:bg-yellow-500 min-h-[36px]"
              >
                {busy ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                Confirm Rollback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatState(state: any): string {
  if (!state) return "(none)";
  try {
    return JSON.stringify(state, null, 2);
  } catch {
    return String(state);
  }
}
