/**
 * Standard bias derivation logic used across the entire platform.
 * Ensures consistent classification of "left", "center", and "right" leanings.
 */
export function deriveBias(s: any): "left" | "center" | "right" {
  if (!s) return "center";
  const b = (s.bias || s.publisher?.biasRating || "").toLowerCase();
  if (b.includes("left")) return "left";
  if (b.includes("right")) return "right";
  return "center";
}
