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
    };
  }

  interface User {
    role: Role;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
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
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        if (!email) {
          return null;
        }

        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          return existingUser;
        }

        const shouldBeAdmin = adminEmails.has(email);

        const newUser = await prisma.user.create({
          data: {
            email,
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
        return token;
      }

      if (!token.role && token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { role: true },
        });

        token.role = dbUser?.role ?? Role.INTERN;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as Role) ?? Role.INTERN;
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
