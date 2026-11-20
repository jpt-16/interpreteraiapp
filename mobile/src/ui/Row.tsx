import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { MIN_TAP, space, useColors } from "~/theme/theme";
import { Icon, type IconName } from "./Icon";
import { Text } from "./Text";

/** Standard list row: leading icon, title/subtitle, trailing value, chevron or checkmark. */
export function Row({
  title,
  subtitle,
  icon,
  iconTint,
  leading,
  value,
  trailing,
  chevron,
  selected,
  destructive,
  onPress,
  disabled,
  accessibilityHint,
  numberOfLines,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: IconName;
  iconTint?: string;
  leading?: ReactNode;
  value?: ReactNode;
  trailing?: ReactNode;
  chevron?: boolean;
  selected?: boolean;
  destructive?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityHint?: string;
  numberOfLines?: number;
}) {
  const c = useColors();
  const body = (pressed: boolean) => (
    <View style={[styles.row, pressed && { backgroundColor: c.fill }]}>
      {leading ?? (icon ? <Icon name={icon} size={20} color={iconTint ?? c.accent} /> : null)}
      <View style={styles.text}>
        {typeof title === "string" ? (
          <Text variant="body" tone={destructive ? "bad" : "primary"} numberOfLines={numberOfLines}>
            {title}
          </Text>
        ) : (
          title
        )}
        {subtitle ? (
          typeof subtitle === "string" ? (
            <Text variant="subheadline" tone="secondary" numberOfLines={numberOfLines ? numberOfLines + 1 : undefined}>
              {subtitle}
            </Text>
          ) : (
            subtitle
          )
        ) : null}
      </View>
      {value ? (
        typeof value === "string" ? (
          <Text variant="body" tone="secondary" tabular>
            {value}
          </Text>
        ) : (
          value
        )
      ) : null}
      {trailing}
      {selected ? <Icon name="check" size={18} color={c.accent} weight="semibold" /> : null}
      {chevron ? <Icon name="chevron" size={14} color={c.tertiaryLabel} weight="semibold" /> : null}
    </View>
  );
  if (!onPress) return body(false);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityHint={accessibilityHint}
      style={disabled ? { opacity: 0.5 } : undefined}
    >
      {({ pressed }) => body(pressed)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.lg, paddingVertical: 11, minHeight: MIN_TAP },
  text: { flex: 1, gap: 2 },
});
