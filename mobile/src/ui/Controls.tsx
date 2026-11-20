import type { ReactNode } from "react";
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { radius, space, useColors } from "~/theme/theme";
import { typeScale } from "~/theme/type";
import { Icon } from "./Icon";
import { Text } from "./Text";

/** iOS-style segmented control. */
export function Segmented<T extends string | number>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; disabled?: boolean }[];
  label: string;
}) {
  const c = useColors();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={[styles.segmented, { backgroundColor: c.fill }]}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            disabled={o.disabled}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected, disabled: o.disabled }}
            style={[
              styles.segment,
              selected && { backgroundColor: c.isDark ? "#636366" : "#FFFFFF", shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
              o.disabled && { opacity: 0.35 },
            ]}
          >
            <Text variant="subheadline" weight={selected ? "600" : "500"} numberOfLines={1} style={{ color: c.label }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Wrapping selectable pills. */
export function Chips<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
}) {
  const c = useColors();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.chips}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            style={({ pressed }) => [
              styles.chip,
              { backgroundColor: selected ? c.accent : c.fill, minHeight: 36 },
              pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] },
            ]}
          >
            <Text variant="subheadline" weight="500" style={{ color: selected ? c.onAccent : c.label }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "accent" | "good" | "warn" | "bad" }) {
  const c = useColors();
  const bg = { neutral: c.fill, accent: c.accentFill, good: c.goodFill, warn: c.warnFill, bad: c.badFill }[tone];
  const fg = { neutral: c.secondaryLabel, accent: c.accent, good: c.good, warn: c.warn, bad: c.bad }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text variant="caption1" weight="600" style={{ color: fg }} numberOfLines={1}>
        {children}
      </Text>
    </View>
  );
}

export function TextField({ style, multiline, ...props }: TextInputProps) {
  const c = useColors();
  return (
    <TextInput
      placeholderTextColor={c.tertiaryLabel}
      multiline={multiline}
      maxFontSizeMultiplier={2}
      {...props}
      style={[
        typeScale.body,
        { color: c.label, backgroundColor: c.card, borderRadius: radius.card, paddingHorizontal: space.lg, paddingVertical: 12, minHeight: 44 },
        multiline && { minHeight: 140, textAlignVertical: "top", paddingTop: 12 },
        style,
      ]}
    />
  );
}

export function SearchField({ value, onChangeText, placeholder = "Search" }: { value: string; onChangeText: (t: string) => void; placeholder?: string }) {
  const c = useColors();
  return (
    <View style={[styles.search, { backgroundColor: c.fill }]}>
      <Icon name="search" size={16} color={c.secondaryLabel} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.secondaryLabel}
        accessibilityLabel={placeholder}
        returnKeyType="search"
        clearButtonMode="while-editing"
        autoCorrect={false}
        style={[typeScale.body, { flex: 1, color: c.label, paddingVertical: 8 }]}
      />
    </View>
  );
}

export function Card({ children, tint }: { children: ReactNode; tint?: boolean }) {
  const c = useColors();
  return <View style={{ backgroundColor: tint ? c.accentFill : c.card, borderRadius: radius.card, padding: space.lg, gap: space.md }}>{children}</View>;
}

export function EmptyState({ title, message, children }: { title: string; message?: string; children?: ReactNode }) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 32, paddingHorizontal: 24, gap: 6 }}>
      <Text variant="headline" style={{ textAlign: "center" }}>
        {title}
      </Text>
      {message ? (
        <Text variant="subheadline" tone="secondary" style={{ textAlign: "center" }}>
          {message}
        </Text>
      ) : null}
      {children ? <View style={{ marginTop: 12 }}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  segmented: { flexDirection: "row", borderRadius: 9, padding: 2 },
  segment: { flex: 1, minHeight: 32, alignItems: "center", justifyContent: "center", borderRadius: 7, paddingHorizontal: 6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: "flex-start" },
  search: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, paddingHorizontal: 10, minHeight: 38 },
});
