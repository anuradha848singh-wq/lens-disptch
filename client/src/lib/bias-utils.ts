/**
 * Standard bias derivation logic used across the entire platform.
 * Ensures consistent classification of "left", "center", and "right" leanings.
 */
export function deriveBias(s: any): "left" | "center" | "right" {
  if (!s) return "center";
  const b = (s.bias || s.publisher?.biasRating || "").toLowerCase();
  if (b.includes("left") || b.includes("pro_opposition")) return "left";
  if (b.includes("right") || b.includes("pro_establishment")) return "right";
  return "center";
}
