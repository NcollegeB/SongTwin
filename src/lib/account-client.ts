import type { User } from "firebase/auth";

export async function accountRequest<T>(
  path: string,
  currentUser: User,
  init?: RequestInit,
) {
  const token = await currentUser.getIdToken();
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(path, { ...init, headers });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || `Request failed: ${response.status}`);
  }

  return payload as T;
}
