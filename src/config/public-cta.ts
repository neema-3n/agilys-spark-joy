export type PublicCtaRole = "primary" | "secondary";
export const PUBLIC_CTA_SURFACES = [
  "header-desktop",
  "header-mobile",
  "hero",
  "home-cta",
  "page-fonctionnalites",
  "page-cas-clients",
  "page-contact",
] as const;
export type PublicCtaSurface = (typeof PUBLIC_CTA_SURFACES)[number];

export const PUBLIC_CTA_LABELS = {
  primary: "Se connecter",
  secondary: "Nous contacter",
} as const;

export const PUBLIC_CTA_TARGETS = {
  primary: "/auth/login",
  secondary: "/contact",
} as const;

export const getPublicCtaId = (surface: PublicCtaSurface, role: PublicCtaRole): string =>
  `public-cta-${surface}-${role}`;
