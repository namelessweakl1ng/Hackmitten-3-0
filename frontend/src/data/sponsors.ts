export type StaticSponsor = {
  name: string;
  logo: string;
  website: string | null;
  tier: string;
  customTier?: string | null;
};

export const SPONSORS: StaticSponsor[] = [
  {
    name: "VigyanLabs",
    logo: "/images/sponsors/Vlabs.jpeg",
    website: null,
    tier: "TITLE",
  },
  {
    name: "SUCE-STEP",
    logo: "/images/sponsors/logo1.png",
    website: null,
    tier: "PARTNER",
  },
  {
    name: "CYNEFIAN Pvt. Ltd.",
    logo: "/images/sponsors/logo2.png",
    website: null,
    tier: "PARTNER",
  },
  {
    name: "1by0grit.com",
    logo: "/images/sponsors/logo3.png",
    website: null,
    tier: "PARTNER",
  },
  // CSE
  {
    name: "CSE",
    logo: "/images/sponsors/cse.png",
    website: null,
    tier: "CUSTOM",
    customTier: "Departments",
  },

  // AI&ML
  {
    name: "AI&ML",
    logo: "/images/sponsors/aiml.png",
    website: null,
    tier: "CUSTOM",
    customTier: "Departments",
  },
];

export function resolveSponsors() {
  return SPONSORS.map((s, index) => ({
    id: `static-sponsor-${index}`,
    name: s.name,
    logoUrl: s.logo,
    websiteUrl: s.website,
    tier: s.tier,
    customTier: s.customTier ?? null,
    sortOrder: index,
  }));
}
