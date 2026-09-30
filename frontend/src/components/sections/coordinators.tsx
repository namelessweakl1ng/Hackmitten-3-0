"use client";

import {
  Github,
  Linkedin,
  Mail,
  Phone,
  X,
} from "lucide-react";
import { useRef, useState } from "react";

import { COORDINATORS } from "@/data/coordinators";
import { DEVELOPING_TEAM } from "@/data/developing-team";

type Coordinator = {
  id: string;
  name: string;
  role: string;
  department: string | null;
  qualification: string | null;
  type: "STUDENT" | "FACULTY";
  phone: string | null;
  email: string | null;
  photoUrl: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  isLead: boolean;
};

export function Coordinators() {
  const coordinators: Coordinator[] = COORDINATORS.map((c, index) => ({
          id: `static-coordinator-${index}`,
          name: c.name,
          role: c.role,
          department: c.department,
          qualification: c.qualification ?? null,
          type: c.type,
          phone: c.phone,
          email: c.email,
          photoUrl: c.image,
          linkedinUrl: null,
          githubUrl: null,
          isLead: c.isLead ?? false,
  }));

  /*
   * ============================================================
   * FACULTY FIRST
   * ============================================================
   */
  const faculty = coordinators.filter(
    (coordinator) => coordinator.type === "FACULTY"
  );

  /*
   * ============================================================
   * STUDENTS SECOND
   * ============================================================
   */
  const students = coordinators
    .filter((coordinator) => coordinator.type === "STUDENT")
    .sort((a, b) => {
      const aOrder = normalizeRole(a.role);
      const bOrder = normalizeRole(b.role);

      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }

      return 0;
    });

  if (coordinators.length === 0) {
    return null;
  }

  return (
    <section
      id="crew"
      className="relative section-pad mx-auto max-w-7xl"
    >
      {/* ====================================================== */}
      {/* HEADER                                                 */}
      {/* ====================================================== */}

      <div className="mb-12 md:mb-16">
        <div className="mono mb-4 text-xs uppercase tracking-[0.3em] text-[#B52A32]">
          / Coordinators
        </div>

        <h2 className="display text-4xl font-bold leading-[0.95] tracking-tight text-white sm:text-6xl md:text-7xl">
          THE CREW
          <br />
          <span className="text-[#A8A8A8]">
            BEHIND THE MISSION.
          </span>
        </h2>
      </div>

      {/* ====================================================== */}
      {/* 1. FACULTY COORDINATORS                                */}
      {/* ====================================================== */}

      <CoordinatorGroup
        title="FACULTY COORDINATORS"
        coordinators={faculty}
      />

      <div className="h-16 md:h-20" />

      {/* ====================================================== */}
      {/* 2. STUDENT COORDINATORS                                */}
      {/* ====================================================== */}

      <CoordinatorGroup
        title="STUDENT COORDINATORS"
        coordinators={students}
      />

      <div className="h-16 md:h-20" />

      {/* ====================================================== */}
      {/* 3. DEVELOPING & DESIGN TEAM                            */}
      {/* ====================================================== */}

      <DevelopingTeam />
    </section>
  );
}

/* ================================================================
   STUDENT ROLE ORDER
================================================================ */

function normalizeRole(role: string): number {
  const normalized = role.trim().toLowerCase();

  if (normalized === "president") return 1;
  if (normalized === "vice president") return 2;
  if (normalized === "secretary") return 3;
  if (normalized === "joint secretary") return 4;

  return 99;
}

/* ================================================================
   COORDINATOR GROUP
================================================================ */

