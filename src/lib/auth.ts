import { prismaAdapter } from "better-auth/adapters/prisma";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET ?? "trans-development-secret-change-before-production",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://127.0.0.1:3000",
  database: prismaAdapter(prisma, {
    provider: "postgresql"
  }),
  emailAndPassword: {
    enabled: true
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "TRANSLATOR",
        required: false
      }
    }
  },
  plugins: [nextCookies()]
});
