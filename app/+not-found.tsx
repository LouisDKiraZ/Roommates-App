import { Link, Stack } from "expo-router";
import { StyleSheet } from "react-native";

import { Text } from "@/components/Themed";
import { Screen } from "@/components/ui/Screen";
import { FontSize, FontWeight, Spacing } from "@/constants/theme";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <Screen style={styles.container}>
        <Text style={styles.title}>This screen doesn&apos;t exist.</Text>

        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go to home screen</Text>
        </Link>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold as any,
  },
  link: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  linkText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold as any,
  },
});
