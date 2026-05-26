import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import type { SpotifyTokenSession } from "./types";

const SESSION_COOKIE = "song_twin_spotify_session";
export const AUTH_STATE_COOKIE = "song_twin_spotify_state";
export const AUTH_VERIFIER_COOKIE = "song_twin_spotify_verifier";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;
const AUTH_MAX_AGE_SECONDS = 60 * 10;

function cookieBase() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

function sessionSecret() {
  if (process.env.SESSION_SECRET) {
    return process.env.SESSION_SECRET;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is required in production");
  }

  return "song-twin-local-dev-secret-change-before-production";
}

function key() {
  return createHash("sha256").update(sessionSecret()).digest();
}

function base64Url(buffer: Buffer) {
  return buffer.toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url");
}

function encryptSession(session: SpotifyTokenSession) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(session), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `v1.${base64Url(iv)}.${base64Url(tag)}.${base64Url(encrypted)}`;
}

function decryptSession(value?: string) {
  if (!value) {
    return null;
  }

  const [version, ivValue, tagValue, encryptedValue] = value.split(".");
  if (version !== "v1" || !ivValue || !tagValue || !encryptedValue) {
    return null;
  }

  try {
    const decipher = createDecipheriv("aes-256-gcm", key(), fromBase64Url(ivValue));
    decipher.setAuthTag(fromBase64Url(tagValue));
    const decrypted = Buffer.concat([
      decipher.update(fromBase64Url(encryptedValue)),
      decipher.final(),
    ]);
    return JSON.parse(decrypted.toString("utf8")) as SpotifyTokenSession;
  } catch {
    return null;
  }
}

export function getSessionFromRequest(request: NextRequest) {
  return decryptSession(request.cookies.get(SESSION_COOKIE)?.value);
}

export function setSessionCookie(response: NextResponse, session: SpotifyTokenSession) {
  response.cookies.set({
    ...cookieBase(),
    name: SESSION_COOKIE,
    value: encryptSession(session),
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    ...cookieBase(),
    name: SESSION_COOKIE,
    value: "",
    maxAge: 0,
  });
}

export function setAuthCookies(
  response: NextResponse,
  values: { state: string; verifier: string },
) {
  response.cookies.set({
    ...cookieBase(),
    name: AUTH_STATE_COOKIE,
    value: values.state,
    maxAge: AUTH_MAX_AGE_SECONDS,
  });
  response.cookies.set({
    ...cookieBase(),
    name: AUTH_VERIFIER_COOKIE,
    value: values.verifier,
    maxAge: AUTH_MAX_AGE_SECONDS,
  });
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.set({
    ...cookieBase(),
    name: AUTH_STATE_COOKIE,
    value: "",
    maxAge: 0,
  });
  response.cookies.set({
    ...cookieBase(),
    name: AUTH_VERIFIER_COOKIE,
    value: "",
    maxAge: 0,
  });
}
