"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Users, Crown, X, Download, UtensilsCrossed, Check, Clock, FileSpreadsheet } from "lucide-react";
import QRCode from "qrcode";

type ApprovedTeam = {
  id: string;
  teamName: string;
  registrationId: string | null;
  college: string | null;
  createdAt: string;
  _count: { members: number };
  members: {
    id: string;
    fullName: string;
    participantId: string | null;
    qrToken: string | null;
    isLeader: boolean;
    college: string;
    degree: string | null;
    hasParticipantImage: boolean;
    participantImageFileName: string | null;
  }[];
};

type MealStat = {
  meal: { id: string; type: string; label: string; date: string | null; startTime: string; endTime: string; enabled: boolean };
  totalApproved: number;
  eatenCount: number;
  notEatenCount: number;
  eaten: { participantId: string | null; fullName: string; teamName: string; registrationId: string | null; checkedInAt: string }[];
  notEaten: { participantId: string | null; fullName: string; teamName: string; registrationId: string | null }[];
};

export function CoordinatorPortal() {
  const [tab, setTab] = useState<"teams" | "meals">("teams");
  const [search, setSearch] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<ApprovedTeam | null>(null);
  const closeTeamButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!selectedTeam) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeTeamButtonRef.current?.focus();
    return () => previousFocus?.focus();
  }, [selectedTeam]);

  const { data, isLoading, error } = useQuery<{ teams: ApprovedTeam[] }>({
    queryKey: ["coordinator-teams"],
    queryFn: () => fetchCoordinatorData("/api/coordinator/teams"),
  });
  const teams: ApprovedTeam[] = data?.teams ?? [];

  const filtered = teams.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    if (t.teamName.toLowerCase().includes(q)) return true;
    if (t.registrationId?.toLowerCase().includes(q)) return true;
    if (t.members.some((m) => m.participantId?.toLowerCase().includes(q) || m.fullName.toLowerCase().includes(q))) return true;
    return false;
  });

  return (
    <div className="space-y-6">
      <header>
        <div className="mono text-[10px] uppercase tracking-[0.3em] text-[#B52A32] mb-2">/ Coordinator Portal</div>
        <h1 className="display text-2xl md:text-3xl font-bold text-white">Event Operations</h1>
      </header>

      {/* Tabs */}
      <div className="flex gap-1">
        <button
          onClick={() => setTab("teams")}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all ${
            tab === "teams" ? "bg-[#B52A32] text-white" : "border border-white/10 text-[#A8A8A8] hover:text-white hover:bg-white/5"
          }`}
        >
          <Users size={14} /> Approved Teams
        </button>
        <button
          onClick={() => setTab("meals")}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all ${
            tab === "meals" ? "bg-[#B52A32] text-white" : "border border-white/10 text-[#A8A8A8] hover:text-white hover:bg-white/5"
          }`}
        >
          <UtensilsCrossed size={14} /> Meal Consumption
        </button>
      </div>

      {tab === "teams" && (
        <>
          {/* Search + CSV download */}
          {teams.length > 0 && (
            <div className="flex gap-3 items-center max-w-md">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A8A8]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search team name, ID, or participant…"
                  className="w-full bg-[#080808] border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-[#A8A8A8]/50 focus:border-[#B52A32] focus:outline-none"
                />
              </div>
              <button
                onClick={downloadTeamsCSV}
                className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2.5 text-xs text-white hover:border-[#B52A32] hover:bg-white/5 transition-all whitespace-nowrap"
                title="Download teams as CSV"
              >
                <FileSpreadsheet size={14} /> CSV
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="text-[#A8A8A8] text-sm">Loading…</div>
          ) : error ? (
            <div role="alert" className="glass rounded-lg p-6 text-sm text-[#D83A43]">{error.message}</div>
          ) : teams.length === 0 ? (
            <div className="glass rounded-lg p-8 text-center">
              <Users size={24} className="mx-auto text-[#A8A8A8] opacity-50 mb-3" />
              <div className="text-sm text-[#A8A8A8]">No approved teams yet.</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-[#A8A8A8] text-center py-8">No teams match your search.</div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((team) => (
                <button
                  key={team.id}
                  onClick={() => setSelectedTeam(team)}
                  className="group glass glass-hover rounded-lg p-5 text-left transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="mono text-xs text-[#B52A32]">{team.registrationId ?? "—"}</div>
                    <Users size={14} className="text-[#A8A8A8]" />
                  </div>
                  <div className="display text-lg md:text-xl font-bold text-white group-hover:text-[#D83A43] transition-colors">
                    {team.teamName}
                  </div>
                  {team.college && <div className="text-xs text-[#A8A8A8] mt-1 truncate">{team.college}</div>}
                  <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                    <span className="text-xs text-[#A8A8A8]">{team._count.members} members</span>
                    <span className="text-xs text-[#B52A32] group-hover:translate-x-1 transition-transform">View →</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "meals" && <MealConsumptionView />}

      {/* Team details modal */}
      {selectedTeam && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedTeam(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="coordinator-team-title"
            className="bg-[#0a0a0a] border border-white/10 rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setSelectedTeam(null);
              } else if (e.key === "Tab") {
                const focusable = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'));
                const first = focusable[0];
                const last = focusable.at(-1);
                if (e.shiftKey && document.activeElement === first) {
                  e.preventDefault();
                  last?.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                  e.preventDefault();
                  first?.focus();
                }
              }
            }}
          >
            <div className="sticky top-0 bg-[#0a0a0a] border-b border-white/5 p-5 flex items-center justify-between">
              <div>
                <div className="mono text-xs text-[#B52A32]">{selectedTeam.registrationId}</div>
                <h2 id="coordinator-team-title" className="display text-xl font-bold text-white mt-1">{selectedTeam.teamName}</h2>
                {selectedTeam.college && <div className="text-xs text-[#A8A8A8] mt-1">{selectedTeam.college}</div>}
              </div>
              <button ref={closeTeamButtonRef} onClick={() => setSelectedTeam(null)} aria-label="Close team details" className="text-[#A8A8A8] hover:text-white p-1">
                <X size={20} />
              </button>
            </div>
            <div className="p-5">
              <div className="mono text-[10px] uppercase tracking-widest text-[#A8A8A8] mb-3">
                Members ({selectedTeam.members.length})
              </div>
              <div className="space-y-3">
                {selectedTeam.members.map((m, i) => (
                  <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg bg-[#080808] border border-white/5">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full mono text-xs ${
                      m.isLeader ? "bg-[#B52A32] text-white" : "bg-[#151515] text-[#B52A32] border border-white/10"
                    }`}>
                      {m.isLeader ? <Crown size={12} /> : String(i + 1).padStart(2, "0")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white font-medium truncate">
                        {m.fullName}
                        {m.isLeader && <span className="ml-2 text-[10px] text-[#D83A43]">· LEADER</span>}
                      </div>
                      <div className="mono text-xs text-[#B52A32]">{m.participantId ?? "—"}</div>
                      <div className="text-xs text-[#A8A8A8] truncate">{m.college}</div>
                      {m.degree && (
                        <div className="text-[11px] text-[#A8A8A8] truncate mt-0.5">Degree: {m.degree}</div>
                      )}
                    </div>
                    {m.hasParticipantImage && (
                      <a href={`/api/admin/participants/${m.id}/image`} download={m.participantImageFileName ?? undefined} title={`Download ${m.fullName}'s participant photo`}>
                        <img src={`/api/admin/participants/${m.id}/image`} alt={`${m.fullName} participant photo`} className="h-12 w-12 rounded object-cover" />
                      </a>
                    )}
                    {m.qrToken && m.participantId && (
                      <button
                        onClick={() => downloadParticipantQR(m.fullName, m.qrToken!)}
                        className="flex items-center gap-1 text-xs text-[#A8A8A8] hover:text-white px-2 py-1.5 rounded hover:bg-white/5 transition-colors shrink-0"
                        title="Download QR code as PNG"
                      >
                        <Download size={12} /> QR
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {selectedTeam.members.length > 0 && (
                <button
                  onClick={() => {
                    selectedTeam.members.forEach((m) => {
                      if (m.qrToken) {
                        downloadParticipantQR(m.fullName, m.qrToken);
                      }
                    });
                  }}
                  className="mt-4 w-full flex items-center justify-center gap-2 rounded-full bg-[#B52A32] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#D83A43] transition-all"
                >
                  <Download size={14} /> Download All QR Codes
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Meal Consumption View (read-only for coordinators) ─────────────────────

function MealConsumptionView() {
  const [activeMealId, setActiveMealId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<{ meals: MealStat[]; totalApproved: number }>({
    queryKey: ["food-stats-coordinator"],
    queryFn: () => fetchCoordinatorData("/api/food/stats"),
    refetchInterval: 15000,
  });
  const meals = data?.meals ?? [];

  const activeMeal = meals.find((m) => m.meal.id === activeMealId) ?? meals[0];

  if (isLoading) return <div className="text-[#A8A8A8] text-sm">Loading meal data…</div>;
  if (error) return <div role="alert" className="glass rounded-lg p-6 text-sm text-[#D83A43]">{error.message}</div>;
  if (meals.length === 0) return <div className="glass rounded-lg p-8 text-center text-sm text-[#A8A8A8]">No meals configured.</div>;

  const pct = activeMeal?.totalApproved > 0 ? (activeMeal.eatenCount / activeMeal.totalApproved) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Meal overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {meals.map((m) => {
          const p = m.totalApproved > 0 ? (m.eatenCount / m.totalApproved) * 100 : 0;
          return (
            <button
              key={m.meal.id}
              onClick={() => setActiveMealId(m.meal.id)}
              className={`glass rounded-lg p-4 text-left transition-all ${
                activeMeal?.meal.id === m.meal.id ? "border-[#B52A32] red-glow" : "hover:border-white/20"
              }`}
            >
              <div className="mono text-[10px] uppercase tracking-widest text-[#A8A8A8]">{m.meal.label}</div>
              <div className="display text-2xl font-bold text-white mt-1">{m.eatenCount}<span className="text-[#A8A8A8] text-base">/{m.totalApproved}</span></div>
              <div className="mt-2 h-1 bg-[#080808] rounded-full overflow-hidden">
                <div className="h-full bg-[#B52A32]" style={{ width: `${p}%` }} />
              </div>
            </button>
          );
        })}
      </div>

      {activeMeal && (
        <>
          {/* Big progress */}
          <div className="glass rounded-lg p-5 md:p-8">
            <div className="flex items-end justify-between mb-4 flex-wrap gap-2">
              <div>
                <div className="mono text-[10px] uppercase tracking-widest text-[#A8A8A8]">{activeMeal.meal.label}</div>
                <div className="display text-4xl md:text-5xl font-bold text-white mt-1">
                  {activeMeal.eatenCount} <span className="text-[#A8A8A8] text-2xl md:text-3xl">/ {activeMeal.totalApproved}</span>
                </div>
                <div className="text-xs text-[#A8A8A8] mt-1">served</div>
              </div>
              <div className="text-right">
                <div className="display text-2xl md:text-3xl font-bold text-[#B52A32]">{activeMeal.notEatenCount}</div>
                <div className="text-xs text-[#A8A8A8] mt-1">not yet eaten</div>
              </div>
            </div>
            <div className="h-3 bg-[#080808] rounded-full overflow-hidden border border-white/5">
              <div className="h-full bg-gradient-to-r from-[#8B1E24] to-[#D83A43] transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-2 text-xs text-[#A8A8A8] text-right">{Math.round(pct)}% served</div>
          </div>

          {/* Who ate / who hasn't — grouped by team */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Eaten */}
            <div className="glass rounded-lg overflow-hidden">
              <div className="p-4 border-b border-white/5 flex items-center gap-2">
                <Check size={14} className="text-green-400" />
                <h3 className="text-sm font-semibold text-white">Eaten ({activeMeal.eatenCount})</h3>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-white/5">
                {activeMeal.eaten.length === 0 ? (
                  <div className="p-4 text-center text-sm text-[#A8A8A8]">No one has eaten yet.</div>
                ) : (
                  activeMeal.eaten.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 p-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white truncate">{p.fullName}</div>
                        <div className="text-xs text-[#A8A8A8] truncate">{p.teamName}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="mono text-xs text-[#B52A32]">{p.participantId ?? "—"}</div>
                        <div className="text-xs text-[#A8A8A8]">{new Date(p.checkedInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Not eaten */}
            <div className="glass rounded-lg overflow-hidden">
              <div className="p-4 border-b border-white/5 flex items-center gap-2">
                <Clock size={14} className="text-[#A8A8A8]" />
                <h3 className="text-sm font-semibold text-white">Not Eaten ({activeMeal.notEatenCount})</h3>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-white/5">
                {activeMeal.notEaten.length === 0 ? (
                  <div className="p-4 text-center text-sm text-[#A8A8A8]">Everyone has eaten!</div>
                ) : (
                  activeMeal.notEaten.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 p-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white truncate">{p.fullName}</div>
                        <div className="text-xs text-[#A8A8A8] truncate">{p.teamName}</div>
                      </div>
                      <div className="mono text-xs text-[#B52A32] shrink-0">{p.participantId ?? "—"}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

async function fetchCoordinatorData<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    if (response.status === 401) throw new Error("Your session has expired. Please sign in again.");
    if (response.status === 403) throw new Error("You do not have permission to view this data.");
    throw new Error("Unable to load data. Please try again.");
  }
  return response.json() as Promise<T>;
}

// The authorized server export reads complete team/member/payment rows from PostgreSQL.
export function downloadTeamsCSV() {
  window.location.assign("/api/coordinator/teams/export");
}
async function downloadParticipantQR(fullName: string, qrToken: string) {
  // Generate QR code data URL from the opaque token (this is what the scanner reads)
  const qrDataUrl = await QRCode.toDataURL(qrToken, {
    width: 400,
    margin: 2,
    color: { dark: "#000000", light: "#FFFFFF" },
    errorCorrectionLevel: "M",
  });

  const W = 400, H = 460;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // White background for QR scannability
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H);

  // QR code
  const qrImg = new Image();
  qrImg.onload = () => {
    const qrSize = 380;
    ctx.drawImage(qrImg, (W - qrSize) / 2, 10, qrSize, qrSize);

    // Name at the bottom
    ctx.fillStyle = "#000000";
    ctx.font = "bold 20px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(fullName, W / 2, H - 15);

    // Download with participant name as filename
    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    const safeName = fullName.replace(/[^a-zA-Z0-9 _-]/g, "").trim() || "participant";
    a.download = `${safeName}.png`;
    a.click();
  };
  qrImg.src = qrDataUrl;
}
