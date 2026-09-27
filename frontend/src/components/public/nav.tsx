"use client";

import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEventState } from "@/components/auth/use-event-state";

export function PublicNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const eventState = useEventState();
  const regOpen = eventState.data?.registrationOpen ?? true;
  // Registration is "full" when state is REGISTRATION_OPEN (deadline not passed) but either
  // the manual toggle is off (registrationsOpen=false) OR capacity has been reached.
  const isFull =
    !!eventState.data &&
    eventState.data.registrationOpen &&
    (!eventState.data.registrationsOpen ||
      (eventState.data.registrationCapacity > 0 &&
        eventState.data.currentCount >= eventState.data.registrationCapacity));

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { label: "Home", href: "#home" },
    { label: "About", href: "#about" },
    { label: "Gallery", href: "#gallery" },
    { label: "Crew", href: "#crew" },
    { label: "Venue", href: "#venue" },
    ...(regOpen && !isFull ? [{ label: "Register", href: "/register" }] : []),
  ];

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled ? "py-3" : "py-5"
        }`}
      >
        <div
          className={`absolute inset-0 transition-all duration-500 ${
            scrolled ? "opacity-100" : "opacity-0"
          }`}
          style={{
            background: "rgba(3, 3, 3, 0.7)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        />
        <nav className="relative mx-auto flex max-w-7xl items-center justify-between px-4 md:px-10">
          <Link href="/" className="flex items-baseline gap-2 group">
            <span className="display text-xl md:text-2xl font-bold tracking-tight text-white">
              HACKMITTEN
            </span>
            <span className="text-xs md:text-sm font-medium text-[#B52A32] mono">3.0</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {/* Desktop: show Home, About, Gallery, Crew, Venue (5 links) when registration is available; otherwise 4 to make room */}
            {navLinks.slice(0, regOpen && !isFull ? 5 : 4).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group relative text-sm font-medium tracking-wide text-[#A8A8A8] hover:text-white transition-colors"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 h-px w-0 bg-[#B52A32] transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}
            {regOpen && !isFull ? (
              <Link
                href="/register"
                className="group flex items-center gap-2 rounded-full border border-[#B52A32] px-5 py-2 text-sm font-medium text-white transition-all hover:bg-[#B52A32] hover:shadow-[0_0_30px_-8px_rgba(216,58,67,0.7)]"
              >
                Register Now
                <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
              </Link>
            ) : isFull ? (
              <span className="rounded-full border border-[#B52A32]/40 bg-[#B52A32]/10 px-5 py-2 text-sm font-medium text-[#D83A43]">
                Full
              </span>
            ) : (
              <span className="rounded-full border border-white/15 px-5 py-2 text-sm font-medium text-[#A8A8A8]">
                Registration Closed
              </span>
            )}
          </div>

          <button
            aria-label="Open menu"
            onClick={() => setOpen(true)}
            className="md:hidden text-white p-2 -mr-2"
          >
            <Menu size={22} />
          </button>
        </nav>
      </header>

      {/* Mobile full-screen overlay */}
      {open && (
        <div className="fixed inset-0 z-[60] bg-[#030303] flex flex-col animate-in fade-in duration-300">
          <div className="flex items-center justify-between px-5 py-5">
            <div className="flex items-baseline gap-2">
              <span className="display text-xl font-bold text-white">HACKMITTEN</span>
              <span className="text-xs text-[#B52A32] mono">3.0</span>
            </div>
            <button
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="text-white p-2 -mr-2"
            >
              <X size={22} />
            </button>
          </div>
          <div className="flex flex-1 flex-col justify-center gap-2 px-8">
            {navLinks.map((link, i) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="display text-5xl sm:text-6xl font-bold text-white/80 hover:text-white transition-colors py-2"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {link.label.toUpperCase()}
              </Link>
            ))}
            {!regOpen && !isFull && (
              <div className="display text-2xl font-bold text-[#A8A8A8] py-2 mt-4">
                REGISTRATION CLOSED
              </div>
            )}
            {isFull && (
              <div className="display text-2xl font-bold text-[#D83A43] py-2 mt-4">
                REGISTRATIONS FULL
              </div>
            )}
          </div>
          <div className="px-8 py-8 text-xs mono uppercase tracking-widest text-[#A8A8A8]">
            IDEAS BEYOND THE HORIZON
          </div>
        </div>
      )}
    </>
  );
}
