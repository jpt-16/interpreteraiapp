import { router } from "expo-router";
import { Pressable } from "react-native";
import { useColors } from "~/theme/theme";
import { Icon } from "~/ui/Icon";
import { TabStack } from "~/ui/TabStack";

export default function Layout() {
  const c = useColors();
  return (
    <TabStack
      title="Overview"
      headerRight={() => (
        <Pressable onPress={() => router.push("/settings")} accessibilityRole="button" accessibilityLabel="Settings" hitSlop={12} style={{ padding: 4 }}>
          <Icon name="settings" size={22} color={c.accent} />
        </Pressable>
      )}
    />
  );
}
