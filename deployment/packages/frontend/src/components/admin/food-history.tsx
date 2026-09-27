"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, UtensilsCrossed } from "lucide-react";

export function AdminFoodHistory() {
  const [q, setQ] = useState("");
  const [mealId, setMealId] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const { data: mealsData } = useQuery({
    queryKey: ["meals"],
    queryFn: async () => (await fetch("/api/meals")).json(),
  });
  const meals: any[] = mealsData?.meals ?? [];

  const { data, isLoading } = useQuery({
    queryKey: ["food-check-ins", q, mealId, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (mealId) params.set("mealId", mealId);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      const r = await fetch(`/api/food/check-ins?${params.toString()}`);
      return r.json();
    },
    refetchInterval: 15000,
  });

  const checkIns: any[] = data?.checkIns ?? [];
  const total = data?.pagination?.total ?? 0;

  return (
    <div className="space-y-6">
      <header>
        <div className="mono text-[10px] uppercase tracking-[0.3em] text-[#B52A32] mb-2">
          / Food Check-ins
        </div>
        <h1 className="display text-3xl md:text-4xl font-bold text-white">Food Administration</h1>
        <p className="text-sm text-[#A8A8A8] mt-1">
          {total} total check-ins · use the food admin scanner for live check-ins
        </p>
      </header>

      {/* Filters */}
      <div className="glass rounded-lg p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A8A8]" />
          <input
            type="text"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Search participant, team, participant ID…"
            className="w-full bg-[#080808] border border-white/10 rounded pl-9 pr-3 py-2 text-sm text-white focus:border-[#B52A32] focus:outline-none"
          />
        </div>
        <select
          value={mealId}
          onChange={(e) => { setMealId(e.target.value); setPage(1); }}
          className="bg-[#080808] border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-[#B52A32] focus:outline-none"
        >
          <option value="">All meals</option>
          {meals.map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="glass rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5">
              <tr className="text-left mono text-[10px] uppercase tracking-widest text-[#A8A8A8]">
                <th className="px-4 py-3">Participant</th>
                <th className="px-4 py-3 hidden md:table-cell">Team</th>
                <th className="px-4 py-3">Meal</th>
                <th className="px-4 py-3 hidden md:table-cell">Checked In By</th>
                <th className="px-4 py-3">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[#A8A8A8]">Loading…</td></tr>
              ) : checkIns.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[#A8A8A8]">
                    <UtensilsCrossed size={20} className="mx-auto mb-2 opacity-50" />
                    No check-ins match.
                  </td>
                </tr>
              ) : (
                checkIns.map((c) => (
                  <tr key={c.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">{c.participant.fullName}</div>
                      <div className="mono text-[10px] text-[#A8A8A8]">
                        {c.participant.participantId ?? "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-[#A8A8A8]">
                      {c.participant.team.teamName}
                      <div className="mono text-[10px] text-[#A8A8A8]">
                        {c.participant.team.registrationId ?? ""}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold text-[#B52A32]">{c.meal.label}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-[#A8A8A8] text-xs">
                      {c.checkedInBy?.email ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-[#A8A8A8] text-xs">
                      {new Date(c.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
