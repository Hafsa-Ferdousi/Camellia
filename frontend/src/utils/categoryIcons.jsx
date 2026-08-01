import { Diamond, Crown, Gem } from "lucide-react";

// Custom line-art icons drawn in the same style as lucide-react (24x24
// viewBox, stroke = currentColor, round caps) so they sit in the icon
// row/tiles without looking mismatched. Lucide has no literal jewelry
// shapes, and commercial jewelry sites (Tanishq, Kalyan, Malabar Gold)
// use recognizable per-item silhouettes rather than generic glyphs —
// a bangle, a necklace-with-pendant, a stacked-bangle set, a dangling
// jhumka earring — so each fixed category gets its own shape below.

const iconProps = (size, strokeWidth) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth,
  strokeLinecap: "round",
  strokeLinejoin: "round",
});

// Single bangle — a thick ring, used for the plain "Bangles" category.
export function BangleIcon({ size = 22, strokeWidth = 1.5, ...rest }) {
  return (
    <svg {...iconProps(size, strokeWidth)} {...rest}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
    </svg>
  );
}

// Stacked bangles — a set/chura viewed edge-on as layered bands.
export function BangleStackIcon({ size = 22, strokeWidth = 1.5, ...rest }) {
  return (
    <svg {...iconProps(size, strokeWidth)} {...rest}>
      <ellipse cx="12" cy="6.5" rx="7" ry="2.75" />
      <ellipse cx="12" cy="12" rx="7" ry="2.75" />
      <ellipse cx="12" cy="17.5" rx="7" ry="2.75" />
    </svg>
  );
}

// Necklace — a chain arc with a hanging pendant.
export function NecklaceIcon({ size = 22, strokeWidth = 1.5, ...rest }) {
  return (
    <svg {...iconProps(size, strokeWidth)} {...rest}>
      <path d="M5 4c-0.8 6.2 2 11 7 11s7.8-4.8 7-11" />
      <circle cx="12" cy="18" r="2.25" />
    </svg>
  );
}

// Kalira — a bridal bangle with dangling chains and drops.
export function KaliraIcon({ size = 22, strokeWidth = 1.5, ...rest }) {
  return (
    <svg {...iconProps(size, strokeWidth)} {...rest}>
      <circle cx="12" cy="5.5" r="3.5" />
      <path d="M8.5 8.5v3.5M12 9v4.5M15.5 8.5v3.5" />
      <circle cx="8.5" cy="13.5" r="1.1" />
      <circle cx="12" cy="15" r="1.1" />
      <circle cx="15.5" cy="13.5" r="1.1" />
    </svg>
  );
}

// Jhumka / dangling earring — stud + bell-shaped drop with fringe.
export function EarringIcon({ size = 22, strokeWidth = 1.5, ...rest }) {
  return (
    <svg {...iconProps(size, strokeWidth)} {...rest}>
      <circle cx="12" cy="4.5" r="1.25" />
      <path d="M12 5.75v2" />
      <path d="M8.5 10c0 3 1.2 6 3.5 6s3.5-3 3.5-6" />
      <path d="M9 15.5h6" />
    </svg>
  );
}

export const CATEGORY_ICONS = {
  kalira: KaliraIcon,
  chura: BangleStackIcon,
  bangles: BangleIcon,
  necklace: NecklaceIcon,
  "diamond-cut": Diamond,
  "wedding-accessories": Crown,
  // legacy slugs
  jhumka: EarringIcon,
  "wedding-sets": Crown,
};

export const getCategoryIcon = (slug) => CATEGORY_ICONS[slug] || Gem;
