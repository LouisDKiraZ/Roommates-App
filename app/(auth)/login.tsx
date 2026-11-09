import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Link, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Text, useThemeColor } from "@/components/Themed";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { useAppState } from "@/context/AppStateContext";
import { FontSize, FontWeight, Spacing } from "@/constants/theme";

export default function LoginScreen() {
  const { login } = useAppState();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const textMuted = useThemeColor({}, "textMuted");
  const danger = useThemeColor({}, "danger");

  async function handleLogin() {
    setError(null);
    if (!username.trim() || !password) {
      return setError("Enter your username and password.");
    }

    setSubmitting(true);
    try {
      await login(username, password);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't log you in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Ionicons name="chevron-back" size={24} />
      </Pressable>

      <View style={styles.content}>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={[styles.subtitle, { color: textMuted }]}>
          Log in to get back to your apartment.
        </Text>

        <View style={styles.form}>
          <TextField
            label="Username"
            placeholder="e.g. alex_k"
            autoCapitalize="none"
            autoCorrect={false}
            value={username}
            onChangeText={setUsername}
          />
          <TextField
            label="Password"
            placeholder="••••••••"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        {error && <Text style={[styles.formError, { color: danger }]}>{error}</Text>}

        <Button label={submitting ? "Logging in..." : "Log in"} onPress={handleLogin} />

        <View style={styles.footer}>
          <Text style={{ color: textMuted }}>Don&apos;t have an account? </Text>
          <Link href="/(auth)/signup">
            <Text style={styles.link}>Sign up</Text>
          </Link>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: {
    marginLeft: Spacing.md,
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    alignSelf: "flex-start",
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold as any,
  },
  subtitle: {
    fontSize: FontSize.md,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  form: {
    marginTop: Spacing.md,
  },
  formError: {
    fontSize: FontSize.sm,
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: Spacing.lg,
  },
  link: {
    fontWeight: FontWeight.semibold as any,
  },
});
