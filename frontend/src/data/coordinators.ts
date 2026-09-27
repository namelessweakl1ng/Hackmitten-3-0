export type StaticCoordinator = {
  name: string;
  role: string;
  department: string | null;
  qualification?: string | null;
  type: "STUDENT" | "FACULTY";
  image: string | null;
  email: string | null;
  phone: string | null;
  isLead?: boolean;
};

export const COORDINATORS: StaticCoordinator[] = [
  {
    name: "Komal Kirthi Mittal B",
    role: "President",
    department: "CSE",
    type: "STUDENT",
    image: "/images/coordinators/komal.jpeg",
    email: "mittalkomal380@gmail.com",
    phone: "9901727510",
  },
  {
    name: "Hiremata Rohith",
    role: "President",
    department: "CSE",
    type: "STUDENT",
    image: "/images/coordinators/rohith.jpeg",
    email: "4mn24cs404@gmail.com",
    phone: "8125636397",
  },
  {
    name: "Manasa M Swamy",
    role: "Vice President",
    department: "CSE",
    type: "STUDENT",
    image: "/images/coordinators/manasa.jpeg",
    email: "manasauttam@gmail.com",
    phone: "7760882899",
  },
  {
    name: "Rakshitha K M",
    role: "Secretary",
    department: "CSE",
    type: "STUDENT",
    image: "/images/coordinators/rakshitha.jpeg",
    email: "rakshithakm1602@gmail.com",
    phone: "9845058451",
  },
  {
    name: "Madan Gowda B U",
    role: "Secretary",
    department: "CSE",
    type: "STUDENT",
    image: "/images/coordinators/madan.jpeg",
    email: "madangowdabu2005@gmail.com",
    phone: "7676453140",
  },
  {
    name: "Bindu B S",
    role: "Joint Secretary",
    department: "CSE",
    type: "STUDENT",
    image: "/images/coordinators/bindu.jpeg",
    email: "bindu.bs807@gmail.com",
    phone: "8073709238",
  },
  {
    name: "Arjun Urs R",
    role: "Joint Secretary",
    department: "CSE",
    type: "STUDENT",
    image: "/images/coordinators/arjun.jpeg",
    email: "arjunursr2005@gmail.com",
    phone: "7483522779",
  },
  {
    name: "Divya H",
    role: "Joint Secretary",
    department: "AI&ML",
    type: "STUDENT",
    image: "/images/coordinators/divya.jpeg",
    email: "divyahgowda0901@gmail.com",
    phone: "7019231891",
  },
  {
    name: "Srinidhi TG",
    role: "Joint Secretary",
    department: "AI&ML",
    type: "STUDENT",
    image: "/images/coordinators/Srinidhi.jpeg",
    email: "srinidhitg2006@gmail.com",
    phone: "8660586517",
  },
  {
    name: "Kishore P",
    role: "Vice President",
    department: "CSE",
    type: "STUDENT",
    image: "/images/coordinators/kishore.jpeg",
    email: "kishkeerthi274@gmail.com",
    phone: "7348928249",
  },

  {
    name: "Dr. Mahadeva Prasad Y N",
    role: "Associate Professor",
    department: "CSE",
    qualification: "M.Tech and Ph.D",
    type: "FACULTY",
    image: "/images/faculty_coordinators/mahadevprasad.png",
    email: null,
    phone: null,
  },
  {
    name: "Dr. Malathi M",
    role: "Professor",
    department: "CSE",
    qualification: "M.Tech and Ph.D",
    type: "FACULTY",
    image: "/images/faculty_coordinators/malathimam.png",
    email: null,
    phone: null,
  },
  {
    name: "Prof. Karthik V S",
    role: "Assistant Professor",
    department: "CSE",
    qualification: "MCA",
    type: "FACULTY",
    image: "/images/faculty_coordinators/karthik.png",
    email: null,
    phone: null,
  },
    {
    name: "Prof. Srinidhi N Koppal",
    role: "Assistant Professor",
    department: "AI&ML",
    qualification: "M.Sc",
    type: "FACULTY",
    image: "/images/faculty_coordinators/sreenidhi.png",
    email: null,
    phone: null,
  },
];
