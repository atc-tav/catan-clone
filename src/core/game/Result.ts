/**
 * A tiny Result type. The rules engine never throws for *expected* illegal
 * moves — it returns `err(reason)` so the UI (or an AI) can probe legality
 * cheaply. Exceptions are reserved for genuine programmer errors.
 *
 * In C# this becomes a `readonly struct Result` with an `IsOk` flag and an
 * error string.
 */
export type Result = { ok: true } | { ok: false; error: string };

export const ok: Result = { ok: true };

export function err(error: string): Result {
  return { ok: false, error };
}
