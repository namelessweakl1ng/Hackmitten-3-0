"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";

type Sponsor = { id: string; name: string; logoUrl: string; websiteUrl: string | null; tier: string; customTier: string | null };

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : `Request failed (${response.status})`);
  return result as T;
}

export function SponsorManager() {
  const queryClient = useQueryClient();
  const { data, isLoading, error: queryError } = useQuery<{ sponsors: Sponsor[] }>({
    queryKey: ["admin-sponsors"], queryFn: () => request("/api/admin/sponsors"),
  });
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [tier, setTier] = useState("PARTNER");
  const [customTier, setCustomTier] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const selectLogo = (file: File | null) => {
    setError(null);
    if (file && !["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setLogo(null); setError("Logo must be a PNG, JPG, or WebP image."); return;
    }
    if (file && file.size > 8 * 1024 * 1024) {
      setLogo(null); setError("Logo must be 8 MB or smaller."); return;
    }
    setLogo(file);
  };

  useEffect(() => {
    if (!logo) { setPreview(null); return; }
    const url = URL.createObjectURL(logo); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logo]);

  const reset = () => { setAdding(false); setName(""); setWebsiteUrl(""); setTier("PARTNER"); setCustomTier(""); setLogo(null); };
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin-sponsors"] });
    await queryClient.invalidateQueries({ queryKey: ["sponsors"] });
  };
  const add = async (event: React.FormEvent) => {
    event.preventDefault(); if (!logo) return;
    setBusyId("new"); setError(null); setSuccess(null);
    const body = new FormData();
    body.set("name", name); body.set("websiteUrl", websiteUrl); body.set("tier", tier); body.set("customTier", customTier); body.set("logo", logo);
    try { await request("/api/admin/sponsors", { method: "POST", body }); await refresh(); reset(); setSuccess(`${name} was added.`); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to add sponsor."); }
    finally { setBusyId(null); }
  };
  const remove = async (sponsor: Sponsor) => {
    if (!confirm("Are you sure you want to remove this sponsor?")) return;
    setBusyId(sponsor.id); setError(null); setSuccess(null);
    try { await request(`/api/admin/sponsors/${sponsor.id}`, { method: "DELETE" }); await refresh(); setSuccess(`${sponsor.name} was removed.`); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to remove sponsor."); }
    finally { setBusyId(null); }
  };

  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><div className="mono mb-2 text-[10px] uppercase tracking-[0.3em] text-[#B52A32]">/ Sponsors</div>
        <h1 className="display text-2xl font-bold text-white md:text-3xl">Sponsor Management</h1>
        <p className="mt-1 text-sm text-[#A8A8A8]">Manage the organizations shown on the public website.</p></div>
      <button type="button" onClick={() => setAdding(true)} disabled={adding || busyId !== null} className="flex min-h-11 items-center gap-2 rounded-full bg-[#B52A32] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#D83A43] disabled:opacity-50"><Plus size={16}/> Add Sponsor</button>
    </header>
    {(error || queryError) && <div role="alert" className="rounded border-l-2 border-[#B52A32] bg-[#B52A32]/10 p-3 text-sm text-[#D83A43]">{error || queryError?.message}</div>}
    {success && <div role="status" className="rounded border-l-2 border-emerald-500 bg-emerald-500/10 p-3 text-sm text-emerald-300">{success}</div>}

    {adding && <form onSubmit={add} className="glass rounded-lg border-l-2 border-[#B52A32] p-5">
      <div className="mb-5 flex items-center justify-between"><h2 className="font-semibold">New Sponsor</h2><button type="button" aria-label="Close" onClick={reset} disabled={busyId !== null}><X size={18}/></button></div>
      <div className="grid gap-5 lg:grid-cols-[180px_1fr]">
        <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed border-white/20 bg-[#080808] text-center text-xs text-[#A8A8A8] hover:border-[#B52A32]">
          {preview ? <img src={preview} alt="Logo preview" className="h-40 w-full object-contain p-3"/> : <><ImagePlus className="mb-2"/><span>Choose logo</span><span className="mt-1 text-[10px]">PNG, JPG, or WebP · max 8 MB</span></>}
          <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" required onChange={(e) => selectLogo(e.target.files?.[0] ?? null)}/>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Sponsor name"><input className={inputClass} required maxLength={120} value={name} onChange={(e) => setName(e.target.value)}/></Field>
          <Field label="Website URL (optional)"><input className={inputClass} type="url" placeholder="https://example.com" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)}/></Field>
          <Field label="Tier"><select className={inputClass} value={tier} onChange={(e) => setTier(e.target.value)}><option value="TITLE">Title</option><option value="PARTNER">Partner</option><option value="CUSTOM">Custom</option></select></Field>
          {tier === "CUSTOM" && <Field label="Custom tier"><input className={inputClass} maxLength={80} value={customTier} onChange={(e) => setCustomTier(e.target.value)}/></Field>}
        </div>
      </div>
      <button disabled={busyId !== null || !name.trim() || !logo} className="mt-5 flex min-h-11 items-center gap-2 rounded-full bg-[#B52A32] px-5 py-2 text-sm font-semibold disabled:opacity-50">{busyId === "new" ? <Loader2 className="animate-spin" size={16}/> : <Plus size={16}/>} Add Sponsor</button>
    </form>}

    {isLoading ? <p className="text-sm text-[#A8A8A8]">Loading sponsors…</p> : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {data?.sponsors.map((sponsor) => <article key={sponsor.id} className="glass flex min-w-0 items-center gap-4 rounded-lg p-4">
        <div className="flex h-20 w-24 shrink-0 items-center justify-center rounded bg-white p-2"><img src={sponsor.logoUrl} alt={`${sponsor.name} logo`} className="max-h-full max-w-full object-contain"/></div>
        <div className="min-w-0 flex-1"><h2 className="truncate font-semibold">{sponsor.name}</h2><div className="mono mt-1 text-[10px] uppercase tracking-wider text-[#B52A32]">{sponsor.customTier || sponsor.tier}</div>
          {sponsor.websiteUrl && <a href={sponsor.websiteUrl} target="_blank" rel="noopener noreferrer" className="mt-1 block truncate text-xs text-[#A8A8A8] hover:text-white">{sponsor.websiteUrl}</a>}</div>
        <button type="button" aria-label={`Remove ${sponsor.name}`} onClick={() => remove(sponsor)} disabled={busyId !== null} className="rounded p-2 text-[#A8A8A8] hover:bg-[#B52A32]/10 hover:text-[#D83A43] disabled:opacity-50">{busyId === sponsor.id ? <Loader2 className="animate-spin" size={17}/> : <Trash2 size={17}/>}</button>
      </article>)}
      {data?.sponsors.length === 0 && <p className="text-sm text-[#A8A8A8]">No sponsors have been added.</p>}
    </div>}
  </div>;
}

const inputClass = "mt-1 w-full rounded border border-white/10 bg-[#080808] px-3 py-2.5 text-sm text-white outline-none focus:border-[#B52A32]";
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mono text-[9px] uppercase tracking-widest text-[#A8A8A8]">{label}</span>{children}</label>; }
