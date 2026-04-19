import { betterAuth } from "better-auth"
import { db } from "./db"
import { prismaAdapter } from "better-auth/adapters/prisma"

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql"
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  // Role and isActive are now on OrganizationMember, not on User.
  // User is a global identity; org-specific attributes live in the membership.
})

export type Session = typeof auth.$Infer.Session
