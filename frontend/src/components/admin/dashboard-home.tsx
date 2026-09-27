"use client";

import { useQuery } from "@tanstack/react-query";
import { Users, CheckCircle2, Clock, ShieldCheck, UtensilsCrossed, Download } from "lucide-react";
import Link from "next/link";
import { fetchJson } from "@/lib/api-fetch";

type Stats = {
  counts: {
    totalTeams: number;
    approvedTeams: number;
    pendingPayments: number;
    verifiedPayments: number;
    rejectedPayments: number;
    totalParticipants: number;
    totalFoodCheckIns: number;
  };
  meals: { id: string; type: string; label: string; checkInCount: number }[];
  recentCheckIns: {
    id: string;
    createdAt: string;
    participant: { fullName: string; team: { teamName: string } };
    meal: { label: string };
  }[];
  recentRegistrations: {
    id: string;
    teamName: string;
    status: string;
    college: string | null;
    members: { id: string }[];
    payment: { status: string } | null;
  }[];
};

const STAT_CARDS = [
  { key: "totalTeams", label: "Total Registrations", icon: Users },
  { key: "approvedTeams", label: "Approved Teams", icon: CheckCircle2 },
  { key: "pendingPayments", label: "Pending Payments", icon: Clock },
  { key: "verifiedPayments", label: "Verified Payments", icon: ShieldCheck },
  { key: "totalParticipants", label: "Total Participants", icon: Users },
  { key: "totalFoodCheckIns", label: "Food Check-ins", icon: UtensilsCrossed },
] as const;

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "text-[#A8A8A8]",
  SUBMITTED: "text-[#A8A8A8]",
  PAYMENT_PENDING: "text-yellow-400",
  PAYMENT_VERIFIED: "text-blue-400",
  APPROVED: "text-[#D83A43]",
  REJECTED: "text-red-500",
  PENDING: "text-yellow-400",
  VERIFIED: "text-[#D83A43]",
};

export function AdminDashboardHome() {
  const { data, isLoading, error: queryError } = useQuery<Stats>({
    queryKey: ["admin-stats"],
    queryFn: () => fetchJson("/api/admin/stats"),
    refetchInterval: 15000,
  });

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <div className="mono text-[10px] uppercase tracking-[0.3em] text-[#B52A32] mb-2">
            / Dashboard
          </div>
          <h1 className="display text-3xl md:text-4xl font-bold text-white">Mission Control</h1>
          <p className="text-sm text-[#A8A8A8] mt-1">Real-time overview of Hackmitten 3.0</p>
        </div>
        <a
          href="/api/admin/export"
          className="flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs text-white hover:border-[#B52A32] hover:bg-white/5 transition-all whitespace-nowrap"
        >
          <Download size={14} /> Export CSV
        </a>
      </header>

      {queryError && <div role="alert" className="glass rounded p-3 text-sm text-[#D83A43] border-l-2 border-[#B52A32]">{queryError.message}</div>}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.key} className="glass rounded-lg p-4">
              <Icon size={16} className="text-[#A8A8A8] mb-3" />
              <div className="display text-2xl md:text-3xl font-bold text-white">
                {isLoading || queryError ? "—" : data?.counts[card.key] ?? 0}
              </div>
              <div className="mono text-[9px] uppercase tracking-widest text-[#A8A8A8] mt-1">
                {card.label}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent registrations */}
        <div className="lg:col-span-2 glass rounded-lg overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-white/5">
            <h2 className="text-sm font-semibold text-white">Recent Registrations</h2>
            <Link href="/admin/registrations" className="text-xs text-[#B52A32] hover:text-[#D83A43]">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-white/5">
            {isLoading ? (
              <div className="p-6 text-sm text-[#A8A8A8]">Loading…</div>
            ) : data?.recentRegistrations?.length === 0 ? (
              <div className="p-6 text-sm text-[#A8A8A8]">No registrations yet.</div>
            ) : (
              data?.recentRegistrations?.map((t) => (
                <Link
                  key={t.id}
                  href={`/admin/registrations/${t.id}`}
                  className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{t.teamName}</div>
                    <div className="text-xs text-[#A8A8A8] truncate">
                      {t.members.length} members · {t.college ?? "No college"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs font-semibold ${STATUS_COLORS[t.status] ?? "text-[#A8A8A8]"}`}>
                      {t.status.replace(/_/g, " ")}
                    </div>
                    <div className="text-[10px] text-[#A8A8A8]">
                      {t.payment?.status ? `Payment: ${t.payment.status.toLowerCase()}` : "No payment"}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Meal check-in summary */}
        <div className="glass rounded-lg overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-white/5">
            <h2 className="text-sm font-semibold text-white">Food Check-ins</h2>
            <Link href="/admin/food" className="text-xs text-[#B52A32] hover:text-[#D83A43]">
              History →
            </Link>
          </div>
          <div className="divide-y divide-white/5">
            {isLoading ? (
              <div className="p-6 text-sm text-[#A8A8A8]">Loading…</div>
            ) : (
              data?.meals?.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-4">
                  <div>
                    <div className="text-sm text-white">{m.label}</div>
                    <div className="mono text-[10px] uppercase tracking-widest text-[#A8A8A8]">
                      {m.type}
                    </div>
                  </div>
                  <div className="display text-2xl font-bold text-[#B52A32]">{m.checkInCount}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent check-ins */}
      <div className="glass rounded-lg overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <h2 className="text-sm font-semibold text-white">Recent Food Check-ins</h2>
        </div>
        <div className="divide-y divide-white/5">
          {isLoading ? (
            <div className="p-6 text-sm text-[#A8A8A8]">Loading…</div>
          ) : data?.recentCheckIns?.length === 0 ? (
            <div className="p-6 text-sm text-[#A8A8A8]">No check-ins yet.</div>
          ) : (
            data?.recentCheckIns?.map((c) => (
              <div key={c.id} className="flex items-center gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{c.participant.fullName}</div>
                  <div className="text-xs text-[#A8A8A8] truncate">
                    {c.participant.team.teamName} · {c.meal.label}
                  </div>
                </div>
                <div className="mono text-xs text-[#A8A8A8]">
                  {new Date(c.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
