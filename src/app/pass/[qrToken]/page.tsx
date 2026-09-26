"use client";

import { use, useState, useEffect, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import Link from "next/link";
import { Check, AlertCircle, Download, Loader2 } from "lucide-react";

type PassData = {
  participant: {
    id: string;
    fullName: string;
    participantId: string | null;
  };
  team: {
    teamName: string;
    registrationId: string | null;
    status: string;
  };
  event: { name: string };
  verified: boolean;
};

export default function PassPage({ params }: { params: Promise<{ qrToken: string }> }) {
  const { qrToken } = use(params);
  const [pass, setPass] = useState<PassData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/pass/${qrToken}`);
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Failed to load pass");
        setPass(j);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load pass");
      } finally {
        setLoading(false);
      }
    })();
  }, [qrToken]);

  const downloadPass = async () => {
    if (!cardRef.current) return;
    // Find the QR canvas inside the card
    const canvas = cardRef.current.querySelector("canvas");
    if (!canvas) return;
    // Composite a printable pass image (1000x1414 portrait)
    const W = 1000, H = 1414;
    const out = document.createElement("canvas");
    out.width = W; out.height = H;
    const ctx = out.getContext("2d");
    if (!ctx) return;
    // Background
    ctx.fillStyle = "#030303";
    ctx.fillRect(0, 0, W, H);
    // Border
    ctx.strokeStyle = "#B52A32";
    ctx.lineWidth = 4;
    ctx.strokeRect(40, 40, W - 80, H - 80);

    // Header
    ctx.fillStyle = "#A8A8A8";
    ctx.font = "300 22px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(pass?.event.name?.toUpperCase() ?? "HACKMITTEN 3.0", W / 2, 130);

    // Team
    ctx.fillStyle = "#A8A8A8";
    ctx.font = "300 16px 'JetBrains Mono', monospace";
    ctx.fillText("TEAM", W / 2, 220);
    ctx.fillStyle = "#F2F2F2";
    ctx.font = "bold 64px 'Space Grotesk', sans-serif";
    ctx.fillText(pass?.team.teamName ?? "—", W / 2, 290);

    // Registration ID
    ctx.fillStyle = "#A8A8A8";
    ctx.font = "300 16px 'JetBrains Mono', monospace";
    ctx.fillText("REGISTRATION ID", W / 2, 380);
    ctx.fillStyle = "#B52A32";
    ctx.font = "bold 36px 'JetBrains Mono', monospace";
    ctx.fillText(pass?.team.registrationId ?? "—", W / 2, 430);

    // QR — scale up the canvas
    const qrSize = 480;
    ctx.drawImage(canvas, (W - qrSize) / 2, 520, qrSize, qrSize);

    // Participant
    ctx.fillStyle = "#A8A8A8";
    ctx.font = "300 16px 'JetBrains Mono', monospace";
    ctx.fillText("PARTICIPANT", W / 2, 1080);
    ctx.fillStyle = "#F2F2F2";
    ctx.font = "bold 36px 'Space Grotesk', sans-serif";
    ctx.fillText(pass?.participant.fullName ?? "—", W / 2, 1130);
    ctx.fillStyle = "#A8A8A8";
    ctx.font = "300 18px 'Inter', sans-serif";
    ctx.fillText(pass?.participant.participantId ?? "—", W / 2, 1180);

    // Verified badge
    if (pass?.verified) {
      ctx.fillStyle = "#B52A32";
      ctx.beginPath();
      ctx.arc(W / 2, 1300, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#B52A32";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(W / 2, 1300, 28, 0, Math.PI * 2);
      ctx.stroke();
      // Check mark
      ctx.strokeStyle = "#F2F2F2";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(W / 2 - 10, 1300);
      ctx.lineTo(W / 2 - 2, 1308);
      ctx.lineTo(W / 2 + 12, 1292);
      ctx.stroke();
      ctx.fillStyle = "#D83A43";
      ctx.font = "bold 20px 'Space Grotesk', sans-serif";
      ctx.fillText("VERIFIED", W / 2, 1360);
    }

    // Trigger download
    const dataUrl = out.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `hackmitten-pass-${pass?.team.registrationId ?? qrToken.slice(0, 8)}.png`;
    a.click();
  };

  return (
    <main className="relative min-h-screen bg-[#030303] text-white flex items-center justify-center px-5 py-10">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, #151515 0%, #080808 50%, #030303 100%)",
        }}
      />
      <div className="fixed inset-0 bg-grid pointer-events-none opacity-30" />

      <div className="relative z-10 w-full max-w-md">
        {loading && (
          <div className="glass rounded-lg p-12 text-center text-[#A8A8A8] flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" /> Loading pass…
          </div>
        )}

        {!loading && error && (
          <div className="glass rounded-lg p-8 text-center">
            <AlertCircle size={36} className="mx-auto text-[#B52A32] mb-4" />
            <h1 className="display text-2xl font-bold text-white mb-2">Pass Not Found</h1>
            <p className="text-sm text-[#A8A8A8] mb-6">{error}</p>
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#B52A32] hover:text-[#D83A43]">
              ← Return home
            </Link>
          </div>
        )}

        {!loading && pass && (
          <>
            <div className="text-center mb-6">
              <div className="mono text-[10px] uppercase tracking-[0.3em] text-[#A8A8A8]">
                {pass.event.name}
              </div>
            </div>

            <div ref={cardRef} className="glass rounded-2xl p-6 md:p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#B52A32] to-transparent" />

              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="mono text-[10px] uppercase tracking-widest text-[#A8A8A8]">Team</div>
                  <div className="display text-2xl font-bold text-white mt-0.5">{pass.team.teamName}</div>
                </div>
                <div className="text-right">
                  <div className="mono text-[10px] uppercase tracking-widest text-[#A8A8A8]">Registration</div>
                  <div className="mono text-sm text-[#B52A32] mt-0.5">{pass.team.registrationId ?? "—"}</div>
                </div>
              </div>

              <div className="mb-6">
                <div className="mono text-[10px] uppercase tracking-widest text-[#A8A8A8] mb-1">Participant</div>
                <div className="text-xl text-white font-semibold">{pass.participant.fullName}</div>
                <div className="text-sm text-[#A8A8A8] mt-1">{pass.participant.participantId ?? "—"}</div>
              </div>

              <div className="flex justify-center my-8">
                <div className="bg-white p-4 rounded-lg">
                  <QRCodeCanvas value={qrToken} size={220} level="M" includeMargin={false} />
                </div>
              </div>

              <div className="text-center">
                {pass.verified ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#B52A32] bg-[#B52A32]/10 px-4 py-1.5 text-sm font-semibold text-[#D83A43]">
                    <Check size={14} /> VERIFIED
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-1.5 text-sm text-[#A8A8A8]">
                    PENDING VERIFICATION
                  </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-white/5 text-center text-xs text-[#A8A8A8]">
                Present this QR at the food check-in counter.
                <br />
                Each QR is single-use per meal.
              </div>
            </div>

            {pass.verified && (
              <button
                onClick={downloadPass}
                className="mt-4 w-full flex items-center justify-center gap-2 rounded-full bg-[#B52A32] px-6 py-3 text-sm font-semibold text-white hover:bg-[#D83A43] transition-all min-h-[44px]"
              >
                <Download size={14} /> DOWNLOAD PASS (PNG)
              </button>
            )}

            <div className="mt-6 text-center">
              <Link href="/" className="text-xs text-[#A8A8A8] hover:text-white transition-colors">
                ← Return to public site
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
