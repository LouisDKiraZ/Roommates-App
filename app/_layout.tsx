import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { useColorScheme } from "@/components/useColorScheme";
import { AppStateProvider } from "@/context/AppStateContext";
import { WallpaperProvider } from "@/context/WallpaperContext";

export { ErrorBoundary } from "expo-router";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AppStateProvider>
      <WallpaperProvider>
        <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
          <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="+not-found" />
          </Stack>
        </ThemeProvider>
      </WallpaperProvider>
    </AppStateProvider>
  );
}
