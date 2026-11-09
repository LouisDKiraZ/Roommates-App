import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Link, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Text, useThemeColor } from "@/components/Themed";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { useAppState } from "@/context/AppStateContext";
import { passwordRules } from "@/lib/auth/password";
import { isValidUsername } from "@/lib/auth/validators";
import { FontSize, FontWeight, Spacing } from "@/constants/theme";

export default function SignupScreen() {
  const { signup } = useAppState();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showRules, setShowRules] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const textMuted = useThemeColor({}, "textMuted");
  const success = useThemeColor({}, "primary");
  const danger = useThemeColor({}, "danger");

  const unmetRules = useMemo(
    () => passwordRules.filter((rule) => !rule.test(password)),
    [password]
  );
  const passwordIsStrong = unmetRules.length === 0;
  const usernameError =
    username.length > 0 && !isValidUsername(username)
      ? "3-20 characters: letters, numbers, underscore only."
      : undefined;
  const confirmError =
    confirmPassword.length > 0 && confirmPassword !== password
      ? "Passwords don't match."
      : undefined;

  async function handleSignup() {
    setError(null);

    if (!name.trim()) return setError("Enter your name.");
    if (!isValidUsername(username)) {
      return setError("Choose a username: 3-20 characters, letters/numbers/underscore only.");
    }
    if (!passwordIsStrong) return setError("Your password doesn't meet the requirements yet.");
    if (password !== confirmPassword) return setError("Passwords don't match.");

    setSubmitting(true);
    try {
      await signup(name, username, password);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create your account.");
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
        <Text style={styles.title}>Create your account</Text>
        <Text style={[styles.subtitle, { color: textMuted }]}>
          You&apos;ll be able to create or join an apartment next.
        </Text>

        <View style={styles.form}>
          <TextField label="Name" placeholder="Your name" value={name} onChangeText={setName} />
          <TextField
            label="Username"
            placeholder="e.g. alex_k"
            autoCapitalize="none"
            autoCorrect={false}
            value={username}
            onChangeText={setUsername}
            error={usernameError}
          />
          <TextField
            label="Password"
            placeholder="••••••••"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            onFocus={() => setShowRules(true)}
          />

          {showRules && (
            <View style={styles.rules}>
              {passwordRules.map((rule) => {
                const met = rule.test(password);
                return (
                  <View key={rule.id} style={styles.ruleRow}>
                    <Ionicons
                      name={met ? "checkmark-circle" : "ellipse-outline"}
                      size={16}
                      color={met ? success : textMuted}
                    />
                    <Text style={[styles.ruleLabel, { color: met ? success : textMuted }]}>
                      {rule.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          <TextField
            label="Confirm password"
            placeholder="••••••••"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            error={confirmError}
          />
        </View>

        {error && <Text style={[styles.formError, { color: danger }]}>{error}</Text>}

        <Button
          label={submitting ? "Creating account..." : "Create account"}
          onPress={handleSignup}
        />

        <View style={styles.footer}>
          <Text style={{ color: textMuted }}>Already have an account? </Text>
          <Link href="/(auth)/login">
            <Text style={styles.link}>Log in</Text>
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
  rules: {
    marginTop: -Spacing.sm,
    marginBottom: Spacing.lg,
    gap: Spacing.xs,
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  ruleLabel: {
    fontSize: FontSize.xs,
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
