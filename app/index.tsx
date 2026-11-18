import { ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";

import { Screen } from "@/components/ui/Screen";
import { useThemeColor } from "@/components/Themed";
import { useAppState } from "@/context/AppStateContext";

// Entry point: sends the user to the right place based on real auth /
// apartment state. See context/AppStateContext.tsx.
export default function Index() {
  const { isLoading, currentUser, apartment } = useAppState();
  const primary = useThemeColor({}, "primary");

  if (isLoading) {
    return (
      <Screen style={{ alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={primary} size="large" />
      </Screen>
    );
  }

  if (!currentUser) return <Redirect href="/(auth)/welcome" />;
  if (!apartment) return <Redirect href="/onboarding/apartment" />;
  return <Redirect href="/(tabs)" />;
}
