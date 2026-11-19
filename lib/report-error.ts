import { isSupabaseConfigured } from "@/lib/supabase/config";
import { publicRpc } from "@/lib/supabase/publicApi";

// Errors that say nothing about our code: browser extensions, lost
// connections, cancelled loads, a known harmless browser warning.
const NOISE = [
  /chrome-extension:|moz-extension:|safari-extension:/i,
  /ResizeObserver loop/i,
  /^Script error\.?$/i,
  /Failed to fetch|Load failed|NetworkError|network error|fetch failed/i,
  /AbortError|The user aborted|aborted a request/i,
  /Loading chunk \d+ failed|ChunkLoadError/i,
];

const sent = new Set<string>();

/** Logs an error seen by a visitor (shown in /admin/erreurs). Never throws; once per message per page load. */
export function reportClientError(message: string, detail?: string) {
  try {
    const msg = String(message || "").trim().slice(0, 500);
    if (!msg || !isSupabaseConfigured || NOISE.some((r) => r.test(msg) || (detail ? r.test(detail) && /extension/.test(String(r)) : false))) return;
    if (sent.has(msg) || sent.size >= 10) return;
    sent.add(msg);
    publicRpc("log_app_error", {
      p_source: "client",
      p_message: msg,
      p_url: typeof location !== "undefined" ? location.pathname : null,
      p_detail: detail ? String(detail).slice(0, 2000) : null,
      p_user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    }).catch(() => {});
  } catch {}
}

/** Logs a server-side failure (a refused save, a crashed action). Never throws. */
export async function reportServerError(message: string, where: string, detail?: string) {
  try {
    if (!isSupabaseConfigured) return;
    await publicRpc("log_app_error", { p_source: "server", p_message: String(message).slice(0, 500), p_url: where, p_detail: detail ?? null });
  } catch {}
}