function CoordinatorGroup({
  title,
  coordinators,
}: {
  title: string;
  coordinators: Coordinator[];
}) {
  if (coordinators.length === 0) return null;

  const isStudent = title === "STUDENT COORDINATORS";

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <span className="mono whitespace-nowrap text-[10px] uppercase tracking-[0.3em] text-[#A8A8A8]">
          {title}
        </span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      {isStudent ? (
        <StudentCarousel coordinators={coordinators} />
      ) : (
        <div className="grid grid-cols-4 gap-1 sm:grid-cols-4 sm:gap-3 md:gap-4 lg:gap-6">
          {coordinators.map((coordinator) => (
            <CoordinatorCard key={coordinator.id} coordinator={coordinator} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ================================================================
   STUDENT CAROUSEL  – infinite auto-scroll, one card at a time
================================================================ */

function StudentCarousel({ coordinators }: { coordinators: Coordinator[] }) {
  const [paused, setPaused] = useState(false);
  const items = [...coordinators, ...coordinators];
  const count = coordinators.length;
  const dur = count * 2.5;

  return (
    <div
      className="relative overflow-hidden"
      style={{ "--gap": "12px", "--card-w": "clamp(140px, 28vw, 220px)" } as React.CSSProperties}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <style>{`
        @keyframes scroll-left {
          from { transform: translateX(0); }
          to   { transform: translateX(calc(-1 * ${count} * (var(--card-w) + var(--gap)))); }
        }
        .marquee-track {
          animation: scroll-left ${dur}s linear infinite;
        }
        .marquee-track.paused { animation-play-state: paused; }
      `}</style>

      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-black/80 to-transparent sm:w-16" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-black/80 to-transparent sm:w-16" />

      <div
        className={`flex marquee-track${paused ? " paused" : ""}`}
        style={{ gap: "var(--gap)" }}
      >
        {items.map((coordinator, i) => (
          <div
            key={`${coordinator.id}-${i}`}
            style={{ width: "var(--card-w)", flexShrink: 0 }}
          >
            <CoordinatorCard coordinator={coordinator} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================
   COORDINATOR CARD
================================================================ */

function CoordinatorCard({
  coordinator,
}: {
  coordinator: Coordinator;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const hasContact = Boolean(coordinator.email || coordinator.phone);

  function openContact() {
    if (hasContact) dialogRef.current?.showModal();
  }

  return (
    <article
      className={`group relative overflow-hidden rounded-lg glass glass-hover transition-all duration-300 ${
        coordinator.isLead ? "md:col-span-2 md:row-span-1" : ""
      }`}
    >
      <button
        type="button"
        onClick={openContact}
        disabled={!hasContact}
        aria-label={hasContact ? `View contact details for ${coordinator.name}` : coordinator.name}
        className="block w-full text-left disabled:cursor-default"
      >
        <div
          className={`relative overflow-hidden ${
            coordinator.isLead ? "aspect-[16/10]" : "aspect-[4/5]"
          }`}
        >
          {coordinator.photoUrl ? (
            <img
              src={coordinator.photoUrl}
              alt={coordinator.name}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-[#151515]">
              <span className="display text-2xl font-bold text-[#252525] sm:text-3xl md:text-4xl">
                {coordinator.name
                  .split(" ")
                  .map((name) => name[0])
                  .slice(0, 2)
                  .join("")}
              </span>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-transparent to-transparent" />

          {coordinator.isLead && (
            <div className="absolute left-3 top-3 border border-[#B52A32] bg-black/60 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-[#B52A32] backdrop-blur">
              Lead
            </div>
          )}
        </div>

        <div className="p-1.5 sm:p-3 md:p-4 lg:p-5">
          <h3 className="display break-words text-[9px] font-semibold leading-tight tracking-tight text-white sm:text-sm md:text-base lg:text-lg">
            {coordinator.name}
          </h3>
          <div className="mt-1 break-words text-[7px] leading-tight text-[#B52A32] sm:text-xs">
            {coordinator.role}
          </div>
          {coordinator.type === "FACULTY" && coordinator.qualification && (
            <div className="mt-1 break-words text-[8px] leading-tight text-[#A8A8A8] sm:text-[10px] md:text-[11px]">
              {coordinator.qualification}
            </div>
          )}
          {coordinator.department && (
            <div className="mt-1 break-words text-[8px] leading-tight text-[#A8A8A8] sm:text-[10px] md:text-[11px]">
              {coordinator.department}
            </div>
          )}
          {hasContact && (
            <div className="mono mt-2 text-[7px] uppercase tracking-widest text-[#B52A32] sm:text-[9px]">
              View contact
            </div>
          )}
        </div>
      </button>

      {hasContact && (
        <dialog
          ref={dialogRef}
          aria-labelledby={`coordinator-dialog-title-${coordinator.id}`}
          onClick={(event) => {
            if (event.target === event.currentTarget) dialogRef.current?.close();
          }}
          className="fixed left-1/2 top-1/2 m-0 w-[min(92vw,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/15 bg-[#0b0708] p-0 text-white shadow-2xl backdrop:bg-black/80"
        >
          <div className="relative p-6 sm:p-8">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Close contact details"
              className="absolute right-4 top-4 rounded-full p-2 text-[#A8A8A8] transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-[#F07C84]"
            >
              <X size={18} />
            </button>
            <div className="mono mb-3 text-[10px] uppercase tracking-[0.3em] text-[#E07179]">
              Coordinator contact
            </div>
            <h3 id={`coordinator-dialog-title-${coordinator.id}`} className="display pr-8 text-2xl font-bold">
              {coordinator.name}
            </h3>
            <p className="mt-2 text-sm text-[#E07179]">{coordinator.role}</p>
            <div className="mt-7 space-y-3 border-t border-white/10 pt-5">
              {coordinator.email && (
                <a
                  href={`mailto:${coordinator.email}`}
                  className="flex items-center gap-3 rounded-lg border border-white/10 px-3 py-3 text-sm text-[#D6C8C8] transition-colors hover:border-[#B52A32] hover:text-white"
                >
                  <Mail size={16} className="shrink-0 text-[#E07179]" />
                  <span className="break-all">{coordinator.email}</span>
                </a>
              )}
              {coordinator.phone && (
                <a
                  href={`tel:${coordinator.phone}`}
                  className="flex items-center gap-3 rounded-lg border border-white/10 px-3 py-3 text-sm text-[#D6C8C8] transition-colors hover:border-[#B52A32] hover:text-white"
                >
                  <Phone size={16} className="shrink-0 text-[#E07179]" />
                  {coordinator.phone}
                </a>
              )}
            </div>
          </div>
        </dialog>
      )}
    </article>
  );
}

/* ================================================================
   DEVELOPING & DESIGN TEAM
================================================================ */

function DevelopingTeam() {
  const [paused, setPaused] = useState(false);
  if (DEVELOPING_TEAM.length === 0) return null;

  const items = [...DEVELOPING_TEAM, ...DEVELOPING_TEAM];
  const count = DEVELOPING_TEAM.length;
  const dur = count * 2.5;

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <span className="mono whitespace-nowrap text-[10px] uppercase tracking-[0.3em] text-[#A8A8A8]">
          DEVELOPING & DESIGN TEAM
        </span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <div
        className="relative overflow-hidden"
        style={{ "--gap": "12px", "--card-w": "clamp(150px, 32vw, 240px)" } as React.CSSProperties}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <style>{`
          @keyframes scroll-right {
            from { transform: translateX(calc(-1 * ${count} * (var(--card-w) + var(--gap)))); }
            to   { transform: translateX(0px); }
          }
          .dev-track {
            animation: scroll-right ${dur}s linear infinite;
          }
          .dev-track.paused { animation-play-state: paused; }
        `}</style>

        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-black/80 to-transparent sm:w-16" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-black/80 to-transparent sm:w-16" />

        <div
          className={`flex dev-track${paused ? " paused" : ""}`}
          style={{ gap: "var(--gap)" }}
        >
          {items.map((member, i) => (
            <div key={`${member.id}-${i}`} style={{ width: "var(--card-w)", flexShrink: 0 }}>
              <DevelopingTeamCard member={member} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DevelopingTeamCard({
  member,
}: {
  member: (typeof DEVELOPING_TEAM)[number];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const hasConnections = Boolean(member.linkedin || member.github || member.phone);

  return (
    <article className="group relative overflow-hidden rounded-lg glass glass-hover transition-all duration-300">
      <button
        type="button"
        onClick={() => hasConnections && dialogRef.current?.showModal()}
        disabled={!hasConnections}
        className="block w-full text-left disabled:cursor-default"
        aria-label={hasConnections ? `View contact details for ${member.name}` : member.name}
      >
        <div className="relative aspect-[4/5] overflow-hidden">
          <img
            src={member.image}
            alt={member.name}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-transparent to-transparent" />
        </div>
        <div className="p-1.5 sm:p-2 md:p-3">
          <h3 className="display break-words text-[8px] font-semibold leading-tight tracking-tight text-white sm:text-xs md:text-sm">
            {member.name}
          </h3>
          <div className="mt-1 break-words text-[7px] uppercase tracking-wide text-[#B52A32] sm:text-[9px] md:text-[10px]">
            {member.role}
          </div>
          {hasConnections && (
            <div className="mono mt-2 text-[6px] uppercase tracking-widest text-[#B52A32] sm:text-[8px]">
              View links
            </div>
          )}
        </div>
      </button>

      {hasConnections && (
        <dialog
          ref={dialogRef}
          aria-labelledby={`developer-dialog-title-${member.id}`}
          onClick={(event) => {
            if (event.target === event.currentTarget) dialogRef.current?.close();
          }}
          className="fixed left-1/2 top-1/2 m-0 w-[min(92vw,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/15 bg-[#0b0708] p-0 text-white shadow-2xl backdrop:bg-black/80"
        >
          <div className="relative p-6 sm:p-8">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Close contact details"
              className="absolute right-4 top-4 rounded-full p-2 text-[#A8A8A8] transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-[#F07C84]"
            >
              <X size={18} />
            </button>
            <div className="mono mb-3 text-[10px] uppercase tracking-[0.3em] text-[#E07179]">
              Team contact
            </div>
            <h3 id={`developer-dialog-title-${member.id}`} className="display pr-8 text-2xl font-bold">
              {member.name}
            </h3>
            <p className="mt-2 text-sm text-[#E07179]">{member.role}</p>
            <div className="mt-7 space-y-3 border-t border-white/10 pt-5">
              {member.linkedin && (
                <a href={member.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg border border-white/10 px-3 py-3 text-sm text-[#D6C8C8] hover:border-[#0A66C2] hover:text-white">
                  <Linkedin size={16} className="text-[#4DA3FF]" /> LinkedIn
                </a>
              )}
              {member.github && (
                <a href={member.github} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg border border-white/10 px-3 py-3 text-sm text-[#D6C8C8] hover:border-white/50 hover:text-white">
                  <Github size={16} /> GitHub
                </a>
              )}
              {member.phone && (
                <a href={`tel:${member.phone}`} className="flex items-center gap-3 rounded-lg border border-white/10 px-3 py-3 text-sm text-[#D6C8C8] hover:border-[#22C55E] hover:text-white">
                  <Phone size={16} className="text-[#22C55E]" /> {member.phone}
                </a>
              )}
            </div>
          </div>
        </dialog>
      )}
    </article>
  );
}
