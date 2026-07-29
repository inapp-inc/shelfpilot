/** Prefix app base path for root-relative static assets (e.g. /product-images/…). */
export function resolveAssetUrl(url) {
  if (!url || typeof url !== "string") return url;
  if (url.startsWith("data:") || url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  const base = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "");
  if (!url.startsWith("/")) return url;
  return `${base}${url}`;
}
