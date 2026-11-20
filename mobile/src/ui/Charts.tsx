import { useMemo, useRef, useState } from "react";
import { PanResponder, Pressable, StyleSheet, View } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import { radius, space, useColors } from "~/theme/theme";
import { Text } from "./Text";

export interface Series {
  label: string;
  values: (number | null)[];
}

/**
 * Score-over-time line chart on a single 0–100 axis (never dual-axis).
 * Touch and drag to read exact values; a legend names every series and a
 * data table is available for VoiceOver and the light-mode contrast relief.
 */
export function LineChart({ labels, series, height = 190 }: { labels: string[]; series: Series[]; height?: number }) {
  const c = useColors();
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const [showData, setShowData] = useState(false);
  const left = 28;
  const right = 8;
  const top = 8;
  const bottom = 22;
  const plotW = Math.max(1, width - left - right);
  const plotH = height - top - bottom;
  const n = labels.length;
  const x = (i: number) => left + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => top + (1 - v / 100) * plotH;

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
    }),
  ).current;
  const setFromX = (px: number) => {
    if (n === 0) return;
    const i = Math.round(((px - left) / plotW) * (n - 1));
    setActive(Math.max(0, Math.min(n - 1, i)));
  };

  const paths = useMemo(
    () =>
      series.map((s) => {
        let d = "";
        let pen = false;
        s.values.forEach((v, i) => {
          if (v === null) return;
          d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
          pen = true;
        });
        return d.trim();
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [series, width, height, n],
  );

  const summary = `${series.map((s) => s.label).join(", ")} over ${n} days. ${series
    .map((s) => {
      const last = [...s.values].reverse().find((v) => v !== null);
      return `${s.label} latest ${last ?? "none"}`;
    })
    .join(". ")}.`;

  return (
    <View style={{ gap: space.sm }}>
      <View style={styles.legend}>
        {series.map((s, i) => (
          <View key={s.label} style={styles.legendItem}>
            <View style={{ width: 14, height: 3, borderRadius: 2, backgroundColor: c.chart[i] }} />
            <Text variant="caption1" tone="secondary">
              {s.label}
            </Text>
          </View>
        ))}
      </View>

      <Text variant="footnote" tone="secondary" tabular style={{ minHeight: 18 }} accessibilityLiveRegion="polite">
        {active === null
          ? "Touch the chart to read values"
          : `${labels[active]} · ${series.map((s) => `${s.label} ${s.values[active] ?? "—"}`).join(" · ")}`}
      </Text>

      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={{ height }}
        accessible
        accessibilityRole="image"
        accessibilityLabel={summary}
        {...pan.panHandlers}
        onTouchStart={(e) => setFromX(e.nativeEvent.locationX)}
        onTouchMove={(e) => setFromX(e.nativeEvent.locationX)}
        onTouchEnd={() => setActive(null)}
      >
        {width > 0 && (
          <Svg width={width} height={height}>
            {[0, 50, 100].map((g) => (
              <Line key={g} x1={left} x2={width - right} y1={y(g)} y2={y(g)} stroke={c.separator} strokeWidth={StyleSheet.hairlineWidth * 2} />
            ))}
            {[0, 50, 100].map((g) => (
              <SvgText key={`t${g}`} x={left - 6} y={y(g) + 4} fontSize={10} fill={c.secondaryLabel} textAnchor="end">
                {g}
              </SvgText>
            ))}
            {[0, Math.floor((n - 1) / 2), n - 1].filter((v, i, a) => n > 0 && a.indexOf(v) === i).map((i) => (
              <SvgText key={`x${i}`} x={x(i)} y={height - 5} fontSize={10} fill={c.secondaryLabel} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}>
                {labels[i]}
              </SvgText>
            ))}
            {active !== null && <Line x1={x(active)} x2={x(active)} y1={top} y2={top + plotH} stroke={c.tertiaryLabel} strokeWidth={1} strokeDasharray="3 3" />}
            {paths.map((d, i) => (
              <Path key={series[i].label} d={d} stroke={c.chart[i]} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            ))}
            {active !== null &&
              series.map((s, i) => {
                const v = s.values[active];
                return v === null ? null : <Circle key={s.label} cx={x(active)} cy={y(v)} r={4.5} fill={c.chart[i]} stroke={c.card} strokeWidth={2} />;
              })}
          </Svg>
        )}
      </View>

      <Pressable onPress={() => setShowData((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: showData }} hitSlop={8}>
        <Text variant="footnote" tone="accent">
          {showData ? "Hide data" : "Show data"}
        </Text>
      </Pressable>
      {showData && (
        <View style={{ gap: 4 }}>
          {labels.map((l, i) => (
            <View key={`${l}-${i}`} style={styles.tableRow}>
              <Text variant="caption1" tone="secondary" style={{ width: 52 }}>
                {l}
              </Text>
              {series.map((s) => (
                <Text key={s.label} variant="caption1" tabular style={{ flex: 1, textAlign: "right" }}>
                  {s.values[i] ?? "—"}
                </Text>
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/** Horizontal bars for a 0–100 measure by category. Bars are thin with a rounded data end. */
export function BarList({ rows }: { rows: { label: string; value: number | null; detail?: string }[] }) {
  const c = useColors();
  return (
    <View style={{ gap: space.md }}>
      {rows.map((r) => (
        <View key={r.label} style={{ gap: 6 }} accessible accessibilityLabel={`${r.label}: ${r.value ?? "no data"}${r.detail ? `, ${r.detail}` : ""}`}>
          <View style={styles.between}>
            <Text variant="subheadline">{r.label}</Text>
            <Text variant="subheadline" weight="600" tabular>
              {r.value ?? "—"}
            </Text>
          </View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: c.fill, overflow: "hidden" }}>
            <View style={{ width: `${r.value ?? 0}%`, height: "100%", borderRadius: 4, backgroundColor: c.chart[0] }} />
          </View>
          {r.detail ? (
            <Text variant="caption1" tone="secondary">
              {r.detail}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

export function StatTile({ label, value, sub, delta }: { label: string; value: string | number; sub?: string; delta?: number | null }) {
  const c = useColors();
  return (
    <View style={[styles.tile, { backgroundColor: c.card }]} accessible accessibilityLabel={`${label}: ${value}${sub ? `, ${sub}` : ""}`}>
      <Text variant="footnote" tone="secondary" numberOfLines={1}>
        {label}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
        <Text variant="title1" tabular maxFontSizeMultiplier={1.5}>
          {value}
        </Text>
        {delta ? (
          <Text variant="footnote" weight="600" tone={delta > 0 ? "good" : "bad"} tabular>
            {delta > 0 ? "+" : ""}
            {delta}
          </Text>
        ) : null}
      </View>
      {sub ? (
        <Text variant="caption1" tone="secondary" numberOfLines={2}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  between: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  tableRow: { flexDirection: "row", gap: 8 },
  tile: { flex: 1, minWidth: "46%", borderRadius: radius.card, padding: space.lg, gap: 4 },
});
