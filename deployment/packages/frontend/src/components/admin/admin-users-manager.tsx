"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, X, Loader2, Save, ShieldCheck } from "lucide-react";

type AdminUser = {
  id: string;
  username: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
};

export function AdminUsersManager() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<{ users: AdminUser[] }>({
    queryKey: ["admin-users"],
    queryFn: async () => (await fetch("/api/admin/users")).json(),
  });
  const users: AdminUser[] = data?.users ?? [];

  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<any>({ username: "", email: "", name: "", role: "COORDINATOR", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, name: draft.name || undefined }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed");
      setCreating(false);
      setDraft({ username: "", email: "", name: "", role: "COORDINATOR", password: "" });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  };

  const del = async (id: string) => {
    if (!confirm("Delete this admin user? This cannot be undone.")) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    const j = await res.json();
    if (!res.ok) { alert(j.error || "Failed"); return; }
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  };

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="mono text-[10px] uppercase tracking-[0.3em] text-[#B52A32] mb-2">/ Admin Users</div>
          <h1 className="display text-2xl md:text-3xl font-bold text-white">Admin User Accounts</h1>
          <p className="text-sm text-[#A8A8A8] mt-1">{users.length} accounts · create coordinators or food admins</p>
        </div>
        <button onClick={() => setCreating(true)} className="flex items-center gap-2 rounded-full bg-[#B52A32] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#D83A43] min-h-[44px]">
          <Plus size={14} /> Add User
        </button>
      </header>

      {error && <div className="glass rounded p-3 text-sm text-[#D83A43] border-l-2 border-[#B52A32]">{error}</div>}

      {creating && (
        <div className="glass rounded-lg p-5 border-l-2 border-[#B52A32]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">New Admin User</h3>
            <button onClick={() => setCreating(false)} className="text-[#A8A8A8] hover:text-white"><X size={16} /></button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Labeled label="Username"><input value={draft.username} onChange={(e) => setDraft({ ...draft, username: e.target.value })} className={inputCls} /></Labeled>
            <Labeled label="Email"><input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} className={inputCls} /></Labeled>
            <Labeled label="Name (optional)"><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={inputCls} /></Labeled>
            <Labeled label="Role">
              <select value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} className={inputCls}>
                <option value="COORDINATOR">Coordinator</option>
                <option value="FOOD_ADMIN">Food Admin</option>
                <option value="PARTICIPANT">Participant</option>
              </select>
            </Labeled>
            <Labeled label="Password (min 8 chars)"><input type="password" value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} className={inputCls} /></Labeled>
          </div>
          <button onClick={create} disabled={busy || !draft.username || !draft.email || !draft.password} className="mt-4 flex items-center gap-2 rounded-full bg-[#B52A32] disabled:opacity-50 px-5 py-2 text-sm font-semibold text-white hover:bg-[#D83A43]">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Create User
          </button>
        </div>
      )}

      <div className="glass rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5">
              <tr className="text-left mono text-[10px] uppercase tracking-widest text-[#A8A8A8]">
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3 hidden md:table-cell">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3 hidden md:table-cell">Created</th>
                <th className="px-4 py-3 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[#A8A8A8]">Loading…</td></tr>
              ) : users.map(u => (
                <tr key={u.id} className="hover:bg-white/5">
                  <td className="px-4 py-3 text-white font-medium">{u.username}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-[#A8A8A8]">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold ${u.role === "SUPER_ADMIN" ? "text-[#D83A43]" : u.role === "COORDINATOR" ? "text-blue-400" : "text-[#A8A8A8]"}`}>
                      {u.role === "SUPER_ADMIN" && <ShieldCheck size={10} className="inline mr-1" />}
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-[#A8A8A8] text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {u.role !== "SUPER_ADMIN" && (
                      <button onClick={() => del(u.id)} className="text-[#A8A8A8] hover:text-[#D83A43]" aria-label="Delete">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
