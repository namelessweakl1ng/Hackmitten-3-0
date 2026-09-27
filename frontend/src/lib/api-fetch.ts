/** Fetch a JSON API response and surface authorization/server errors to React Query. */
export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = payload && typeof payload === "object" && "error" in payload
      ? (payload as { error?: unknown }).error
      : null;
    throw new Error(typeof error === "string" ? error : `Request failed (${response.status})`);
  }
  if (payload === null) throw new Error("Invalid server response");
  return payload as T;
}
