"use client";

import { useState } from "react";
import { Loader2, Check, ShieldAlert, Eye, EyeOff } from "lucide-react";

export function CredentialsManager() {
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [recoveryKey, setRecoveryKey] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showRec, setShowRec] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(false); setBusy(true);
    try {
      const res = await fetch("/api/admin/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newUsername, newPassword, recoveryKey }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed");
      setSuccess(true);
      setNewUsername(""); setNewPassword(""); setRecoveryKey("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <div className="mono text-[10px] uppercase tracking-[0.3em] text-[#B52A32] mb-2">/ Credentials</div>
        <h1 className="display text-2xl md:text-3xl font-bold text-white">Change Super Admin Credentials</h1>
        <p className="text-sm text-[#A8A8A8] mt-1">
          Rotates the super admin username and password. Requires the BERSERK recovery key
          as a second factor — even when already authenticated.
        </p>
      </header>

      <div className="glass rounded-lg p-4 border-l-2 border-yellow-500/60 flex gap-3">
        <ShieldAlert size={18} className="text-yellow-500 shrink-0 mt-0.5" />
        <div className="text-sm text-[#A8A8A8]">
          <div className="text-white font-semibold mb-1">Recovery Key Required</div>
          The BERSERK recovery key was generated at bootstrap time and printed in the terminal.
          It is stored as a bcrypt hash in the database — only the original plaintext (from your
          secret manager or runtime environment) will work.
        </div>
      </div>

      <form onSubmit={submit} className="glass rounded-lg p-5 md:p-6 space-y-4">
        <label className="block">
          <span className="mono text-[10px] uppercase tracking-widest text-[#A8A8A8]">New Username</span>
          <input
            type="text"
            required
            minLength={4}
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            className="mt-1 w-full bg-[#080808] border border-white/10 rounded px-3 py-2.5 text-white focus:border-[#B52A32] focus:outline-none"
            placeholder="new_root_username"
          />
        </label>

        <label className="block">
          <span className="mono text-[10px] uppercase tracking-widest text-[#A8A8A8]">New Password (min 12 chars)</span>
          <div className="relative">
            <input
              type={showPwd ? "text" : "password"}
              required
              minLength={12}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 w-full bg-[#080808] border border-white/10 rounded px-3 py-2.5 pr-10 text-white focus:border-[#B52A32] focus:outline-none"
              placeholder="••••••••••••"
            />
            <button type="button" onClick={() => setShowPwd(s => !s)} className="absolute right-3 top-3.5 text-[#A8A8A8] hover:text-white">
              {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </label>

        <label className="block">
          <span className="mono text-[10px] uppercase tracking-widest text-[#A8A8A8]">BERSERK Recovery Key</span>
          <div className="relative">
            <input
              type={showRec ? "text" : "password"}
              required
              value={recoveryKey}
              onChange={(e) => setRecoveryKey(e.target.value)}
              className="mt-1 w-full bg-[#080808] border border-white/10 rounded px-3 py-2.5 pr-10 text-white focus:border-[#B52A32] focus:outline-none mono"
              placeholder="••••••••••••••••••••"
            />
            <button type="button" onClick={() => setShowRec(s => !s)} className="absolute right-3 top-3.5 text-[#A8A8A8] hover:text-white">
              {showRec ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </label>

        {error && (
          <div className="text-sm text-[#D83A43] glass rounded p-3 border-l-2 border-[#B52A32]">{error}</div>
        )}
        {success && (
          <div className="text-sm text-green-400 glass rounded p-3 border-l-2 border-green-500 flex items-center gap-2">
            <Check size={14} /> Credentials updated successfully. Use the new username + password to log in.
          </div>
        )}

        <button
          type="submit"
          disabled={busy || !newUsername || !newPassword || !recoveryKey}
          className="w-full flex items-center justify-center gap-2 rounded-full bg-[#B52A32] disabled:opacity-50 px-6 py-3 text-sm font-semibold text-white hover:bg-[#D83A43] transition-all min-h-[44px]"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <ShieldAlert size={14} />}
          CHANGE CREDENTIALS
        </button>
      </form>
    </div>
  );
}
