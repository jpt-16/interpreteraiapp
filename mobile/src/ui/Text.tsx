import { Text as RNText, type TextProps } from "react-native";
import { useColors, type Colors } from "~/theme/theme";
import { typeScale, type TypeVariant } from "~/theme/type";

type Tone = "primary" | "secondary" | "tertiary" | "accent" | "good" | "warn" | "bad" | "onAccent";

function toneColor(c: Colors, tone: Tone) {
  switch (tone) {
    case "secondary": return c.secondaryLabel;
    case "tertiary": return c.tertiaryLabel;
    case "accent": return c.accent;
    case "good": return c.good;
    case "warn": return c.warn;
    case "bad": return c.bad;
    case "onAccent": return c.onAccent;
    default: return c.label;
  }
}

/** Text with an iOS type style. Respects Dynamic Type, capped so dense UI stays usable. */
export function Text({
  variant = "body",
  tone = "primary",
  weight,
  tabular,
  style,
  maxFontSizeMultiplier = 2,
  ...props
}: TextProps & { variant?: TypeVariant; tone?: Tone; weight?: "400" | "500" | "600" | "700"; tabular?: boolean }) {
  const c = useColors();
  return (
    <RNText
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[
        typeScale[variant],
        { color: toneColor(c, tone) },
        weight ? { fontWeight: weight } : null,
        tabular ? { fontVariant: ["tabular-nums"] } : null,
        style,
      ]}
      {...props}
    />
  );
}
