import { Children, Fragment, isValidElement, type ReactNode } from "react";
import { Platform, ScrollView, StyleSheet, View, type ScrollViewProps, type StyleProp, type ViewStyle } from "react-native";
import { MAX_CONTENT_WIDTH, space, useColors } from "~/theme/theme";
import { Text } from "./Text";

/** Scrolling screen on the grouped background. Large titles collapse natively on iOS. */
export function Screen({ children, contentStyle, ...props }: ScrollViewProps & { contentStyle?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      style={{ backgroundColor: c.background }}
      contentContainerStyle={[styles.content, contentStyle]}
      {...props}
    >
      <View style={styles.column}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.lg, paddingTop: Platform.OS === "ios" ? space.sm : space.lg, paddingBottom: 120, alignItems: "center" },
  column: { width: "100%", maxWidth: MAX_CONTENT_WIDTH, gap: space.xxl },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: space.lg },
  headerText: { letterSpacing: 0 },
});

export function Separator({ inset = 0 }: { inset?: number }) {
  const c = useColors();
  return <View style={{ height: StyleSheet.hairlineWidth, marginLeft: inset, backgroundColor: c.separator }} />;
}

/** Inset grouped list section with optional header and footer, like Settings. */
export function Section({
  title,
  footer,
  children,
  inset = 16,
  action,
}: {
  title?: string;
  footer?: ReactNode;
  children: ReactNode;
  inset?: number;
  action?: ReactNode;
}) {
  const c = useColors();
  const items = Children.toArray(children).filter(isValidElement);
  return (
    <View style={{ gap: space.sm }}>
      {(title || action) && (
        <View style={styles.header}>
          {title ? (
            <Text variant="footnote" tone="secondary" accessibilityRole="header" style={styles.headerText}>
              {title.toUpperCase()}
            </Text>
          ) : (
            <View />
          )}
          {action}
        </View>
      )}
      <View style={{ backgroundColor: c.card, borderRadius: 12, overflow: "hidden" }}>
        {items.map((child, i) => (
          <Fragment key={i}>
            {i > 0 && <Separator inset={inset} />}
            {child}
          </Fragment>
        ))}
      </View>
      {footer ? (
        <Text variant="footnote" tone="secondary" style={{ paddingHorizontal: space.lg }}>
          {footer}
        </Text>
      ) : null}
    </View>
  );
}
