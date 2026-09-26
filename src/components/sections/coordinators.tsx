"use client";

import {
  ChevronDown,
  Github,
  Linkedin,
  Phone,
} from "lucide-react";
import { useState } from "react";

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
  if (coordinators.length === 0) {
    return null;
  }

  return (
    <div>
      {/* Group heading */}
      <div className="mb-6 flex items-center gap-4">
        <span className="mono whitespace-nowrap text-[10px] uppercase tracking-[0.3em] text-[#A8A8A8]">
          {title}
        </span>

        <div className="h-px flex-1 bg-white/10" />
      </div>

      {/* Coordinator cards */}
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 md:gap-4 lg:gap-6">
        {coordinators.map((coordinator) => (
          <CoordinatorCard
            key={coordinator.id}
            coordinator={coordinator}
          />
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
  const [expanded, setExpanded] = useState(false);

  const hasContact = Boolean(
    coordinator.email || coordinator.phone
  );

  return (
    <article
      className={`group relative overflow-hidden rounded-lg glass glass-hover transition-all duration-300 ${
        coordinator.isLead
          ? "md:col-span-2 md:row-span-1"
          : ""
      } ${
        expanded
          ? "ring-1 ring-[#B52A32]/50 sm:ring-0"
          : ""
      }`}
    >
      <button
        type="button"
        onClick={() => {
          if (
            hasContact &&
            window.matchMedia("(max-width: 639px)").matches
          ) {
            setExpanded((current) => !current);
          }
        }}
        aria-expanded={
          hasContact ? expanded : undefined
        }
        aria-controls={
          hasContact
            ? `coordinator-contact-${coordinator.id}`
            : undefined
        }
        aria-label={
          hasContact
            ? `${
                expanded ? "Hide" : "Show"
              } contact details for ${coordinator.name}`
            : coordinator.name
        }
        className="block w-full text-left"
      >
        {/* Photo */}
        <div
          className={`relative overflow-hidden ${
            coordinator.isLead
              ? "aspect-[16/10]"
              : "aspect-[4/5] sm:aspect-[4/5]"
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

          {/* Dark gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-transparent to-transparent" />

          {/* Lead badge */}
          {coordinator.isLead && (
            <div className="absolute left-3 top-3 border border-[#B52A32] bg-black/60 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-[#B52A32] backdrop-blur">
              Lead
            </div>
          )}
        </div>

        {/* Details */}
        <div className="p-1.5 sm:p-3 md:p-4 lg:p-5">
          <h3 className="display break-words text-[10px] font-semibold leading-tight tracking-tight text-white sm:text-sm md:text-base lg:text-lg">
            {coordinator.name}
          </h3>

          <div className="mt-1 break-words text-[8px] leading-tight text-[#B52A32] sm:text-xs">
            {coordinator.role}
          </div>

          {coordinator.type === "FACULTY" &&
            coordinator.qualification && (
              <div className="mt-1 break-words text-[9px] leading-tight text-[#A8A8A8] sm:text-[10px] md:text-[11px]">
                {coordinator.qualification}
              </div>
            )}

          {coordinator.department && (
            <div className="mt-1 break-words text-[9px] leading-tight text-[#A8A8A8] sm:text-[10px] md:text-[11px]">
              {coordinator.department}
            </div>
          )}

          {/* Mobile contact toggle */}
          {hasContact && (
            <div className="mono mt-2 flex items-center gap-1 text-[8px] uppercase tracking-widest text-[#B52A32] sm:hidden">
              Contact
              <ChevronDown
                size={11}
                className={`transition-transform ${
                  expanded ? "rotate-180" : ""
                }`}
              />
            </div>
          )}
        </div>
      </button>

      {/* Contact information */}
      {hasContact && (
        <div
          id={`coordinator-contact-${coordinator.id}`}
          className={`${
            expanded ? "block" : "hidden"
          } mt-3 space-y-1 border-t border-white/5 px-1.5 pt-3 sm:block sm:-mt-2 sm:px-3 md:px-4 lg:px-5`}
        >
          {coordinator.email && (
            <a
              href={`mailto:${coordinator.email}`}
              className="block max-w-full break-words text-[10px] text-[#A8A8A8] transition-colors hover:text-white sm:text-[11px]"
            >
              {coordinator.email}
            </a>
          )}

          {coordinator.phone && (
            <a
              href={`tel:${coordinator.phone}`}
              className="block text-[10px] text-[#A8A8A8] transition-colors hover:text-white sm:text-[11px]"
            >
              {coordinator.phone}
            </a>
          )}
        </div>
      )}
    </article>
  );
}

/* ================================================================
   DEVELOPING & DESIGN TEAM
================================================================ */

function DevelopingTeam() {
  if (DEVELOPING_TEAM.length === 0) {
    return null;
  }

  return (
    <div>
      {/* Section heading */}
      <div className="mb-6 flex items-center gap-4">
        <span className="mono whitespace-nowrap text-[10px] uppercase tracking-[0.3em] text-[#A8A8A8]">
          DEVELOPING & DESIGN TEAM
        </span>

        <div className="h-px flex-1 bg-white/10" />
      </div>

      {/* Team cards */}
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-2 sm:gap-3 md:grid-cols-4 md:gap-4 lg:gap-6">
        {DEVELOPING_TEAM.map((member) => (
          <DevelopingTeamCard
            key={member.id}
            member={member}
          />
        ))}
      </div>
    </div>
  );
}

/* ================================================================
   DEVELOPING TEAM CARD
================================================================ */

function DevelopingTeamCard({
  member,
}: {
  member: (typeof DEVELOPING_TEAM)[number];
}) {
  const hasConnections = Boolean(
    member.linkedin ||
      member.github ||
      member.phone
  );

  return (
    <article className="group relative overflow-hidden rounded-lg glass glass-hover transition-all duration-300">
      {/* ====================================================== */}
      {/* PHOTO                                                  */}
      {/* ====================================================== */}

      <div className="relative aspect-[4/5] overflow-hidden">
        {member.image ? (
          <img
            src={member.image}
            alt={member.name}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[#151515]">
            <span className="display text-3xl font-bold text-[#252525]">
              {member.name
                .split(" ")
                .map((name) => name[0])
                .slice(0, 2)
                .join("")}
            </span>
          </div>
        )}

        {/* Photo gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-transparent to-transparent" />
      </div>

      {/* ====================================================== */}
      {/* INFORMATION                                            */}
      {/* ====================================================== */}

      <div className="p-2 sm:p-3 md:p-4">
        <h3 className="display break-words text-xs font-semibold leading-tight tracking-tight text-white sm:text-sm md:text-base">
          {member.name}
        </h3>

        <div className="mt-1 text-[9px] uppercase tracking-wide text-[#B52A32] sm:text-xs">
          {member.role}
        </div>

        {/* ================================================== */}
        {/* CONNECTS                                             */}
        {/* ================================================== */}

        {hasConnections && (
          <div className="mt-4 border-t border-white/10 pt-3">
            <div className="mono mb-2 text-[8px] uppercase tracking-[0.2em] text-[#A8A8A8]">
              Connects
            </div>

            <div className="flex items-center gap-2">
              {/* ================================================== */}
              {/* LINKEDIN                                            */}
              {/* ================================================== */}

              {member.linkedin && (
                <a
                  href={member.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${member.name} LinkedIn`}
                  className="
                    flex h-8 w-8 items-center justify-center
                    rounded-full
                    border border-[#0A66C2]/40
                    bg-[#0A66C2]/10
                    text-[#0A66C2]
                    transition-all duration-300
                    hover:border-[#0A66C2]
                    hover:bg-[#0A66C2]/20
                    hover:text-[#4DA3FF]
                    hover:shadow-[0_0_12px_rgba(10,102,194,0.45)]
                  "
                >
                  <Linkedin
                    size={14}
                    strokeWidth={2}
                  />
                </a>
              )}

              {/* ================================================== */}
              {/* GITHUB                                              */}
              {/* ================================================== */}

              {member.github && (
                <a
                  href={member.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${member.name} GitHub`}
                  className="
                    flex h-8 w-8 items-center justify-center
                    rounded-full
                    border border-white/20
                    bg-white/5
                    text-[#D4D4D4]
                    transition-all duration-300
                    hover:border-white/50
                    hover:bg-white/10
                    hover:text-white
                    hover:shadow-[0_0_12px_rgba(255,255,255,0.25)]
                  "
                >
                  <Github
                    size={14}
                    strokeWidth={2}
                  />
                </a>
              )}

              {/* ================================================== */}
              {/* PHONE                                               */}
              {/* ================================================== */}

              {member.phone && (
                <a
                  href={`tel:${member.phone}`}
                  aria-label={`Call ${member.name}`}
                  className="
                    flex h-8 w-8 items-center justify-center
                    rounded-full
                    border border-[#22C55E]/40
                    bg-[#22C55E]/10
                    text-[#22C55E]
                    transition-all duration-300
                    hover:border-[#22C55E]
                    hover:bg-[#22C55E]/20
                    hover:text-[#4ADE80]
                    hover:shadow-[0_0_12px_rgba(34,197,94,0.45)]
                  "
                >
                  <Phone
                    size={14}
                    strokeWidth={2}
                  />
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
