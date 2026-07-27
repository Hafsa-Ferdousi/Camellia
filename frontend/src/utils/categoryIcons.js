import { Crown, CircleDot, Circle, Link2, Diamond, Sparkles, Gem } from "lucide-react";

export const CATEGORY_ICONS = {
  kalira: Crown,
  chura: CircleDot,
  bangles: Circle,
  necklace: Link2,
  "diamond-cut": Diamond,
  "wedding-accessories": Sparkles,
  // legacy slugs
  jhumka: Circle,
  "wedding-sets": Sparkles,
};

export const getCategoryIcon = (slug) => CATEGORY_ICONS[slug] || Gem;
