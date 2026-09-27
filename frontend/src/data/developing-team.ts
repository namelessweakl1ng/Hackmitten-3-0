export type DevelopingTeamMember = {
  id: string;
  name: string;
  role: string;
  image: string;
  linkedin?: string;
  github?: string;
  phone?: string;
};

export const DEVELOPING_TEAM: DevelopingTeamMember[] = [
  {
    id: "developer-1",
    name: "Manjunath P",
    role: "Developer",
    image: "/images/developers/manjuanath.jpeg",
    linkedin: "https://www.linkedin.com/in/manjunatha67p/",
    github: "https://github.com/namelessweakl1ng",
  },
  {
    id: "developer-2",
    name: "Pradeep Kadakol",
    role: "Developer",
    image: "/images/developers/person2.png",
    linkedin: "https://www.linkedin.com/in/pradeep-kadakol-602220333/",
    github: "https://github.com/pradeepkadakol",
  },
  {
    id: "developer-3",
    name: "Sharath HN",
    role: "Developer",
    image: "/images/developers/person3.png",
    linkedin: "https://www.linkedin.com/in/sharath-hn-368449228/",
    github: "https://github.com/sharath-6363",
  },
  {
    id: "developer-5",
    name: "Jasim Hussain",
    role: "Developer",
    image: "/images/developers/jasim.jpeg",
    linkedin: "https://www.linkedin.com/in/jasim-hussaain?utm_source=share_via&utm_content=profile&utm_medium=member_ios",
    github: "https://github.com/jasimk786",
  },
  {
    id: "developer-4",
    name: "Harshith H R",
    role: "Design & Content",
    image: "/images/developers/harshith.jpeg",
    phone: "8296338351",
  },];