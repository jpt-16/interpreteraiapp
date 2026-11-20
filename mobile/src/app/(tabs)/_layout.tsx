import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Platform, StyleSheet } from "react-native";
import { useColors } from "~/theme/theme";
import { Icon, type IconName } from "~/ui/Icon";

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: "overview", title: "Overview", icon: "overview" },
  { name: "practice", title: "Practice", icon: "practice" },
  { name: "live", title: "Live", icon: "live" },
  { name: "progress", title: "Progress", icon: "progress" },
  { name: "glossary", title: "Glossary", icon: "glossary" },
];

export const unstable_settings = { initialRouteName: "overview" };

export default function TabLayout() {
  const c = useColors();
  const ios = Platform.OS === "ios";
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.secondaryLabel,
        tabBarLabelStyle: { fontSize: 10, fontWeight: "500" },
        tabBarStyle: ios
          ? { position: "absolute", backgroundColor: "transparent", borderTopColor: c.separator, borderTopWidth: StyleSheet.hairlineWidth }
          : { backgroundColor: c.card, borderTopColor: c.separator },
        tabBarBackground: ios ? () => <BlurView tint={c.isDark ? "systemChromeMaterialDark" : "systemChromeMaterialLight"} intensity={90} style={StyleSheet.absoluteFill} /> : undefined,
      }}
    >
      <Tabs.Screen name="index" options={{ href: null }} />
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{ title: t.title, tabBarIcon: ({ color }) => <Icon name={t.icon} size={24} color={String(color)} /> }}
        />
      ))}
    </Tabs>
  );
}
