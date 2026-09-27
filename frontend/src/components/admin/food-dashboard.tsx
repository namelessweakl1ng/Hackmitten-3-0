"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { UtensilsCrossed, Check, Clock, Users, ScanLine, History } from "lucide-react";

type MealStat = {
  meal: {
    id: string;
    type: string;
    label: string;
    date: string | null;
    startTime: string;
    endTime: string;
    enabled: boolean;
  };
  totalApproved: number;
  eatenCount: number;
  notEatenCount: number;
  eaten: {
    participantId: string | null;
    fullName: string;
    teamName: string;
    registrationId: string | null;
    checkedInAt: string;
  }[];
  notEaten: {
    participantId: string | null;
    fullName: string;
    teamName: string;
    registrationId: string | null;
  }[];
};

type TeamStatus = {
  id: string;
  teamName: string;
  registrationId: string | null;
  members: {
    id: string;
    fullName: string;
    participantId: string | null;
    isLeader: boolean;
    meals: {
      mealId: string;
      mealLabel: string;
      mealType: string;
      eaten: boolean;
      checkedInAt: string | null;
    }[];
  }[];
};

export function FoodDashboard() {
  const [activeMealId, setActiveMealId] = useState<string>("");
  const [view, setView] = useState<"consumption" | "team" | "scanner" | "history">("consumption");

  const { data: statsData } = useQuery<{ meals: MealStat[]; totalApproved: number }>({
    queryKey: ["food-stats"],
    queryFn: async () => (await fetch("/api/food/stats")).json(),
    refetchInterval: 10000,
  });
  const meals = statsData?.meals ?? [];

  // Derive the active meal — if no meal is selected, default to the first one
  const activeMeal = meals.find((m) => m.meal.id === activeMealId) ?? meals[0];

  return (
    <div className="space-y-6">
      <header>
        <div className="mono text-[10px] uppercase tracking-[0.3em] text-[#B52A32] mb-2">/ Food Dashboard</div>
        <h1 className="display text-2xl md:text-3xl font-bold text-white">Meal Consumption</h1>
        <p className="text-sm text-[#A8A8A8] mt-1">
          {statsData?.totalApproved ?? 0} approved participants · {meals.length} meals configured
        </p>
      </header>

      {/* View tabs */}
      <div className="flex gap-1 overflow-x-auto no-scrollbar">
        {[
          { id: "consumption", label: "Consumption", icon: UtensilsCrossed },
          { id: "team", label: "Team Status", icon: Users },
          { id: "scanner", label: "Scanner", icon: ScanLine },
          { id: "history", label: "History", icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setView(tab.id as any)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all ${
                view === tab.id
                  ? "bg-[#B52A32] text-white"
                  : "border border-white/10 text-[#A8A8A8] hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon size={14} /> {tab.label}
            </button>
          );
        })}
      </div>

      {view === "consumption" && activeMeal && (
        <ConsumptionView meals={meals} activeMeal={activeMeal} setActiveMealId={setActiveMealId} />
      )}
      {view === "team" && <TeamStatusView />}
      {view === "scanner" && <ScannerView />}
      {view === "history" && <HistoryView />}
    </div>
  );
}

// ─── Consumption View ─────────────────────────────────────────────────────

