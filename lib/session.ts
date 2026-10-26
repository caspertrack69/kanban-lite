import { cookies } from "next/headers";
import {
  getIronSession,
  type IronSession,
  type SessionOptions,
} from "iron-session";
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
} from "./constants";
import { AppError } from "./errors";

export type SessionData = {
  authenticated?: boolean;
};

function readSessionPassword(): string {
  const primary = process.env.SESSION_PASSWORD;
  const password =
    primary && primary.length > 0 ? primary : process.env.SESSION_SECRET;

  if (!password || password.length < 32) {
    throw new AppError(
      503,
      "MISCONFIGURED",
      "Session secret is missing or too short. Set SESSION_PASSWORD to at least 32 characters.",
    );
  }

  return password;
}

export function readAppPassword(): string {
  const password = process.env.APP_PASSWORD;
  if (!password) {
    throw new AppError(
      503,
      "MISCONFIGURED",
      "Web login is not configured. Set APP_PASSWORD.",
    );
  }
  return password;
}

export function getSessionOptions(): SessionOptions {
  return {
    cookieName: SESSION_COOKIE_NAME,
    password: readSessionPassword(),
    ttl: SESSION_TTL_SECONDS,
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
    },
  };
}

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, getSessionOptions());
}

export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session.authenticated === true;
}

export async function requireSession(): Promise<void> {
  if (!(await isAuthenticated())) {
    throw new AppError(401, "UNAUTHENTICATED", "Sign in to continue.");
  }
}

export async function createSession(): Promise<void> {
  const session = await getSession();
  session.authenticated = true;
  await session.save();
}

export async function destroySession(): Promise<void> {
  const session = await getSession();
  session.destroy();
}
