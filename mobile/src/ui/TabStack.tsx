import { Stack } from "expo-router";
import type { ReactNode } from "react";
import { Platform } from "react-native";
import { useColors } from "~/theme/theme";

/**
 * Native stack for one tab: large title that collapses on scroll, translucent
 * blurred bar on iOS, back swipe from the left edge. On other platforms it
 * falls back to a standard header.
 */
export function TabStack({ title, headerRight }: { title: string; headerRight?: () => ReactNode }) {
  const c = useColors();
  const ios = Platform.OS === "ios";
  return (
    <Stack
      screenOptions={{
        headerLargeTitle: ios,
        headerLargeTitleShadowVisible: false,
        headerTransparent: ios,
        headerBlurEffect: ios ? c.blur : undefined,
        headerShadowVisible: !ios,
        headerTintColor: c.accent,
        headerTitleStyle: { color: c.label },
        headerLargeTitleStyle: { color: c.label },
        headerStyle: { backgroundColor: ios ? undefined : c.background },
        contentStyle: { backgroundColor: c.background },
      }}
    >
      <Stack.Screen name="index" options={{ title, headerRight }} />
    </Stack>
  );
}
