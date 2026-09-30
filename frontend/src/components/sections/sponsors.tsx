"use client";

import { useEffect, useState } from "react";

type Sponsor = { id: string; name: string; logoUrl: string; websiteUrl: string | null; tier: string; customTier: string | null; sortOrder: number };

const DEPARTMENTS: Sponsor[] = [
  { id: "department-cse", name: "CSE", logoUrl: "/images/sponsors/cse.png", websiteUrl: null, tier: "CUSTOM", customTier: "Departments", sortOrder: 0 },
  { id: "department-aiml", name: "AI&ML", logoUrl: "/images/sponsors/aiml.png", websiteUrl: null, tier: "CUSTOM", customTier: "Departments", sortOrder: 1 },
];

export function Sponsors() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/sponsors", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load sponsors");
        return response.json() as Promise<{ sponsors: Sponsor[] }>;
      })
      .then((result) => setSponsors(result.sponsors))
      .catch((error) => { if (error instanceof Error && error.name !== "AbortError") console.error("Unable to load sponsors"); });
    return () => controller.abort();
  }, []);

  /* ================================
     SEPARATE SPONSORS AND DEPARTMENTS
     ================================ */

  const sponsorLogos = sponsors;

  const departmentLogos = DEPARTMENTS;

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

            <div className="grid w-full grid-cols-[repeat(auto-fit,minmax(min(100%,8rem),1fr))] items-center gap-4 md:gap-6">

              {sponsorLogos.map((sponsor) => (
                <div
                  key={sponsor.id}
                  className="
                    flex
                    h-28
                    min-w-0
                    items-center
                    justify-center
                    md:h-36
                  "
                >
                  {sponsor.logoUrl ? (
                    sponsor.websiteUrl ? <a href={sponsor.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex h-full w-full items-center justify-center">
                      <SponsorLogo sponsor={sponsor} />
                    </a> : <SponsorLogo sponsor={sponsor} />
                  ) : (
                    <span className="text-center text-sm font-bold text-[#A8A8A8]/50 md:text-lg">
                      {sponsor.name}
                    </span>
                  )}
                </div>
              ))}

            </div>
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

function SponsorLogo({ sponsor }: { sponsor: Sponsor }) {
  return <img
    src={sponsor.logoUrl}
    alt={`${sponsor.name} logo`}
    loading="lazy"
    className="block max-h-full max-w-full object-contain"
  />;
}
