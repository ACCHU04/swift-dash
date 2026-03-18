import { auth } from "@/lib/firebase";

/** Get the current Firebase ID token for backend API calls */
export async function getAccessToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken();
  } catch {
    return null;
  }
}

/** Get current user email */
export function getAuthUserEmail(): string | null {
  return auth.currentUser?.email ?? null;
}

/** Sign out */
export async function signOut(): Promise<void> {
  await auth.signOut();
}
