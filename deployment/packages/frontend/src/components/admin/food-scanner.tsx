"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Html5Qrcode } from "html5-qrcode";
import { ScanLine, CheckCircle2, XCircle, AlertCircle, LogOut, History, X, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";

type ScanResult = {
  status: "CHECKED_IN" | "ALREADY_CHECKED_IN" | "ERROR";
  error?: string;
  participant?: { id: string; fullName: string; participantId: string | null };
  team?: { teamName: string; registrationId: string | null };
  meal?: { label: string; type: string };
  checkedInAt?: string;
  previousCheckInAt?: string | null;
};

export function FoodScannerApp() {
  const [mealId, setMealId] = useState<string>("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = "qr-reader";
  const qc = useQueryClient();

  // Load meals
  const { data: mealsData } = useQuery({
    queryKey: ["meals"],
    queryFn: async () => (await fetch("/api/meals")).json(),
  });
  const meals: any[] = mealsData?.meals ?? [];

  // Default to LUNCH (one-time, deferred)
  useEffect(() => {
    if (!mealId && meals.length > 0) {
      const lunch = meals.find((m) => m.type === "LUNCH") ?? meals[0];
      const id = window.setTimeout(() => setMealId(lunch.id), 0);
      return () => window.clearTimeout(id);
    }
  }, [meals, mealId]);

  const performCheckIn = async (qrToken: string) => {
    if (!mealId) {
      setError("Select a meal first.");
      return;
    }
    setError(null);
    try {
      const r = await fetch("/api/food/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrToken, mealId }),
      });
      const j = await r.json();
      if (j.status === "CHECKED_IN") {
        setResult({ ...j, status: "CHECKED_IN" });
      } else if (j.status === "ALREADY_CHECKED_IN" || r.status === 409) {
        setResult({ ...j, status: "ALREADY_CHECKED_IN" });
      } else {
        setResult({ status: "ERROR", error: j.error || "Scan failed" });
      }
      qc.invalidateQueries({ queryKey: ["food-check-ins"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    } catch {
      setResult({ status: "ERROR", error: "Network error" });
    }
  };

  const startScanner = async () => {
    setError(null);
    setResult(null);
    setScanning(true);
    // Wait for next tick so the container div is rendered
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode(containerId, { verbose: false });
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            // Stop and submit
            stopScanner();
            performCheckIn(decodedText);
          },
          () => {},
        );
      } catch {
        setError(
          "Could not start camera. Allow camera permission, or paste the QR token manually below.",
        );
        setScanning(false);
      }
    }, 100);
  };

  const stopScanner = async () => {
    const scanner = scannerRef.current;
    if (scanner) {
      try {
        await scanner.stop();
        await scanner.clear();
      } catch { /* ignore */ }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  useEffect(() => {
    return () => { stopScanner(); };
     
  }, []);

  return (
    <main className="min-h-screen bg-[#030303] text-white">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at top, #151515 0%, #080808 50%, #030303 100%)",
        }}
      />

      <div className="relative z-10 max-w-md mx-auto px-4 py-5 min-h-screen flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between mb-4">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="display text-base font-bold text-white">HACKMITTEN</span>
            <span className="mono text-xs text-[#B52A32]">3.0</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/meals"
              className="flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-xs text-white hover:border-[#B52A32]"
            >
              <UtensilsCrossed size={12} /> Meals
            </Link>
            <button
              onClick={() => setShowHistory(true)}
              className="flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-xs text-white hover:border-[#B52A32]"
            >
              <History size={12} /> History
            </button>
            <button
              onClick={() => signOut({ callbackUrl: "/login", redirect: true })}
              className="rounded-full border border-white/15 p-2 text-white hover:border-[#B52A32]"
              aria-label="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </header>

        {/* Meal selector */}
        <div className="glass rounded-lg p-3 mb-4">
          <div className="mono text-[10px] uppercase tracking-widest text-[#A8A8A8] mb-2">
            Active Meal
          </div>
          <div className="grid grid-cols-2 gap-2">
            {meals.filter((m) => m.enabled).map((m) => (
              <button
                key={m.id}
                onClick={() => setMealId(m.id)}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-all ${
                  mealId === m.id
                    ? "bg-[#B52A32] text-white"
                    : "bg-[#080808] text-[#A8A8A8] border border-white/10 hover:text-white"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scanner / Result */}
        {!result && (
          <div className="flex-1 flex flex-col">
            {scanning ? (
              <div className="glass rounded-lg p-4">
                <div id={containerId} className="w-full aspect-square rounded-md overflow-hidden bg-black" />
                <button
                  onClick={stopScanner}
                  className="mt-4 w-full rounded-full border border-white/15 px-5 py-3 text-sm text-white hover:bg-white/5"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={startScanner}
                disabled={!mealId}
                className="flex-1 glass rounded-lg p-8 flex flex-col items-center justify-center gap-4 hover:border-[#B52A32] transition-all disabled:opacity-50 min-h-[280px]"
              >
                <div className="h-16 w-16 rounded-full bg-[#B52A32]/20 flex items-center justify-center">
                  <ScanLine size={28} className="text-[#B52A32]" />
                </div>
                <div className="text-center">
                  <div className="display text-xl font-bold text-white">Tap to Scan</div>
                  <div className="text-xs text-[#A8A8A8] mt-1">
                    {meals.find((m) => m.id === mealId)?.label ?? "Select meal"} check-in
                  </div>
                </div>
              </button>
            )}

            {error && (
              <div className="mt-4 glass rounded-lg p-3 border-l-2 border-[#B52A32] text-sm text-[#D83A43]">
                <AlertCircle size={14} className="inline mr-2" />
                {error}
              </div>
            )}

            {/* Manual token entry fallback */}
            <div className="mt-4 glass rounded-lg p-3">
              <div className="mono text-[10px] uppercase tracking-widest text-[#A8A8A8] mb-2">
                Or enter QR token manually
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="Paste token"
                  className="flex-1 bg-[#080808] border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-[#B52A32] focus:outline-none mono"
                />
                <button
                  onClick={() => {
                    if (manualToken.trim().length < 8) return;
                    performCheckIn(manualToken.trim());
                    setManualToken("");
                  }}
                  disabled={manualToken.trim().length < 8}
                  className="rounded-full bg-[#B52A32] disabled:opacity-30 px-4 py-2 text-xs font-semibold text-white hover:bg-[#D83A43]"
                >
                  CHECK IN
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="flex-1 flex flex-col">
            {result.status === "CHECKED_IN" && (
              <div className="glass rounded-lg p-6 border-l-2 border-[#D83A43]">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle2 size={28} className="text-[#D83A43]" />
                  <div>
                    <div className="display text-2xl font-bold text-white">VERIFIED</div>
                    <div className="text-xs text-[#A8A8A8]">
                      {result.meal?.label} CHECKED IN
                    </div>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <div className="mono text-[10px] uppercase tracking-widest text-[#A8A8A8]">Participant</div>
                    <div className="text-white font-medium">{result.participant?.fullName}</div>
                  </div>
                  <div>
                    <div className="mono text-[10px] uppercase tracking-widest text-[#A8A8A8]">Team</div>
                    <div className="text-white">{result.team?.teamName}</div>
                  </div>
                  <div>
                    <div className="mono text-[10px] uppercase tracking-widest text-[#A8A8A8]">Registration</div>
                    <div className="mono text-sm text-[#B52A32]">{result.team?.registrationId ?? "—"}</div>
                  </div>
                  {result.checkedInAt && (
                    <div>
                      <div className="mono text-[10px] uppercase tracking-widest text-[#A8A8A8]">Time</div>
                      <div className="text-white">
                        {new Date(result.checkedInAt).toLocaleTimeString()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {result.status === "ALREADY_CHECKED_IN" && (
              <div className="glass rounded-lg p-6 border-l-2 border-yellow-500">
                <div className="flex items-center gap-3 mb-4">
                  <AlertCircle size={28} className="text-yellow-500" />
                  <div>
                    <div className="display text-2xl font-bold text-white">ALREADY CHECKED IN</div>
                    <div className="text-xs text-[#A8A8A8]">
                      {result.meal?.label} already issued
                    </div>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <div className="mono text-[10px] uppercase tracking-widest text-[#A8A8A8]">Participant</div>
                    <div className="text-white font-medium">{result.participant?.fullName}</div>
                  </div>
                  <div>
                    <div className="mono text-[10px] uppercase tracking-widest text-[#A8A8A8]">Team</div>
                    <div className="text-white">{result.team?.teamName}</div>
                  </div>
                  {result.previousCheckInAt && (
                    <div>
                      <div className="mono text-[10px] uppercase tracking-widest text-[#A8A8A8]">Previously</div>
                      <div className="text-yellow-500">
                        {new Date(result.previousCheckInAt).toLocaleTimeString()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {result.status === "ERROR" && (
              <div className="glass rounded-lg p-6 border-l-2 border-[#B52A32]">
                <div className="flex items-center gap-3 mb-2">
                  <XCircle size={28} className="text-[#B52A32]" />
                  <div>
                    <div className="display text-2xl font-bold text-white">SCAN FAILED</div>
                  </div>
                </div>
                <p className="text-sm text-[#A8A8A8]">{result.error}</p>
              </div>
            )}

            <button
              onClick={() => setResult(null)}
              className="mt-6 w-full rounded-full bg-[#B52A32] px-5 py-3 text-sm font-semibold text-white hover:bg-[#D83A43]"
            >
              SCAN NEXT
            </button>
          </div>
        )}
      </div>

      {/* History drawer */}
      {showHistory && <HistoryDrawer onClose={() => setShowHistory(false)} mealId={mealId} />}
    </main>
  );
}

function HistoryDrawer({ onClose, mealId }: { onClose: () => void; mealId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["food-check-ins-recent", mealId],
    queryFn: async () => {
      const params = new URLSearchParams({ pageSize: "30" });
      if (mealId) params.set("mealId", mealId);
      const r = await fetch(`/api/food/check-ins?${params.toString()}`);
      return r.json();
    },
  });
  const checkIns: any[] = data?.checkIns ?? [];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center">
      <div className="bg-[#0a0a0a] border border-white/10 rounded-t-2xl md:rounded-2xl w-full md:max-w-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <h3 className="display text-lg font-bold text-white">Recent Check-ins</h3>
          <button onClick={onClose} className="text-[#A8A8A8] hover:text-white">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto p-4 space-y-2">
          {isLoading ? (
            <div className="text-[#A8A8A8] text-sm">Loading…</div>
          ) : checkIns.length === 0 ? (
            <div className="text-[#A8A8A8] text-sm">No check-ins yet.</div>
          ) : (
            checkIns.map((c) => (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-md bg-white/5">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{c.participant.fullName}</div>
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
