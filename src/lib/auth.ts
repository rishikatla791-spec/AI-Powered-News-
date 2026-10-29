import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins";
import { headers } from "next/headers";
import { getDb, schema } from "@/lib/db";
import { adminEmails, env, hasAuth, hasEmail, hasGoogleAuth, siteUrl, trustedOrigins } from "@/lib/env";
import { sendEmail } from "@/lib/email";
import { magicLinkEmail, passwordResetEmail, verifyEmail } from "@/lib/email-templates";

async function createAuth() {
  const db = await getDb();
  const e = env();
  return betterAuth({
    appName: "Lede",
    baseURL: siteUrl(),
    secret: e.BETTER_AUTH_SECRET,
    trustedOrigins: trustedOrigins(),
    database: drizzleAdapter(db, { provider: "pg", schema, transaction: false }),
    session: { expiresIn: 60 * 60 * 24 * 30, cookieCache: { enabled: true, maxAge: 300 } },
    // Briefs only go to verified addresses; password sign-ups confirm theirs with a link.
    emailVerification: {
      sendOnSignUp: hasEmail(),
      autoSignInAfterVerification: true,
      expiresIn: 60 * 60 * 24,
      sendVerificationEmail: async ({ user, url }) => {
        const { subject, html, text } = verifyEmail(url);
        await sendEmail({ to: user.email, subject, html, text });
      },
    },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      autoSignIn: true,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: 60 * 30,
      sendResetPassword: async ({ user, url }) => {
        const { subject, html, text } = passwordResetEmail(url);
        await sendEmail({ to: user.email, subject, html, text });
      },
    },
    socialProviders: hasGoogleAuth()
      ? { google: { clientId: e.GOOGLE_CLIENT_ID!, clientSecret: e.GOOGLE_CLIENT_SECRET! } }
      : undefined,
    plugins: [
      magicLink({
        expiresIn: 60 * 15,
        sendMagicLink: async ({ email, url }) => {
          const { subject, html, text } = magicLinkEmail(url);
          await sendEmail({ to: email, subject, html, text });
        },
      }),
      nextCookies(),
    ],
  });
}

type Auth = Awaited<ReturnType<typeof createAuth>>;
let instance: Promise<Auth> | null = null;

export function getAuth(): Promise<Auth> {
  instance ??= createAuth();
  return instance;
}

export type SessionUser = { id: string; email: string; name: string; image?: string | null; isAdmin: boolean; emailVerified: boolean };

/** The signed-in reader, or null. Never throws (anonymous reading always works). */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (!hasAuth()) return null;
  try {
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return null;
    const u = session.user;
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      image: u.image,
      isAdmin: adminEmails().includes(u.email.toLowerCase()),
      emailVerified: u.emailVerified,
    };
  } catch {
    return null;
  }
}
