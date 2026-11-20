import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { scoreColor, useColors } from "~/theme/theme";
import { Text } from "./Text";

export function ScoreRing({ score, size = 96, stroke = 8, caption }: { score: number; size?: number; stroke?: number; caption?: string }) {
  const c = useColors();
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  return (
    <View
      style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}
      accessible
      accessibilityLabel={`${caption ?? "Score"} ${Math.round(score)} out of 100`}
    >
      <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }], position: "absolute" }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.fill} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={scoreColor(c, score)}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circ}`}
          strokeDashoffset={circ * (1 - pct)}
          fill="none"
        />
      </Svg>
      <Text variant="title1" tabular style={{ fontSize: size * 0.34, lineHeight: size * 0.4 }} maxFontSizeMultiplier={1.2}>
        {Math.round(score)}
      </Text>
      {caption ? (
        <Text variant="caption2" tone="secondary" maxFontSizeMultiplier={1.2}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

export function ScoreBar({ label, score }: { label: string; score: number | null }) {
  const c = useColors();
  return (
    <View
      style={{ gap: 6 }}
      accessible
      accessibilityLabel={`${label}: ${score === null ? "not applicable" : `${score} out of 100`}`}
    >
      <View style={styles.between}>
        <Text variant="subheadline">{label}</Text>
        <Text variant="subheadline" weight="600" tabular>
          {score === null ? "—" : score}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: c.fill }]}>
        {score !== null && <View style={{ width: `${score}%`, height: "100%", borderRadius: 3, backgroundColor: scoreColor(c, score) }} />}
      </View>
    </View>
  );
}

export function ScorePill({ score }: { score: number }) {
  const c = useColors();
  const color = scoreColor(c, score);
  return (
    <View style={{ minWidth: 38, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: c.fill, alignItems: "center" }}>
      <Text variant="subheadline" weight="700" tabular style={{ color }} maxFontSizeMultiplier={1.4}>
        {score}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  track: { height: 6, borderRadius: 3, overflow: "hidden" },
});
