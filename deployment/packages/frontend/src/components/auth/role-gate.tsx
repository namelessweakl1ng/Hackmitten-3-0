"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export function RoleGate({
  roles,
  children,
}: {
  roles: string[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const allowed = Boolean(role && roles.includes(role));

  useEffect(() => {
    if (status === "unauthenticated" || (status === "authenticated" && !allowed)) {
      router.replace("/login");
    }
  }, [allowed, router, status]);

  if (status !== "authenticated" || !allowed) {
    return <main className="min-h-screen bg-[#030303] text-[#A8A8A8] flex items-center justify-center">Loading…</main>;
  }

  return children;
}
