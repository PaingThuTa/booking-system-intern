import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import type { DefaultSession, NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

import prisma from "./db";
import { DEFAULT_REDIRECT } from "./roles";

const adminEmails = new Set(
  process.env.ADMIN_EMAILS?.split(",").map((email) => email.trim().toLowerCase()).filter(Boolean),
);

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: DefaultSession["user"] & {
      id: string;
      role: Role;
      internId?: string | null;
    };
  }

  interface User {
    role: Role;
    internId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
    internId?: string | null;
  }
}

const googleProviderConfigured =
  Boolean(process.env.GOOGLE_CLIENT_ID) && Boolean(process.env.GOOGLE_CLIENT_SECRET);

export const authOptions: NextAuthOptions = {
  // Cast adapter to v4 Adapter type to satisfy types while using @auth/prisma-adapter
  adapter: PrismaAdapter(prisma) as unknown as Adapter,
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Email login",
      credentials: {
        email: { label: "Email", type: "email" },
        fullName: { label: "Full name", type: "text" },
        internId: { label: "Intern ID", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const fullName = credentials?.fullName?.trim();
        const internIdRaw = credentials?.internId?.trim();

        if (!email || !fullName || !internIdRaw) {
          return null;
        }

        const normalizedInternId = internIdRaw.toUpperCase();

        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        const internIdOwner = await prisma.user.findFirst({
          where: {
            internId: normalizedInternId,
          },
        });

        if (existingUser) {
          if (existingUser.internId && existingUser.internId !== normalizedInternId) {
            throw new Error("This account is linked to a different intern ID.");
          }

          if (internIdOwner && internIdOwner.id !== existingUser.id) {
            throw new Error("This intern ID is already linked to another account.");
          }

          const updatedUser = await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              name: fullName,
              internId: existingUser.internId ?? normalizedInternId,
            },
          });

          return updatedUser;
        }

        const shouldBeAdmin = adminEmails.has(email);

        if (internIdOwner) {
          throw new Error("This intern ID is already linked to another account.");
        }

        const newUser = await prisma.user.create({
          data: {
            email,
            name: fullName,
            internId: normalizedInternId,
            role: shouldBeAdmin ? Role.ADMIN : Role.INTERN,
          },
        });

        return newUser;
      },
    }),
    ...(googleProviderConfigured
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID ?? "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
            authorization: {
              params: {
                prompt: "select_account",
              },
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) {
        return false;
      }

      const shouldBeAdmin = adminEmails.has(user.email.toLowerCase());

      if (user.id) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            role: shouldBeAdmin ? Role.ADMIN : Role.INTERN,
          },
        });
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role ?? Role.INTERN;
        token.internId = user.internId ?? null;
        return token;
      }

      if (!token.role && token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { role: true, internId: true, name: true },
        });

        token.role = dbUser?.role ?? Role.INTERN;
        token.internId = dbUser?.internId ?? null;
        if (dbUser?.name) {
          token.name = dbUser.name;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as Role) ?? Role.INTERN;
        session.user.internId = token.internId ?? null;
        if (token.name) {
          session.user.name = token.name as string;
        }
      }

      return session;
    },
    async redirect({ baseUrl }) {
      return baseUrl;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.email) {
        return;
      }

      const shouldBeAdmin = adminEmails.has(user.email.toLowerCase());

      if (shouldBeAdmin) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: Role.ADMIN },
        });
      }
    },
  },
};

export const auth = () => getServerSession(authOptions);

export const defaultRedirectForRole = (role: Role) => DEFAULT_REDIRECT[role] ?? "/";
