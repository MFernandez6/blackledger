import { type NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { resolveStaffForLogin } from "@/lib/directory";
import { loginSchema } from "@/lib/schemas/login";
import type { StaffRole } from "@/lib/types";

if (!process.env.NEXTAUTH_URL && process.env.VERCEL_URL) {
  process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL}`;
}

const useSecureCookies =
  process.env.NEXTAUTH_URL?.startsWith("https://") ||
  process.env.VERCEL === "1";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: StaffRole;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: StaffRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: StaffRole;
  }
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
  useSecureCookies,
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
    updateAge: 30 * 60,
  },
  cookies: {
    sessionToken: {
      name: useSecureCookies
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        try {
          const staff = await resolveStaffForLogin(parsed.data.email);
          if (!staff) return null;

          const valid = await compare(parsed.data.password, staff.passwordHash);
          if (!valid) return null;

          return {
            id: staff.id,
            email: staff.email,
            name: staff.name,
            role: staff.role,
          };
        } catch (err) {
          console.error("[BLACKLEDGER] sign-in directory error", err);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.email = user.email;
      }
      const email =
        typeof token.email === "string" ? token.email.toLowerCase() : null;
      if (email) {
        try {
          const staff = await prisma.staff.findFirst({
            where: { email, isActive: true },
            select: { id: true, role: true },
          });
          if (staff) {
            token.id = staff.id;
            token.role = staff.role as StaffRole;
          }
        } catch {
          // keep existing token if DB is briefly unavailable
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as StaffRole;
      }
      return session;
    },
  },
};

export function getSession() {
  return getServerSession(authOptions);
}

export async function resolveSessionStaff(session: {
  user?: { id?: string; email?: string | null; role?: StaffRole } | null;
}) {
  const email = session.user?.email?.toLowerCase();
  const id = session.user?.id;

  if (id) {
    const byId = await prisma.staff.findFirst({
      where: { id, isActive: true },
      select: { id: true, email: true, name: true, role: true },
    });
    if (byId) return { ...byId, role: byId.role as StaffRole };
  }

  if (email) {
    const byEmail = await prisma.staff.findFirst({
      where: { email, isActive: true },
      select: { id: true, email: true, name: true, role: true },
    });
    if (byEmail) return { ...byEmail, role: byEmail.role as StaffRole };
  }

  return null;
}

export async function requireSession() {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export function canWriteFinance(role: StaffRole): boolean {
  return role === "ADMIN" || role === "FINANCE";
}

export function canEditSchedules(role: StaffRole): boolean {
  return role === "ADMIN";
}

export function isServiceKey(header: string | null): boolean {
  const key = process.env.BLACKLEDGER_API_KEY;
  if (!key || !header) return false;
  const token = header.startsWith("Bearer ") ? header.slice(7) : header;
  return token === key;
}
