import { StyleSheet, View } from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Text, useThemeColor } from "@/components/Themed";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { FontSize, FontWeight, Spacing } from "@/constants/theme";

export default function WelcomeScreen() {
  const primary = useThemeColor({}, "primary");
  const primaryMuted = useThemeColor({}, "primaryMuted");
  const textMuted = useThemeColor({}, "textMuted");

  return (
    <Screen style={styles.safe}>
      <View style={styles.content}>
        <View style={[styles.logo, { backgroundColor: primaryMuted }]}>
          <Ionicons name="home" size={40} color={primary} />
        </View>

        <Text style={styles.title}>Roomly</Text>
        <Text style={[styles.tagline, { color: textMuted }]}>
          Share the chores, split the bills, stay in sync — all in one place with your roommates.
        </Text>

        <View style={styles.features}>
          <Feature icon="sparkles-outline" label="Cleaning rotation" />
          <Feature icon="receipt-outline" label="Shared expenses" />
          <Feature icon="calendar-outline" label="Shared calendar" />
          <Feature icon="people-outline" label="Your apartment" />
        </View>
      </View>

      <View style={styles.actions}>
        <Link href="/(auth)/signup" asChild>
          <Button label="Create an account" />
        </Link>
        <Link href="/(auth)/login" asChild>
          <Button label="I already have an account" variant="ghost" />
        </Link>
      </View>
    </Screen>
  );
}

function Feature({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const primary = useThemeColor({}, "primary");
  const textMuted = useThemeColor({}, "textMuted");

  return (
    <View style={styles.featureRow}>
      <Ionicons name={icon} size={18} color={primary} style={styles.featureIcon} />
      <Text style={{ color: textMuted }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    justifyContent: "space-between",
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
    alignItems: "center",
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 34,
    fontWeight: FontWeight.bold as any,
  },
  tagline: {
    fontSize: FontSize.md,
    textAlign: "center",
    marginTop: Spacing.sm,
    lineHeight: 22,
  },
  features: {
    marginTop: Spacing.xxl,
    alignSelf: "stretch",
    gap: Spacing.md,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  featureIcon: {
    marginRight: Spacing.md,
  },
  actions: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
});
