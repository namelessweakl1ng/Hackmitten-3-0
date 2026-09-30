"use client";

import { useEffect, useRef, useState } from "react";
import { resolveSponsors } from "@/data/sponsors";

type Sponsor = ReturnType<typeof resolveSponsors>[number];

export function Sponsors() {
  const sponsors = resolveSponsors();

  if (sponsors.length === 0) {
    return null;
  }

  /* ================================
     SEPARATE SPONSORS AND DEPARTMENTS
     ================================ */

  const sponsorLogos = sponsors.filter(
    (sponsor) => sponsor.tier !== "CUSTOM"
  );

  const departmentLogos = sponsors.filter(
    (sponsor) => sponsor.tier === "CUSTOM"
  );

  /* ================================
     DEPARTMENT LOGO FALLBACK
     ================================ */

  const getDepartmentLogo = (department: Sponsor) => {
    if (department.logoUrl) {
      return department.logoUrl;
    }

    const name = department.name.toLowerCase();

    if (name.includes("cse")) {
      return "/images/sponsors/cse.png";
    }

    if (name.includes("ai") || name.includes("ml")) {
      return "/images/sponsors/aiml.png";
    }

    return "";
  };

  return (
    <section
      id="sponsors"
      className="relative border-t border-white/5 py-16 md:py-24"
    >
      <div className="mx-auto max-w-7xl px-5 md:px-10">

        {/* ================================
                    HEADER
            ================================ */}

        <div className="mb-10 text-center md:mb-16">
          <div className="mono mb-4 text-xs uppercase tracking-[0.3em] text-[#B52A32]">
            / Partners
          </div>

          <h2 className="display text-3xl font-bold leading-[0.95] tracking-tight text-white sm:text-5xl md:text-7xl">
            BACKED BY
            <br />
            <span className="text-[#A8A8A8]">THE BEST.</span>
          </h2>
        </div>

        {/* =====================================================
                            SPONSORS
            ===================================================== */}

        {sponsorLogos.length > 0 && (
          <div className="mb-16 md:mb-24">

            {/* Sponsors title */}
            <div className="mb-8 flex items-center gap-4">
              <span className="mono whitespace-nowrap text-[10px] uppercase tracking-widest text-[#A8A8A8]">
                SPONSORS
              </span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <SponsorGlobe sponsors={sponsorLogos} />

          </div>
        )}

        {/* =====================================================
                         DEPARTMENTS
            ===================================================== */}

        {departmentLogos.length > 0 && (
          <div>

            {/* Departments title */}
            <div className="mb-8 flex items-center gap-4">
              <span className="mono whitespace-nowrap text-[10px] uppercase tracking-widest text-[#A8A8A8]">
                DEPARTMENTS
              </span>

              <div className="h-px flex-1 bg-white/10" />
            </div>

            {/* CSE + AI&ML */}
            <div className="flex items-start justify-center gap-12 md:gap-24">

              {departmentLogos.map((department) => {
                const logo = getDepartmentLogo(department);

                return (
                  <div
                    key={department.id}
                    className="flex w-32 flex-col items-center md:w-40"
                  >

                    {/* Circular logo */}
                    <div
                      className="
                        flex
                        h-28
                        w-28
                        items-center
                        justify-center
                        overflow-hidden
                        rounded-full
                        bg-white
                        p-2
                        shadow-lg
                        md:h-36
                        md:w-36
                      "
                    >
                      {logo ? (
                        <img
                          src={logo}
                          alt={`${department.name} logo`}
                          loading="lazy"
                          className="
                            h-full
                            w-full
                            rounded-full
                            object-contain
                          "
                        />
                      ) : (
                        <span className="text-center text-sm font-bold text-black">
                          {department.name}
                        </span>
                      )}
                    </div>

                    {/* Department name */}
                    <span
                      className="
                        mono
                        mt-4
                        text-center
                        text-xs
                        uppercase
                        tracking-widest
                        text-[#A8A8A8]
                      "
                    >
                      {department.name}
                    </span>

                  </div>
                );
              })}

            </div>
          </div>
        )}

      </div>
    </section>
  );
}

