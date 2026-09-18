const IMAGE_PATH = /\.(png|jpe?g|webp|gif|avif|svg)(\?|#|$)/i;

export function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function isUsableImageUrl(value: string | undefined | null) {
  const raw = value?.trim() ?? "";
  if (!raw) return false;
  if (raw.startsWith("data:image/")) return true;
  if (raw.startsWith("/")) return IMAGE_PATH.test(raw) || /\/images\//i.test(raw);
  if (!isHttpUrl(raw)) return false;
  try {
    const url = new URL(raw);
    if (IMAGE_PATH.test(url.pathname)) return true;
    return /(?:unsplash|cloudinary|imgix|googleusercontent|fbcdn|twimg|images)\./i.test(
      url.hostname,
    );
  } catch {
    return false;
  }
}

export function usablePropertyImage(value: string | undefined | null) {
  const raw = value?.trim() ?? "";
  return isUsableImageUrl(raw) ? raw : "";
}
