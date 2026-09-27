import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { LOGIN_ROLE_MAP } from "@/lib/operational-users";

type UserLike = {
  id: string;
  username: string;
  email: string;
  role: import("@prisma/client").Role;
  passwordHash: string;
};

export function normalizeLoginIdentifier(identifier: string): string {
  return identifier.trim();
}

export async function findUserByLoginIdentifier(identifier: string, database = db) {
  const normalizedIdentifier = normalizeLoginIdentifier(identifier);
  if (!normalizedIdentifier) return null;

  return database.user.findFirst({
    where: {
      OR: [
        { email: normalizedIdentifier.toLowerCase() },
        { username: { equals: normalizedIdentifier, mode: "insensitive" } },
      ],
    },
  });
}

export function roleMatchesSelectedRole(
  selectedRole: string | null | undefined,
  userRole: import("@prisma/client").Role | string,
): boolean {
  const normalizedSelection = String(selectedRole ?? "").trim().toUpperCase();
  const normalizedUserRole = String(userRole ?? "").trim().toUpperCase();
  return LOGIN_ROLE_MAP[normalizedSelection as keyof typeof LOGIN_ROLE_MAP] === normalizedUserRole;
}

export async function verifyPasswordAndRole({
  identifier,
  password,
  selectedRole,
  user,
}: {
  identifier: string | null | undefined;
  password: string | null | undefined;
  selectedRole: string | null | undefined;
  user: UserLike | null;
}): Promise<boolean> {
  if (!identifier || !password || !user) return false;

  const passwordOk = await bcrypt.compare(password, user.passwordHash);
  if (!passwordOk) return false;

  return roleMatchesSelectedRole(selectedRole, user.role);
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 }, // 7 days
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        identifier: { label: "Username or Email", type: "text" },
        password: { label: "Password", type: "password" },
        role: { label: "Role", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password || !credentials?.role) return null;

        const id = normalizeLoginIdentifier(String(credentials.identifier));
        const selectedRole = String(credentials.role);

        const user = await findUserByLoginIdentifier(id);

        if (!user) return null;

        const passwordAndRoleValid = await verifyPasswordAndRole({
          identifier: id,
          password: String(credentials.password),
          selectedRole,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            passwordHash: user.passwordHash,
          },
        });

        if (!passwordAndRoleValid) {
          console.warn("[auth] login rejected: invalid password or mismatched role");
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.username,
          role: user.role,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  // Required at runtime — NextAuth throws in production if NEXTAUTH_SECRET is
  // missing. No dev fallback is provided here.
  secret: process.env.NEXTAUTH_SECRET,
};

// Type augmentation so role is visible on session.user
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: import("@prisma/client").Role;
    };
  }
  interface User {
    role: import("@prisma/client").Role;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: import("@prisma/client").Role;
  }
}
