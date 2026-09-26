"use client";

import { Session } from "next-auth";
import { SessionProvider, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  LayoutDashboard, Users, UtensilsCrossed, ScrollText, LogOut, Home,
  Settings, KeyRound, UserCog, RotateCcw, UsersRound,
} from "lucide-react";

const NAV: { label: string; href: string; roles: string[]; icon: any; superAdminOnly?: boolean }[] = [
  { label: "Dashboard", href: "/admin", roles: ["SUPER_ADMIN"], icon: LayoutDashboard },
  { label: "Registrations", href: "/admin/registrations", roles: ["SUPER_ADMIN"], icon: Users },
  { label: "Teams", href: "/admin/teams", roles: ["SUPER_ADMIN"], icon: UsersRound },
  { label: "Food Check-ins", href: "/admin/food", roles: ["SUPER_ADMIN"], icon: UtensilsCrossed },
  { label: "Audit Log", href: "/admin/audit", roles: ["SUPER_ADMIN"], icon: ScrollText },
  { label: "Event Settings", href: "/admin/settings", roles: ["SUPER_ADMIN"], icon: Settings, superAdminOnly: true },
  { label: "Meals", href: "/admin/meals", roles: ["SUPER_ADMIN", "FOOD_ADMIN"], icon: UtensilsCrossed },
  { label: "Change History", href: "/admin/change-history", roles: ["SUPER_ADMIN"], icon: RotateCcw, superAdminOnly: true },
  { label: "Credentials", href: "/admin/credentials", roles: ["SUPER_ADMIN"], icon: KeyRound, superAdminOnly: true },
  { label: "Admin Users", href: "/admin/users", roles: ["SUPER_ADMIN"], icon: UserCog, superAdminOnly: true },
];

function AdminShellInner({ children, session }: { children: React.ReactNode; session: Session | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    const role = (session?.user as any)?.role;
    if (role && role !== "SUPER_ADMIN" && role !== "COORDINATOR" && role !== "FOOD_ADMIN") {
      router.push("/");
    }
    // FOOD_ADMIN can only access /admin/meals — redirect to scanner for other admin pages
    if (role === "FOOD_ADMIN" && pathname && !pathname.startsWith("/admin/meals")) {
      router.push("/food-admin");
    }
  }, [status, session, router]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center text-[#A8A8A8]">
        Loading…
      </div>
    );
  }

  const role = (session?.user as any)?.role;
  if (role !== "SUPER_ADMIN" && role !== "COORDINATOR" && role !== "FOOD_ADMIN") return null;

  // Filter nav by role
  const visibleNav = NAV.filter((item) => item.roles.includes(role));

  return (
    <div className="min-h-screen bg-[#030303] text-white flex flex-col md:flex-row">
      <aside className="md:w-60 md:fixed md:inset-y-0 md:left-0 md:overflow-y-auto border-b md:border-b-0 md:border-r border-white/5 bg-[#080808]">
        <div className="p-4 md:p-6">
          <Link href="/admin" className="flex items-baseline gap-2">
            <span className="display text-base font-bold text-white">HACKMITTEN</span>
            <span className="mono text-xs text-[#B52A32]">3.0</span>
          </Link>
          <div className="mt-4 hidden md:block">
            <div className="mono text-[10px] uppercase tracking-widest text-[#A8A8A8]">
              {role === "SUPER_ADMIN" ? "Super Admin" : "Coordinator"}
            </div>
            <div className="text-xs text-white/80 truncate mt-0.5">
              {(session?.user as any)?.email}
            </div>
          </div>
        </div>
        <nav className="px-2 md:px-3 pb-4 md:pb-6 flex md:flex-col gap-1 overflow-x-auto no-scrollbar">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== "/admin" && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                scroll={false}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all whitespace-nowrap ${
                  active
                    ? "bg-[#B52A32]/15 text-white border-l-2 border-[#B52A32]"
                    : "text-[#A8A8A8] hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}

          <div className="md:mt-auto md:pt-6 flex md:flex-col gap-1">
            <Link
              href="/"
              target="_blank"
              scroll={false}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-[#A8A8A8] hover:text-white hover:bg-white/5 whitespace-nowrap"
            >
              <Home size={16} /> Public Site
            </Link>
            <button
              onClick={() => {
                import("next-auth/react").then((m) => m.signOut({ callbackUrl: "/login", redirect: true }));
              }}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-[#A8A8A8] hover:text-[#D83A43] hover:bg-white/5 whitespace-nowrap w-full text-left"
            >
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        </nav>
      </aside>

      <main className="flex-1 md:ml-60 p-4 md:p-8">{children}</main>
    </div>
  );
}

export function AdminShell({ children, session }: { children: React.ReactNode; session: Session | null }) {
  return (
    <SessionProvider session={session}>
      <AdminShellInner session={session}>{children}</AdminShellInner>
    </SessionProvider>
  );
}
