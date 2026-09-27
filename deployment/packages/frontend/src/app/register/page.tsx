"use client";

import Link from "next/link";
import { useRegisterStore } from "@/components/register/store";
import {
  RegisterStepper,
  StepTeam,
  StepMembers,
  StepDetails,
  StepPayment,
  StepSubmit,
} from "@/components/register/steps";
import { useEventState } from "@/components/auth/use-event-state";

export default function RegisterPage() {
  const step = useRegisterStore((s) => s.step);
  const eventState = useEventState();
  const regOpen = eventState.data?.registrationOpen;
  const loading = eventState.isLoading;
  const registrationsOpen = eventState.data?.registrationsOpen ?? true;
  const registrationCapacity = eventState.data?.registrationCapacity ?? 60;
  const currentCount = eventState.data?.currentCount ?? 0;
  const isFull =
    !!eventState.data &&
    registrationCapacity > 0 &&
    currentCount >= registrationCapacity;
  // Manual close (toggle off) — only meaningful if registration deadline hasn't passed
  const manuallyClosed = !!eventState.data && !registrationsOpen && regOpen !== false;

  // While loading event state, show a neutral state (don't flash closed)
  if (loading) {
    return (
      <main className="relative min-h-screen bg-[#030303] text-white flex items-center justify-center">
        <div className="text-[#A8A8A8]">Loading…</div>
      </main>
    );
  }

  // If registration is manually closed (admin toggle off), show that
  if (manuallyClosed) {
    return (
      <main className="relative min-h-screen bg-[#030303] text-white flex items-center justify-center px-5">
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at top, #151515 0%, #080808 50%, #030303 100%)",
          }}
        />
        <div className="relative z-10 text-center max-w-md">
          <div className="mono text-xs uppercase tracking-[0.3em] text-[#B52A32] mb-4">
            / Registration Closed
          </div>
          <h1 className="display text-4xl md:text-6xl font-bold text-white mb-4">
            REGISTRATION
            <br />
            <span className="text-[#B52A32]">CLOSED.</span>
          </h1>
          <p className="text-[#A8A8A8] mb-8">
            Registrations are currently closed. Please check back later or contact the coordinator.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white hover:border-white/40 hover:bg-white/5 transition-all min-h-[44px]"
          >
            ← Return Home
          </Link>
        </div>
      </main>
    );
  }

  // If registration is full (capacity reached)
  if (isFull) {
    return (
      <main className="relative min-h-screen bg-[#030303] text-white flex items-center justify-center px-5">
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at top, #151515 0%, #080808 50%, #030303 100%)",
          }}
        />
        <div className="relative z-10 text-center max-w-md">
          <div className="mono text-xs uppercase tracking-[0.3em] text-[#B52A32] mb-4">
            / Registrations Full
          </div>
          <h1 className="display text-4xl md:text-6xl font-bold text-white mb-4">
            REGISTRATIONS
            <br />
            <span className="text-[#B52A32]">FULL.</span>
          </h1>
          <p className="text-[#A8A8A8] mb-8">
            All {registrationCapacity} spots have been taken. Thank you for the overwhelming response.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white hover:border-white/40 hover:bg-white/5 transition-all min-h-[44px]"
          >
            ← Return Home
          </Link>
        </div>
      </main>
    );
  }

  // If registration is closed (deadline passed), show a clean closed state
  if (regOpen === false) {
    return (
      <main className="relative min-h-screen bg-[#030303] text-white flex items-center justify-center px-5">
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at top, #151515 0%, #080808 50%, #030303 100%)",
          }}
        />
        <div className="relative z-10 text-center max-w-md">
          <div className="mono text-xs uppercase tracking-[0.3em] text-[#B52A32] mb-4">
            / Registration Closed
          </div>
          <h1 className="display text-4xl md:text-6xl font-bold text-white mb-4">
            REGISTRATION
            <br />
            <span className="text-[#B52A32]">CLOSED.</span>
          </h1>
          <p className="text-[#A8A8A8] mb-8">
            {eventState.data?.registrationMessage || "The registration deadline has passed."}
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white hover:border-white/40 hover:bg-white/5 transition-all min-h-[44px]"
          >
            ← Return Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-[#030303] text-white">
      {/* Subtle backdrop — radial gradient + grid */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at top, #151515 0%, #080808 50%, #030303 100%)",
        }}
      />
      <div className="fixed inset-0 bg-grid pointer-events-none opacity-30" />

      <div className="relative z-10">
        <header className="border-b border-white/5">
          <div className="mx-auto max-w-7xl px-4 md:px-10 py-5 flex items-center justify-between">
            <Link href="/" className="flex items-baseline gap-2">
              <span className="display text-lg font-bold text-white">HACKMITTEN</span>
              <span className="mono text-xs text-[#B52A32]">3.0</span>
            </Link>
            <Link href="/" className="text-xs text-[#A8A8A8] hover:text-white transition-colors">
              ← Back to site
            </Link>
          </div>
        </header>

        <section className="mx-auto max-w-7xl px-4 md:px-10 py-8 md:py-16">
          <RegisterStepper />
          <div className="mt-8 md:mt-10">
            {step === 0 && <StepTeam />}
            {step === 1 && <StepMembers />}
            {step === 2 && <StepDetails />}
            {step === 3 && <StepPayment />}
            {step === 4 && <StepSubmit />}
          </div>
        </section>
      </div>
    </main>
  );
}
