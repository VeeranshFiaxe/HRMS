// src/lib/auth.ts
// NextAuth configuration — email/password + Google OAuth

import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  // @ts-ignore — PrismaAdapter type mismatch between next-auth versions
  adapter: PrismaAdapter(prisma) as any,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days default
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        rememberMe: { label: "Remember Me", type: "checkbox" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        });

        if (!user) throw new Error("Invalid email or password");
        if (!user.isActive) throw new Error("Your account has been deactivated");
        if (!user.password) {
          throw new Error("This account uses Google login. Please sign in with Google.");
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) throw new Error("Invalid email or password");

        // Audit log
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: "LOGIN",
            description: `User ${user.email} logged in via credentials`,
          },
        }).catch(() => {}); // non-blocking

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          rememberMe: credentials.rememberMe === "true",
        };
      },
    }),

    ...(googleClientId && googleClientSecret
      ? [
          GoogleProvider({
            clientId: googleClientId,
            clientSecret: googleClientSecret,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
  ],

  callbacks: {
    async signIn({ user, account }) {
      // For Google sign-in, ensure user exists in our DB
      if (account?.provider === "google") {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! },
        });
        if (existingUser && !existingUser.isActive) {
          return false; // block inactive accounts
        }
      }
      return true;
    },

    async jwt({ token, user, trigger }) {
      if (user) {
        // On first sign-in, attach extra fields to token
        token.id = user.id;
        token.role = (user as any).role;
        token.rememberMe = (user as any).rememberMe ?? false;
      }

      // Refresh role from DB on session update
      if (trigger === "update") {
        const dbUser = await prisma.user.findUnique({ where: { id: token.id as string } });
        if (dbUser) token.role = dbUser.role;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },

  events: {
    async signOut({ token }) {
      if (token?.id) {
        await prisma.auditLog.create({
          data: {
            userId: token.id as string,
            action: "LOGOUT",
            description: "User logged out",
          },
        }).catch(() => {});
      }
    },
  },
};

// Extend next-auth types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      image?: string | null;
    };
  }
  interface User {
    role?: string;
    rememberMe?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    rememberMe?: boolean;
  }
}
