"use client"

import { createAuthClient } from "better-auth/react"
import { socialProviderClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  plugins: [socialProviderClient()],
})

export const { signIn, signOut, signUp, useSession } = authClient
