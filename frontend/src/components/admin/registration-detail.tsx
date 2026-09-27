"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { ArrowLeft, Check, X, ShieldCheck, Loader2, ExternalLink, Crown, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";

type Team = {
  id: string;
  teamName: string;
  registrationId: string | null;
  status: string;
  college: string | null;
  createdAt: string;
  members: {
    id: string; fullName: string; email: string; phone: string; college: string;
    degree: string | null;
    hasParticipantImage: boolean;
    participantId: string | null; qrToken: string | null; passVerified: boolean; isLeader: boolean;
  }[];
  payment: {
    id: string; status: string; transactionId: string | null;
    rejectionReason: string | null; verifiedAt: string | null;
    verifiedBy: { email: string; name: string | null } | null;
    screenshots: { id: string; fileName: string; mimeType: string; sizeBytes: number }[];
  } | null;
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

export function AdminRegistrationDetail({ id }: { id: string }) {
  
  const qc = useQueryClient();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const [busy, setBusy] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, error: queryError } = useQuery<{ team: Team }>({
    queryKey: ["admin-registration", id],
    queryFn: async () => {
      const response = await fetch(`/api/admin/registrations/${id}`);
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || `Unable to load registration (${response.status})`);
      }
      return response.json();
    },
    refetchInterval: 10000,
  });
  const team = data?.team;

  const canVerify = role === "SUPER_ADMIN";
  const canApprove = role === "SUPER_ADMIN";

  async function verifyPayment() {
    if (!team?.payment) return;
    setBusy(true); setError(null);
    try {
      const r = await fetch(`/api/admin/payments/${team.payment.id}/verify`, { method: "POST" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed");
      qc.invalidateQueries({ queryKey: ["admin-registration", id] });
      qc.invalidateQueries({ queryKey: ["admin-registrations"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function rejectPayment() {
    if (!team?.payment || rejectReason.trim().length < 3) return;
    setBusy(true); setError(null);
    try {
      const r = await fetch(`/api/admin/payments/${team.payment.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed");
      setRejectMode(false); setRejectReason("");
      qc.invalidateQueries({ queryKey: ["admin-registration", id] });
      qc.invalidateQueries({ queryKey: ["admin-registrations"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function approveTeam() {
    setBusy(true); setError(null);
    try {
      const r = await fetch(`/api/admin/teams/${id}/approve`, { method: "POST" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed");
      qc.invalidateQueries({ queryKey: ["admin-registration", id] });
      qc.invalidateQueries({ queryKey: ["admin-registrations"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function _rejectTeam() {
    if (rejectReason.trim().length < 3) return;
    setBusy(true); setError(null);
    try {
      const r = await fetch(`/api/admin/teams/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed");
      setRejectMode(false); setRejectReason("");
      qc.invalidateQueries({ queryKey: ["admin-registration", id] });
      qc.invalidateQueries({ queryKey: ["admin-registrations"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) {
    return <div className="text-[#A8A8A8]">Loading…</div>;
  }
  if (queryError) {
    return <div role="alert" className="text-[#D83A43]">{queryError.message}</div>;
  }
  if (!team) {
    return <div className="text-[#D83A43]">Team not found.</div>;
  }

  const registeredFormatted = (() => {
    try {
      return new Date(team.createdAt).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return new Date(team.createdAt).toLocaleString();
    }
  })();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/registrations"
          className="inline-flex items-center gap-2 text-xs text-[#A8A8A8] hover:text-white transition-colors mb-4"
        >
          <ArrowLeft size={12} /> All Registrations
        </Link>
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="mono text-[10px] uppercase tracking-[0.3em] text-[#B52A32] mb-2">
              / Registration
            </div>
            <h1 className="display text-3xl md:text-4xl font-bold text-white">{team.teamName}</h1>
            <div className="mono text-sm text-[#A8A8A8] mt-1">
              {team.registrationId ?? "Not yet approved"}
            </div>
          </div>
          <div className="text-right">
            <div className={`text-sm font-semibold ${STATUS_COLORS[team.status]}`}>
              {team.status.replace(/_/g, " ")}
            </div>
          </div>
        </div>
        <div className="mt-4 inline-flex items-center gap-2 rounded-md border border-[#B52A32]/30 bg-[#B52A32]/5 px-3 py-1.5">
          <span className="mono text-[10px] uppercase tracking-widest text-[#A8A8A8]">Registered:</span>
          <span className="text-sm text-white font-semibold">{registeredFormatted}</span>
        </div>
      </div>

      {error && (
        <div className="glass rounded p-3 text-sm text-[#D83A43] border-l-2 border-[#B52A32]">
          {error}
        </div>
      )}

      {/* Members */}
      <section className="glass rounded-lg p-5">
        <h2 className="mono text-[10px] uppercase tracking-widest text-[#A8A8A8] mb-4">
          Members ({team.members.length})
        </h2>
        <div className="space-y-3">
          {team.members.map((m, i) => (
            <div key={m.id} className={`flex items-start gap-3 pb-3 border-b border-white/5 last:border-0 last:pb-0 ${m.isLeader ? "bg-[#B52A32]/5 -mx-2 px-2 rounded" : ""}`}>
              {m.hasParticipantImage && <img src={`/api/admin/participants/${m.id}/image`} alt={`${m.fullName} participant photo`} className="h-16 w-16 rounded object-cover" />}
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full mono text-xs ${
                m.isLeader ? "bg-[#B52A32] text-white" : "bg-[#151515] text-[#B52A32]"
              }`}>
                {m.isLeader ? <Crown size={12} /> : String(i + 1).padStart(2, "0")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white font-medium">
                  {m.fullName}
                  {m.isLeader && (
                    <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-[#D83A43]">
                      <Crown size={10} /> TEAM LEADER
                    </span>
                  )}
                  {m.passVerified && (
                    <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-[#D83A43]">
                      <ShieldCheck size={10} /> PASS
                    </span>
                  )}
                </div>
                <div className="text-xs text-[#A8A8A8]">{m.email} · {m.phone}</div>
                <div className="text-xs text-[#A8A8A8]">{m.college}</div>
                {m.degree && (
                  <div className="text-xs text-[#A8A8A8] mt-0.5">
                    <span className="mono text-[10px] uppercase tracking-widest text-[#A8A8A8]/70">Degree:</span> {m.degree}
                  </div>
                )}
                {m.participantId && (
                  <div className="mono text-[10px] text-[#B52A32] mt-1">ID: {m.participantId}</div>
                )}
                {m.qrToken && (
                  <Link href={`/pass/${m.qrToken}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-[#A8A8A8] hover:text-white mt-1">
                    <ExternalLink size={10} /> View Digital Pass
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Payment */}
      {team.payment && (
        <section className="glass rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="mono text-[10px] uppercase tracking-widest text-[#A8A8A8]">
              Payment
            </h2>
            <span className={`text-xs font-semibold ${STATUS_COLORS[team.payment.status]}`}>
              {team.payment.status}
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <div className="mono text-[10px] uppercase tracking-widest text-[#A8A8A8] mb-1">
                Transaction ID
              </div>
              <div className="mono text-sm text-white">
                {team.payment.transactionId ?? "—"}
              </div>
            </div>
            <div>
              <div className="mono text-[10px] uppercase tracking-widest text-[#A8A8A8] mb-1">
                Verified By / At
              </div>
              <div className="text-sm text-white">
                {team.payment.verifiedBy?.email ?? "—"}
              </div>
              <div className="text-xs text-[#A8A8A8]">
                {team.payment.verifiedAt
                  ? new Date(team.payment.verifiedAt).toLocaleString()
                  : "Not verified"}
              </div>
            </div>
          </div>

          {team.payment.rejectionReason && (
            <div className="mb-4 p-3 rounded bg-red-950/30 border-l-2 border-[#B52A32] text-sm text-[#D83A43]">
              <div className="mono text-[10px] uppercase tracking-widest mb-1">Rejection reason</div>
              {team.payment.rejectionReason}
            </div>
          )}

          {/* Screenshots — served via private API */}
          <div className="mono text-[10px] uppercase tracking-widest text-[#A8A8A8] mb-2">
            Payment Screenshot
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {team.payment.screenshots.map((s) => (
              <PaymentScreenshot key={s.id} paymentId={team.payment!.id} screenshotId={s.id} fileName={s.fileName} />
            ))}
            {team.payment.screenshots.length === 0 && (
              <div className="text-xs text-[#A8A8A8]">No screenshot uploaded.</div>
            )}
          </div>

          {/* Actions */}
          {canVerify && team.payment.status === "PENDING" && !rejectMode && (
            <div className="mt-5 pt-5 border-t border-white/5 flex gap-2">
              <button
                onClick={verifyPayment}
                disabled={busy}
                className="flex items-center gap-2 rounded-full bg-[#B52A32] disabled:opacity-50 px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#D83A43] transition-all"
              >
                {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                VERIFY PAYMENT
              </button>
              <button
                onClick={() => setRejectMode(true)}
                disabled={busy}
                className="flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-xs font-semibold text-white hover:border-[#B52A32] hover:text-[#D83A43] transition-all"
              >
                <X size={12} /> REJECT PAYMENT
              </button>
            </div>
          )}

          {rejectMode && (
            <div className="mt-5 pt-5 border-t border-white/5">
              <label className="block">
                <span className="mono text-[10px] uppercase tracking-widest text-[#A8A8A8]">
                  Reason for rejection
                </span>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  placeholder="e.g. Transaction ID not found in our UPI records"
                  className="mt-1 w-full bg-[#080808] border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-[#B52A32] focus:outline-none"
                />
              </label>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={rejectPayment}
                  disabled={busy || rejectReason.trim().length < 3}
                  className="flex items-center gap-2 rounded-full bg-[#B52A32] disabled:opacity-30 px-5 py-2 text-xs font-semibold text-white hover:bg-[#D83A43]"
                >
                  CONFIRM REJECTION
                </button>
                <button
                  onClick={() => { setRejectMode(false); setRejectReason(""); }}
                  className="rounded-full border border-white/15 px-5 py-2 text-xs text-white hover:bg-white/5"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Team approval */}
      {canApprove && team.payment?.status === "VERIFIED" && team.status !== "APPROVED" && (
        <section className="glass rounded-lg p-5">
          <h2 className="mono text-[10px] uppercase tracking-widest text-[#A8A8A8] mb-3">
            Team Approval
          </h2>
          <p className="text-sm text-[#A8A8A8] mb-4">
            Payment is verified. Approving the team will generate a unique registration ID
            and issue digital passes with QR credentials for each member.
          </p>
          <div className="flex gap-2">
            <button
              onClick={approveTeam}
              disabled={busy}
              className="flex items-center gap-2 rounded-full bg-[#B52A32] disabled:opacity-50 px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#D83A43]"
            >
              {busy ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
              APPROVE TEAM
            </button>
            {!rejectMode && (
              <button
                onClick={() => setRejectMode(true)}
                disabled={busy}
                className="flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-xs font-semibold text-white hover:border-[#B52A32] hover:text-[#D83A43]"
              >
                REJECT TEAM
              </button>
            )}
          </div>
        </section>
      )}

      {team.status === "APPROVED" && (
        <section className="glass rounded-lg p-5 border-l-2 border-[#B52A32]">
          <div className="flex items-center gap-3">
            <ShieldCheck size={20} className="text-[#D83A43]" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-white">Team Approved</div>
              <div className="text-xs text-[#A8A8A8]">
                Registration ID <span className="mono text-[#B52A32]">{team.registrationId}</span> ·
                {" "}{team.members.filter(m => m.qrToken).length} QR passes issued
              </div>
            </div>
            {canApprove && (
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    if (!confirm("Revert approval? This will set the team back to PAYMENT_VERIFIED. The registration ID and QR passes are preserved for re-approval if needed.")) return;
                    setBusy(true); setError(null);
                    try {
                      const r = await fetch(`/api/admin/teams/${id}/approve`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "revert" }),
                      });
                      const j = await r.json();
                      if (!r.ok) throw new Error(j.error || "Failed");
                      qc.invalidateQueries({ queryKey: ["admin-registration", id] });
                      qc.invalidateQueries({ queryKey: ["admin-registrations"] });
                      qc.invalidateQueries({ queryKey: ["admin-stats"] });
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Failed");
                    } finally {
                      setBusy(false);
                    }
                  }}
                  disabled={busy}
                  className="flex items-center gap-2 rounded-full border border-yellow-500/40 text-yellow-500 disabled:opacity-50 px-4 py-2 text-xs font-semibold hover:bg-yellow-500/10 transition-all"
                >
                  {busy ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                  REVERT APPROVAL
                </button>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function PaymentScreenshot({ paymentId, screenshotId, fileName }: { paymentId: string; screenshotId: string; fileName: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/admin/payments/${paymentId}/screenshot?screenshotId=${encodeURIComponent(screenshotId)}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error(`Screenshot request failed: ${res.status}`);
        }

        const blob = await res.blob();

        if (blob.size === 0) {
          throw new Error("Screenshot response was empty");
        }

        objectUrl = URL.createObjectURL(blob);

        if (!cancelled) {
          setUrl(objectUrl);
        }
      } catch {
        if (!cancelled) {
          setUrl(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [paymentId, screenshotId]);

  if (loading) {
    return (
      <div className="aspect-square bg-[#080808] rounded border border-white/10 flex items-center justify-center text-xs text-[#A8A8A8]">
        Loading…
      </div>
    );
  }

  if (!url) {
    return (
      <div className="aspect-square bg-[#080808] rounded border border-white/10 flex items-center justify-center text-xs text-[#A8A8A8]">
        No image
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block aspect-square bg-[#080808] rounded border border-white/10 overflow-hidden hover:border-[#B52A32] transition-colors"
    >
      <img
        src={url}
        alt={fileName}
        className="w-full h-full object-cover"
      />
    </a>
  );
}
