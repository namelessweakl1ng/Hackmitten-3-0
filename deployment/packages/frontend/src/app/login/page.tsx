"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, ShieldCheck, Users, UtensilsCrossed } from "lucide-react";

type Role = "ADMIN" | "COORDINATOR" | "FOOD";

const ROLE_OPTIONS: { id: Role; title: string; subtitle: string; icon: any; hint: string }[] = [
  { id: "ADMIN", title: "ADMIN", subtitle: "Super Admin · root access", icon: ShieldCheck, hint: "Verify payments, approve teams, configure event, manage everything." },
  { id: "COORDINATOR", title: "COORDINATOR", subtitle: "Event operational coordinator", icon: Users, hint: "View approved teams and participant information for event operations." },
  { id: "FOOD", title: "FOOD COORDINATOR", subtitle: "Food check-in operator", icon: UtensilsCrossed, hint: "Scan participant QRs for meal check-ins and view consumption." },
];

export default function LoginPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", {
      identifier,
      password,
      role: selectedRole,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Invalid credentials. Please verify your username/email and password.");
      return;
    }
    // Decide redirect based on actual session role
    const r = await fetch("/api/auth/session");
    const session = await r.json();
    const role = session?.user?.role;
    if (role === "SUPER_ADMIN") router.push("/admin");
    else if (role === "COORDINATOR") router.push("/coordinator");
    else if (role === "FOOD_ADMIN") router.push("/food-admin");
    else router.push("/");
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
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-baseline gap-2">
            <span className="display text-2xl font-bold text-white">HACKMITTEN</span>
            <span className="mono text-sm text-[#B52A32]">3.0</span>
          </Link>
          <p className="mt-3 mono text-[10px] uppercase tracking-[0.3em] text-[#A8A8A8]">
            Restricted Access
          </p>
        </div>

        {/* Step 1: choose role */}
        {!selectedRole && (
          <div className="space-y-3">
            <h1 className="display text-2xl font-bold text-white text-center mb-6">Select Your Role</h1>
            {ROLE_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  onClick={() => setSelectedRole(opt.id)}
                  className="group w-full glass glass-hover rounded-lg p-4 flex items-center gap-4 text-left transition-all"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#151515] border border-white/10 text-[#B52A32] group-hover:border-[#B52A32] transition-colors">
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="display text-base font-bold text-white tracking-tight">{opt.title}</div>
                    <div className="text-xs text-[#A8A8A8] mt-0.5">{opt.subtitle}</div>
                    <div className="text-[10px] text-[#A8A8A8]/70 mt-1 leading-relaxed">{opt.hint}</div>
                  </div>
                  <div className="text-[#A8A8A8] group-hover:text-white transition-colors">→</div>
                </button>
              );
            })}
          </div>
        )}

        {/* Step 2: login form */}
        {selectedRole && (
          <form onSubmit={submit} className="glass rounded-lg p-6 md:p-8">
            <button
              type="button"
              onClick={() => { setSelectedRole(null); setError(null); }}
              className="text-xs text-[#A8A8A8] hover:text-white transition-colors mb-4 flex items-center gap-1"
            >
              <ArrowLeft size={12} /> Change role
            </button>

            <div className="mb-6">
              <div className="mono text-[10px] uppercase tracking-widest text-[#B52A32]">
                {ROLE_OPTIONS.find((r) => r.id === selectedRole)?.title}
              </div>
              <h1 className="display text-2xl font-bold text-white mt-1">Sign In</h1>
              <p className="text-sm text-[#A8A8A8] mt-1">
                {ROLE_OPTIONS.find((r) => r.id === selectedRole)?.subtitle}
              </p>
            </div>

            <label className="block mb-4">
              <span className="mono text-[10px] uppercase tracking-widest text-[#A8A8A8]">
                Username or Email
              </span>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="mt-1 w-full bg-[#080808] border border-white/10 rounded px-3 py-2.5 text-white focus:border-[#B52A32] focus:outline-none transition-colors"
                placeholder="Enter username"
                autoComplete="username"
              />
            </label>

            <label className="block mb-6">
              <span className="mono text-[10px] uppercase tracking-widest text-[#A8A8A8]">
                Password
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full bg-[#080808] border border-white/10 rounded px-3 py-2.5 text-white focus:border-[#B52A32] focus:outline-none transition-colors"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </label>

            {error && (
              <div className="mb-4 text-sm text-[#D83A43] glass rounded p-3 border-l-2 border-[#B52A32]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[#B52A32] disabled:opacity-50 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-[#D83A43] flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              ENTER
            </button>
          </form>
        )}

        <Link
          href="/"
          className="mt-6 flex items-center justify-center gap-2 text-xs text-[#A8A8A8] hover:text-white transition-colors"
        >
          <ArrowLeft size={12} /> Return to public site
        </Link>
      </div>
    </main>
  );
}