function ConsumptionView({
  meals, activeMeal, setActiveMealId,
}: {
  meals: MealStat[];
  activeMeal: MealStat;
  setActiveMealId: (id: string) => void;
}) {
  const [showEaten, setShowEaten] = useState(true);
  const pct = activeMeal.totalApproved > 0 ? (activeMeal.eatenCount / activeMeal.totalApproved) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Meal selector */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {meals.map((m) => (
          <button
            key={m.meal.id}
            onClick={() => setActiveMealId(m.meal.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all ${
              m.meal.id === activeMeal.meal.id
                ? "bg-[#B52A32] text-white"
                : "border border-white/10 text-[#A8A8A8] hover:text-white"
            }`}
          >
            {m.meal.label}
          </button>
        ))}
      </div>

      {/* Big progress bar */}
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
        {/* Progress bar */}
        <div className="h-3 bg-[#080808] rounded-full overflow-hidden border border-white/5">
          <div
            className="h-full bg-gradient-to-r from-[#8B1E24] to-[#D83A43] transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-2 text-xs text-[#A8A8A8] text-right">{Math.round(pct)}% served</div>
      </div>

      {/* Eaten / Not Eaten toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowEaten(true)}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
            showEaten ? "bg-[#B52A32] text-white" : "border border-white/10 text-[#A8A8A8]"
          }`}
        >
          Eaten ({activeMeal.eatenCount})
        </button>
        <button
          onClick={() => setShowEaten(false)}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
            !showEaten ? "bg-[#B52A32] text-white" : "border border-white/10 text-[#A8A8A8]"
          }`}
        >
          Not Eaten ({activeMeal.notEatenCount})
        </button>
      </div>

      {/* Lists */}
      <div className="glass rounded-lg overflow-hidden">
        <div className="max-h-96 overflow-y-auto">
          {showEaten ? (
            activeMeal.eaten.length === 0 ? (
              <div className="p-6 text-center text-sm text-[#A8A8A8]">No one has eaten yet.</div>
            ) : (
              <div className="divide-y divide-white/5">
                {activeMeal.eaten.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 md:p-4">
                    <Check size={14} className="text-green-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white font-medium truncate">{p.fullName}</div>
                      <div className="text-xs text-[#A8A8A8] truncate">{p.teamName}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="mono text-xs text-[#B52A32]">{p.participantId ?? "—"}</div>
                      <div className="text-xs text-[#A8A8A8]">
                        {new Date(p.checkedInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            activeMeal.notEaten.length === 0 ? (
              <div className="p-6 text-center text-sm text-[#A8A8A8]">Everyone has eaten!</div>
            ) : (
              <div className="divide-y divide-white/5">
                {activeMeal.notEaten.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 md:p-4">
                    <Clock size={14} className="text-[#A8A8A8] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white font-medium truncate">{p.fullName}</div>
                      <div className="text-xs text-[#A8A8A8] truncate">{p.teamName}</div>
                    </div>
                    <div className="mono text-xs text-[#B52A32] shrink-0">{p.participantId ?? "—"}</div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Team Status View ─────────────────────────────────────────────────────

function TeamStatusView() {
  const { data, isLoading } = useQuery<{ teams: TeamStatus[]; meals: any[] }>({
    queryKey: ["food-team-status"],
    queryFn: async () => (await fetch("/api/food/team-status")).json(),
    refetchInterval: 15000,
  });
  const teams: TeamStatus[] = data?.teams ?? [];
  const meals = data?.meals ?? [];

  if (isLoading) return <div className="text-[#A8A8A8] text-sm">Loading…</div>;
  if (teams.length === 0) return <div className="glass rounded-lg p-6 text-center text-[#A8A8A8] text-sm">No approved teams yet.</div>;

  return (
    <div className="space-y-4">
      {teams.map((team) => (
        <div key={team.id} className="glass rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="mono text-xs text-[#B52A32]">{team.registrationId}</span>
            <span className="display text-sm font-bold text-white">{team.teamName}</span>
          </div>
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left mono text-[9px] uppercase tracking-widest text-[#A8A8A8]">
                  <th className="pr-3 pb-2">Member</th>
                  {meals.map((m) => (
                    <th key={m.id} className="px-2 pb-2 text-center whitespace-nowrap">{m.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {team.members.map((m) => (
                  <tr key={m.id} className="border-t border-white/5">
                    <td className="pr-3 py-2">
                      <div className="text-white">{m.fullName}</div>
                      <div className="mono text-[10px] text-[#B52A32]">{m.participantId ?? "—"}</div>
                    </td>
                    {m.meals.map((mm) => (
                      <td key={mm.mealId} className="px-2 py-2 text-center">
                        {mm.eaten ? (
                          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-green-500/20 text-green-400">
                            <Check size={12} />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-white/5 text-[#A8A8A8]">
                            <Clock size={12} />
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Scanner View ─────────────────────────────────────────────────────────

function ScannerView() {
  return (
    <div className="space-y-4">
      <div className="glass rounded-lg p-6 text-center">
        <ScanLine size={32} className="mx-auto text-[#B52A32] mb-3" />
        <h3 className="display text-lg font-bold text-white mb-2">QR Scanner</h3>
        <p className="text-sm text-[#A8A8A8] mb-4">
          Use the dedicated scanner page for the best mobile scanning experience.
        </p>
        <a
          href="/food-admin"
          className="inline-flex items-center gap-2 rounded-full bg-[#B52A32] px-6 py-3 text-sm font-semibold text-white hover:bg-[#D83A43] transition-all min-h-[44px]"
        >
          <ScanLine size={14} /> Open Scanner
        </a>
      </div>
    </div>
  );
}

// ─── History View ─────────────────────────────────────────────────────────

function HistoryView() {
  const { data, isLoading } = useQuery({
    queryKey: ["food-check-ins-recent"],
    queryFn: async () => {
      const r = await fetch("/api/food/check-ins?pageSize=30");
      return r.json();
    },
    refetchInterval: 10000,
  });
  const checkIns: any[] = data?.checkIns ?? [];

  return (
    <div className="glass rounded-lg overflow-hidden">
      <div className="p-4 border-b border-white/5">
        <h3 className="text-sm font-semibold text-white">Recent Check-ins</h3>
      </div>
      {isLoading ? (
        <div className="p-6 text-sm text-[#A8A8A8]">Loading…</div>
      ) : checkIns.length === 0 ? (
        <div className="p-6 text-center text-sm text-[#A8A8A8]">No check-ins yet.</div>
      ) : (
        <div className="max-h-96 overflow-y-auto divide-y divide-white/5">
          {checkIns.map((c) => (
            <div key={c.id} className="flex items-center gap-3 p-3">
              <Check size={14} className="text-green-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white font-medium truncate">{c.participant.fullName}</div>
                <div className="text-xs text-[#A8A8A8] truncate">{c.participant.team.teamName} · {c.meal.label}</div>
              </div>
              <div className="mono text-xs text-[#A8A8A8] shrink-0">
                {new Date(c.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
