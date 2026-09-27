"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

type Team = {
  id: string;
  teamName: string;
  registrationId: string | null;
  status: string;
  college: string | null;
  createdAt: string;
  members: { id: string; fullName: string; email: string; phone: string; participantId: string | null }[];
  payment: { id: string; status: string; transactionId: string | null; updatedAt: string } | null;
};

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

function formatRegistered(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return new Date(iso).toLocaleString();
  }
}

export function AdminRegistrationsList() {
  
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-registrations", q, status, paymentStatus, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (status) params.set("status", status);
      if (paymentStatus) params.set("paymentStatus", paymentStatus);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      const r = await fetch(`/api/admin/registrations?${params.toString()}`);
      return r.json();
    },
    refetchInterval: 20000,
  });

  const teams: Team[] = data?.teams ?? [];
  const total = data?.pagination?.total ?? 0;
  const totalPages = data?.pagination?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <header>
        <div className="mono text-[10px] uppercase tracking-[0.3em] text-[#B52A32] mb-2">
          / Registrations
        </div>
        <h1 className="display text-3xl md:text-4xl font-bold text-white">All Teams</h1>
        <p className="text-sm text-[#A8A8A8] mt-1">{total} total · click any row to verify payment</p>
      </header>

      {/* Filters */}
      <div className="glass rounded-lg p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A8A8]" />
          <input
            type="text"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Search by team, email, phone, transaction ID…"
            className="w-full bg-[#080808] border border-white/10 rounded pl-9 pr-3 py-2 text-sm text-white placeholder:text-[#A8A8A8] focus:border-[#B52A32] focus:outline-none"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="bg-[#080808] border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-[#B52A32] focus:outline-none"
        >
          <option value="">All statuses</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="PAYMENT_PENDING">Payment Pending</option>
          <option value="PAYMENT_VERIFIED">Payment Verified</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <select
          value={paymentStatus}
          onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }}
          className="bg-[#080808] border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-[#B52A32] focus:outline-none"
        >
          <option value="">Any payment</option>
          <option value="PENDING">Payment Pending</option>
          <option value="VERIFIED">Payment Verified</option>
          <option value="REJECTED">Payment Rejected</option>
        </select>
      </div>

      {/* Table */}
      <div className="glass rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5">
              <tr className="text-left mono text-[10px] uppercase tracking-widest text-[#A8A8A8]">
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3 hidden md:table-cell">Members</th>
                <th className="px-4 py-3 hidden lg:table-cell">College</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 hidden md:table-cell">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[#A8A8A8]">Loading…</td></tr>
              ) : teams.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[#A8A8A8]">No teams match.</td></tr>
              ) : (
                teams.map((t) => (
                  <tr key={t.id} className="hover:bg-white/5 transition-colors cursor-pointer">
                    <td className="px-4 py-3">
                      <Link href={`/admin/registrations/${t.id}`} className="block">
                        <div className="font-semibold text-white">{t.teamName}</div>
                        <div className="mono text-[10px] text-[#A8A8A8]">
                          {t.registrationId ?? "—"}
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-[#A8A8A8]">
                      {t.members.length}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-[#A8A8A8] truncate max-w-[200px]">
                      {t.college ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/registrations/${t.id}`} className="block">
                        <span className={`text-xs font-semibold ${STATUS_COLORS[t.payment?.status ?? "PENDING"] ?? "text-[#A8A8A8]"}`}>
                          {t.payment?.status ?? "NONE"}
                        </span>
                        {t.payment?.transactionId && (
                          <div className="mono text-[10px] text-[#A8A8A8] truncate max-w-[120px]">
                            {t.payment.transactionId}
                          </div>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/registrations/${t.id}`} className="block">
                        <span className={`text-xs font-semibold ${STATUS_COLORS[t.status] ?? "text-[#A8A8A8]"}`}>
                          {t.status.replace(/_/g, " ")}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-white">
                      <Link href={`/admin/registrations/${t.id}`} className="block">
                        <span className="mono text-xs text-white font-medium">{formatRegistered(t.createdAt)}</span>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-xs text-[#A8A8A8]">
            Page {page} of {totalPages} · {total} total
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 rounded-md border border-white/10 px-3 py-1.5 text-xs text-white disabled:opacity-30 hover:border-[#B52A32]"
            >
              <ChevronLeft size={12} /> Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 rounded-md border border-white/10 px-3 py-1.5 text-xs text-white disabled:opacity-30 hover:border-[#B52A32]"
            >
              Next <ChevronRight size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
