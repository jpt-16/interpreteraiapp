import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { DataProvider, useData } from "~/data/store";
import { useColors } from "~/theme/theme";

function Navigator() {
  const { auth } = useData();
  const c = useColors();
  if (auth === "loading") return <View style={{ flex: 1, backgroundColor: c.background }} />;
  const base = {
    headerTintColor: c.accent,
    headerTitleStyle: { color: c.label },
    headerStyle: { backgroundColor: c.background },
    headerShadowVisible: false,
    contentStyle: { backgroundColor: c.background },
  };
  return (
    <Stack screenOptions={base}>
      <Stack.Protected guard={auth !== "signedOut"}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="exercise" options={{ headerShown: false, presentation: "fullScreenModal", gestureEnabled: false, animation: "slide_from_bottom" }} />
        <Stack.Screen name="session/[id]" options={{ title: "Session", headerBackTitle: "Back" }} />
        <Stack.Screen name="settings" options={{ title: "Settings", headerBackTitle: "Back" }} />
        <Stack.Screen name="term" options={{ title: "Term", presentation: "formSheet", sheetAllowedDetents: [0.85, 1], sheetGrabberVisible: true }} />
      </Stack.Protected>
      <Stack.Protected guard={auth === "signedOut"}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <DataProvider>
          <StatusBar style="auto" />
          <Navigator />
        </DataProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
