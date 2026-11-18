import { Image, StyleSheet, View } from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Text, useThemeColor } from "@/components/Themed";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { FontSize, FontWeight, Spacing } from "@/constants/theme";

export default function WelcomeScreen() {
  const textMuted = useThemeColor({}, "textMuted");

  return (
    <Screen style={styles.safe}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image
            source={require("@/assets/logo.jpg")}
            style={styles.logoImage}
            resizeMode="cover"
          />
        </View>

        <Text style={styles.title}>Roomly</Text>
        <Text style={[styles.tagline, { color: textMuted }]}>
          Share the chores, split the bills, stay in sync — all in one place with your roommates.
        </Text>

        <View style={styles.features}>
          <Feature icon="sparkles-outline" label="Chore rotation" />
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
  logoContainer: {
    width: 88,
    height: 88,
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: Spacing.lg,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  logoImage: {
    width: "100%",
    height: "100%",
    borderRadius: 24,
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
