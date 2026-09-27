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
