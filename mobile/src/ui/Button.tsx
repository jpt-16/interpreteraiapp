import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { useColors } from "~/theme/theme";
import { Icon, type IconName } from "./Icon";
import { Text } from "./Text";

type Variant = "filled" | "tinted" | "plain" | "destructive";
type Size = "large" | "medium" | "small";

const HEIGHT: Record<Size, number> = { large: 50, medium: 44, small: 34 };
const RADIUS: Record<Size, number> = { large: 14, medium: 12, small: 17 };

/** Press feedback starts on touch-down (scale + dim) with no animation delay. */
export function Button({
  title,
  onPress,
  variant = "filled",
  size = "large",
  icon,
  trailingIcon,
  loading,
  disabled,
  fullWidth = true,
  accessibilityHint,
}: {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  trailingIcon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  accessibilityHint?: string;
}) {
  const c = useColors();
  const bg = variant === "filled" ? c.accent : variant === "tinted" ? c.accentFill : variant === "destructive" ? c.badFill : "transparent";
  const fg = variant === "filled" ? c.onAccent : variant === "destructive" ? c.bad : c.accent;
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: off, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        { height: HEIGHT[size], borderRadius: RADIUS[size], backgroundColor: bg, alignSelf: fullWidth ? "stretch" : "flex-start", paddingHorizontal: size === "small" ? 14 : 20 },
        pressed && { transform: [{ scale: 0.97 }], opacity: 0.8 },
        off && { opacity: 0.4 },
      ]}
    >
      <View style={styles.inner}>
        {loading ? <ActivityIndicator color={fg} /> : icon ? <Icon name={icon} size={size === "small" ? 14 : 18} color={fg} weight="semibold" /> : null}
        <Text variant={size === "small" ? "subheadline" : "headline"} style={{ color: fg }} numberOfLines={1}>
          {title}
        </Text>
        {trailingIcon ? <Icon name={trailingIcon} size={16} color={fg} weight="semibold" /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: "center", justifyContent: "center" },
  inner: { flexDirection: "row", alignItems: "center", gap: 8 },
});
