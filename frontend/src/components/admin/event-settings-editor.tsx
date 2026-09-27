"use client";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Save } from "lucide-react";

type Config = { registrationEnabled: boolean; registrationLimit: number | null };
export function EventSettingsEditor() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<{ config: Config }>({
    queryKey: ["config"],
    queryFn: async () => { const response = await fetch("/api/admin/config"); if (!response.ok) throw new Error("Unable to load registration settings"); return response.json(); },
  });
  const [form, setForm] = useState<Config>({ registrationEnabled: false, registrationLimit: null });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (data?.config) setForm(data.config); }, [data]);
  const save = async () => {
    setSaving(true); setSaved(false); setError(null);
    try {
      const response = await fetch("/api/admin/config", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save registration settings");
      setForm(result.config); setSaved(true);
      await queryClient.invalidateQueries({ queryKey: ["event-state"] });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Save failed"); }
    finally { setSaving(false); }
  };
  if (isLoading) return <div className="text-[#A8A8A8]">Loading registration settings…</div>;
  return <div className="glass max-w-3xl space-y-6 rounded-lg p-6">
    <header><div className="mono mb-2 text-[10px] uppercase tracking-[0.3em] text-[#B52A32]">/ Operations</div><h1 className="display text-2xl font-bold text-white">Registration Control</h1><p className="mt-1 text-sm text-[#A8A8A8]">Control whether teams may register and set the maximum team count.</p></header>
    <label className="flex items-center justify-between gap-4 rounded border border-white/10 bg-[#080808] p-4"><span><span className="block font-medium text-white">Registration enabled</span><span className="text-xs text-[#A8A8A8]">The API enforces this setting.</span></span><input aria-label="Registration enabled" type="checkbox" checked={form.registrationEnabled} onChange={(event) => setForm({ ...form, registrationEnabled: event.target.checked })} className="h-5 w-5 accent-[#B52A32]" /></label>
    <label className="block"><span className="mono text-[10px] uppercase tracking-widest text-[#A8A8A8]">Registration limit</span><input type="number" min="1" value={form.registrationLimit ?? ""} onChange={(event) => setForm({ ...form, registrationLimit: event.target.value === "" ? null : Math.max(1, Number(event.target.value)) })} placeholder="Unlimited" className="mt-1 w-full rounded border border-white/10 bg-[#080808] px-3 py-2 text-sm text-white" /><span className="mt-1 block text-xs text-[#A8A8A8]">Leave blank for no limit.</span></label>
    {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
    <button onClick={save} disabled={saving} className="flex min-h-11 items-center gap-2 rounded-full bg-[#B52A32] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Save size={14} />}{saving ? "Saving…" : saved ? "Saved" : "Save settings"}</button>
  </div>;
}
