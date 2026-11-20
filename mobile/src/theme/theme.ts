import { useColorScheme } from "react-native";

/**
 * Semantic colours modelled on iOS system colours, with a navy-tinted dark mode.
 * Components never use raw hex values: they read these roles, so light, dark
 * and increased-contrast tweaks live in one place.
 */
export interface Colors {
  background: string; // grouped background (screen)
  card: string; // grouped row / card surface
  cardElevated: string; // surface above a card (sheets, inputs inside cards)
  label: string;
  secondaryLabel: string;
  tertiaryLabel: string;
  separator: string;
  fill: string; // subtle control fill
  accent: string;
  accentFill: string;
  onAccent: string;
  good: string;
  goodFill: string;
  warn: string;
  warnFill: string;
  bad: string;
  badFill: string;
  chart: [string, string, string];
  blur: "systemChromeMaterialDark" | "systemChromeMaterialLight";
  isDark: boolean;
}

export const light: Colors = {
  background: "#F2F2F7",
  card: "#FFFFFF",
  cardElevated: "#F2F2F7",
  label: "#000000",
  secondaryLabel: "rgba(60,60,67,0.62)",
  tertiaryLabel: "rgba(60,60,67,0.32)",
  separator: "rgba(60,60,67,0.18)",
  fill: "rgba(120,120,128,0.12)",
  accent: "#007AFF",
  accentFill: "rgba(0,122,255,0.12)",
  onAccent: "#FFFFFF",
  good: "#1F9D4B",
  goodFill: "rgba(52,199,89,0.16)",
  warn: "#B86E00",
  warnFill: "rgba(255,149,0,0.16)",
  bad: "#D70015",
  badFill: "rgba(255,59,48,0.13)",
  // Validated palette (see README): blue, orange, green.
  chart: ["#2a78d6", "#eb6834", "#1baf7a"],
  blur: "systemChromeMaterialLight",
  isDark: false,
};

export const dark: Colors = {
  background: "#0A0D14",
  card: "#151A24",
  cardElevated: "#1D2430",
  label: "#FFFFFF",
  secondaryLabel: "rgba(235,235,245,0.62)",
  tertiaryLabel: "rgba(235,235,245,0.32)",
  separator: "rgba(120,130,150,0.28)",
  fill: "rgba(120,120,128,0.28)",
  accent: "#0A84FF",
  accentFill: "rgba(10,132,255,0.18)",
  onAccent: "#FFFFFF",
  good: "#30D158",
  goodFill: "rgba(48,209,88,0.16)",
  warn: "#FF9F0A",
  warnFill: "rgba(255,159,10,0.16)",
  bad: "#FF6961",
  badFill: "rgba(255,69,58,0.16)",
  chart: ["#3987e5", "#d95926", "#199e70"],
  blur: "systemChromeMaterialDark",
  isDark: true,
};

export function useColors(): Colors {
  return useColorScheme() === "light" ? light : dark;
}

export function scoreColor(c: Colors, score: number | null | undefined) {
  if (score === null || score === undefined) return c.tertiaryLabel;
  if (score >= 85) return c.good;
  if (score >= 70) return c.accent;
  if (score >= 55) return c.warn;
  return c.bad;
}

/** Layout constants (points). */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;
export const radius = { control: 10, card: 12, sheet: 20, pill: 999 } as const;
export const MIN_TAP = 44;
export const MAX_CONTENT_WIDTH = 720;
