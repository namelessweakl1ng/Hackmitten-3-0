"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Pencil, X, Loader2, Crown, AlertTriangle, Search } from "lucide-react";

type Team = {
  id: string;
  teamName: string;
  registrationId: string | null;
  status: string;
  college: string | null;
  createdAt: string;
  members: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    college: string;
    degree: string | null;
    isLeader: boolean;
    participantId: string | null;
  }[];
  payment: { id: string; status: string; transactionId: string | null } | null;
};

export function TeamManager() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Team | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Team | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ teams: Team[] }>({
    queryKey: ["admin-teams"],
    queryFn: async () => (await fetch("/api/admin/teams")).json(),
  });
  const teams: Team[] = data?.teams ?? [];
  const filtered = teams.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return t.teamName.toLowerCase().includes(q) || t.registrationId?.toLowerCase().includes(q) || t.college?.toLowerCase().includes(q);
  });

  const deleteTeam = async () => {
    if (!confirmDelete) return;
    setBusy(true); setError(null);
    try {
      const r = await fetch(`/api/admin/teams/${confirmDelete.id}`, { method: "DELETE" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed");
      setConfirmDelete(null);
      qc.invalidateQueries({ queryKey: ["admin-teams"] });
      qc.invalidateQueries({ queryKey: ["admin-registrations"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="mono text-[10px] uppercase tracking-[0.3em] text-[#B52A32] mb-2">/ Teams</div>
          <h1 className="display text-2xl md:text-3xl font-bold text-white">Team Management</h1>
          <p className="text-sm text-[#A8A8A8] mt-1">{teams.length} teams · add, edit, or delete</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-full bg-[#B52A32] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#D83A43] min-h-[44px]"
        >
          <Plus size={14} /> Add Team
        </button>
      </header>

      {error && <div className="glass rounded p-3 text-sm text-[#D83A43] border-l-2 border-[#B52A32]">{error}</div>}

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A8A8]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search team name, ID, or college…"
          className="w-full bg-[#080808] border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-[#A8A8A8]/50 focus:border-[#B52A32] focus:outline-none"
        />
      </div>

      {isLoading ? (
        <div className="text-[#A8A8A8] text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-lg p-8 text-center">
          <div className="text-sm text-[#A8A8A8]">No teams found.</div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((team) => (
            <div key={team.id} className="glass rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="mono text-xs text-[#B52A32]">{team.registrationId ?? "—"}</div>
                  <div className="display text-lg font-bold text-white mt-1">{team.teamName}</div>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-1 rounded ${
                  team.status === "APPROVED" ? "bg-[#B52A32]/20 text-[#D83A43]" :
                  team.status === "REJECTED" ? "bg-red-500/20 text-red-400" :
                  "bg-white/5 text-[#A8A8A8]"
                }`}>
                  {team.status.replace(/_/g, " ")}
                </span>
              </div>
              {team.college && <div className="text-xs text-[#A8A8A8] truncate">{team.college}</div>}
              <div className="mt-2 text-xs text-[#A8A8A8]">{team.members.length} members</div>
              <div className="mt-3 pt-3 border-t border-white/5 flex gap-2">
                <button
                  onClick={() => setEditing(team)}
                  className="flex items-center gap-1 text-xs text-[#A8A8A8] hover:text-white px-2 py-1 rounded hover:bg-white/5"
                >
                  <Pencil size={12} /> Edit
                </button>
                <button
                  onClick={() => setConfirmDelete(team)}
                  className="flex items-center gap-1 text-xs text-[#A8A8A8] hover:text-red-400 px-2 py-1 rounded hover:bg-white/5"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <TeamFormModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false);
            qc.invalidateQueries({ queryKey: ["admin-teams"] });
            qc.invalidateQueries({ queryKey: ["admin-registrations"] });
            qc.invalidateQueries({ queryKey: ["admin-stats"] });
          }}
        />
      )}

      {editing && (
        <TeamFormModal
          team={editing}
          onClose={() => setEditing(null)}
          onSuccess={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["admin-teams"] });
            qc.invalidateQueries({ queryKey: ["admin-registrations"] });
          }}
        />
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
          <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={20} className="text-red-400" />
              <h3 className="display text-lg font-bold text-white">Delete team?</h3>
            </div>
            <div className="mb-4 space-y-1">
              <div className="text-sm text-white">Team: <span className="font-bold">{confirmDelete.teamName}</span></div>
              <div className="text-xs text-[#A8A8A8]">Team ID: <span className="mono text-[#B52A32]">{confirmDelete.registrationId ?? "—"}</span></div>
            </div>
            <p className="text-sm text-[#A8A8A8] mb-6">
              This will permanently remove the team, all {confirmDelete.members.length} participants,
              payment records, screenshots, food check-ins, and QR/pass data. This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDelete(null)} disabled={busy} className="rounded-full border border-white/15 px-5 py-2 text-xs text-white hover:bg-white/5 disabled:opacity-50">Cancel</button>
              <button onClick={deleteTeam} disabled={busy} className="flex items-center gap-2 rounded-full bg-red-600 disabled:opacity-50 px-5 py-2 text-xs font-semibold text-white hover:bg-red-500">
                {busy ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Delete Team
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Team Form Modal (create + edit) ───────────────────────────────────────

function TeamFormModal({
  team,
  onClose,
  onSuccess,
}: {
  team?: Team;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEdit = !!team;
  const [teamName, setTeamName] = useState(team?.teamName ?? "");
  const [college, setCollege] = useState(team?.college ?? "");
  const [members, setMembers] = useState<any[]>(
    team?.members?.map((m) => ({
      id: m.id,
      fullName: m.fullName,
      email: m.email,
      phone: m.phone,
      college: m.college,
      degree: m.degree ?? "",
      isLeader: m.isLeader,
    })) ?? [
      { fullName: "", email: "", phone: "", college: "", degree: "", isLeader: true },
      { fullName: "", email: "", phone: "", college: "", degree: "", isLeader: false },
      { fullName: "", email: "", phone: "", college: "", degree: "", isLeader: false },
    ]
  );
  const [status, setStatus] = useState<"SUBMITTED" | "APPROVED">(
    team?.status === "APPROVED" ? "APPROVED" : "SUBMITTED"
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setMember = (idx: number, patch: any) => {
    setMembers((ms) => ms.map((m, i) => (i === idx ? { ...m, ...patch } : m)));
  };
  const addMember = () => {
    if (members.length < 4) setMembers([...members, { fullName: "", email: "", phone: "", college: "", degree: "", isLeader: false }]);
  };
  const removeMember = (idx: number) => {
    if (members.length > 3) setMembers(members.filter((_, i) => i !== idx));
  };

  const submit = async () => {
    setBusy(true); setError(null);
    try {
      const leaderCount = members.filter((m) => m.isLeader).length;
      if (leaderCount !== 1) {
        throw new Error("Exactly one team leader is required");
      }
      if (members.length < 3 || members.length > 4) {
        throw new Error("Minimum 3, maximum 4 members");
      }
      for (const m of members) {
        if (!m.fullName.trim() || !m.email.trim() || !m.phone.trim() || !m.college.trim()) {
          throw new Error("All member fields are required");
        }
      }

      const url = isEdit ? `/api/admin/teams/${team!.id}` : "/api/admin/teams";
      const method = isEdit ? "PATCH" : "POST";
      const body: any = { teamName, college: college || undefined, members, status };
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed");
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-[#0a0a0a] border-b border-white/5 p-5 flex items-center justify-between">
          <h3 className="display text-lg font-bold text-white">{isEdit ? "Edit Team" : "Add Team"}</h3>
          <button onClick={onClose} className="text-[#A8A8A8] hover:text-white"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-5">
          {/* Team info */}
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mono text-[10px] uppercase tracking-widest text-[#A8A8A8]">Team Name</span>
              <input value={teamName} onChange={(e) => setTeamName(e.target.value)} className="mt-1 w-full bg-[#080808] border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-[#B52A32] focus:outline-none" placeholder="Enter team name" />
            </label>
            <label className="block">
              <span className="mono text-[10px] uppercase tracking-widest text-[#A8A8A8]">College / Institution</span>
              <input value={college} onChange={(e) => setCollege(e.target.value)} className="mt-1 w-full bg-[#080808] border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-[#B52A32] focus:outline-none" placeholder="Enter college / institution name" />
            </label>
          </div>

          {!isEdit && (
            <label className="block">
              <span className="mono text-[10px] uppercase tracking-widest text-[#A8A8A8]">Status</span>
              <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="mt-1 w-full bg-[#080808] border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-[#B52A32] focus:outline-none">
                <option value="SUBMITTED">Submitted (pending approval)</option>
                <option value="APPROVED">Approved (generates IDs + QR passes immediately)</option>
              </select>
            </label>
          )}

          {/* Members */}
          <div>
            <div className="mono text-[10px] uppercase tracking-widest text-[#A8A8A8] mb-3">Members ({members.length})</div>
            <div className="space-y-3">
              {members.map((m, i) => (
                <div key={i} className="glass rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="mono text-xs text-[#B52A32]">
                      Member {String(i + 1).padStart(2, "0")}
                      {m.isLeader && <span className="ml-2 inline-flex items-center gap-1 text-[#D83A43]"><Crown size={10} /> LEADER</span>}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const newLeader = !m.isLeader;
                          setMembers(ms => ms.map((mm, idx) => ({ ...mm, isLeader: idx === i ? newLeader : false })));
                        }}
                        className={`text-[10px] px-2 py-0.5 rounded ${m.isLeader ? "bg-[#B52A32] text-white" : "border border-white/15 text-[#A8A8A8]"}`}
                      >
                        {m.isLeader ? "Leader" : "Make Leader"}
                      </button>
                      {members.length > 3 && (
                        <button onClick={() => removeMember(i)} className="text-[#A8A8A8] hover:text-red-400"><X size={12} /></button>
                      )}
                    </div>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    <input value={m.fullName} onChange={(e) => setMember(i, { fullName: e.target.value })} placeholder="Full name" className="bg-[#080808] border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:border-[#B52A32] focus:outline-none" />
                    <input type="email" value={m.email} onChange={(e) => setMember(i, { email: e.target.value })} placeholder="Email" className="bg-[#080808] border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:border-[#B52A32] focus:outline-none" />
                    <input value={m.phone} onChange={(e) => setMember(i, { phone: e.target.value })} placeholder="Phone" className="bg-[#080808] border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:border-[#B52A32] focus:outline-none" />
                    <input value={m.college} onChange={(e) => setMember(i, { college: e.target.value })} placeholder="College" className="bg-[#080808] border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:border-[#B52A32] focus:outline-none" />
                    <div className="md:col-span-2">
                      <AdminDegreeField
                        value={m.degree ?? ""}
                        onChange={(v) => setMember(i, { degree: v })}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {members.length < 4 && (
              <button onClick={addMember} className="mt-3 flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs text-white hover:border-[#B52A32] hover:bg-white/5">
                <Plus size={12} /> Add Member 4 (optional)
              </button>
            )}
          </div>

          {error && <div className="text-sm text-[#D83A43] glass rounded p-3 border-l-2 border-[#B52A32]">{error}</div>}

          <div className="flex gap-2 justify-end pt-4 border-t border-white/5">
            <button onClick={onClose} disabled={busy} className="rounded-full border border-white/15 px-5 py-2 text-xs text-white hover:bg-white/5 disabled:opacity-50">Cancel</button>
            <button onClick={submit} disabled={busy} className="flex items-center gap-2 rounded-full bg-[#B52A32] disabled:opacity-50 px-5 py-2 text-xs font-semibold text-white hover:bg-[#D83A43]">
              {busy ? <Loader2 size={12} className="animate-spin" /> : null}
              {isEdit ? "Save Changes" : "Create Team"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Admin Degree Field (dropdown + custom text input) ──────────────────────

const ADMIN_DEGREE_OPTIONS = [
  "B.E",
  "B.Tech",
  "M.E",
  "M.Tech",
  "MCA",
  "M.Sc",
  "B.Sc",
  "BCA",
  "Diploma",
  "Ph.D",
  "Other",
];

function AdminDegreeField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const isPreset = ADMIN_DEGREE_OPTIONS.includes(value) && value !== "Other";
  const isOtherSelected = !isPreset && value !== "" && !ADMIN_DEGREE_OPTIONS.includes(value);
  const selectValue = isOtherSelected || value === "Other" ? "Other" : isPreset ? value : "";

  return (
    <div className="space-y-2">
      <label className="block">
        <span className="mono text-[10px] uppercase tracking-widest text-[#A8A8A8]">Degree (optional)</span>
        <select
          value={selectValue}
          onChange={(e) => {
            if (e.target.value === "Other") {
              onChange(isOtherSelected ? value : "");
            } else {
              onChange(e.target.value);
            }
          }}
          className="mt-1 w-full bg-[#080808] border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:border-[#B52A32] focus:outline-none"
        >
          <option value="">None</option>
          {ADMIN_DEGREE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </label>
      {(isOtherSelected || selectValue === "Other") && (
        <label className="block">
          <span className="mono text-[10px] uppercase tracking-widest text-[#A8A8A8]">Specify degree</span>
          <input
            type="text"
            value={isOtherSelected ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter your degree"
            maxLength={60}
            className="mt-1 w-full bg-[#080808] border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:border-[#B52A32] focus:outline-none"
          />
        </label>
      )}
    </div>
  );
}
