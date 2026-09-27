"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, X, Loader2, Save } from "lucide-react";

type Meal = {
  id: string;
  type: string;
  label: string;
  date: string | null;
  startTime: string;
  endTime: string;
  enabled: boolean;
};

const MEAL_TYPES = ["BREAKFAST", "LUNCH", "SNACKS", "DINNER", "CUSTOM"];

export function MealManager() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<{ meals: Meal[] }>({
    queryKey: ["admin-meals"],
    queryFn: async () => (await fetch("/api/admin/meals")).json(),
  });
  const meals: Meal[] = data?.meals ?? [];

  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<any>({ type: "LUNCH", label: "", date: new Date().toISOString().slice(0, 10), startTime: "12:00", endTime: "14:00", enabled: true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/admin/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed");
      setCreating(false);
      setDraft({ type: "LUNCH", label: "", date: new Date().toISOString().slice(0, 10), startTime: "12:00", endTime: "14:00", enabled: true });
      qc.invalidateQueries({ queryKey: ["admin-meals"] });
      qc.invalidateQueries({ queryKey: ["meals"] });
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  };

  const update = async (id: string, patch: Partial<Meal>) => {
    await fetch(`/api/admin/meals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    qc.invalidateQueries({ queryKey: ["admin-meals"] });
    qc.invalidateQueries({ queryKey: ["meals"] });
  };

  const del = async (id: string) => {
    if (!confirm("Delete this meal? Existing check-ins will be preserved.")) return;
    await fetch(`/api/admin/meals/${id}`, { method: "DELETE" });
    qc.invalidateQueries({ queryKey: ["admin-meals"] });
    qc.invalidateQueries({ queryKey: ["meals"] });
  };

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="mono text-[10px] uppercase tracking-[0.3em] text-[#B52A32] mb-2">/ Meals</div>
          <h1 className="display text-2xl md:text-3xl font-bold text-white">Meal Management</h1>
          <p className="text-sm text-[#A8A8A8] mt-1">{meals.length} meals configured · toggle enabled to open/close check-in</p>
        </div>
        <button onClick={() => setCreating(true)} className="flex items-center gap-2 rounded-full bg-[#B52A32] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#D83A43] min-h-[44px]">
          <Plus size={14} /> Add Meal
        </button>
      </header>

      {error && <div className="glass rounded p-3 text-sm text-[#D83A43] border-l-2 border-[#B52A32]">{error}</div>}

      {creating && (
        <div className="glass rounded-lg p-5 border-l-2 border-[#B52A32]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">New Meal</h3>
            <button onClick={() => setCreating(false)} className="text-[#A8A8A8] hover:text-white"><X size={16} /></button>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <Labeled label="Label"><input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="Lunch" className={inputCls} /></Labeled>
            <Labeled label="Type">
              <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })} className={inputCls}>
                {MEAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Labeled>
            <Labeled label="Date"><input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className={inputCls} /></Labeled>
            <Labeled label="Start Time"><input type="time" value={draft.startTime} onChange={(e) => setDraft({ ...draft, startTime: e.target.value })} className={inputCls} /></Labeled>
            <Labeled label="End Time"><input type="time" value={draft.endTime} onChange={(e) => setDraft({ ...draft, endTime: e.target.value })} className={inputCls} /></Labeled>
          </div>
          <button onClick={create} disabled={busy || !draft.label} className="mt-4 flex items-center gap-2 rounded-full bg-[#B52A32] disabled:opacity-50 px-5 py-2 text-sm font-semibold text-white hover:bg-[#D83A43]">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Create Meal
          </button>
        </div>
      )}

      <div className="space-y-2">
        {isLoading ? (
          <div className="text-[#A8A8A8] text-sm">Loading…</div>
        ) : meals.map(m => (
          <div key={m.id} className="glass rounded-lg p-4 flex items-center gap-4 flex-wrap">
            <div className="mono text-xs text-[#B52A32] w-20">{m.type}</div>
            <input
              value={m.label}
              onChange={(e) => update(m.id, { label: e.target.value })}
              className="flex-1 min-w-[120px] bg-transparent border-b border-white/10 text-sm text-white focus:border-[#B52A32] focus:outline-none pb-1"
            />
            <input
              type="date"
              value={m.date || ""}
              onChange={(e) => update(m.id, { date: e.target.value })}
              className="bg-[#080808] border border-white/10 rounded px-2 py-1 text-xs text-white"
            />
            <input
              type="time"
              value={m.startTime}
              onChange={(e) => update(m.id, { startTime: e.target.value })}
              className="bg-[#080808] border border-white/10 rounded px-2 py-1 text-xs text-white"
            />
            <span className="text-[#A8A8A8]">—</span>
            <input
              type="time"
              value={m.endTime}
              onChange={(e) => update(m.id, { endTime: e.target.value })}
              className="bg-[#080808] border border-white/10 rounded px-2 py-1 text-xs text-white"
            />
            <button
              onClick={() => update(m.id, { enabled: !m.enabled })}
              className={`text-xs px-3 py-1 rounded ${m.enabled ? "bg-[#B52A32]/20 text-[#D83A43]" : "bg-[#151515] text-[#A8A8A8]"}`}
            >
              {m.enabled ? "Enabled" : "Disabled"}
            </button>
            <button onClick={() => del(m.id)} className="text-[#A8A8A8] hover:text-[#D83A43]" aria-label="Delete">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const inputCls = "w-full bg-[#080808] border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:border-[#B52A32] focus:outline-none";

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mono text-[9px] uppercase tracking-widest text-[#A8A8A8]">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
