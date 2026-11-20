import { useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { useColors } from "~/theme/theme";

/** Scrolling level history (newest on the right). */
export function LiveBars({ level, active, color, bars = 44, height = 64 }: { level: number; active: boolean; color?: string; bars?: number; height?: number }) {
  const c = useColors();
  const history = useRef<number[]>(Array(bars).fill(0));
  const [, tick] = useState(0);
  useEffect(() => {
    history.current = [...history.current.slice(1 - bars), active ? level : 0];
    tick((n) => n + 1);
  }, [level, active, bars]);
  return (
    <View style={{ height, flexDirection: "row", alignItems: "center", gap: 3 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {history.current.map((v, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: Math.max(3, v * height),
            borderRadius: 2,
            backgroundColor: v > 0.02 ? (color ?? c.accent) : c.fill,
            opacity: 0.4 + 0.6 * (i / bars),
          }}
        />
      ))}
    </View>
  );
}

/** One bar per few words: the "shape" of the passage, filled as it plays. No text is revealed. */
export function PassageShape({ text, progress, height = 64 }: { text: string; progress: number; height?: number }) {
  const c = useColors();
  const bars = useMemo(() => {
    const words = text.split(/\s+/).filter(Boolean);
    const step = Math.max(1, Math.ceil(words.length / 56));
    const out: number[] = [];
    for (let i = 0; i < words.length; i += step) {
      const chunk = words.slice(i, i + step);
      const len = chunk.reduce((a, w) => a + w.length, 0) / chunk.length;
      out.push(Math.min(1, (0.25 + len / 11) * (/[.,;:?!]$/.test(chunk[chunk.length - 1]) ? 0.55 : 1)));
    }
    return out;
  }, [text]);
  const played = Math.floor(progress * bars.length);
  return (
    <View
      style={{ height, flexDirection: "row", alignItems: "center", gap: 3 }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Source audio progress"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
    >
      {bars.map((b, i) => (
        <View key={i} style={{ flex: 1, height: `${Math.round(b * 100)}%`, borderRadius: 2, backgroundColor: i < played ? c.accent : i === played && progress > 0 && progress < 1 ? c.accent : c.fill }} />
      ))}
    </View>
  );
}
