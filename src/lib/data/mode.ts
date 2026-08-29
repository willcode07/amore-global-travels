/**
 * Persistence switch for travel requests.
 *
 * Pages / static demo always uses browser localStorage. The CRM API branch
 * turns this on when `NEXT_PUBLIC_DATA_BACKEND=api` and the app is not a
 * static export.
 */
export function isApiBackend() {
  if (process.env.NEXT_PUBLIC_DATA_BACKEND !== "api") return false;
  if (process.env.NEXT_PUBLIC_HAS_API === "0") return false;
  return true;
}
