/** Shared ID helpers for browser demo storage and the API/Postgres path. */

export function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createTripRef(fullName: string, phone: string) {
  const letters = fullName
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 3)
    .toUpperCase()
    .padEnd(3, "X");
  const digits = phone.replace(/\D/g, "").slice(-4).padStart(4, "0");
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const suffix =
    alphabet[Math.floor(Math.random() * alphabet.length)] +
    alphabet[Math.floor(Math.random() * alphabet.length)];
  return `${letters}-${digits}-${suffix}`;
}
